import { mkdir, unlink } from 'node:fs/promises';
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import {
  db,
  chatConversations,
  taskActivities,
  taskAttachments,
  taskLabels,
  taskBoards,
  taskColumns,
  taskComments,
  tasks,
  users,
  workspaceMemberGroupMembers,
  type TaskBoard,
  type TaskPriority,
  type TaskRecurrence
} from '@db';
import { createScopedChatConversation } from './workspace';

export class TaskBoardError extends Error {
  constructor(
    message: string,
    public code: 'not_found' | 'forbidden' | 'too_large' | 'validation' = 'validation'
  ) {
    super(message);
    this.name = 'TaskBoardError';
  }
}

const DEFAULT_COLUMNS: { name: string; color: string }[] = [
  { name: 'To Do', color: 'indigo' },
  { name: 'In Progress', color: 'amber' },
  { name: 'Done', color: 'emerald' }
];

const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50 MB

export const listTaskLabels = async (workspaceId: string) =>
  db.select().from(taskLabels).where(eq(taskLabels.workspaceId, workspaceId)).orderBy(asc(taskLabels.name));

export const createTaskLabel = async (
  workspaceId: string,
  input: { name: string; color?: string }
) => {
  const name = input.name.trim();
  if (!name) throw new TaskBoardError('Label name is required.');
  const [label] = await db
    .insert(taskLabels)
    .values({ workspaceId, name, color: input.color?.trim() || 'indigo' })
    .returning();
  return label;
};

export const updateTaskLabel = async (
  workspaceId: string,
  labelId: string,
  input: { name?: string; color?: string }
) => {
  const [current] = await db
    .select()
    .from(taskLabels)
    .where(and(eq(taskLabels.id, labelId), eq(taskLabels.workspaceId, workspaceId)))
    .limit(1);
  if (!current) throw new TaskBoardError('Label not found.', 'not_found');

  const nextName = input.name?.trim() || current.name;
  const [updated] = await db
    .update(taskLabels)
    .set({
      name: nextName,
      ...(input.color !== undefined ? { color: input.color.trim() || 'indigo' } : {}),
      updatedAt: new Date()
    })
    .where(eq(taskLabels.id, labelId))
    .returning();

  if (nextName !== current.name) {
    const affectedTasks = await db
      .select({ id: tasks.id, labels: tasks.labels })
      .from(tasks)
      .innerJoin(taskBoards, eq(tasks.boardId, taskBoards.id))
      .where(eq(taskBoards.workspaceId, workspaceId));
    for (const task of affectedTasks) {
      if ((task.labels ?? []).includes(current.name)) {
        await db
          .update(tasks)
          .set({
            labels: [...new Set((task.labels ?? []).map((label) => (label === current.name ? nextName : label)))],
            updatedAt: new Date()
          })
          .where(eq(tasks.id, task.id));
      }
    }
  }

  return updated;
};

export const deleteTaskLabel = async (workspaceId: string, labelId: string) => {
  const [label] = await db
    .select()
    .from(taskLabels)
    .where(and(eq(taskLabels.id, labelId), eq(taskLabels.workspaceId, workspaceId)))
    .limit(1);
  if (!label) throw new TaskBoardError('Label not found.', 'not_found');
  const [deleted] = await db.delete(taskLabels).where(eq(taskLabels.id, labelId)).returning();
  if (deleted) {
    const affectedTasks = await db
      .select({ id: tasks.id, labels: tasks.labels })
      .from(tasks)
      .innerJoin(taskBoards, eq(tasks.boardId, taskBoards.id))
      .where(eq(taskBoards.workspaceId, workspaceId));
    for (const task of affectedTasks) {
      if ((task.labels ?? []).includes(label.name)) {
        await db
          .update(tasks)
          .set({
            labels: (task.labels ?? []).filter((value) => value !== label.name),
            updatedAt: new Date()
          })
          .where(eq(tasks.id, task.id));
      }
    }
  }
  return deleted ?? null;
};

export const getBoardInWorkspace = async (workspaceId: string, boardId: string) => {
  const [row] = await db
    .select()
    .from(taskBoards)
    .where(and(eq(taskBoards.id, boardId), eq(taskBoards.workspaceId, workspaceId)))
    .limit(1);

  return row ?? null;
};

export const canManageBoard = (
  membershipRole: 'owner' | 'member',
  userId: string,
  board: Pick<TaskBoard, 'ownerId'>
) => membershipRole === 'owner' || board.ownerId === userId;

export type TaskBoardActor = { userId: string; role: 'owner' | 'member' };

const isBoardViewer = async (
  board: Pick<TaskBoard, 'workspaceId' | 'ownerId' | 'workspaceMemberGroupId'>,
  actor: TaskBoardActor
) => {
  if (actor.role === 'owner' || board.ownerId === actor.userId || !board.workspaceMemberGroupId) return true;

  const [membership] = await db
    .select({ id: workspaceMemberGroupMembers.id })
    .from(workspaceMemberGroupMembers)
    .where(
      and(
        eq(workspaceMemberGroupMembers.groupId, board.workspaceMemberGroupId),
        eq(workspaceMemberGroupMembers.userId, actor.userId)
      )
    )
    .limit(1);

  return Boolean(membership);
};

const logActivity = async (input: {
  boardId: string;
  eventType: string;
  description: string;
  actorId?: string | null;
  taskId?: string | null;
  meta?: Record<string, unknown> | null;
}) => {
  await db.insert(taskActivities).values({
    boardId: input.boardId,
    eventType: input.eventType,
    description: input.description,
    actorId: input.actorId ?? null,
    taskId: input.taskId ?? null,
    meta: input.meta ?? null
  });
};

const ensureAssigneeExists = async (assigneeId: string) => {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, assigneeId))
    .limit(1);
  if (!row) throw new TaskBoardError('Assignee not found.', 'not_found');
};

const parseDueAt = (dueAt: string): Date => {
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) throw new TaskBoardError('Invalid due date.');
  return parsed;
};
const normalizeRecurrenceDays = (days: number[] | undefined) =>
  [...new Set((days ?? []).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort(
    (a, b) => a - b
  );

const nextRecurringDate = (base: Date, recurrence: TaskRecurrence, recurrenceDays: number[]) => {
  const next = new Date(base);
  if (recurrence === 'daily') {
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }
  if (recurrence !== 'weekly') return next;

  const days = normalizeRecurrenceDays(recurrenceDays);
  const currentDay = next.getUTCDay();
  const delta = Math.min(
    ...days.map((day) => (day - currentDay + 7) % 7).filter((value) => value > 0),
    7
  );
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
};

export const listBoards = async (
  workspaceId: string,
  actor?: TaskBoardActor
) => {
  const rows = await db
    .select({
      id: taskBoards.id,
      name: taskBoards.name,
      description: taskBoards.description,
      workspaceMemberGroupId: taskBoards.workspaceMemberGroupId,
      ownerId: taskBoards.ownerId,
      createdAt: taskBoards.createdAt,
      updatedAt: taskBoards.updatedAt,
      workspaceId: taskBoards.workspaceId,
      ownerName: users.name
    })
    .from(taskBoards)
    .innerJoin(users, eq(taskBoards.ownerId, users.id))
    .where(eq(taskBoards.workspaceId, workspaceId))
    .orderBy(asc(taskBoards.name));

  const visibleRows = actor
    ? (await Promise.all(
        rows.map(async (row) => ((await isBoardViewer(row, actor)) ? row : null))
      )).filter((row): row is (typeof rows)[number] => row !== null)
    : rows;
  const boardIds = visibleRows.map((row) => row.id);
  const counts =
    boardIds.length === 0
      ? []
      : await db
        .select({ boardId: tasks.boardId, value: count() })
        .from(tasks)
        .where(inArray(tasks.boardId, boardIds))
        .groupBy(tasks.boardId);

  const countByBoard = new Map(counts.map((row) => [row.boardId, Number(row.value)]));
  return visibleRows.map((row) => ({
    ...row,
    taskCount: countByBoard.get(row.id) ?? 0
  }));
};

export const createBoard = async (
  workspaceId: string,
  input: {
    name: string;
    description?: string | null;
    ownerId: string;
    workspaceMemberGroupId?: string | null;
  }
) => {
  const [board] = await db
    .insert(taskBoards)
    .values({
      workspaceId,
      workspaceMemberGroupId: input.workspaceMemberGroupId ?? null,
      name: input.name.trim(),
      description: input.description ?? null,
      ownerId: input.ownerId
    })
    .returning();
  await createScopedChatConversation({
    workspaceId,
    createdById: input.ownerId,
    contextType: 'taskboard',
    contextId: board.id,
    groupId: input.workspaceMemberGroupId,
    name: board.name
  });

  const columns = await db
    .insert(taskColumns)
    .values(
      DEFAULT_COLUMNS.map((column, index) => ({
        boardId: board.id,
        name: column.name,
        color: column.color,
        position: index
      }))
    )
    .returning();

  await logActivity({
    boardId: board.id,
    eventType: 'board.created',
    description: `Board "${board.name}" created`,
    actorId: input.ownerId
  });

  return { board, columns };
};

export const updateBoard = async (
  boardId: string,
  input: { name?: string; description?: string | null; workspaceMemberGroupId?: string | null }
) => {
  const [board] = await db
    .update(taskBoards)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.workspaceMemberGroupId !== undefined
        ? { workspaceMemberGroupId: input.workspaceMemberGroupId }
        : {}),
      updatedAt: new Date()
    })
    .where(eq(taskBoards.id, boardId))
    .returning();

  if (board && (input.name !== undefined || input.workspaceMemberGroupId !== undefined)) {
    await db
      .update(chatConversations)
      .set({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.workspaceMemberGroupId !== undefined ? { groupId: input.workspaceMemberGroupId } : {}),
        updatedAt: new Date()
      })
      .where(and(eq(chatConversations.contextType, 'taskboard'), eq(chatConversations.contextId, boardId)));
  }

  return board ?? null;
};


const unlinkAttachmentFiles = async (paths: string[]) => {
  await Promise.all(
    paths.map(async (path) => {
      try {
        await unlink(`static${path}`);
      } catch {
        // Best-effort cleanup: the DB row is the source of truth.
      }
    })
  );
};

export const deleteBoard = async (boardId: string) => {
  const files = await db
    .select({ filePath: taskAttachments.filePath })
    .from(taskAttachments)
    .where(eq(taskAttachments.boardId, boardId));
  const [deleted] = await db.delete(taskBoards).where(eq(taskBoards.id, boardId)).returning();
  if (deleted) await unlinkAttachmentFiles(files.map((file) => file.filePath));
  return deleted ?? null;
};

export const listColumns = async (boardId: string) =>
  db
    .select()
    .from(taskColumns)
    .where(eq(taskColumns.boardId, boardId))
    .orderBy(asc(taskColumns.position), asc(taskColumns.createdAt));

export const getColumnInBoard = async (boardId: string, columnId: string) => {
  const [row] = await db
    .select()
    .from(taskColumns)
    .where(and(eq(taskColumns.id, columnId), eq(taskColumns.boardId, boardId)))
    .limit(1);

  return row ?? null;
};

export const createColumn = async (
  boardId: string,
  input: { name: string; color?: string },
  actor?: { userId: string }
) => {
  const existing = await listColumns(boardId);

  const [column] = await db
    .insert(taskColumns)
    .values({
      boardId,
      name: input.name.trim(),
      color: input.color?.trim() || 'indigo',
      position: existing.length
    })
    .returning();

  await logActivity({
    boardId,
    eventType: 'column.created',
    description: `Column "${column.name}" created`,
    actorId: actor?.userId ?? null
  });

  return column;
};

export const updateColumn = async (columnId: string, input: { name?: string; color?: string }) => {
  const [column] = await db
    .update(taskColumns)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.color !== undefined ? { color: input.color.trim() || 'indigo' } : {}),
      updatedAt: new Date()
    })
    .where(eq(taskColumns.id, columnId))
    .returning();

  return column ?? null;
};

export const deleteColumn = async (boardId: string, columnId: string, actor?: { userId: string }) => {
  const columns = await listColumns(boardId);
  if (columns.length <= 1) {
    throw new TaskBoardError('Board must have at least one column.');
  }

  const index = columns.findIndex((column) => column.id === columnId);
  if (index < 0) throw new TaskBoardError('Column not found.', 'not_found');

  const target = columns[index];
  const neighbor = columns[index - 1] ?? columns[index + 1];
  if (!neighbor) throw new TaskBoardError('Board must have at least one column.');

  const movedTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.columnId, target.id))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  if (movedTasks.length > 0) {
    const [last] = await db
      .select({ position: tasks.position })
      .from(tasks)
      .where(eq(tasks.columnId, neighbor.id))
      .orderBy(desc(tasks.position))
      .limit(1);
    const start = (last?.position ?? -1) + 1;

    for (let i = 0; i < movedTasks.length; i++) {
      await db
        .update(tasks)
        .set({ columnId: neighbor.id, position: start + i, updatedAt: new Date() })
        .where(eq(tasks.id, movedTasks[i].id));
    }
  }

  const [deleted] = await db.delete(taskColumns).where(eq(taskColumns.id, target.id)).returning();
  if (!deleted) return null;

  const remaining = columns.filter((column) => column.id !== target.id);
  for (let i = 0; i < remaining.length; i++) {
    await db
      .update(taskColumns)
      .set({ position: i, updatedAt: new Date() })
      .where(eq(taskColumns.id, remaining[i].id));
  }

  await logActivity({
    boardId,
    eventType: 'column.deleted',
    description:
      movedTasks.length > 0
        ? `Column "${target.name}" deleted; ${movedTasks.length} task(s) moved to "${neighbor.name}"`
        : `Column "${target.name}" deleted`,
    actorId: actor?.userId ?? null
  });

  return deleted;
};

export const reorderColumns = async (boardId: string, orderedColumnIds: string[]) => {
  const columns = await listColumns(boardId);
  const existingIds = new Set(columns.map((column) => column.id));
  if (
    orderedColumnIds.length !== columns.length ||
    !orderedColumnIds.every((id) => existingIds.has(id))
  ) {
    throw new TaskBoardError('Column list is not valid for this board.');
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedColumnIds.length; i++) {
      await tx
        .update(taskColumns)
        .set({ position: -(i + 1000) })
        .where(eq(taskColumns.id, orderedColumnIds[i]));
    }
    for (let i = 0; i < orderedColumnIds.length; i++) {
      await tx
        .update(taskColumns)
        .set({ position: i, updatedAt: new Date() })
        .where(eq(taskColumns.id, orderedColumnIds[i]));
    }
  });
};

export const getTaskInBoard = async (boardId: string, taskId: string, actor?: TaskBoardActor) => {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId)))
    .limit(1);

  if (!row || !actor) return row ?? null;
  const [board] = await db
    .select()
    .from(taskBoards)
    .where(eq(taskBoards.id, boardId))
    .limit(1);
  if (!board || !(await isBoardViewer(board, actor))) return null;
  return row;
};

export const createTask = async (
  boardId: string,
  input: {
    columnId?: string;
    title: string;
    description?: string | null;
    priority?: TaskPriority;
    labels?: string[];
    assigneeId?: string | null;
    startAt?: string | null;
    dueAt?: string | null;
    recurrence?: TaskRecurrence;
    recurrenceDays?: number[];
  },
  actor?: { userId: string }
) => {
  const columns = await listColumns(boardId);
  if (columns.length === 0) throw new TaskBoardError('Board has no columns.');

  const target = input.columnId
    ? (columns.find((column) => column.id === input.columnId) ?? null)
    : columns[0];
  if (!target) throw new TaskBoardError('Column not found.', 'not_found');
  if (input.assigneeId) await ensureAssigneeExists(input.assigneeId);


  const [last] = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(eq(tasks.columnId, target.id))
    .orderBy(desc(tasks.position))
    .limit(1);
  const position = (last?.position ?? -1) + 1;

  const [task] = await db
    .insert(tasks)
    .values({
      boardId,
      columnId: target.id,
      title: input.title.trim(),
      description: input.description ?? null,
      priority: input.priority ?? 'medium',
      labels: input.labels ? [...new Set(input.labels.map((l) => l.trim()).filter(Boolean))] : [],
      assigneeId: input.assigneeId ?? null,
      startAt: input.startAt ? parseDueAt(input.startAt) : null,
      dueAt: input.dueAt ? parseDueAt(input.dueAt) : null,
      recurrence: input.recurrence ?? 'never',
      recurrenceDays: input.recurrence === 'weekly' ? normalizeRecurrenceDays(input.recurrenceDays) : [],
      position,
      createdById: actor?.userId ?? null
    })
    .returning();

  await logActivity({
    boardId,
    eventType: 'task.created',
    description: `Task "${task.title}" created in "${target.name}"`,
    actorId: actor?.userId ?? null,
    taskId: task.id
  });

  return task;
};
export const getTaskBoardView = async (boardId: string, actor?: TaskBoardActor) => {
  const columns = await listColumns(boardId);

  const boardTasks = await db
    .select({ task: tasks, assigneeName: users.name })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.boardId, boardId))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  let visibleBoardTasks = boardTasks;
  if (actor) {
    const [board] = await db
      .select()
      .from(taskBoards)
      .where(eq(taskBoards.id, boardId))
      .limit(1);
    if (!board) visibleBoardTasks = [];
    else if (!(await isBoardViewer(board, actor))) visibleBoardTasks = [];
  }

  const taskIds = visibleBoardTasks.map((row) => row.task.id);
  const counts =
    taskIds.length === 0
      ? []
      : await db
        .select({ taskId: taskComments.taskId, value: count() })
        .from(taskComments)
        .where(inArray(taskComments.taskId, taskIds))
        .groupBy(taskComments.taskId);

  const countByTask = new Map(counts.map((row) => [row.taskId, Number(row.value)]));

  const attachmentCounts =
    taskIds.length === 0
      ? []
      : await db
        .select({ taskId: taskAttachments.taskId, value: count() })
        .from(taskAttachments)
        .where(inArray(taskAttachments.taskId, taskIds))
        .groupBy(taskAttachments.taskId);

  const attachmentCountByTask = new Map(attachmentCounts.map((row) => [row.taskId, Number(row.value)]));

  return {
    columns: columns.map((column) => ({
      id: column.id,
      name: column.name,
      color: column.color,
      position: column.position,
      tasks: visibleBoardTasks
        .filter((row) => row.task.columnId === column.id)
        .map((row) => ({
          id: row.task.id,
          title: row.task.title,
          description: row.task.description,
          priority: row.task.priority,
          labels: row.task.labels ?? [],
          startAt: row.task.startAt,
          dueAt: row.task.dueAt,
          recurrence: row.task.recurrence,
          recurrenceDays: row.task.recurrenceDays ?? [],
          assigneeId: row.task.assigneeId,
          assigneeName: row.assigneeName,
          position: row.task.position,
          createdById: row.task.createdById,
          commentCount: countByTask.get(row.task.id) ?? 0,
          attachmentCount: attachmentCountByTask.get(row.task.id) ?? 0,
          completedAt: row.task.completedAt,
          createdAt: row.task.createdAt
        }))
    }))
  };
};

export const getTaskDetail = async (
  boardId: string,
  taskId: string,
  actor?: TaskBoardActor,
  commentLimit?: number
) => {
  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) return null;

  const [assignee] = task.assigneeId
    ? await db.select({ name: users.name }).from(users).where(eq(users.id, task.assigneeId)).limit(1)
    : [];

  const comments = await listTaskComments(boardId, taskId, actor, commentLimit);
  if (!comments) return null;

  const attachments = await listTaskAttachments(boardId, taskId, actor);
  if (!attachments) return null;

  return {
    id: task.id,
    boardId: task.boardId,
    columnId: task.columnId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    labels: task.labels ?? [],
    startAt: task.startAt,
    dueAt: task.dueAt,
    recurrence: task.recurrence,
    recurrenceDays: task.recurrenceDays ?? [],
    assigneeId: task.assigneeId,
    assigneeName: assignee?.name ?? null,
    position: task.position,
    createdById: task.createdById,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    comments,
    attachments
  };
};
export const updateTask = async (
  boardId: string,
  taskId: string,
  input: {
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    labels?: string[];
    assigneeId?: string | null;
    startAt?: string | null;
    dueAt?: string | null;
    recurrence?: TaskRecurrence;
    recurrenceDays?: number[];
  },
  actor?: TaskBoardActor
) => {
  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) throw new TaskBoardError('Task not found.', 'not_found');

  if (input.assigneeId) await ensureAssigneeExists(input.assigneeId);

  const [updated] = await db
    .update(tasks)
    .set({
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.labels !== undefined ? { labels: [...new Set(input.labels.map((l) => l.trim()).filter(Boolean))] } : {}),
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
      ...(input.startAt !== undefined ? { startAt: input.startAt ? parseDueAt(input.startAt) : null } : {}),
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? parseDueAt(input.dueAt) : null } : {}),
      ...(input.recurrence !== undefined ? { recurrence: input.recurrence } : {}),
      ...(input.recurrenceDays !== undefined
        ? { recurrenceDays: input.recurrence === 'weekly' ? normalizeRecurrenceDays(input.recurrenceDays) : [] }
        : {}),
    })
    .where(eq(tasks.id, taskId))
    .returning();

  if (updated) {
    await logActivity({
      boardId,
      eventType: 'task.updated',
      description: `Task "${updated.title}" updated`,
      actorId: actor?.userId ?? null,
      taskId: updated.id
    });
  }

  return updated ?? null;
};

export const completeTask = async (
  boardId: string,
  taskId: string,
  completed: boolean,
  actor: TaskBoardActor
) => {
  const [board] = await db.select().from(taskBoards).where(eq(taskBoards.id, boardId)).limit(1);
  if (!board) throw new TaskBoardError('Board not found.', 'not_found');

  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) throw new TaskBoardError('Task not found.', 'not_found');

  const isManager = canManageBoard(actor.role, actor.userId, board);
  if (!isManager && task.assigneeId !== actor.userId && task.createdById !== actor.userId) {
    throw new TaskBoardError('Only the PIC, task creator, or board manager can complete this task.', 'forbidden');
  }

  let completedAt = completed ? new Date() : null;
  let startAt = task.startAt;
  let dueAt = task.dueAt;
  const recurrence = task.recurrence ?? 'never';

  if (completed && recurrence !== 'never') {
    const baseDate = dueAt ?? startAt;
    if (baseDate) {
      const nextDate = nextRecurringDate(baseDate, recurrence, task.recurrenceDays ?? []);
      const dueShift = dueAt ? nextDate.getTime() - dueAt.getTime() : 0;
      dueAt = dueAt ? nextDate : null;
      startAt = startAt
        ? new Date(startAt.getTime() + (dueAt ? dueShift : nextDate.getTime() - startAt.getTime()))
        : nextDate;
    }
    completedAt = null;
  }

  const [updated] = await db
    .update(tasks)
    .set({ completedAt, startAt, dueAt, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();

  if (updated) {
    await logActivity({
      boardId,
      eventType: completed ? (recurrence === 'never' ? 'task.completed' : 'task.recurring') : 'task.reopened',
      description:
        completed && recurrence !== 'never'
          ? `Task "${updated.title}" recurring cycle completed`
          : completed
            ? `Task "${updated.title}" completed`
            : `Task "${updated.title}" reopened`,
      actorId: actor.userId,
      taskId: updated.id
    });
  }

  return updated ?? null;
};

export const deleteTask = async (
  boardId: string,
  taskId: string,
  actor: { userId: string; role: 'owner' | 'member' }
) => {
  const [board] = await db.select().from(taskBoards).where(eq(taskBoards.id, boardId)).limit(1);
  if (!board) throw new TaskBoardError('Board not found.', 'not_found');

  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) throw new TaskBoardError('Task not found.', 'not_found');

  const isManager = canManageBoard(actor.role, actor.userId, board);
  if (!isManager && task.createdById !== actor.userId) {
    throw new TaskBoardError('Only the board manager or task creator can delete this task.', 'forbidden');
  }
  const files = await db
    .select({ filePath: taskAttachments.filePath })
    .from(taskAttachments)
    .where(eq(taskAttachments.taskId, taskId));

  const [deleted] = await db.delete(tasks).where(eq(tasks.id, taskId)).returning();
  if (!deleted) return null;
  await unlinkAttachmentFiles(files.map((file) => file.filePath));

  await logActivity({
    boardId,
    eventType: 'task.deleted',
    description: `Task "${deleted.title}" deleted`,
    actorId: actor.userId,
    taskId: null
  });

  return deleted;
};

export const moveTask = async (
  boardId: string,
  taskId: string,
  input: { columnId: string; position?: number },
  actor?: TaskBoardActor
) => {
  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) throw new TaskBoardError('Task not found.', 'not_found');

  const columns = await listColumns(boardId);
  const source = columns.find((column) => column.id === task.columnId) ?? null;
  const target = columns.find((column) => column.id === input.columnId) ?? null;
  if (!source || !target) throw new TaskBoardError('Column not found.', 'not_found');

  if (source.id === target.id) {
    const siblings = await db
      .select()
      .from(tasks)
      .where(eq(tasks.columnId, source.id))
      .orderBy(asc(tasks.position), asc(tasks.createdAt));

    const ordered = siblings.filter((row) => row.id !== task.id);
    const position = Math.min(input.position ?? ordered.length, ordered.length);
    ordered.splice(position, 0, task);

    for (let i = 0; i < ordered.length; i++) {
      await db
        .update(tasks)
        .set({ position: i, updatedAt: new Date() })
        .where(eq(tasks.id, ordered[i].id));
    }

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    return updated ?? task;
  }

  const sourceTasks = (
    await db
      .select()
      .from(tasks)
      .where(eq(tasks.columnId, source.id))
      .orderBy(asc(tasks.position), asc(tasks.createdAt))
  ).filter((row) => row.id !== task.id);

  const targetTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.columnId, target.id))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  const position = Math.min(input.position ?? targetTasks.length, targetTasks.length);
  targetTasks.splice(position, 0, { ...task, columnId: target.id });

  const maxPosition = columns.reduce((max, column) => Math.max(max, column.position), 0);
  const targetIsLast = target.position === maxPosition;
  const sourceIsLast = source.position === maxPosition;

  let completedAt = task.completedAt;
  if (targetIsLast && !sourceIsLast && completedAt === null) {
    completedAt = new Date();
  } else if (sourceIsLast && !targetIsLast && completedAt !== null) {
    completedAt = null;
  }

  await db
    .update(tasks)
    .set({ columnId: target.id, position, completedAt, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  for (let i = 0; i < sourceTasks.length; i++) {
    await db
      .update(tasks)
      .set({ position: i, updatedAt: new Date() })
      .where(eq(tasks.id, sourceTasks[i].id));
  }
  for (let i = 0; i < targetTasks.length; i++) {
    if (targetTasks[i].id === taskId) continue;
    const finalPosition = i < position ? i : i + 1;
    await db
      .update(tasks)
      .set({ position: finalPosition, updatedAt: new Date() })
      .where(eq(tasks.id, targetTasks[i].id));
  }

  await logActivity({
    boardId,
    eventType: 'task.moved',
    description: `Task "${task.title}" moved from "${source.name}" to "${target.name}"`,
    actorId: actor?.userId ?? null,
    taskId,
    meta: { from: source.name, to: target.name }
  });

  if (targetIsLast && !sourceIsLast && task.completedAt === null) {
    await logActivity({
      boardId,
      eventType: 'task.completed',
      description: `Task "${task.title}" completed`,
      actorId: actor?.userId ?? null,
      taskId
    });
  } else if (sourceIsLast && !targetIsLast && task.completedAt !== null) {
    await logActivity({
      boardId,
      eventType: 'task.reopened',
      description: `Task "${task.title}" reopened`,
      actorId: actor?.userId ?? null,
      taskId
    });
  }

  const [updated] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return updated ?? task;
};

export const listTaskComments = async (
  boardId: string,
  taskId: string,
  actor?: TaskBoardActor,
  limit?: number
) => {
  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) return null;

  const selectComments = db
    .select({ comment: taskComments, authorName: users.name })
    .from(taskComments)
    .leftJoin(users, eq(taskComments.userId, users.id))
    .where(eq(taskComments.taskId, taskId));
  const rows =
    limit === undefined
      ? await selectComments.orderBy(asc(taskComments.createdAt))
      : await selectComments
          .orderBy(desc(taskComments.createdAt))
          .limit(Math.min(Math.max(limit, 1), 100));

  return (limit === undefined ? rows : [...rows].reverse()).map((row) => ({
    id: row.comment.id,
    content: row.comment.content,
    authorId: row.comment.userId,
    authorName: row.authorName,
    createdAt: row.comment.createdAt
  }));
};

export const createTaskComment = async (
  boardId: string,
  taskId: string,
  input: { content: string },
  actor: TaskBoardActor
) => {
  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) throw new TaskBoardError('Task not found.', 'not_found');

  const content = input.content.trim();
  if (!content) throw new TaskBoardError('Comment must not be empty.');

  const [comment] = await db
    .insert(taskComments)
    .values({ taskId, userId: actor.userId, content })
    .returning();

  const [author] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, actor.userId))
    .limit(1);

  await logActivity({
    boardId,
    eventType: 'comment.added',
    description: `Comment added on task "${task.title}"`,
    actorId: actor.userId,
    taskId
  });

  return {
    id: comment.id,
    content: comment.content,
    authorId: comment.userId,
    authorName: author?.name ?? null,
    createdAt: comment.createdAt
  };
};
export const updateTaskComment = async (
  boardId: string,
  taskId: string,
  commentId: string,
  input: { content: string },
  actor: TaskBoardActor
) => {
  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) throw new TaskBoardError('Task not found.', 'not_found');

  const [comment] = await db
    .select()
    .from(taskComments)
    .where(and(eq(taskComments.id, commentId), eq(taskComments.taskId, taskId)))
    .limit(1);
  if (!comment) throw new TaskBoardError('Comment not found.', 'not_found');

  const [board] = await db.select().from(taskBoards).where(eq(taskBoards.id, boardId)).limit(1);
  if (!board) throw new TaskBoardError('Board not found.', 'not_found');

  const isManager = canManageBoard(actor.role, actor.userId, board);
  if (!isManager && comment.userId !== actor.userId) {
    throw new TaskBoardError('Only the comment author or board manager can edit this comment.', 'forbidden');
  }

  const content = input.content.trim();
  if (!content) throw new TaskBoardError('Comment must not be empty.');

  const [updated] = await db
    .update(taskComments)
    .set({ content })
    .where(and(eq(taskComments.id, commentId), eq(taskComments.taskId, taskId)))
    .returning();

  const [author] = updated.userId
    ? await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, updated.userId))
        .limit(1)
    : [];

  await logActivity({
    boardId,
    eventType: 'comment.updated',
    description: `Comment updated on task "${task.title}"`,
    actorId: actor.userId,
    taskId
  });

  return {
    id: updated.id,
    content: updated.content,
    authorId: updated.userId,
    authorName: author?.name ?? null,
    createdAt: updated.createdAt
  };


};
export const deleteTaskComment = async (
  boardId: string,
  taskId: string,
  commentId: string,
  actor: TaskBoardActor
) => {
  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) throw new TaskBoardError('Task not found.', 'not_found');

  const [comment] = await db
    .select()
    .from(taskComments)
    .where(and(eq(taskComments.id, commentId), eq(taskComments.taskId, taskId)))
    .limit(1);
  if (!comment) throw new TaskBoardError('Comment not found.', 'not_found');

  const [board] = await db.select().from(taskBoards).where(eq(taskBoards.id, boardId)).limit(1);
  if (!board) throw new TaskBoardError('Board not found.', 'not_found');

  const isManager = canManageBoard(actor.role, actor.userId, board);
  if (!isManager && comment.userId !== actor.userId) {
    throw new TaskBoardError('Only the comment author or board manager can delete this comment.', 'forbidden');
  }

  await db.delete(taskComments).where(eq(taskComments.id, commentId));

  await logActivity({
    boardId,
    eventType: 'comment.deleted',
    description: `Comment deleted on task "${task.title}"`,
    actorId: actor.userId,
    taskId
  });

  return comment;
};

export const listTaskBoardActivity = async (
  boardId: string,
  limit = 50,
  actor?: TaskBoardActor,
  taskId?: string
) => {
  const clamped = Math.min(Math.max(limit, 1), 100);

  const activityWhere = taskId
    ? and(eq(taskActivities.boardId, boardId), eq(taskActivities.taskId, taskId))
    : eq(taskActivities.boardId, boardId);
  const rows = await db
    .select({
      activity: taskActivities,
      actorName: users.name,
      taskTitle: tasks.title
    })
    .from(taskActivities)
    .leftJoin(users, eq(taskActivities.actorId, users.id))
    .leftJoin(tasks, eq(taskActivities.taskId, tasks.id))
    .where(activityWhere)
    .orderBy(desc(taskActivities.createdAt))
    .limit(clamped);

  let visibleRows = rows;
  if (actor) {
    const [board] = await db
      .select({ workspaceId: taskBoards.workspaceId, ownerId: taskBoards.ownerId })
      .from(taskBoards)
      .where(eq(taskBoards.id, boardId))
      .limit(1);
    if (board) {
      visibleRows = (
        await Promise.all(
          rows.map(async (row) =>
            row.activity.taskId && row.taskTitle
              ? (await getTaskInBoard(boardId, row.activity.taskId, actor) ? row : null)
              : row
          )
        )
      ).filter((row): row is (typeof rows)[number] => row !== null);
    }
  }

  return visibleRows.map((row) => ({
    id: row.activity.id,
    eventType: row.activity.eventType,
    description: row.activity.description,
    actorId: row.activity.actorId,
    actorName: row.actorName,
    taskId: row.activity.taskId,
    taskTitle: row.taskTitle,
    meta: row.activity.meta,
    createdAt: row.activity.createdAt
  }));
};

/* ------------------------------------------------------- attachments */

export const listTaskAttachments = async (boardId: string, taskId: string, actor?: TaskBoardActor) => {
  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) return null;
  const rows = await db
    .select({ attachment: taskAttachments, uploaderName: users.name })
    .from(taskAttachments)
    .leftJoin(users, eq(taskAttachments.uploaderId, users.id))
    .where(eq(taskAttachments.taskId, taskId))
    .orderBy(asc(taskAttachments.createdAt));

  return rows.map((row) => ({
    id: row.attachment.id,
    fileName: row.attachment.fileName,
    filePath: row.attachment.filePath,
    fileType: row.attachment.fileType,
    fileSize: row.attachment.fileSize,
    width: row.attachment.width,
    height: row.attachment.height,
    uploaderId: row.attachment.uploaderId,
    uploaderName: row.uploaderName,
    createdAt: row.attachment.createdAt
  }));
};

export const createTaskAttachment = async (
  boardId: string,
  taskId: string,
  actor: TaskBoardActor,
  file: File
) => {
  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) throw new TaskBoardError('Task not found.', 'not_found');

  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new TaskBoardError('File too large (max 50 MB).', 'too_large');
  }

  // Determine content type — use the file's type or infer from extension
  let fileType = file.type || 'application/octet-stream';
  if (!file.type) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const extMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm',
      mov: 'video/quicktime', pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown',
      doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    fileType = extMap[ext] ?? 'application/octet-stream';
  }

  // Save file to static/task-uploads/
  const ext = file.name.split('.').pop() || 'bin';
  const filename = `${actor.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await mkdir('static/task-uploads', { recursive: true });
  await Bun.write(`static/task-uploads/${filename}`, file);

  // Image dimensions are detected client-side after upload; left null here.
  const [inserted] = await db
    .insert(taskAttachments)
    .values({
      taskId,
      boardId,
      uploaderId: actor.userId,
      fileName: file.name,
      filePath: `/task-uploads/${filename}`,
      fileType,
      fileSize: file.size,
      width: null,
      height: null
    })
    .returning();

  const [uploader] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, actor.userId))
    .limit(1);

  await logActivity({
    boardId,
    eventType: 'attachment.added',
    description: `${uploader?.name ?? 'Someone'} attached ${file.name} to ${task.title}`,
    actorId: actor.userId,
    taskId
  });

  return {
    id: inserted.id,
    fileName: inserted.fileName,
    filePath: inserted.filePath,
    fileType: inserted.fileType,
    fileSize: inserted.fileSize,
    width: inserted.width,
    height: inserted.height,
    uploaderId: inserted.uploaderId,
    uploaderName: uploader?.name ?? null,
    createdAt: inserted.createdAt
  };
};
export const createTaskDescriptionImage = async (
  boardId: string,
  taskId: string,
  actor: TaskBoardActor,
  file: File
) => {
  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) throw new TaskBoardError('Task not found.', 'not_found');
  if (!file.type.startsWith('image/')) {
    throw new TaskBoardError('Only image files can be inserted into a description.');
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new TaskBoardError('File too large (max 50 MB).', 'too_large');
  }

  const extension = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const filename = `${actor.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  await mkdir('static/task-description-images', { recursive: true });
  await Bun.write(`static/task-description-images/${filename}`, file);

  return { filePath: `/task-description-images/${filename}` };
};


export const createTaskLinkAttachment = async (
  boardId: string,
  taskId: string,
  actor: TaskBoardActor,
  input: { url: string; displayText?: string }
) => {
  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) throw new TaskBoardError('Task not found.', 'not_found');

  let url: URL;
  try {
    url = new URL(input.url);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
  } catch {
    throw new TaskBoardError('A valid HTTP or HTTPS link is required.', 'validation');
  }

  const fileName = input.displayText?.trim() || url.hostname;
  const [inserted] = await db
    .insert(taskAttachments)
    .values({
      taskId,
      boardId,
      uploaderId: actor.userId,
      fileName,
      filePath: url.toString(),
      fileType: 'text/uri-list',
      fileSize: 0,
      width: null,
      height: null
    })
    .returning();

  const [uploader] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, actor.userId))
    .limit(1);
  await logActivity({
    boardId,
    eventType: 'attachment.added',
    description: `${uploader?.name ?? 'Someone'} attached ${fileName} to ${task.title}`,
    actorId: actor.userId,
    taskId
  });

  return {
    id: inserted.id,
    fileName: inserted.fileName,
    filePath: inserted.filePath,
    fileType: inserted.fileType,
    fileSize: inserted.fileSize,
    width: inserted.width,
    height: inserted.height,
    uploaderId: inserted.uploaderId,
    uploaderName: uploader?.name ?? null,
    createdAt: inserted.createdAt
  };
};

export const deleteTaskAttachment = async (
  boardId: string,
  taskId: string,
  attachmentId: string,
  actor: TaskBoardActor
) => {
  const task = await getTaskInBoard(boardId, taskId, actor);
  if (!task) throw new TaskBoardError('Task not found.', 'not_found');

  const [attachment] = await db
    .select()
    .from(taskAttachments)
    .where(
      and(
        eq(taskAttachments.id, attachmentId),
        eq(taskAttachments.taskId, taskId),
        eq(taskAttachments.boardId, boardId)
      )
    )
    .limit(1);
  if (!attachment) throw new TaskBoardError('Attachment not found.', 'not_found');

  const [board] = await db.select().from(taskBoards).where(eq(taskBoards.id, boardId)).limit(1);
  if (!board) throw new TaskBoardError('Board not found.', 'not_found');

  const isManager = canManageBoard(actor.role, actor.userId, board);
  if (!isManager && attachment.uploaderId !== actor.userId) {
    throw new TaskBoardError(
      'Only the uploader or board manager can delete this attachment.',
      'forbidden'
    );
  }

  await db.delete(taskAttachments).where(eq(taskAttachments.id, attachmentId));

  try {
    await unlink(`static${attachment.filePath}`);
  } catch {
    // Best-effort cleanup: the DB row is the source of truth.
  }

  const [actorRow] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, actor.userId))
    .limit(1);

  await logActivity({
    boardId,
    eventType: 'attachment.deleted',
    description: `${actorRow?.name ?? 'Someone'} removed ${attachment.fileName} from ${task.title}`,
    actorId: actor.userId,
    taskId
  });

  return attachment;
};
