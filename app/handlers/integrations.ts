import { type Ctx } from '@core';
import { MCP_TOOLS, callMcpTool, type McpToolName } from '@services/integration';
import { WorkflowError } from '@services/workflow';

type McpCallBody = {
  workspaceId: string;
  tool: McpToolName;
  arguments: Record<string, unknown>;
};

type IntegrationCreateCardBody = {
  workspaceId: string;
  workflowId: string;
  name: string;
  wa: string;
  product?: string;
  tag?: string;
  source?: 'mcp' | 'manual';
};

export function listTools() {
  return { tools: MCP_TOOLS };
}

export async function callTool({ body, set }: Ctx<McpCallBody>) {
  try {
    const result = await callMcpTool(body.workspaceId, body.tool, body.arguments ?? {});
    return { ok: true as const, result };
  } catch (error) {
    if (error instanceof WorkflowError) {
      set.status = error.code === 'not_found' ? 404 : 400;
      return { error: error.message };
    }
    throw error;
  }
}

export async function createCardIntegration({ body, set }: Ctx<IntegrationCreateCardBody>) {
  try {
    const result = await callMcpTool(body.workspaceId, 'create_card', {
      workflowId: body.workflowId,
      name: body.name,
      wa: body.wa,
      product: body.product,
      tag: body.tag,
      source: body.source ?? 'mcp'
    });
    return { ok: true as const, ...result };
  } catch (error) {
    if (error instanceof WorkflowError) {
      set.status = error.code === 'not_found' ? 404 : 400;
      return { error: error.message };
    }
    throw error;
  }
}
