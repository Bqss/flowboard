import { Elysia } from 'elysia';
import * as integrations from '@handlers/integrations';
import { isValidIntegrationKey } from '@services/integration';
import { IntegrationCreateCardSchema, McpCallSchema } from '@validators';

const readApiKey = (request: Request) => {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return request.headers.get('x-api-key');
};

export const createIntegrationsRoutes = () =>
  new Elysia({ prefix: '/integrations' })
    .onBeforeHandle(({ request, set }) => {
      if (!isValidIntegrationKey(readApiKey(request))) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
    })
    .get('/mcp/tools', integrations.listTools)
    .post('/mcp/call', integrations.callTool, { body: McpCallSchema })
    .post('/cards', integrations.createCardIntegration, { body: IntegrationCreateCardSchema });

export const integrationsRoutes = createIntegrationsRoutes();
