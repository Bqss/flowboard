import { type Ctx } from '@core';
import type { TaskBoard, TaskPriority, TaskRecurrence } from '@db';
import {
  TaskBoardError,
  canManageBoard,
  createBoard,
  createColumn,
  createTask,
  completeTask,
  createTaskAttachment,
  createTaskLinkAttachment,
  createTaskComment,
  createTaskDescriptionImage,
  deleteBoard,
  deleteColumn,
  deleteTask,
  deleteTaskAttachment,
  deleteTaskComment,
  deleteTaskLabel,
  getColumnInBoard,
  getTaskBoardView,
  getTaskDetail,
  listBoards,
  listTaskAttachments,
  listTaskBoardActivity,
  listTaskComments,
  listTaskLabels,
  moveTask,
  reorderColumns,
  updateBoard,
  updateColumn,
  updateTask,
  updateTaskComment,
  updateTaskLabel,
  createTaskLabel,
  type TaskBoardActor
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
type LabelParams = BoardParams & { labelId: string };

type CreateBoardBody = {
  name: string;
  description?: string | null;
  workspaceMemberGroupId?: string | null;
};

type UpdateBoardBody = {
  name?: string;
  description?: string | null;
  workspaceMemberGroupId?: string | null;
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
  labels?: string[];
  assigneeId?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
  recurrence?: TaskRecurrence;
  recurrenceDays?: number[];
};

type UpdateTaskBody = {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  labels?: string[];
  assigneeId?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
  recurrence?: TaskRecurrence;
  recurrenceDays?: number[];
};
type CompleteTaskBody = {
  completed: boolean;
};

type CreateLabelBody = {
  name: string;
  color?: string;
};

type UpdateLabelBody = {
  name?: string;
  color?: string;
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

type CreateLinkAttachmentBody = {
  url: string;
  displayText?: string;
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

export async function list({ user, workspace, membership, set }: Ctx<unknown, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const rows = await listBoards(workspace.id, { userId: user.id, role: membership.role });
  return {
    boards: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      workspaceMemberGroupId: row.workspaceMemberGroupId,
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
    workspaceMemberGroupId: body.workspaceMemberGroupId,
    ownerId: user.id
  });

  return {
    board: {
      id: board.id,
      workspaceId: board.workspaceId,
      workspaceMemberGroupId: board.workspaceMemberGroupId,
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
      workspaceMemberGroupId: board.workspaceMemberGroupId,
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

export async function boardView({
  user,
  board,
  membership,
  set
}: BoardCtx<unknown, BoardParams>) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const data = await getTaskBoardView(
    board.id,
    user ? { userId: user.id, role: membership.role } : undefined
  );
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

export async function listLabelsHandler({ board, membership }: BoardCtx<unknown, BoardParams>) {
  if (!board || !membership) return { labels: [] };
  return { labels: await listTaskLabels(board.workspaceId) };
}

export async function createLabelHandler({
  user,
  board,
  membership,
  body,
  set
}: BoardCtx<CreateLabelBody, BoardParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }
  const denied = requireManager(user, membership, board, set);
  if (denied) return denied;
  try {
    return { label: await createTaskLabel(board.workspaceId, body) };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}

export async function updateLabelHandler({
  user,
  board,
  membership,
  params,
  body,
  set
}: BoardCtx<UpdateLabelBody, LabelParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }
  const denied = requireManager(user, membership, board, set);
  if (denied) return denied;
  try {
    return { label: await updateTaskLabel(board.workspaceId, params.labelId, body) };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}

export async function deleteLabelHandler({
  user,
  board,
  membership,
  params,
  set
}: BoardCtx<unknown, LabelParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }
  const denied = requireManager(user, membership, board, set);
  if (denied) return denied;
  try {
    await deleteTaskLabel(board.workspaceId, params.labelId);
    return { ok: true };
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
  user,
  board,
  membership,
  params,
  query,
  set
}: BoardCtx<unknown, TaskParams> & { query: { commentsLimit?: string } }) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const parsedLimit = query.commentsLimit ? parseInt(query.commentsLimit, 10) : undefined;
  const detail = await getTaskDetail(
    board.id,
    params.taskId,
    user ? { userId: user.id, role: membership.role } : undefined,
    parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined
  );
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
    const task = await updateTask(
      board.id,
      params.taskId,
      body,
      user ? { userId: user.id, role: membership.role } : undefined
    );
    return { task };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}
export async function completeTaskHandler({
  user,
  board,
  membership,
  params,
  body,
  set
}: BoardCtx<CompleteTaskBody, TaskParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  try {
    const task = await completeTask(board.id, params.taskId, body.completed, {
      userId: user.id,
      role: membership.role
    });
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
    const task = await moveTask(
      board.id,
      params.taskId,
      body,
      user ? { userId: user.id, role: membership.role } : undefined
    );
    return { task };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}

export async function listComments({
  user,
  board,
  membership,
  params,
  set
}: BoardCtx<unknown, TaskParams>) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const comments = await listTaskComments(
    board.id,
    params.taskId,
    user ? { userId: user.id, role: membership.role } : undefined
  );
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
    const comment = await createTaskComment(board.id, params.taskId, body, {
      userId: user.id,
      role: membership.role
    });
    return { comment };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}
export async function updateCommentHandler({
  user,
  board,
  membership,
  params,
  body,
  set
}: BoardCtx<CreateCommentBody, CommentParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  try {
    const comment = await updateTaskComment(board.id, params.taskId, params.commentId, body, {
      userId: user.id,
      role: membership.role
    });
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
  user,
  board,
  membership,
  query,
  set
}: BoardCtx<unknown, BoardParams> & { query: { limit?: string; taskId?: string } }) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const parsed = parseInt(query.limit ?? '50', 10);
  const rows = await listTaskBoardActivity(
    board.id,
    Number.isNaN(parsed) ? 50 : parsed,
    user ? { userId: user.id, role: membership.role } : undefined,
    query.taskId
  );
  return { activity: rows };
}

export async function listAttachments({
  user,
  board,
  membership,
  params,
  set
}: BoardCtx<unknown, TaskParams>) {
  if (!board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }

  const attachments = await listTaskAttachments(
    board.id,
    params.taskId,
    user ? { userId: user.id, role: membership.role } : undefined
  );
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
    const attachment = await createTaskAttachment(
      board.id,
      params.taskId,
      { userId: user.id, role: membership.role },
      file
    );
    return { attachment };
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}
export async function uploadDescriptionImage({
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
    const result = await createTaskDescriptionImage(
      board.id,
      params.taskId,
      { userId: user.id, role: membership.role },
      file
    );
    return result;
  } catch (error) {
    return handleTaskBoardError(error, set);
  }
}


export async function createLinkAttachmentHandler({
  user,
  board,
  membership,
  params,
  body,
  set
}: BoardCtx<CreateLinkAttachmentBody, TaskParams>) {
  if (!user || !board || !membership) {
    set.status = 404;
    return { error: 'Board not found' };
  }
  try {
    const attachment = await createTaskLinkAttachment(
      board.id,
      params.taskId,
      { userId: user.id, role: membership.role },
      body
    );
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
