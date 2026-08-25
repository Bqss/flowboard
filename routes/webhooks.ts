import { Elysia } from 'elysia';
import * as webhooks from '@handlers/webhooks';
import { WhatsappWebhookSchema } from '@validators';
import { env } from '@config/env';
export const createWebhooksRoutes = () =>
  new Elysia({ prefix: '/webhooks' })
    .onBeforeHandle(({ request, set }) => {
      const secret = request.headers.get('x-webhook-secret');
      if (!env.waWebhookSecret || secret !== env.waWebhookSecret) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
    })
    .post('/whatsapp/reply', webhooks.whatsappReply, {
      body: WhatsappWebhookSchema
    });

export const webhooksRoutes = createWebhooksRoutes();
