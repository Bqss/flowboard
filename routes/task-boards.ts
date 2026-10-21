import { Elysia, t } from 'elysia';
import { eq, and } from 'drizzle-orm';
import { db, taskBoards } from '@db';
import * as taskBoardHandlers from '@handlers/task-boards';
import { createRequireAuth } from '@middlewares';
import { resolveWorkspaceMember } from '@middlewares/workspace';
import { isWorkspaceMemberInGroup } from '@services/workspace';
import {
  CreateTaskBoardSchema,
  CreateTaskColumnSchema,
  CreateTaskCommentSchema,
  CreateTaskLabelSchema,
  CompleteTaskSchema,
  CreateTaskSchema,
  MoveTaskSchema,
  ReorderTaskColumnsSchema,
  TaskAttachmentSchema,
  TaskAttachmentLinkSchema,
  TaskBoardAttachmentParam,
  TaskBoardColumnParam,
  TaskBoardCommentParam,
  TaskBoardIdParam,
  TaskBoardLabelParam,
  TaskBoardTaskParam,
  UpdateTaskBoardSchema,
  UpdateTaskColumnSchema,
  UpdateTaskLabelSchema,
  UpdateTaskSchema,
  WorkspaceIdParam
} from '@validators';

const resolveBoard = async (
  cookie: Record<string, { value?: unknown }>,
  workspaceId: string | undefined,
  boardId: string | undefined,
  request?: Request
) => {
  const base = await resolveWorkspaceMember(cookie, workspaceId, request);
  if (!base.workspace || !boardId) {
    return { ...base, board: null };
  }
  const [board] = await db
    .select()
    .from(taskBoards)
    .where(and(eq(taskBoards.id, boardId), eq(taskBoards.workspaceId, base.workspace.id)))
    .limit(1);
  if (
    !board ||
    (board.workspaceMemberGroupId &&
      base.membership?.role === 'member' &&
      (!base.user || !(await isWorkspaceMemberInGroup(base.workspace.id, board.workspaceMemberGroupId, base.user.id))))
  ) {
    return { ...base, board: null };
  }
  return { ...base, board };
};

export const createTaskBoardsRoutes = () => {
  const workspaceBoardGuard = new Elysia()
    .derive({ as: 'scoped' }, async ({ cookie, params, request }) =>
      resolveWorkspaceMember(cookie, params.workspaceId, request)
    )
    .onBeforeHandle({ as: 'scoped' }, (ctx) => {
      const { workspace, membership, set } = ctx as typeof ctx & {
        workspace: unknown;
        membership: unknown;
      };
      if (!workspace || !membership) {
        set.status = 403;
        return { error: 'Forbidden' };
      }
    });
  const boardGuard = new Elysia()
    .derive({ as: 'scoped' }, async ({ cookie, params, request }) =>
      resolveBoard(cookie, params.workspaceId, params.boardId, request)
    )
    .onBeforeHandle({ as: 'scoped' }, (ctx) => {
      const { board, set } = ctx as typeof ctx & { board: unknown };
      if (!board) {
        set.status = 404;
        return { error: 'Board not found' };
      }
    });

  return new Elysia({ prefix: '/workspaces/:workspaceId/boards' })
    .use(createRequireAuth())
    .use(workspaceBoardGuard)
    .get('/', taskBoardHandlers.list, { params: WorkspaceIdParam })
    .post('/', taskBoardHandlers.create, { params: WorkspaceIdParam, body: CreateTaskBoardSchema })
    .group('/:boardId', (app) =>
      app
        .use(boardGuard)
        .get('/', taskBoardHandlers.show, { params: TaskBoardIdParam })
        .patch('/', taskBoardHandlers.update, {
          params: TaskBoardIdParam,
          body: UpdateTaskBoardSchema
        })
        .delete('/', taskBoardHandlers.remove, { params: TaskBoardIdParam })
        .get('/board', taskBoardHandlers.boardView, { params: TaskBoardIdParam })
        .get('/activity', taskBoardHandlers.activity, {
          params: TaskBoardIdParam,
          query: t.Object({ limit: t.Optional(t.String()), taskId: t.Optional(t.String({ format: 'uuid' })) })
        })
        .get('/labels', taskBoardHandlers.listLabelsHandler, { params: TaskBoardIdParam })
        .post('/labels', taskBoardHandlers.createLabelHandler, {
          params: TaskBoardIdParam,
          body: CreateTaskLabelSchema
        })
        .patch('/labels/:labelId', taskBoardHandlers.updateLabelHandler, {
          params: TaskBoardLabelParam,
          body: UpdateTaskLabelSchema
        })
        .delete('/labels/:labelId', taskBoardHandlers.deleteLabelHandler, {
          params: TaskBoardLabelParam
        })
        .post('/columns', taskBoardHandlers.createColumnHandler, {
          params: TaskBoardIdParam,
          body: CreateTaskColumnSchema
        })
        .patch('/columns/:columnId', taskBoardHandlers.updateColumnHandler, {
          params: TaskBoardColumnParam,
          body: UpdateTaskColumnSchema
        })
        .delete('/columns/:columnId', taskBoardHandlers.deleteColumnHandler, {
          params: TaskBoardColumnParam
        })
        .post('/columns/reorder', taskBoardHandlers.reorderColumnsHandler, {
          params: TaskBoardIdParam,
          body: ReorderTaskColumnsSchema
        })
        .post('/tasks', taskBoardHandlers.createTaskHandler, {
          params: TaskBoardIdParam,
          body: CreateTaskSchema
        })
        .get('/tasks/:taskId', taskBoardHandlers.taskDetail, {
          params: TaskBoardTaskParam,
          query: t.Object({ commentsLimit: t.Optional(t.String()) })
        })
        .patch('/tasks/:taskId', taskBoardHandlers.updateTaskHandler, {
          params: TaskBoardTaskParam,
          body: UpdateTaskSchema
        })
        .post('/tasks/:taskId/complete', taskBoardHandlers.completeTaskHandler, {
          params: TaskBoardTaskParam,
          body: CompleteTaskSchema
        })
        .delete('/tasks/:taskId', taskBoardHandlers.deleteTaskHandler, {
          params: TaskBoardTaskParam
        })
        .post('/tasks/:taskId/move', taskBoardHandlers.moveTaskHandler, {
          params: TaskBoardTaskParam,
          body: MoveTaskSchema
        })
        .get('/tasks/:taskId/comments', taskBoardHandlers.listComments, {
          params: TaskBoardTaskParam
        })
        .post('/tasks/:taskId/comments', taskBoardHandlers.createCommentHandler, {
          params: TaskBoardTaskParam,
          body: CreateTaskCommentSchema
        })
        .patch('/tasks/:taskId/comments/:commentId', taskBoardHandlers.updateCommentHandler, {
          params: TaskBoardCommentParam,
          body: CreateTaskCommentSchema
        })
        .delete('/tasks/:taskId/comments/:commentId', taskBoardHandlers.deleteCommentHandler, {
          params: TaskBoardCommentParam
        })
        .get('/tasks/:taskId/attachments', taskBoardHandlers.listAttachments, {
          params: TaskBoardTaskParam
        })
        .post('/tasks/:taskId/attachments', taskBoardHandlers.uploadAttachment, {
          params: TaskBoardTaskParam,
          body: TaskAttachmentSchema
        })
        .post('/tasks/:taskId/description-images', taskBoardHandlers.uploadDescriptionImage, {
          params: TaskBoardTaskParam,
          body: TaskAttachmentSchema
        })
        .post('/tasks/:taskId/attachments/link', taskBoardHandlers.createLinkAttachmentHandler, {
          params: TaskBoardTaskParam,
          body: TaskAttachmentLinkSchema
        })
        .delete(
          '/tasks/:taskId/attachments/:attachmentId',
          taskBoardHandlers.deleteAttachmentHandler,
          {
            params: TaskBoardAttachmentParam
          }
        )
    );
};
