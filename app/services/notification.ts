import { and, desc, eq } from 'drizzle-orm';
import { db, notifications, workspaceMembers, type NotificationType } from '@db';
import {
  getNotificationSettings,
  getUserEmail,
  shouldNotifyEmail,
  shouldNotifyInApp
} from './notification-settings';
import { sendEmail } from './email';
import { broadcastToUsers } from '@services/chatSocket';
import { sendWebPushNotification } from '@services/web-push';


/** Returns the userId of the first workspace owner, or null if none. */
export const getWorkspaceOwnerUserId = async (workspaceId: string): Promise<string | null> => {
  const [owner] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, 'owner')))
    .limit(1);
  return owner?.userId ?? null;
};

/**
 * Resolves who should receive a notification for a card:
 * the assignee if set, otherwise the workspace owner.
 */
export const resolveNotifyTarget = async (
  workspaceId: string,
  assigneeId: string | null
): Promise<string | null> => {
  if (assigneeId) return assigneeId;
  return getWorkspaceOwnerUserId(workspaceId);
};
export const createNotification = async (input: {
  workspaceId: string;
  userId: string;
  cardId?: string | null;
  conversationId?: string | null;
  boardId?: string | null;
  taskId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
}) => {
  const settings = await getNotificationSettings(input.workspaceId, input.userId);

  let row = null;
  if (shouldNotifyInApp(settings, input.type)) {
    [row] = await db
      .insert(notifications)
      .values({
        workspaceId: input.workspaceId,
        userId: input.userId,
        cardId: input.cardId ?? null,
        conversationId: input.conversationId ?? null,
        boardId: input.boardId ?? null,
        taskId: input.taskId ?? null,
        type: input.type,
        title: input.title,
        body: input.body
      })
      .returning();
  }

  if (row) {
    broadcastToUsers(input.workspaceId, [input.userId], { type: 'notification:new', notification: row });

    if (
      input.type === 'chat_message' ||
      input.type === 'chat_reaction' ||
      input.type === 'task_comment' ||
      input.type === 'task_mention' ||
      input.type === 'task_due_soon' ||
      input.type === 'task_overdue'
    ) {
      const url =
        input.type === 'chat_message' && input.conversationId
          ? `/dashboard/chat?workspaceId=${encodeURIComponent(input.workspaceId)}&conversationId=${encodeURIComponent(input.conversationId)}`
          : input.boardId && input.taskId
            ? `/dashboard/boards/${encodeURIComponent(input.boardId)}?workspaceId=${encodeURIComponent(input.workspaceId)}&task=${encodeURIComponent(input.taskId)}`
            : '/dashboard';
      const title = input.title;

      void sendWebPushNotification(input.userId, {
        notificationId: row.id,
        workspaceId: row.workspaceId,
        type: input.type,
        appBody: input.body,
        title,
        body: input.body,
        url
      }).catch((error) => {
        console.error('[notification] web push preparation failed:', error);
      });
    }
  }

  if (shouldNotifyEmail(settings, input.type) && !settings.emailDigest) {
    const email = await getUserEmail(input.userId);
    if (email) {
      await sendEmail({
        to: email,
        subject: input.title,
        html: `<p>${input.body}</p>`,
        text: input.body
      }).catch((error) => {
        console.error('[notification] email send failed:', error);
      });
    }
  }

  return row;
};

export const listNotificationsForUser = async (userId: string, workspaceId: string, limit = 30) =>
  db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.workspaceId, workspaceId)))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

export const countUnreadNotifications = async (userId: string, workspaceId: string) => {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.read, false)
      )
    );

  return rows.length;
};

export const markNotificationRead = async (notificationId: string, userId: string) => {
  const [row] = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();

  return row ?? null;
};

export const markAllNotificationsRead = async (userId: string, workspaceId: string) => {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.workspaceId, workspaceId)));

  return { ok: true as const };
};

export const hasRecentNotification = async (
  userId: string,
  cardId: string,
  type: NotificationType,
  withinHours = 24
) => {
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.cardId, cardId),
        eq(notifications.type, type),
        eq(notifications.read, false)
      )
    )
    .limit(1);

  if (rows.length === 0) return false;

  const [latest] = await db
    .select({ createdAt: notifications.createdAt })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.cardId, cardId),
        eq(notifications.type, type)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(1);

  return Boolean(latest && latest.createdAt >= since);
};
