import { Elysia } from 'elysia';
import * as wajom from '@handlers/wajom';
import { createRequireWorkspaceOwner } from '@middlewares/workspace';
import { checkIntegrationRateLimit, createRequestId } from '@services/integration-security';
import { findWajomConnectionByToken } from '@services/wajom-connections';
import {
  CreateWajomConnectionSchema,
  UpdateWajomConnectionSchema,
  WajomConnectionParam,
  WajomDeliveryStatusSchema,
  WajomInboundReplySchema,
  WajomJobParam,
  WajomJobsQuery,
  WajomTestSendSchema,
  WajomToolCallSchema,
  WorkspaceIdParam
} from '@validators';

const readConnectorToken = (request: Request) => {
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();
  return request.headers.get('x-api-key')?.trim() ?? '';
};

const connectorGuard = new Elysia()
  .derive({ as: 'scoped' }, async ({ request }) => {
    const token = readConnectorToken(request);
    const connection = token ? await findWajomConnectionByToken(token) : null;
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

export const createWajomRoutes = () =>
  new Elysia()
    .group('/workspaces/:workspaceId/integrations/wajom', (app) =>
      app
        .use(createRequireWorkspaceOwner())
        .get('/', wajom.listConnections, { params: WorkspaceIdParam })
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
        .post('/:connectionId/rotate', wajom.rotateConnection, { params: WajomConnectionParam })
        .post('/:connectionId/test', wajom.testConnection, { params: WajomConnectionParam })
        .post('/:connectionId/test-send', wajom.testSend, {
          params: WajomConnectionParam,
          body: WajomTestSendSchema
        })
    )
    .group('/integrations/wajom', (app) =>
      app
        .use(connectorGuard)
        .onError({ as: 'scoped' }, ({ code, request, set }) => {
          if (code === 'VALIDATION') {
            const requestId = createRequestId(request.headers.get('x-request-id') ?? undefined);
            set.status = 422;
            set.headers['x-request-id'] = requestId;
            return {
              ok: false,
              error: 'Invalid connector request.',
              code: 'invalid_input',
              requestId
            };
          }
        })
        .get('/tools', wajom.listTools)
        .get('/manifest', wajom.manifest)
        .get('/health', wajom.connectorHealth)
        .post('/call', wajom.callTool, { body: WajomToolCallSchema })
        .post('/inbound/reply', wajom.inboundReply, { body: WajomInboundReplySchema })
        .post('/jobs/:jobId/status', wajom.deliveryStatus, {
          params: WajomJobParam,
          body: WajomDeliveryStatusSchema
        })
    );

export const wajomRoutes = createWajomRoutes();
