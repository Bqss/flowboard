import { Elysia } from 'elysia';
import { eq, and } from 'drizzle-orm';
import { db, workflows } from '@db';
import * as workflowHandlers from '@handlers/workflows';
import { createRequireAuth } from '@middlewares';
import { resolveWorkspaceMember } from '@middlewares/workspace';
import {
  CreateCardSchema,
  CreateChecklistTemplateSchema,
  CreateStageSchema,
  CreateWorkflowSchema,
  ImportCardsSchema,
  MoveCardSchema,
  ReorderStagesSchema,
  ToggleChecklistItemSchema,
  UpdateCardAssigneeSchema,
  UpdateChecklistTemplateSchema,
  UpdateChecklistActionSchema,
  UpdateStageSchema,
  BulkReassignSchema,
  UpdateWorkflowSchema,
  WorkflowCardItemParam,
  WorkflowCardParam,
  WorkflowIdParam,
  WorkflowStageParam,
  WorkflowStageTemplateParam,
  GenerateWorkflowDraftSchema,
  WorkflowDraftSchema,
  WorkspaceIdParam
} from '@validators';
import * as aiWorkflowHandlers from '@handlers/ai-workflows';

const resolveWorkflow = async (
  cookie: Record<string, { value?: unknown }>,
  workspaceId: string | undefined,
  workflowId: string | undefined
) => {
  const base = await resolveWorkspaceMember(cookie, workspaceId);
  if (!base.workspace || !workflowId) {
    return { ...base, workflow: null };
  }

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, workflowId), eq(workflows.workspaceId, base.workspace.id)))
    .limit(1);

  return { ...base, workflow: workflow ?? null };
};

export const createWorkflowsRoutes = () => {
  const workspaceWorkflowGuard = new Elysia()
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

  const workflowGuard = new Elysia()
    .derive({ as: 'scoped' }, async ({ cookie, params }) =>
      resolveWorkflow(cookie, params.workspaceId, params.workflowId)
    )
    .onBeforeHandle({ as: 'scoped' }, (ctx) => {
      const { workflow, set } = ctx as typeof ctx & { workflow: unknown };
      if (!workflow) {
        set.status = 404;
        return { error: 'Workflow not found' };
      }
    });

  return new Elysia({ prefix: '/workspaces/:workspaceId/workflows' })
    .use(createRequireAuth())
    .use(workspaceWorkflowGuard)
    .get('/', workflowHandlers.list, { params: WorkspaceIdParam })
    .post('/', workflowHandlers.create, { params: WorkspaceIdParam, body: CreateWorkflowSchema })
    .get('/stats', workflowHandlers.dashboardStats, { params: WorkspaceIdParam })
    .get('/waiting-action', workflowHandlers.waitingAction, { params: WorkspaceIdParam })
    .post('/cards/bulk-assign', workflowHandlers.bulkReassign, {
      params: WorkspaceIdParam,
      body: BulkReassignSchema
    })
    .post('/ai/draft', aiWorkflowHandlers.generateDraft, {
      params: WorkspaceIdParam,
      body: GenerateWorkflowDraftSchema
    })
    .post('/ai/save', aiWorkflowHandlers.saveDraft, {
      params: WorkspaceIdParam,
      body: WorkflowDraftSchema
    })
    .group('/:workflowId', (app) =>
      app
        .use(workflowGuard)
        .get('/', workflowHandlers.show, { params: WorkflowIdParam })
        .patch('/', workflowHandlers.update, {
          params: WorkflowIdParam,
          body: UpdateWorkflowSchema
        })
        .delete('/', workflowHandlers.remove, { params: WorkflowIdParam })
        .get('/setup', workflowHandlers.setup, { params: WorkflowIdParam })
        .get('/board', workflowHandlers.board, { params: WorkflowIdParam })
        .get('/stats', workflowHandlers.workflowStats, { params: WorkflowIdParam })
        .post('/stages', workflowHandlers.createStageHandler, {
          params: WorkflowIdParam,
          body: CreateStageSchema
        })
        .patch('/stages/:stageId', workflowHandlers.updateStageHandler, {
          params: WorkflowStageParam,
          body: UpdateStageSchema
        })
        .delete('/stages/:stageId', workflowHandlers.deleteStageHandler, {
          params: WorkflowStageParam
        })
        .post('/stages/reorder', workflowHandlers.reorderStagesHandler, {
          params: WorkflowIdParam,
          body: ReorderStagesSchema
        })
        .post('/stages/:stageId/templates', workflowHandlers.createTemplate, {
          params: WorkflowStageParam,
          body: CreateChecklistTemplateSchema
        })
        .patch('/stages/:stageId/templates/:templateId', workflowHandlers.updateTemplate, {
          params: WorkflowStageTemplateParam,
          body: UpdateChecklistTemplateSchema
        })
        .patch('/stages/:stageId/templates/:templateId/action', workflowHandlers.updateTemplateActionHandler, {
          params: WorkflowStageTemplateParam,
          body: UpdateChecklistActionSchema
        })
        .delete('/stages/:stageId/templates/:templateId', workflowHandlers.deleteTemplate, {
          params: WorkflowStageTemplateParam
        })
        .post('/cards', workflowHandlers.createCardHandler, {
          params: WorkflowIdParam,
          body: CreateCardSchema
        })
        .post('/cards/import', workflowHandlers.importCards, {
          params: WorkflowIdParam,
          body: ImportCardsSchema
        })
        .get('/cards/:cardId', workflowHandlers.cardDetail, { params: WorkflowCardParam })
        .delete('/cards/:cardId', workflowHandlers.deleteCardHandler, { params: WorkflowCardParam })
        .patch('/cards/:cardId/assignee', workflowHandlers.updateAssignee, {
          params: WorkflowCardParam,
          body: UpdateCardAssigneeSchema
        })
        .post('/cards/:cardId/move', workflowHandlers.moveCard, {
          params: WorkflowCardParam,
          body: MoveCardSchema
        })
        .post('/cards/:cardId/relay', workflowHandlers.relayCard, { params: WorkflowCardParam })
        .patch('/cards/:cardId/checklist/:itemId', workflowHandlers.toggleItem, {
          params: WorkflowCardItemParam,
          body: ToggleChecklistItemSchema
        })
    );
};

/** @deprecated Prefer `createWorkflowsRoutes()` when composing the API in dev. */
export const workflowsRoutes = createWorkflowsRoutes();
