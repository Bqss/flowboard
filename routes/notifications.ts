import { Elysia } from 'elysia';
import * as notifications from '@handlers/notifications';
import { createRequireAuth } from '@middlewares';
import { resolveWorkspaceMember } from '@middlewares/workspace';
import { NotificationIdParam, WorkspaceIdParam } from '@validators';

export const createNotificationsRoutes = () => {
  const workspaceMemberGuard = new Elysia()
    .derive({ as: 'scoped' }, async ({ cookie, params }) =>
      resolveWorkspaceMember(cookie, params.workspaceId)
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
    .patch('/:notificationId/read', notifications.markRead, { params: NotificationIdParam });
};

export const notificationsRoutes = createNotificationsRoutes();
