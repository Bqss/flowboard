import { type Ctx } from '@core';
import {
  countUnreadNotifications,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead
} from '@services/notification';
import { getNotificationSettings, upsertNotificationSettings } from '@services/notification-settings';
import {
  getWebPushConfig,
  removePushSubscription,
  savePushSubscription,
  WebPushServiceError
} from '@services/web-push';

type WorkspaceParams = { workspaceId: string };
type NotificationParams = WorkspaceParams & { notificationId: string };
type NotificationSettingsBody = {
  waFailed?: boolean;
  customerReplied?: boolean;
  cardOverdue?: boolean;
  handover?: boolean;
  emailWaFailed?: boolean;
  emailCustomerReplied?: boolean;
  emailCardOverdue?: boolean;
  emailHandover?: boolean;
  emailDigest?: boolean;
  soundEnabled?: boolean;
};

type PushSubscriptionBody = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};
type PushSubscriptionEndpointBody = { endpoint: string };


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
      conversationId: row.conversationId,
      boardId: row.boardId,
      taskId: row.taskId,
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

export async function getSettings({ user, workspace, membership, set }: Ctx<unknown, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const settings = await getNotificationSettings(workspace.id, user.id);
  return { settings };
}

export async function getPushConfig({ user, workspace, membership, set }: Ctx<unknown, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }
  return getWebPushConfig();
}

export async function subscribePush({
  user,
  workspace,
  membership,
  body,
  set
}: Ctx<PushSubscriptionBody, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  try {
    return await savePushSubscription(user.id, body);
  } catch (error) {
    if (error instanceof WebPushServiceError) {
      set.status =
        error.code === 'unavailable' ? 503 : error.code === 'endpoint_in_use' ? 409 : 400;
      return { error: error.message };
    }
    throw error;
  }
}

export async function unsubscribePush({
  user,
  workspace,
  membership,
  body,
  set
}: Ctx<PushSubscriptionEndpointBody, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }
  return removePushSubscription(user.id, body.endpoint);
}

export async function updateSettings({
  user,
  workspace,
  membership,
  body,
  set
}: Ctx<NotificationSettingsBody, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const settings = await upsertNotificationSettings(workspace.id, user.id, body);
  return { settings };
}
