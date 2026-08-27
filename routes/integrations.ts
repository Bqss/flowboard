import { Elysia } from 'elysia';
import * as integrations from '@handlers/integrations';
import { isValidIntegrationKey } from '@services/integration';
import { resolveApiKey, type ResolvedApiKey } from '@services/api-keys';
import { env } from '@config/env';
import { MCP_TOOL_NAMES } from '@services/integration-tools';
import { IntegrationCreateCardSchema } from '@validators';

/**
 * Extract the bearer/x-api-key from the request.
 */
const readApiKey = (request: Request) => {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return request.headers.get('x-api-key');
};

/**
 * Resolve the workspace + plaintext API key from the request.
 *
 * 1. DB-managed per-workspace key → workspace resolved from key hash lookup.
 * 2. Legacy global FLOWBOARD_API_KEY → workspace from x-workspace-id header.
 *
 * Returns the plaintext key (for scope resolution in handlers) + workspaceId,
 * or null if auth fails.
 */
export const resolveIntegrationAuth = async (
  request: Request
): Promise<{ apiKey: string; workspaceId: string; mode: 'db' | 'legacy'; resolved: ResolvedApiKey } | null> => {
  const apiKey = readApiKey(request);
  if (!apiKey) return null;

  // 1. DB-managed per-workspace key.
  const resolved = await resolveApiKey(apiKey);
  if (resolved) return { apiKey, workspaceId: resolved.workspaceId, mode: 'db', resolved };

  // 2. Legacy global key + x-workspace-id header.
  if (env.flowboardApiKey && isValidIntegrationKey(apiKey)) {
    const headerWorkspaceId = request.headers.get('x-workspace-id');
    if (headerWorkspaceId) {
      return {
        apiKey,
        workspaceId: headerWorkspaceId,
        mode: 'legacy',
        resolved: {
          workspaceId: headerWorkspaceId,
          keyId: 'legacy-flowboard-key',
          label: 'Legacy Flowboard key',
          scopeMode: 'all',
          enabledTools: [...MCP_TOOL_NAMES],
          allowedWorkflowIds: []
        }
      };
    }
  }

  return null;
};

export const createIntegrationsRoutes = () =>
  new Elysia({ prefix: '/integrations' })
    // Resolve auth once per request and derive `integrationApiKey` + `integrationWorkspaceId`.
    .derive({ as: 'scoped' }, async ({ request }) => {
      const auth = await resolveIntegrationAuth(request);
      return {
        integrationApiKey: auth?.apiKey ?? null,
        integrationWorkspaceId: auth?.workspaceId ?? null,
        integrationAuth: auth?.resolved ?? null
      };
    })
    .onBeforeHandle(({ integrationApiKey, set }) => {
      if (!integrationApiKey) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
    })
    .post('/cards', integrations.createCardIntegration, { body: IntegrationCreateCardSchema });

export const integrationsRoutes = createIntegrationsRoutes();
