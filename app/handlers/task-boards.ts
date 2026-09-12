import { type Ctx } from '@core';
import type { TaskBoard, TaskPriority } from '@db';
import {
  TaskBoardError,
  canManageBoard,
  createBoard,
  createColumn,
  createTask,
  createTaskAttachment,
  createTaskComment,
  deleteBoard,
  deleteColumn,
  deleteTask,
  deleteTaskAttachment,
  deleteTaskComment,
  getColumnInBoard,
  getTaskBoardView,
  getTaskDetail,
  listBoards,
  listTaskAttachments,
  listTaskBoardActivity,
  listTaskComments,
  moveTask,
  reorderColumns,
  updateBoard,
  updateColumn,
  updateTask
} from '@services/task-board';

type BoardCtx<Body = unknown, Params = Record<string, string>> = Ctx<Body, Params> & {
  board?: TaskBoard | null;
};

type WorkspaceParams = { workspaceId: string };
type BoardParams = WorkspaceParams & { boardId: string };
type ColumnParams = BoardParams & { columnId: string };
type TaskParams = BoardParams & { taskId: string };
type CommentParams = TaskParams & { commentId: string };
type AttachmentParams = TaskParams & { attachmentId: string };

type CreateBoardBody = {
  name: string;
  description?: string | null;
};

type UpdateBoardBody = {
  name?: string;
  description?: string | null;
};

type CreateColumnBody = {
  name: string;
  color?: string;
};

type UpdateColumnBody = {
  name?: string;
  color?: string;
};

type ReorderColumnsBody = {
  columnIds: string[];
};

type CreateTaskBody = {
  columnId?: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueAt?: string | null;
};
type UpdateTaskBody = {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueAt?: string | null;
};

type MoveTaskBody = {
  columnId: string;
  position?: number;
};

type CreateCommentBody = {
  content: string;
};
type UploadAttachmentBody = {
  file: File;
};

const handleTaskBoardError = (error: unknown, set: Ctx['set']) => {
  if (error instanceof TaskBoardError) {
    set.status = error.code === 'not_found' ? 404 : error.code === 'forbidden' ? 403 : error.code === 'too_large' ? 413 : 400;
    return { error: error.message };
  }
  throw error;
};

const requireManager = (
  user: Ctx['user'],
  membership: Ctx['membership'],
  board: TaskBoard,
  set: Ctx['set']
) => {
  if (!user || !membership) {
    set.status = 403;
    return { error: 'Forbidden' } as const;
  }
  if (!canManageBoard(membership.role, user.id, board)) {
    set.status = 403;
    return { error: 'Board owner or workspace owner required' } as const;
  }
  return null;
};

export async function list({ workspace, membership, set }: Ctx<unknown, WorkspaceParams>) {
  if (!workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const rows = await listBoards(workspace.id);
  return {
    boards: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      taskCount: row.taskCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))
  };
}

export async function create({
  user,
  workspace,
  membership,
  body,
  set
}: Ctx<CreateBoardBody, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const { board, columns } = await createBoard(workspace.id, {
    name: body.name,
    description: body.description,
    ownerId: user.id
  });

  return {
    board: {
      id: board.id,
      workspaceId: board.workspaceId,
      name: board.name,
      description: board.description ?? null,
      ownerId: board.ownerId,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt
    },
    columns
  };
}

export function show({ board, membership, set }: BoardCtx<unknown, BoardParams>) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  return {
    board: {
      id: board.id,
      workspaceId: board.workspaceId,
      name: board.name,
      description: board.description ?? null,
      ownerId: board.ownerId,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt
    }
  };
}

export async function update({
  user,
  board,
  membership,
  body,
  set
}: BoardCtx<UpdateBoardBody, BoardParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const denied = requireManager(user, membership, board, set);
  if (denied) return denied;

  const updated = await updateBoard(board.id, body);
  return { board: updated };
}

export async function remove({ user, board, membership, set }: BoardCtx<unknown, BoardParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const denied = requireManager(user, membership, board, set);
  if (denied) return denied;

  await deleteBoard(board.id);
  return { ok: true };
}

export async function boardView({ board, membership, set }: BoardCtx<unknown, BoardParams>) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const data = await getTaskBoardView(board.id);
  return { board: data };
}

export async function createColumnHandler({
  user,
  board,
  membership,
  body,
  set
}: BoardCtx<CreateColumnBody, BoardParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const denied = requireManager(user, membership, board, set);
  if (denied) return denied;

  const column = await createColumn(board.id, body, { userId: user.id });
  return { column };
}

export async function updateColumnHandler({
  user,
  board,
  membership,
  params,
  body,
  set
}: BoardCtx<UpdateColumnBody, ColumnParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const denied = requireManager(user, membership, board, set);
  if (denied) return denied;

  const column = await getColumnInBoard(board.id, params.columnId);
  if (!column) {
    set.status = 404;
    return { error: 'Column not found' };
  }

  const updated = await updateColumn(column.id, body);
  return { column: updated };
}

export async function deleteColumnHandler({
  user,
  board,
  membership,
  params,
  set
}: BoardCtx<unknown, ColumnParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const denied = requireManager(user, membership, board, set);
  if (denied) return denied;

  try {
    await deleteColumn(board.id, params.columnId, { userId: user.id });
    return { ok: true };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}

export async function reorderColumnsHandler({
  user,
  board,
  membership,
  body,
  set
}: BoardCtx<ReorderColumnsBody, BoardParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const denied = requireManager(user, membership, board, set);
  if (denied) return denied;

  try {
    const columns = await reorderColumns(board.id, body.columnIds);
    return { columns };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}

export async function createTaskHandler({
  user,
  board,
  membership,
  body,
  set
}: BoardCtx<CreateTaskBody, BoardParams>) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  try {
    const task = await createTask(board.id, body, user ? { userId: user.id } : undefined);
    return { task };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}

export async function taskDetail({
  board,
  membership,
  params,
  set
}: BoardCtx<unknown, TaskParams>) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const detail = await getTaskDetail(board.id, params.taskId);
  if (!detail) {
    set.status = 404;
    return { error: 'Task not found' };
  }

  return { task: detail };
}

export async function updateTaskHandler({
  user,
  board,
  membership,
  params,
  body,
  set
}: BoardCtx<UpdateTaskBody, TaskParams>) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  try {
    const task = await updateTask(board.id, params.taskId, body, user ? { userId: user.id } : undefined);
    return { task };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}

export async function deleteTaskHandler({
  user,
  board,
  membership,
  params,
  set
}: BoardCtx<unknown, TaskParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  try {
    await deleteTask(board.id, params.taskId, { userId: user.id, role: membership.role });
    return { ok: true };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}

export async function moveTaskHandler({
  user,
  board,
  membership,
  params,
  body,
  set
}: BoardCtx<MoveTaskBody, TaskParams>) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  try {
    const task = await moveTask(board.id, params.taskId, body, user ? { userId: user.id } : undefined);
    return { task };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}

export async function listComments({
  board,
  membership,
  params,
  set
}: BoardCtx<unknown, TaskParams>) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const comments = await listTaskComments(board.id, params.taskId);
  if (!comments) {
    set.status = 404;
    return { error: 'Task not found' };
  }

  return { comments };
}

export async function createCommentHandler({
  user,
  board,
  membership,
  params,
  body,
  set
}: BoardCtx<CreateCommentBody, TaskParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  try {
    const comment = await createTaskComment(board.id, params.taskId, body, { userId: user.id });
    return { comment };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}

export async function deleteCommentHandler({
  user,
  board,
  membership,
  params,
  set
}: BoardCtx<unknown, CommentParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  try {
    await deleteTaskComment(board.id, params.taskId, params.commentId, {
      userId: user.id,
      role: membership.role
    });
    return { ok: true };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}

export async function activity({
  board,
  membership,
  query,
  set
}: BoardCtx<unknown, BoardParams> & { query: { limit?: string } }) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const parsed = parseInt(query.limit ?? '50', 10);
  const rows = await listTaskBoardActivity(board.id, Number.isNaN(parsed) ? 50 : parsed);
  return { activity: rows };
}

export async function listAttachments({
  board,
  membership,
  params,
  set
}: BoardCtx<unknown, TaskParams>) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const attachments = await listTaskAttachments(board.id, params.taskId);
  if (!attachments) {
    set.status = 404;
    return { error: 'Task not found' };
  }

  return { attachments };
}

export async function uploadAttachment({
  user,
  board,
  membership,
  params,
  body,
  set
}: BoardCtx<UploadAttachmentBody, TaskParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const file = body.file;
  if (!file || !file.name) {
    set.status = 400;
    return { error: 'No file uploaded' };
  }

  try {
    const attachment = await createTaskAttachment(board.id, params.taskId, user.id, file);
    return { attachment };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}

export async function deleteAttachmentHandler({
  user,
  board,
  membership,
  params,
  set
}: BoardCtx<unknown, AttachmentParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  try {
    await deleteTaskAttachment(board.id, params.taskId, params.attachmentId, {
      userId: user.id,
      role: membership.role
    });
    return { ok: true };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}
