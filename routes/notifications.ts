import { Elysia } from 'elysia';
import * as notifications from '@handlers/notifications';
import { createRequireAuth } from '@middlewares';
import { resolveWorkspaceMember } from '@middlewares/workspace';
import {
  NotificationIdParam,
  PushSubscriptionEndpointSchema,
  PushSubscriptionSchema,
  UpdateNotificationSettingsSchema,
  WorkspaceIdParam
} from '@validators';
export const createNotificationsRoutes = () => {
  const workspaceMemberGuard = new Elysia()
    .derive({ as: 'scoped' }, async ({ cookie, params, request }) =>
      resolveWorkspaceMember(cookie, params.workspaceId, request)
    )
    .onBeforeHandle({ as: 'scoped' }, (ctx) => {
      const { workspace, membership, set } = ctx as typeof ctx & {
        workspace: unknown;
        membership: unknown;
      };
      if (!workspace || !membership) {
        set.status = 403;
        return { error: 'Forbidden' };
      }
    });

  return new Elysia({ prefix: '/workspaces/:workspaceId/notifications' })
    .use(createRequireAuth())
    .use(workspaceMemberGuard)
    .get('/', notifications.list, { params: WorkspaceIdParam })
    .post('/read-all', notifications.markAllRead, { params: WorkspaceIdParam })
    .patch('/:notificationId/read', notifications.markRead, { params: NotificationIdParam })
    .get('/push-config', notifications.getPushConfig, { params: WorkspaceIdParam })
    .post('/push-subscription', notifications.subscribePush, {
      params: WorkspaceIdParam,
      body: PushSubscriptionSchema
    })
    .delete('/push-subscription', notifications.unsubscribePush, {
      params: WorkspaceIdParam,
      body: PushSubscriptionEndpointSchema
    })
    .get('/settings', notifications.getSettings, { params: WorkspaceIdParam })
    .put('/settings', notifications.updateSettings, {
      params: WorkspaceIdParam,
      body: UpdateNotificationSettingsSchema
    });
};

export const notificationsRoutes = createNotificationsRoutes();
