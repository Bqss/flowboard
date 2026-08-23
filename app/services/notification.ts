import { and, desc, eq } from 'drizzle-orm';
import { db, notifications, type NotificationType } from '@db';

export const createNotification = async (input: {
  workspaceId: string;
  userId: string;
  cardId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
}) => {
  const [row] = await db
    .insert(notifications)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      cardId: input.cardId ?? null,
      type: input.type,
      title: input.title,
      body: input.body
    })
    .returning();

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
