import { Elysia, t } from 'elysia';
import { eq, and } from 'drizzle-orm';
import { db, taskBoards } from '@db';
import * as taskBoardHandlers from '@handlers/task-boards';
import { createRequireAuth } from '@middlewares';
import { resolveWorkspaceMember } from '@middlewares/workspace';
import {
  CreateTaskBoardSchema,
  CreateTaskColumnSchema,
  CreateTaskCommentSchema,
  CreateTaskSchema,
  MoveTaskSchema,
  ReorderTaskColumnsSchema,
  TaskAttachmentSchema,
  TaskBoardAttachmentParam,
  TaskBoardColumnParam,
  TaskBoardCommentParam,
  TaskBoardIdParam,
  TaskBoardTaskParam,
  UpdateTaskBoardSchema,
  UpdateTaskColumnSchema,
  UpdateTaskSchema,
  WorkspaceIdParam
} from '@validators';

const resolveBoard = async (
  cookie: Record<string, { value?: unknown }>,
  workspaceId: string | undefined,
  boardId: string | undefined
) => {
  const base = await resolveWorkspaceMember(cookie, workspaceId);
  if (!base.workspace || !boardId) {
    return { ...base, board: null };
  }

  const [board] = await db
    .select()
    .from(taskBoards)
    .where(and(eq(taskBoards.id, boardId), eq(taskBoards.workspaceId, base.workspace.id)))
    .limit(1);

  return { ...base, board: board ?? null };
};

export const createTaskBoardsRoutes = () => {
  const workspaceBoardGuard = new Elysia()
    .derive({ as: 'scoped' }, async ({ cookie, params }) =>
      resolveWorkspaceMember(cookie, params.workspaceId)
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
    .derive({ as: 'scoped' }, async ({ cookie, params }) =>
      resolveBoard(cookie, params.workspaceId, params.boardId)
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
          query: t.Object({ limit: t.Optional(t.String()) })
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
        .get('/tasks/:taskId', taskBoardHandlers.taskDetail, { params: TaskBoardTaskParam })
        .patch('/tasks/:taskId', taskBoardHandlers.updateTaskHandler, {
          params: TaskBoardTaskParam,
          body: UpdateTaskSchema
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
        .delete(
          '/tasks/:taskId/attachments/:attachmentId',
          taskBoardHandlers.deleteAttachmentHandler,
          {
            params: TaskBoardAttachmentParam
          }
        )
    );
};
