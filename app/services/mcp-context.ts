/**
 * MCP agent context generator.
 *
 * Produces two artifacts for an API key:
 * 1. `getApiKeyPromptContext` — a markdown prompt describing the workspace,
 *    allowed workflows, stages, and rules. Used by the "Copy prompt" UI action.
 * 2. `getApiKeyMcpConfig` — a JSON config object compatible with the standalone
 *    MCP server (Claude/Cursor style), with the API key as a placeholder.
 *
 * Both are regenerated from current DB state on every call.
 */
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, stages, workflows, workspaces, type McpApiKey } from '@db';
import { getToolDefinition, MCP_TOOL_DEFINITIONS, type McpToolName } from './integration-tools';
import type { McpScopeMode } from './api-keys';

export type PromptContextInput = {
  apiKey: Pick<McpApiKey, 'label' | 'scopeMode' | 'enabledTools'> & {
    allowedWorkflowIds: string[];
  };
  workspaceId: string;
  mcpPublicUrl?: string;
};

const loadWorkspace = async (workspaceId: string) => {
  const [row] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return row ?? null;
};

const loadWorkflows = async (workspaceId: string, ids: string[] | null) => {
  const condition = ids
    ? and(eq(workflows.workspaceId, workspaceId), inArray(workflows.id, ids))
    : eq(workflows.workspaceId, workspaceId);
  return db
    .select({
      id: workflows.id,
      name: workflows.name,
      description: workflows.description
    })
    .from(workflows)
    .where(condition)
    .orderBy(asc(workflows.name));
};

const loadStagesForWorkflows = async (workflowIds: string[]) => {
  if (workflowIds.length === 0) return new Map();
  const rows = await db
    .select({
      id: stages.id,
      workflowId: stages.workflowId,
      name: stages.name,
      color: stages.color,
      position: stages.position
    })
    .from(stages)
    .where(inArray(stages.workflowId, workflowIds))
    .orderBy(asc(stages.position));
  const map = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = map.get(row.workflowId) ?? [];
    list.push(row);
    map.set(row.workflowId, list);
  }
  return map;
};

const scopeLabel = (mode: McpScopeMode, count: number): string => {
  if (mode === 'all') return 'all workflows in this workspace';
  if (count === 1) return 'a single workflow';
  return `${count} selected workflows`;
};

const formatToolList = (tools: McpToolName[]): string => {
  return tools
    .map((name) => {
      const def = getToolDefinition(name);
      return `- \`${name}\` — ${def?.description ?? ''}`;
    })
    .join('\n');
};

/**
 * Build the agent prompt for an API key.
 *
 * The prompt is a snapshot of the current scope + workflow context. It does
 * NOT contain the API key, hashes, or any secrets.
 */
export const getApiKeyPromptContext = async (input: PromptContextInput): Promise<string> => {
  const workspace = await loadWorkspace(input.workspaceId);
  const scopeFilter = input.apiKey.scopeMode === 'selected' ? input.apiKey.allowedWorkflowIds : null;
  const workflowRows = await loadWorkflows(input.workspaceId, scopeFilter);
  const stagesByWorkflow = await loadStagesForWorkflows(workflowRows.map((w) => w.id));

  const lines: string[] = [];
  lines.push(`# Flowboard Agent Context`);
  lines.push('');
  lines.push(`## Workspace`);
  lines.push(`- Name: ${workspace?.name ?? 'Unknown'}`);
  lines.push(`- Workspace ID: ${input.workspaceId}`);
  lines.push('');
  lines.push(`## API key access`);
  lines.push(`- Label: ${input.apiKey.label}`);
  lines.push(`- Scope: ${scopeLabel(input.apiKey.scopeMode as McpScopeMode, workflowRows.length)}`);
  lines.push('');

  if (input.apiKey.scopeMode === 'all') {
    lines.push(`You have access to **all workflows** in this workspace, including any new`);
    lines.push(`workflow created after this prompt was generated. Use the \`list_workflows\``);
    lines.push(`tool to discover the current set of workflows.`);
    lines.push('');
  }

  lines.push(`## Allowed workflows`);
  if (workflowRows.length === 0) {
    lines.push(`_No workflows available in scope._`);
  } else {
    for (const w of workflowRows) {
      lines.push(`### ${w.name}`);
      lines.push(`- Workflow ID: \`${w.id}\``);
      if (w.description) {
        lines.push(`- Description: ${w.description}`);
      }
      const ws = stagesByWorkflow.get(w.id) ?? [];
      if (ws.length > 0) {
        lines.push(`- Stages (ordered):`);
        for (const s of ws) {
          lines.push(`  ${s.position + 1}. \`${s.name}\` (stage ID: \`${s.id}\`)`);
        }
      } else {
        lines.push(`- Stages: _none_`);
      }
      lines.push('');
    }
  }

  lines.push(`## Available tools`);
  if (input.apiKey.enabledTools.length === 0) {
    lines.push(`_No tools enabled._`);
  } else {
    lines.push(formatToolList(input.apiKey.enabledTools as McpToolName[]));
  }
  lines.push('');

  lines.push(`## Rules`);
  lines.push(`- Only operate on workflows listed above (or discovered via \`list_workflows\` if scope is "all").`);
  lines.push(`- Never invent workflow IDs, stage IDs, card IDs, or checklist item IDs. Always use IDs returned by tools.`);
  lines.push(`- If a customer's intent is ambiguous across multiple workflows, ask for clarification before acting.`);
  lines.push(`- Verify a card exists (via \`get_card\` or \`find_card_by_wa\`) before mutating it.`);
  lines.push(`- Do not call tools that are not listed in "Available tools" above.`);
  lines.push(`- Stay within this workspace. Do not attempt to access other workspaces.`);

  return lines.join('\n');
};

/**
 * Build the MCP client config JSON for an API key.
 *
 * The API key is always a placeholder (`<FLOWBOARD_MCP_API_KEY>`) so the user
 * fills in the actual key themselves. The URL is configurable via
 * `MCP_PUBLIC_URL` env or the `mcpPublicUrl` argument.
 */
export const getApiKeyMcpConfig = (input: {
  label: string;
  mcpPublicUrl?: string;
}): Record<string, unknown> => {
  const baseUrl = (input.mcpPublicUrl ?? 'http://localhost:3100').replace(/\/$/, '');
  return {
    mcpServers: {
      flowboard: {
        url: `${baseUrl}/mcp`,
        headers: {
          Authorization: 'Bearer <FLOWBOARD_MCP_API_KEY>'
        }
      }
    }
  };
};

/** All tool definitions for the MCP server's tools/list response. */
export const allToolDefinitions = () => MCP_TOOL_DEFINITIONS;
