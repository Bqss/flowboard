import { Elysia } from 'elysia';
import * as integrations from '@handlers/integrations';
import { resolveApiKey, type ResolvedApiKey } from '@services/api-keys';
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
 * DB-managed per-workspace key → workspace resolved from key hash lookup.
 * Returns the plaintext key + workspaceId, or null if auth fails.
 */
export const resolveIntegrationAuth = async (
  request: Request
): Promise<{ apiKey: string; workspaceId: string; resolved: ResolvedApiKey } | null> => {
  const apiKey = readApiKey(request);
  if (!apiKey) return null;

  const resolved = await resolveApiKey(apiKey);
  if (resolved) return { apiKey, workspaceId: resolved.workspaceId, resolved };

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
