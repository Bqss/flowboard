import { Elysia } from 'elysia';
import * as wajom from '@handlers/wajom';
import { createRequireAuth } from '@middlewares';
import { createRequireWorkspaceOwner } from '@middlewares/workspace';
import { checkIntegrationRateLimit } from '@services/integration-security';
import { getWajomConnection } from '@services/wajom-connections';
import { resolveApiKey } from '@services/api-keys';
import {
  CreateWajomConnectionSchema,
  UpdateWajomConnectionSchema,
  WajomConnectionParam,
  WajomDeliveryStatusSchema,
  WajomJobParam,
  WajomJobsQuery,
  WajomTestSendSchema,
  WorkspaceIdParam
} from '@validators';

/**
 * Connector-facing guard: MCP API key (Bearer fbm_...) + connectionId query param.
 * Replaces the old connector token guard. Wajom passes the workspace's MCP API key
 * and the connectionId to identify which Wajom connection to use.
 */
const connectorGuard = new Elysia()
  .derive({ as: 'scoped' }, async ({ request, query }) => {
    const authorization = request.headers.get('authorization');
    const apiKey = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    const auth = apiKey ? await resolveApiKey(apiKey) : null;

    const connectionId = (query as { connectionId?: string })?.connectionId;
    const connection =
      auth && connectionId ? await getWajomConnection(auth.workspaceId, connectionId) : null;

    const caller =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown';
    const rate = checkIntegrationRateLimit(`${connection?.id ?? 'anonymous'}:${caller}`);

    return { wajomConnection: connection, connectorRate: rate };
  })
  .onBeforeHandle({ as: 'scoped' }, ({ wajomConnection, connectorRate, set }) => {
    if (!wajomConnection) {
      set.status = 401;
      return { ok: false, error: 'Unauthorized', code: 'unauthorized' };
    }
    if (!connectorRate.allowed) {
      set.status = 429;
      set.headers['retry-after'] = String(connectorRate.retryAfterSeconds);
      return { ok: false, error: 'Rate limit exceeded', code: 'rate_limited' };
    }
  });

/**
 * Workspace-scoped Wajom management routes (session auth + owner guard).
 * Uses `prefix` so `createRequireAuth()` runs at the instance level —
 * see the routing docs in AGENTS.md.
 */
const wajomWorkspaceRoutes = () =>
  new Elysia({ prefix: '/workspaces/:workspaceId/integrations/wajom' })
    .use(createRequireAuth())
    .use(createRequireWorkspaceOwner())
    .get('/', wajom.listConnections, { params: WorkspaceIdParam })
    .get('/:connectionId/export', wajom.exportActions, { params: WajomConnectionParam })
    .get('/jobs', wajom.listJobs, { params: WorkspaceIdParam, query: WajomJobsQuery })
    .post('/', wajom.createConnection, {
      params: WorkspaceIdParam,
      body: CreateWajomConnectionSchema
    })
    .patch('/:connectionId', wajom.updateConnection, {
      params: WajomConnectionParam,
      body: UpdateWajomConnectionSchema
    })
    .post('/:connectionId/revoke', wajom.revokeConnection, { params: WajomConnectionParam })
    .post('/:connectionId/test', wajom.testConnection, { params: WajomConnectionParam })
    .post('/:connectionId/test-send', wajom.testSend, {
      params: WajomConnectionParam,
      body: WajomTestSendSchema
    });

/**
 * Connector-facing routes (MCP API key auth + connectionId query param).
 * Only health check and delivery status remain — tools/manifest/call/inbound
 * are handled by the MCP server.
 */
const wajomConnectorRoutes = () =>
  new Elysia({ prefix: '/integrations/wajom' })
    .use(connectorGuard)
    .get('/health', wajom.connectorHealth)
    .post('/jobs/:jobId/status', wajom.deliveryStatus, {
      params: WajomJobParam,
      body: WajomDeliveryStatusSchema
    });

export const createWajomRoutes = () =>
  new Elysia().use(wajomWorkspaceRoutes()).use(wajomConnectorRoutes());

export const wajomRoutes = createWajomRoutes();
