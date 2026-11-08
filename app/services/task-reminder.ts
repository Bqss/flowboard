import { and, eq, inArray, isNotNull, isNull, lte, lt, gt } from 'drizzle-orm';
import { db, taskBoards, taskColumns, tasks, users, workspaces, type NotificationType } from '@db';
import { env } from '@config/env';
import { sendEmail } from './email';
import {
  renderTaskDueReminderEmail,
  renderTaskOverdueEmail,
  formatTimeRemaining,
  formatOverdueDuration
} from '../resources/notifications/renderer';
import { isWithinTaskReminderWindow } from './task-reminder-policy';
import { createNotification } from './notification';

type UserSummary = {
  id: string;
  name: string;
  email: string;
};

/**
 * Loads user summaries for an array of user IDs.
 */
const loadUsersMap = async (userIds: string[]): Promise<Map<string, UserSummary>> => {
  const map = new Map<string, UserSummary>();
  if (userIds.length === 0) return map;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email
    })
    .from(users)
    .where(inArray(users.id, userIds));

  for (const user of rows) {
    map.set(user.id, user);
  }
  return map;
};

/**
 * Resolves deduplicated list of recipients (creator and assignee).
 * If creator and assignee are the same user, only one email is sent.
 */
const resolveTaskRecipients = (
  createdById: string | null,
  assigneeId: string | null,
  userMap: Map<string, UserSummary>
): UserSummary[] => {
  const recipients: UserSummary[] = [];
  const seenEmails = new Set<string>();

  const candidates = [
    assigneeId ? userMap.get(assigneeId) : null,
    createdById ? userMap.get(createdById) : null
  ].filter(Boolean) as UserSummary[];

  for (const candidate of candidates) {
    if (candidate.email && !seenEmails.has(candidate.email.toLowerCase())) {
      seenEmails.add(candidate.email.toLowerCase());
      recipients.push(candidate);
    }
  }

  return recipients;
};

const createTaskDeadlineNotifications = async (input: {
  workspaceId: string;
  boardId: string;
  task: { id: string; title: string; createdById: string | null; assigneeId: string | null };
  type: Extract<NotificationType, 'task_due_soon' | 'task_overdue'>;
  title: string;
  body: string;
}) => {
  const recipients = [...new Set(
    [input.task.assigneeId, input.task.createdById].filter(
      (userId): userId is string => Boolean(userId)
    )
  )];

  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        workspaceId: input.workspaceId,
        userId,
        boardId: input.boardId,
        taskId: input.task.id,
        type: input.type,
        title: input.title,
        body: input.body
      }).catch((error) => {
        console.error(`[task-reminder] failed to create ${input.type} notification for ${userId}:`, error);
      })
    )
  );
};

/**
 * Process tasks approaching deadlines and notify creators and assignees.
 * Creates in-app/browser-push alerts and sends the existing reminder emails.
 */
export const processTaskDueSoonReminders = async (): Promise<number> => {
  const now = new Date();

  // Find tasks with dueAt in the future, not yet notified for due soon, and not completed.
  const candidateTasks = await db
    .select({
      task: tasks,
      board: taskBoards,
      column: taskColumns,
      workspaceName: workspaces.name
    })
    .from(tasks)
    .innerJoin(taskBoards, eq(tasks.boardId, taskBoards.id))
    .innerJoin(taskColumns, eq(tasks.columnId, taskColumns.id))
    .innerJoin(workspaces, eq(taskBoards.workspaceId, workspaces.id))
    .where(
      and(
        isNotNull(tasks.dueAt),
        isNull(tasks.dueSoonNotifiedAt),
        isNull(tasks.completedAt),
        gt(tasks.dueAt, now)
      )
    );

  // Filter tasks within their board's reminder window (default 2h)
  const dueSoonTasks = candidateTasks.filter((row) => {
    if (!row.task.dueAt) return false;
    return isWithinTaskReminderWindow(row.task.dueAt, now, row.board.reminderBeforeHours);
  });

  if (dueSoonTasks.length === 0) return 0;

  // Batch load all relevant users (creators and assignees)
  const userIds = [
    ...new Set(
      dueSoonTasks
        .flatMap((row) => [row.task.createdById, row.task.assigneeId])
        .filter(Boolean) as string[]
    )
  ];
  const userMap = await loadUsersMap(userIds);

  let notifiedCount = 0;

  for (const row of dueSoonTasks) {
    const { task, board, column, workspaceName } = row;
    const recipients = resolveTaskRecipients(task.createdById, task.assigneeId, userMap);
    const timeRemaining = formatTimeRemaining(task.dueAt!, now);
    await createTaskDeadlineNotifications({
      workspaceId: board.workspaceId,
      boardId: board.id,
      task,
      type: 'task_due_soon',
      title: 'Task deadline approaching',
      body: `Task “${task.title}” is due ${timeRemaining}.`
    });

    if (recipients.length === 0) {
      // Mark as notified anyway to avoid infinite retries when no recipients exist
      await db
        .update(tasks)
        .set({ dueSoonNotifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(tasks.id, task.id));
      continue;
    }

    const creator = task.createdById ? userMap.get(task.createdById) : null;
    const assignee = task.assigneeId ? userMap.get(task.assigneeId) : null;

    const taskUrl = `${env.appUrl}/dashboard/boards/${board.id}?workspaceId=${board.workspaceId}&task=${task.id}`;

    for (const recipient of recipients) {
      const emailContent = renderTaskDueReminderEmail({
        recipientName: recipient.name,
        taskTitle: task.title,
        taskDescription: task.description,
        boardName: board.name,
        columnName: column.name,
        priority: task.priority,
        dueAt: task.dueAt!,
        timeRemaining,
        creatorName: creator?.name || 'Sistem',
        assigneeName: assignee?.name || 'Belum ditugaskan',
        taskUrl,
        workspaceName,
        appUrl: env.appUrl,
        notificationSettingsUrl: `${env.appUrl}/dashboard/settings/notifications`
      });

      await sendEmail({
        to: recipient.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      }).catch((err) => {
        console.error(`[task-reminder] failed to send due reminder to ${recipient.email}:`, err);
      });
    }

    await db
      .update(tasks)
      .set({ dueSoonNotifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, task.id));

    notifiedCount += 1;
  }

  return notifiedCount;
};

/**
 * Process overdue tasks and send a one-time overdue alert email.
 * Sent to both creator and assignee.
 */
export const processTaskOverdueReminders = async (): Promise<number> => {
  const now = new Date();

  // Find tasks that have passed dueAt, not completed, and not yet notified for overdue.
  const overdueTasks = await db
    .select({
      task: tasks,
      board: taskBoards,
      column: taskColumns,
      workspaceName: workspaces.name
    })
    .from(tasks)
    .innerJoin(taskBoards, eq(tasks.boardId, taskBoards.id))
    .innerJoin(taskColumns, eq(tasks.columnId, taskColumns.id))
    .innerJoin(workspaces, eq(taskBoards.workspaceId, workspaces.id))
    .where(
      and(
        isNotNull(tasks.dueAt),
        isNull(tasks.overdueNotifiedAt),
        isNull(tasks.completedAt),
        lt(tasks.dueAt, now)
      )
    );

  if (overdueTasks.length === 0) return 0;

  // Batch load all relevant users
  const userIds = [
    ...new Set(
      overdueTasks
        .flatMap((row) => [row.task.createdById, row.task.assigneeId])
        .filter(Boolean) as string[]
    )
  ];
  const userMap = await loadUsersMap(userIds);

  let notifiedCount = 0;

  for (const row of overdueTasks) {
    const { task, board, column, workspaceName } = row;
    const recipients = resolveTaskRecipients(task.createdById, task.assigneeId, userMap);
    const overdueDuration = formatOverdueDuration(task.dueAt!, now);
    await createTaskDeadlineNotifications({
      workspaceId: board.workspaceId,
      boardId: board.id,
      task,
      type: 'task_overdue',
      title: 'Task is overdue',
      body: `Task “${task.title}” is overdue by ${overdueDuration}.`
    });

    if (recipients.length === 0) {
      await db
        .update(tasks)
        .set({ overdueNotifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(tasks.id, task.id));
      continue;
    }

    const creator = task.createdById ? userMap.get(task.createdById) : null;
    const assignee = task.assigneeId ? userMap.get(task.assigneeId) : null;

    const taskUrl = `${env.appUrl}/dashboard/boards/${board.id}?workspaceId=${board.workspaceId}&task=${task.id}`;

    for (const recipient of recipients) {
      const emailContent = renderTaskOverdueEmail({
        recipientName: recipient.name,
        taskTitle: task.title,
        taskDescription: task.description,
        boardName: board.name,
        columnName: column.name,
        priority: task.priority,
        dueAt: task.dueAt!,
        overdueDuration,
        creatorName: creator?.name || 'Sistem',
        assigneeName: assignee?.name || 'Belum ditugaskan',
        taskUrl,
        workspaceName,
        appUrl: env.appUrl,
        notificationSettingsUrl: `${env.appUrl}/dashboard/settings/notifications`
      });

      await sendEmail({
        to: recipient.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      }).catch((err) => {
        console.error(`[task-reminder] failed to send overdue alert to ${recipient.email}:`, err);
      });
    }

    // Set overdueNotifiedAt so this notification is only sent ONCE!
    await db
      .update(tasks)
      .set({ overdueNotifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, task.id));

    notifiedCount += 1;
  }

  return notifiedCount;
};
