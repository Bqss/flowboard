import { type Ctx } from '@core';
import {
  countUnreadNotifications,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead
} from '@services/notification';

type WorkspaceParams = { workspaceId: string };
type NotificationParams = WorkspaceParams & { notificationId: string };

export async function list({ user, workspace, membership, set }: Ctx<unknown, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const rows = await listNotificationsForUser(user.id, workspace.id);
  const unread = await countUnreadNotifications(user.id, workspace.id);

  return {
    notifications: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      cardId: row.cardId,
      read: row.read,
      createdAt: row.createdAt
    })),
    unread
  };
}

export async function markRead({
  user,
  workspace,
  membership,
  params,
  set
}: Ctx<unknown, NotificationParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const row = await markNotificationRead(params.notificationId, user.id);
  if (!row || row.workspaceId !== workspace.id) {
    set.status = 404;
    return { error: 'Notification not found' };
  }

  return { ok: true as const };
}

export async function markAllRead({ user, workspace, membership, set }: Ctx<unknown, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  await markAllNotificationsRead(user.id, workspace.id);
  return { ok: true as const };
}
