import type { NotificationType } from '@db';

const taskBuzzNotificationTypes: readonly NotificationType[] = [
  'task_assigned',
  'task_comment',
  'task_mention',
  'task_due_soon',
  'task_overdue'
];

export const isAutoBuzzTaskNotification = (type: NotificationType) =>
  taskBuzzNotificationTypes.includes(type);

/** Chat BUZZ messages are stored with this prefix (see `sendBuzz` in app/services/chat.ts). */
export const isChatBuzzMessageBody = (body: string) => body.startsWith('💥 BUZZ!');

export const shouldAutoBuzzIncomingMessage = (
  senderId: unknown,
  recipientUserId: string | null | undefined
) =>
  typeof senderId === 'string' &&
  senderId.length > 0 &&
  Boolean(recipientUserId) &&
  senderId !== recipientUserId;
