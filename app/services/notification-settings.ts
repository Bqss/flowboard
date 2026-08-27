import { and, eq } from 'drizzle-orm';
import { db, notificationSettings, users, type NotificationSettings, type NotificationType } from '@db';

export type NotificationPreferenceInput = {
  waFailed?: boolean;
  customerReplied?: boolean;
  cardOverdue?: boolean;
  handover?: boolean;
  emailWaFailed?: boolean;
  emailCustomerReplied?: boolean;
  emailCardOverdue?: boolean;
  emailHandover?: boolean;
  emailDigest?: boolean;
};

export type PublicNotificationSettings = {
  waFailed: boolean;
  customerReplied: boolean;
  cardOverdue: boolean;
  handover: boolean;
  emailWaFailed: boolean;
  emailCustomerReplied: boolean;
  emailCardOverdue: boolean;
  emailHandover: boolean;
  emailDigest: boolean;
};

const toPublic = (row: NotificationSettings): PublicNotificationSettings => ({
  waFailed: row.waFailed,
  customerReplied: row.customerReplied,
  cardOverdue: row.cardOverdue,
  handover: row.handover,
  emailWaFailed: row.emailWaFailed,
  emailCustomerReplied: row.emailCustomerReplied,
  emailCardOverdue: row.emailCardOverdue,
  emailHandover: row.emailHandover,
  emailDigest: row.emailDigest
});

const DEFAULTS: PublicNotificationSettings = {
  waFailed: true,
  customerReplied: true,
  cardOverdue: true,
  handover: true,
  emailWaFailed: false,
  emailCustomerReplied: false,
  emailCardOverdue: true,
  emailHandover: true,
  emailDigest: false
};

export const getNotificationSettings = async (
  workspaceId: string,
  userId: string
): Promise<PublicNotificationSettings> => {
  const [row] = await db
    .select()
    .from(notificationSettings)
    .where(
      and(eq(notificationSettings.workspaceId, workspaceId), eq(notificationSettings.userId, userId))
    )
    .limit(1);

  return row ? toPublic(row) : { ...DEFAULTS };
};

export const upsertNotificationSettings = async (
  workspaceId: string,
  userId: string,
  input: Partial<NotificationPreferenceInput> & Record<string, unknown>
): Promise<PublicNotificationSettings> => {
  const [existing] = await db
    .select()
    .from(notificationSettings)
    .where(
      and(eq(notificationSettings.workspaceId, workspaceId), eq(notificationSettings.userId, userId))
    )
    .limit(1);

  const values = {
    workspaceId,
    userId,
    waFailed: input.waFailed ?? existing?.waFailed ?? DEFAULTS.waFailed,
    customerReplied: input.customerReplied ?? existing?.customerReplied ?? DEFAULTS.customerReplied,
    cardOverdue: input.cardOverdue ?? existing?.cardOverdue ?? DEFAULTS.cardOverdue,
    handover: input.handover ?? existing?.handover ?? DEFAULTS.handover,
    emailWaFailed: input.emailWaFailed ?? existing?.emailWaFailed ?? DEFAULTS.emailWaFailed,
    emailCustomerReplied:
      input.emailCustomerReplied ?? existing?.emailCustomerReplied ?? DEFAULTS.emailCustomerReplied,
    emailCardOverdue: input.emailCardOverdue ?? existing?.emailCardOverdue ?? DEFAULTS.emailCardOverdue,
    emailHandover: input.emailHandover ?? existing?.emailHandover ?? DEFAULTS.emailHandover,
    emailDigest: input.emailDigest ?? existing?.emailDigest ?? DEFAULTS.emailDigest,
    updatedAt: new Date()
  };

  if (existing) {
    const [updated] = await db
      .update(notificationSettings)
      .set(values)
      .where(eq(notificationSettings.id, existing.id))
      .returning();
    return toPublic(updated!);
  }

  const [created] = await db
    .insert(notificationSettings)
    .values(values)
    .returning();
  return toPublic(created!);
};

/**
 * Returns whether in-app notification should be created for this event type.
 */
export const shouldNotifyInApp = (settings: PublicNotificationSettings, type: NotificationType): boolean => {
  switch (type) {
    case 'wa_failed':
      return settings.waFailed;
    case 'customer_replied':
      return settings.customerReplied;
    case 'card_overdue':
      return settings.cardOverdue;
    case 'handover':
      return settings.handover;
    default:
      return true;
  }
};

/**
 * Returns whether email should be sent for this event type.
 */
export const shouldNotifyEmail = (settings: PublicNotificationSettings, type: NotificationType): boolean => {
  switch (type) {
    case 'wa_failed':
      return settings.emailWaFailed;
    case 'customer_replied':
      return settings.emailCustomerReplied;
    case 'card_overdue':
      return settings.emailCardOverdue;
    case 'handover':
      return settings.emailHandover;
    default:
      return false;
  }
};

export const getUserEmail = async (userId: string): Promise<string | null> => {
  const [row] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.email ?? null;
};
