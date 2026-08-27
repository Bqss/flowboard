import { type Ctx } from '@core';
import {
  createApiKey,
  listWorkspaceApiKeys,
  revokeApiKey,
  rotateApiKey,
  updateApiKey,
  type ApiKeyWithContext,
  type CreatedApiKey,
  type McpScopeMode
} from '@services/api-keys';
import { MCP_TOOL_NAMES, type McpToolName } from '@services/integration-tools';
import { getApiKeyMcpConfig, getApiKeyPromptContext } from '@services/mcp-context';
import { env } from '@config/env';
import { and, eq } from 'drizzle-orm';
import { db, mcpApiKeys, mcpApiKeyWorkflows } from '@db';

type WorkspaceParams = { workspaceId: string };

/**
 * Strip the plaintext key from a created key response for the API.
 * The plaintext is only returned once at creation time.
 */
const stripKey = (row: CreatedApiKey) => ({
  id: row.id,
  label: row.label,
  keyPrefix: row.keyPrefix,
  scopeMode: row.scopeMode,
  enabledTools: row.enabledTools,
  allowedWorkflowIds: row.allowedWorkflowIds,
  lastUsedAt: row.lastUsedAt,
  revokedAt: row.revokedAt,
  createdAt: row.createdAt,
  key: row.key
});

const stripRow = (row: ApiKeyWithContext) => ({
  id: row.id,
  label: row.label,
  keyPrefix: row.keyPrefix,
  scopeMode: row.scopeMode,
  enabledTools: row.enabledTools,
  allowedWorkflowIds: row.allowedWorkflowIds,
  lastUsedAt: row.lastUsedAt,
  revokedAt: row.revokedAt,
  createdAt: row.createdAt
});

/** Owner-only guard. Returns true if the caller is the workspace owner. */
const requireOwner = (
  membership: { role: string } | null | undefined,
  set: { status?: number | string }
): boolean => {
  if (membership?.role !== 'owner') {
    set.status = 403;
    return false;
  }
  return true;
};

const cleanToolNames = (tools: unknown): McpToolName[] => {
  const valid = new Set<string>(MCP_TOOL_NAMES);
  if (!Array.isArray(tools)) return [];
  const seen = new Set<McpToolName>();
  const result: McpToolName[] = [];
  for (const t of tools) {
    if (typeof t === 'string' && valid.has(t) && !seen.has(t as McpToolName)) {
      seen.add(t as McpToolName);
      result.push(t as McpToolName);
    }
  }
  return result;
};

const cleanWorkflowIds = (ids: unknown): string[] => {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
};

export async function listApiKeys({
  params,
  membership,
  set
}: Ctx<unknown, WorkspaceParams>) {
  if (!requireOwner(membership, set)) return { error: 'Owner access required' };
  const keys = await listWorkspaceApiKeys(params.workspaceId);
  return { keys: keys.map(stripRow) };
}

export async function createApiKeyHandler({
  params,
  body,
  membership,
  set
}: Ctx<
  {
    label: string;
    scopeMode?: McpScopeMode;
    enabledTools?: string[];
    workflowIds?: string[];
  },
  WorkspaceParams
>) {
  if (!requireOwner(membership, set)) return { error: 'Owner access required' };
  try {
    const created = await createApiKey(params.workspaceId, {
      label: body.label,
      scopeMode: (body.scopeMode ?? 'all') as McpScopeMode,
      enabledTools: cleanToolNames(body.enabledTools),
      workflowIds: cleanWorkflowIds(body.workflowIds)
    });
    set.status = 201;
    return { key: stripKey(created) };
  } catch (error) {
    set.status = 400;
    return { error: error instanceof Error ? error.message : 'Failed to create API key.' };
  }
}

export async function updateApiKeyHandler({
  params,
  body,
  membership,
  set
}: Ctx<
  {
    label?: string;
    scopeMode?: McpScopeMode;
    enabledTools?: string[];
    workflowIds?: string[];
  },
  WorkspaceParams & { keyId: string }
>) {
  if (!requireOwner(membership, set)) return { error: 'Owner access required' };
  try {
    const updated = await updateApiKey(params.workspaceId, params.keyId, {
      ...(body.label ? { label: body.label } : {}),
      ...(body.scopeMode ? { scopeMode: body.scopeMode as McpScopeMode } : {}),
      ...(body.enabledTools ? { enabledTools: cleanToolNames(body.enabledTools) } : {}),
      ...(body.workflowIds ? { workflowIds: cleanWorkflowIds(body.workflowIds) } : {})
    });
    if (!updated) {
      set.status = 404;
      return { error: 'API key not found' };
    }
    return { key: stripRow(updated) };
  } catch (error) {
    set.status = 400;
    return { error: error instanceof Error ? error.message : 'Failed to update API key.' };
  }
}

export async function revokeApiKeyHandler({
  params,
  body,
  membership,
  set
}: Ctx<{ keyId: string }, WorkspaceParams>) {
  if (!requireOwner(membership, set)) return { error: 'Owner access required' };
  try {
    const deleted = await revokeApiKey(params.workspaceId, body.keyId);
    if (!deleted) {
      set.status = 404;
      return { error: 'API key not found' };
    }
    return { ok: true as const };
  } catch (error) {
    console.error('[api-keys] revoke error:', error);
    set.status = 500;
    return { error: error instanceof Error ? error.message : 'Failed to revoke API key.' };
  }
}

export async function rotateApiKeyHandler({
  params,
  body,
  membership,
  set
}: Ctx<{ keyId: string }, WorkspaceParams>) {
  if (!requireOwner(membership, set)) return { error: 'Owner access required' };
  const { created } = await rotateApiKey(params.workspaceId, body.keyId);
  if (!created) {
    set.status = 404;
    return { error: 'API key not found' };
  }
  set.status = 201;
  return { key: stripKey(created) };
}

/** Load an API key row + its workflow mappings for prompt/config generation. */
const loadApiKeyForContext = async (workspaceId: string, keyId: string) => {
  const [row] = await db
    .select()
    .from(mcpApiKeys)
    .where(and(eq(mcpApiKeys.id, keyId), eq(mcpApiKeys.workspaceId, workspaceId)))
    .limit(1);
  if (!row) return null;
  const mappings = await db
    .select({ workflowId: mcpApiKeyWorkflows.workflowId })
    .from(mcpApiKeyWorkflows)
    .where(eq(mcpApiKeyWorkflows.apiKeyId, keyId));
  return {
    row,
    allowedWorkflowIds: mappings.map((m) => m.workflowId)
  };
};

export async function getApiKeyPromptHandler({
  params,
  body,
  membership,
  set
}: Ctx<{ keyId: string }, WorkspaceParams>) {
  if (!requireOwner(membership, set)) return { error: 'Owner access required' };
  const loaded = await loadApiKeyForContext(params.workspaceId, body.keyId);
  if (!loaded) {
    set.status = 404;
    return { error: 'API key not found' };
  }
  const prompt = await getApiKeyPromptContext({
    apiKey: {
      label: loaded.row.label,
      scopeMode: loaded.row.scopeMode as McpScopeMode,
      enabledTools: loaded.row.enabledTools as McpToolName[],
      allowedWorkflowIds: loaded.allowedWorkflowIds
    },
    workspaceId: params.workspaceId,
    mcpPublicUrl: env.mcpPublicUrl
  });
  return { prompt };
}

export async function getApiKeyConfigHandler({
  params,
  body,
  membership,
  set
}: Ctx<{ keyId: string }, WorkspaceParams>) {
  if (!requireOwner(membership, set)) return { error: 'Owner access required' };
  const loaded = await loadApiKeyForContext(params.workspaceId, body.keyId);
  if (!loaded) {
    set.status = 404;
    return { error: 'API key not found' };
  }
  const config = getApiKeyMcpConfig({
    label: loaded.row.label,
    mcpPublicUrl: env.mcpPublicUrl
  });
  return { config };
}

