import { type Ctx } from '@core';
import { checklistTemplates, db } from '@db';
import { eq } from 'drizzle-orm';
import {
  WorkflowError,
  canManageWorkflow,
  createCard,
  createChecklistTemplate,
  createStage,
  createWorkflow,
  deleteChecklistTemplate,
  deleteStage,
  deleteWorkflow,
  getBoard,
  getCardDetail,
  getDashboardStats,
  getStageInWorkflow,
  getWorkflowSetup,
  importCardsFromCsv,
  listWaitingActionCards,
  bulkReassignCards,
  listWorkflows,
  moveCardToStage,
  relayCardToNextWorkflow,
  reorderStages,
  toggleChecklistItem,
  updateCardAssignee,
  updateChecklistTemplate,
  updateStage,
  updateTemplateAction,
  updateWorkflow
} from '@services/workflow';

type WorkspaceParams = { workspaceId: string };
type WorkflowParams = WorkspaceParams & { workflowId: string };
type StageParams = WorkflowParams & { stageId: string };
type CardParams = WorkflowParams & { cardId: string };
type ItemParams = CardParams & { itemId: string };

type ReorderStagesBody = {
  stageIds: string[];
};

type CreateWorkflowBody = {
  name: string;
  ownerId?: string;
  defaultAssigneeId?: string | null;
  defaultAssigneeIds?: string[];
};

type UpdateWorkflowBody = {
  name?: string;
  ownerId?: string;
  defaultAssigneeId?: string | null;
  defaultAssigneeIds?: string[];
};

type CreateStageBody = {
  name: string;
  color?: string;
};

type UpdateStageBody = {
  name?: string;
  color?: string;
  onReplyNotify?: boolean;
  overdueReminderHours?: number | null;
  nextWorkflowId?: string | null;
};

type UpdateTemplateActionBody = {
  kind: 'none' | 'send' | 'followup';
  messageTemplate?: string | null;
  delayMinutes?: number;
  followupIfNoReply?: boolean;
};

type CreateTemplateBody = {
  label: string;
  required?: boolean;
};

type UpdateTemplateBody = {
  label?: string;
  required?: boolean;
};

type CreateCardBody = {
  name: string;
  wa: string;
  product?: string;
  tag?: string;
  assigneeId?: string | null;
  source?: 'manual' | 'csv' | 'mcp' | 'estafet';
};

type UpdateAssigneeBody = {
  assigneeId: string | null;
};

type ImportCardsBody = {
  csv: string;
  mode?: 'skip' | 'update';
};

type MoveCardBody = {
  stageId: string;
};

type ToggleItemBody = {
  done: boolean;
};

const handleWorkflowError = (error: unknown, set: Ctx['set']) => {
  if (error instanceof WorkflowError) {
    set.status = error.code === 'not_found' ? 404 : 400;
    return { error: error.message };
  }
  throw error;
};

const requireManager = (
  user: Ctx['user'],
  membership: Ctx['membership'],
  workflow: NonNullable<Ctx['workflow']>,
  set: Ctx['set']
) => {
  if (!user || !membership) {
    set.status = 403;
    return { error: 'Forbidden' } as const;
  }
  if (!canManageWorkflow(membership.role, user.id, workflow)) {
    set.status = 403;
    return { error: 'Workflow owner or workspace owner required' } as const;
  }
  return null;
};

export async function list({ workspace, membership, set }: Ctx<unknown, WorkspaceParams>) {
  if (!workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const rows = await listWorkflows(workspace.id);
  return {
    workflows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      defaultAssigneeId: row.defaultAssigneeId,
      defaultAssigneeIds: row.defaultAssigneeIds ?? (row.defaultAssigneeId ? [row.defaultAssigneeId] : []),
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
}: Ctx<CreateWorkflowBody, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const { workflow, stages: createdStages } = await createWorkflow(workspace.id, {
    name: body.name,
    ownerId: body.ownerId ?? user.id,
    defaultAssigneeId: body.defaultAssigneeId,
    defaultAssigneeIds: body.defaultAssigneeIds
  });

  return {
    workflow: {
      id: workflow.id,
      name: workflow.name,
      ownerId: workflow.ownerId,
      defaultAssigneeId: workflow.defaultAssigneeId,
      defaultAssigneeIds: workflow.defaultAssigneeIds ?? (workflow.defaultAssigneeId ? [workflow.defaultAssigneeId] : [])
    },
    stages: createdStages
  };
}

export async function dashboardStats({
  workspace,
  membership,
  query,
  set
}: Ctx<unknown, WorkspaceParams>) {
  if (!workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const stats = await getDashboardStats(workspace.id, query.workflowId);
  return { stats };
}

export function show({ workflow, membership, set }: Ctx<unknown, WorkflowParams>) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  return {
    workflow: {
      id: workflow.id,
      name: workflow.name,
      ownerId: workflow.ownerId,
      defaultAssigneeId: workflow.defaultAssigneeId,
      defaultAssigneeIds: workflow.defaultAssigneeIds ?? (workflow.defaultAssigneeId ? [workflow.defaultAssigneeId] : []),
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt
    }
  };
}

export async function update({
  user,
  workflow,
  membership,
  body,
  set
}: Ctx<UpdateWorkflowBody, WorkflowParams>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  const updated = await updateWorkflow(workflow.id, body);
  return { workflow: updated };
}

export async function remove({
  user,
  workflow,
  membership,
  set
}: Ctx<unknown, WorkflowParams>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  await deleteWorkflow(workflow.id);
  return { ok: true };
}

export async function setup({ workflow, membership, set }: Ctx<unknown, WorkflowParams>) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const rows = await getWorkflowSetup(workflow.id);
  return {
    stages: rows.map((row) => ({
      id: row.stage.id,
      name: row.stage.name,
      color: row.stage.color,
      position: row.stage.position,
      onReplyNotify: row.stage.onReplyNotify,
      overdueReminderHours: row.stage.overdueReminderHours,
      nextWorkflowId: row.stage.nextWorkflowId,
      templates: row.templates.map(({ template, action }) => ({
        id: template.id,
        label: template.label,
        required: template.required,
        position: template.position,
        action: action
          ? {
              kind: action.kind,
              messageTemplate: action.messageTemplate,
              delayMinutes: action.delayMinutes,
              followupIfNoReply: action.followupIfNoReply
            }
          : {
              kind: 'none' as const,
              messageTemplate: null,
              delayMinutes: 0,
              followupIfNoReply: false
            }
      }))
    }))
  };
}

export async function board({ workflow, membership, set }: Ctx<unknown, WorkflowParams>) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const data = await getBoard(workflow.id);
  return { board: data };
}

export async function createStageHandler({
  user,
  workflow,
  membership,
  body,
  set
}: Ctx<CreateStageBody, WorkflowParams>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  const stage = await createStage(workflow.id, body);
  return { stage };
}

export async function updateStageHandler({
  user,
  workflow,
  membership,
  params,
  body,
  set
}: Ctx<UpdateStageBody, StageParams>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  const stage = await getStageInWorkflow(workflow.id, params.stageId);
  if (!stage) {
    set.status = 404;
    return { error: 'Stage not found' };
  }

  const updated = await updateStage(stage.id, body);
  return { stage: updated };
}

export async function deleteStageHandler({
  user,
  workflow,
  membership,
  params,
  set
}: Ctx<unknown, StageParams>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  try {
    await deleteStage(workflow.id, params.stageId);
    return { ok: true };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function reorderStagesHandler({
  user,
  workflow,
  membership,
  body,
  set
}: Ctx<ReorderStagesBody, WorkflowParams>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  try {
    const updatedStages = await reorderStages(workflow.id, body.stageIds);
    return { stages: updatedStages };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function createTemplate({
  user,
  workflow,
  membership,
  params,
  body,
  set
}: Ctx<CreateTemplateBody, StageParams>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  const stage = await getStageInWorkflow(workflow.id, params.stageId);
  if (!stage) {
    set.status = 404;
    return { error: 'Stage not found' };
  }

  const template = await createChecklistTemplate(stage.id, body);
  return { template };
}

export async function updateTemplate({
  user,
  workflow,
  membership,
  params,
  body,
  set
}: Ctx<UpdateTemplateBody, StageParams & { templateId: string }>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  const stage = await getStageInWorkflow(workflow.id, params.stageId);
  if (!stage) {
    set.status = 404;
    return { error: 'Stage not found' };
  }

  const template = await updateChecklistTemplate(params.templateId, body);
  if (!template || template.stageId !== stage.id) {
    set.status = 404;
    return { error: 'Template not found' };
  }

  return { template };
}

export async function deleteTemplate({
  user,
  workflow,
  membership,
  params,
  set
}: Ctx<unknown, StageParams & { templateId: string }>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  const stage = await getStageInWorkflow(workflow.id, params.stageId);
  if (!stage) {
    set.status = 404;
    return { error: 'Stage not found' };
  }

  const deleted = await deleteChecklistTemplate(params.templateId);
  if (!deleted || deleted.stageId !== stage.id) {
    set.status = 404;
    return { error: 'Template not found' };
  }

  return { ok: true };
}

export async function updateTemplateActionHandler({
  user,
  workflow,
  membership,
  params,
  body,
  set
}: Ctx<UpdateTemplateActionBody, StageParams & { templateId: string }>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  const stage = await getStageInWorkflow(workflow.id, params.stageId);
  if (!stage) {
    set.status = 404;
    return { error: 'Stage not found' };
  }

  const [template] = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, params.templateId))
    .limit(1);

  if (!template || template.stageId !== stage.id) {
    set.status = 404;
    return { error: 'Template not found' };
  }

  if (body.kind !== 'none' && !body.messageTemplate?.trim()) {
    set.status = 400;
    return { error: 'Template pesan WA wajib diisi untuk action aktif.' };
  }

  const action = await updateTemplateAction(params.templateId, body);
  return {
    action: action
      ? {
          kind: action.kind,
          messageTemplate: action.messageTemplate,
          delayMinutes: action.delayMinutes,
          followupIfNoReply: action.followupIfNoReply
        }
      : {
          kind: 'none' as const,
          messageTemplate: null,
          delayMinutes: 0,
          followupIfNoReply: false
        }
  };
}

export async function createCardHandler({
  workflow,
  membership,
  body,
  set
}: Ctx<CreateCardBody, WorkflowParams>) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  try {
    const { card, customer } = await createCard(workflow, body);
    return { card, customer };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function importCards({
  workflow,
  membership,
  body,
  set
}: Ctx<ImportCardsBody, WorkflowParams>) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  try {
    const result = await importCardsFromCsv(workflow, body.csv, body.mode ?? 'skip');
    return { result };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function updateAssignee({
  workflow,
  membership,
  params,
  body,
  set
}: Ctx<UpdateAssigneeBody, CardParams>) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  try {
    const card = await updateCardAssignee(workflow.id, params.cardId, body.assigneeId);
    return { card };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function cardDetail({
  workflow,
  membership,
  params,
  set
}: Ctx<unknown, CardParams>) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const detail = await getCardDetail(workflow.id, params.cardId);
  if (!detail) {
    set.status = 404;
    return { error: 'Card not found' };
  }

  return { detail };
}

export async function relayCard({
  workflow,
  membership,
  params,
  set
}: Ctx<unknown, CardParams>) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  try {
    const result = await relayCardToNextWorkflow(workflow.id, params.cardId);
    return result;
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function waitingAction({
  workspace,
  membership,
  set
}: Ctx<unknown, WorkspaceParams>) {
  if (!workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const cards = await listWaitingActionCards(workspace.id);
  return { cards };
}

export async function bulkReassign({
  workspace,
  membership,
  body,
  set
}: Ctx<{ cardIds: string[]; assigneeId: string | null }, WorkspaceParams>) {
  if (!workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  try {
    const result = await bulkReassignCards(workspace.id, body.cardIds, body.assigneeId);
    return result;
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function moveCard({
  workflow,
  membership,
  params,
  body,
  set
}: Ctx<MoveCardBody, CardParams>) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  try {
    const card = await moveCardToStage(workflow.id, params.cardId, body.stageId);
    return { card };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function toggleItem({
  workflow,
  membership,
  params,
  body,
  set
}: Ctx<ToggleItemBody, ItemParams>) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  try {
    const item = await toggleChecklistItem(workflow.id, params.cardId, params.itemId, body.done);
    return { item };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}
