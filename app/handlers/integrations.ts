import { type Ctx } from '@core';
import { callMcpTool, McpScopeError } from '@services/integration';
import type { ResolvedApiKey } from '@services/api-keys';
import { WorkflowError } from '@services/workflow';

type IntegrationCreateCardBody = {
  workflowId: string;
  name: string;
  wa: string;
  product?: string;
  tag?: string;
  source?: 'mcp' | 'manual';
};

export async function createCardIntegration({
  body,
  integrationApiKey,
  integrationAuth,
  set
}: Ctx<IntegrationCreateCardBody> & { integrationApiKey?: string | null; integrationAuth?: ResolvedApiKey | null }) {
  if (!integrationApiKey || !integrationAuth) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }

  const auth = integrationAuth;

  try {
    const result = await callMcpTool(auth, 'create_card', {
      workflowId: body.workflowId,
      name: body.name,
      wa: body.wa,
      product: body.product,
      tag: body.tag,
      source: body.source ?? 'mcp'
    });
    return { ok: true as const, ...result };
  } catch (error) {
    if (error instanceof McpScopeError) {
      set.status = 403;
      return { error: error.message, code: error.code };
    }
    if (error instanceof WorkflowError) {
      set.status = error.code === 'not_found' ? 404 : 400;
      return { error: error.message };
    }
    throw error;
  }
}
