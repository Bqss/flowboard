export type TaskCommentNotificationType = 'task_comment' | 'task_mention';

export type TaskCommentNotificationRecipient = {
  userId: string;
  type: TaskCommentNotificationType;
};

export const resolveTaskCommentNotificationRecipients = (input: {
  actorId: string;
  assigneeId: string | null;
  creatorId: string | null;
  mentionedUserIds: string[];
}): TaskCommentNotificationRecipient[] => {
  const recipients = new Map<string, TaskCommentNotificationType>();

  for (const userId of [input.assigneeId, input.creatorId]) {
    if (userId && userId !== input.actorId) recipients.set(userId, 'task_comment');
  }

  for (const userId of input.mentionedUserIds) {
    if (userId && userId !== input.actorId) recipients.set(userId, 'task_mention');
  }

  return [...recipients].map(([userId, type]) => ({ userId, type }));
};
