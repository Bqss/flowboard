import { type Ctx } from '@core';
import { checklistTemplates, db } from '@db';
import { eq } from 'drizzle-orm';
import {
  addChecklistItemToCard,
  deleteChecklistItemFromCard,
  WorkflowError,
  canManageWorkflow,
  createCard,
  deleteCard as deleteCardFromWorkflow,
  createChecklistTemplate,
  createStage,
  createWorkflow,
  deleteChecklistTemplate,
  deleteStage,
  deleteWorkflow,
  getBoard,
  getCardChecklistBoard,
  getCardDetail,
  getDashboardStats,
  getStageInWorkflow,
  getWorkflowSetup,
  getWorkflowStats,
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
import {
  createChecklistTemplateGroup,
  saveChecklistItemLayout,
  deleteChecklistTemplateGroup,
  moveChecklistTemplateItem,
  updateChecklistTemplateGroup,
  type DeleteGroupMode
} from '@services/checklist-group';
import { ChecklistGroupError } from '../lib/checklist-group';

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
  description?: string | null;
  label?: string | null;
  labels?: string[];
  workspaceMemberGroupId?: string | null;
  workspaceMemberGroupIds?: string[];
  allowedUserIds?: string[];
  ownerId?: string;
  defaultAssigneeId?: string | null;
  defaultAssigneeIds?: string[];
  urgency?: 'high' | 'medium' | 'low';
  deadlineValue?: number | null;
  deadlineUnit?: 'hours' | 'days';
  reminderBeforeValue?: number | null;
  reminderBeforeUnit?: 'hours' | 'days';
  repeatRule?: 'none' | 'daily' | 'weekly' | 'monthly';
  closureBy?: 'initiator' | 'assignee';
};

type UpdateWorkflowBody = {
  name?: string;
  description?: string | null;
  label?: string | null;
  workspaceMemberGroupId?: string | null;
  labels?: string[];
  workspaceMemberGroupIds?: string[];
  allowedUserIds?: string[];
  ownerId?: string;
  defaultAssigneeId?: string | null;
  defaultAssigneeIds?: string[];
  urgency?: 'high' | 'medium' | 'low';
  deadlineValue?: number | null;
  deadlineUnit?: 'hours' | 'days';
  reminderBeforeValue?: number | null;
  reminderBeforeUnit?: 'hours' | 'days';
  repeatRule?: 'none' | 'daily' | 'weekly' | 'monthly';
  closureBy?: 'initiator' | 'assignee';
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
  deadlineHours?: number | null;
  groupId?: string | null;
};

type CreateChecklistGroupBody = {
  name: string;
  parentId?: string | null;
  requiresCompletion?: boolean;
};

type UpdateChecklistGroupBody = {
  name?: string;
  requiresCompletion?: boolean;
};

type UpdateTemplateBody = {
  label?: string;
  required?: boolean;
  deadlineHours?: number | null;
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

type ColumnMapping = {
  name: number;
  wa: number;
  product?: number;
  tag?: number;
};

type ImportCardsBody = {
  csv: string;
  mode?: 'skip' | 'update';
  columnMapping?: ColumnMapping;
};

type MoveCardBody = {
  stageId: string;
};

type ToggleItemBody = {
  done: boolean;
};

const handleWorkflowError = (error: unknown, set: Ctx['set']) => {
  if (error instanceof WorkflowError || error instanceof ChecklistGroupError) {
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

export async function list({ user, workspace, membership, set }: Ctx<unknown, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const rows = await listWorkflows(workspace.id, {
    userId: user.id,
    role: membership.role
  });
  return {
    workflows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      label: row.labels?.[0] ?? null,
      labels: row.labels ?? [],
      workspaceMemberGroupId: row.workspaceMemberGroupId ?? (row.workspaceMemberGroupIds?.[0] ?? null),
      workspaceMemberGroupIds: (row.workspaceMemberGroupIds && row.workspaceMemberGroupIds.length > 0) ? row.workspaceMemberGroupIds : (row.workspaceMemberGroupId ? [row.workspaceMemberGroupId] : []),
      allowedUserIds: row.allowedUserIds ?? [],
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      defaultAssigneeId: row.defaultAssigneeId,
      defaultAssigneeIds: row.defaultAssigneeIds ?? (row.defaultAssigneeId ? [row.defaultAssigneeId] : []),
      urgency: row.urgency,
      deadlineValue: row.deadlineValue,
      deadlineUnit: row.deadlineUnit,
      reminderBeforeValue: row.reminderBeforeValue,
      reminderBeforeUnit: row.reminderBeforeUnit,
      repeatRule: row.repeatRule,
      closureBy: row.closureBy,
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
    description: body.description,
    label: body.label,
    labels: body.labels,
    workspaceMemberGroupId: body.workspaceMemberGroupId,
    workspaceMemberGroupIds: body.workspaceMemberGroupIds,
    allowedUserIds: body.allowedUserIds,
    ownerId: body.ownerId ?? user.id,
    defaultAssigneeId: body.defaultAssigneeId,
    defaultAssigneeIds: body.defaultAssigneeIds,
    urgency: body.urgency,
    deadlineValue: body.deadlineValue,
    deadlineUnit: body.deadlineUnit,
    reminderBeforeValue: body.reminderBeforeValue,
    reminderBeforeUnit: body.reminderBeforeUnit,
    repeatRule: body.repeatRule,
    closureBy: body.closureBy
  });

  return {
    workflow: {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description ?? null,
      label: workflow.labels?.[0] ?? null,
      labels: workflow.labels ?? [],
      workspaceMemberGroupId: workflow.workspaceMemberGroupId ?? (workflow.workspaceMemberGroupIds?.[0] ?? null),
      workspaceMemberGroupIds: (workflow.workspaceMemberGroupIds && workflow.workspaceMemberGroupIds.length > 0) ? workflow.workspaceMemberGroupIds : (workflow.workspaceMemberGroupId ? [workflow.workspaceMemberGroupId] : []),
      allowedUserIds: workflow.allowedUserIds ?? [],
      ownerId: workflow.ownerId,
      defaultAssigneeId: workflow.defaultAssigneeId,
      defaultAssigneeIds: workflow.defaultAssigneeIds ?? (workflow.defaultAssigneeId ? [workflow.defaultAssigneeId] : []),
      urgency: workflow.urgency,
      deadlineValue: workflow.deadlineValue,
      deadlineUnit: workflow.deadlineUnit,
      reminderBeforeValue: workflow.reminderBeforeValue,
      reminderBeforeUnit: workflow.reminderBeforeUnit,
      repeatRule: workflow.repeatRule,
      closureBy: workflow.closureBy
    },
    stages: createdStages
  };
}

export async function dashboardStats({
  user,
  workspace,
  membership,
  query,
  set
}: Ctx<unknown, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const stats = await getDashboardStats(workspace.id, query.workflowId, {
    userId: user.id,
    role: membership.role
  });
  return { stats };
}

export async function workflowStats({ workflow, membership, set, query }: Ctx<unknown, WorkflowParams> & { query: { range?: string } }) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const rangeDays = parseInt(query.range ?? '30', 10);
  const stats = await getWorkflowStats(workflow.id, isNaN(rangeDays) ? 30 : Math.min(Math.max(rangeDays, 1), 365));
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
      description: workflow.description ?? null,
      label: workflow.labels?.[0] ?? null,
      labels: workflow.labels ?? [],
      workspaceMemberGroupId: workflow.workspaceMemberGroupId ?? (workflow.workspaceMemberGroupIds?.[0] ?? null),
      workspaceMemberGroupIds: (workflow.workspaceMemberGroupIds && workflow.workspaceMemberGroupIds.length > 0) ? workflow.workspaceMemberGroupIds : (workflow.workspaceMemberGroupId ? [workflow.workspaceMemberGroupId] : []),
      allowedUserIds: workflow.allowedUserIds ?? [],
      ownerId: workflow.ownerId,
      defaultAssigneeId: workflow.defaultAssigneeId,
      defaultAssigneeIds: workflow.defaultAssigneeIds ?? (workflow.defaultAssigneeId ? [workflow.defaultAssigneeId] : []),
      urgency: workflow.urgency,
      deadlineValue: workflow.deadlineValue,
      deadlineUnit: workflow.deadlineUnit,
      reminderBeforeValue: workflow.reminderBeforeValue,
      reminderBeforeUnit: workflow.reminderBeforeUnit,
      repeatRule: workflow.repeatRule,
      closureBy: workflow.closureBy,
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
      groups: row.groups,
      templates: row.templates.map(({ template, action }) => ({
        id: template.id,
        label: template.label,
        required: template.required,
        deadlineHours: template.deadlineHours,
        position: template.position,
        groupId: template.groupId,
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

export async function board({ workflow, membership, query, set }: Ctx<unknown, WorkflowParams>) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const parseNumber = (value: string | undefined) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const data = await getBoard(workflow.id, {
    stageId: query.stageId,
    offset: parseNumber(query.offset),
    limit: parseNumber(query.limit),
    search: query.search,
    assigneeId: query.assigneeId,
    tag: query.tag
  });
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

  try {
    const template = await createChecklistTemplate(stage.id, body);
    return { template };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
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

  try {
    await deleteChecklistTemplate(stage.id, params.templateId);
    return { ok: true };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
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
    const result = await importCardsFromCsv(workflow, body.csv, body.mode ?? 'skip', body.columnMapping);
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

export async function deleteCardHandler({
  user,
  workflow,
  membership,
  params,
  set
}: Ctx<unknown, CardParams>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  try {
    const deleted = await deleteCardFromWorkflow(workflow.id, params.cardId);
    if (!deleted) {
      set.status = 404;
      return { error: 'Card not found' };
    }
    return { ok: true, cardId: deleted.id };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
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
  user,
  workspace,
  membership,
  set
}: Ctx<unknown, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const cards = await listWaitingActionCards(workspace.id, {
    userId: user.id,
    role: membership.role
  });
  return { cards };
}

export async function bulkReassign({
  user,
  workspace,
  membership,
  body,
  set
}: Ctx<{ cardIds: string[]; assigneeId: string | null }, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  try {
    const result = await bulkReassignCards(workspace.id, body.cardIds, body.assigneeId, {
      userId: user.id,
      role: membership.role
    });
    return result;
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function moveCard({
  user,
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
    const card = await moveCardToStage(workflow.id, params.cardId, body.stageId, user ? { userId: user.id } : undefined);
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

export async function addCardChecklistItem({
  user,
  workflow,
  membership,
  params,
  body,
  set
}: Ctx<{ label: string; required?: boolean; groupId?: string | null }, CardParams>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  // Drawer add writes to the stage template (mirrored to all cards), so it needs manager rights.
  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  try {
    const item = await addChecklistItemToCard(workflow.id, params.cardId, body);
    return { item };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function deleteCardChecklistItem({
  user,
  workflow,
  membership,
  params,
  set
}: Ctx<unknown, ItemParams>) {
  if (!user || !workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  // Drawer delete removes the item from the stage template too, so it needs manager rights.
  const denied = requireManager(user, membership, workflow, set);
  if (denied) return denied;

  try {
    const ok = await deleteChecklistItemFromCard(workflow.id, params.cardId, params.itemId);
    return { ok };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function createChecklistGroupHandler({
  user,
  workflow,
  membership,
  params,
  body,
  set
}: Ctx<CreateChecklistGroupBody, StageParams>) {
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

  try {
    const group = await createChecklistTemplateGroup(stage.id, body);
    return { group };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function updateChecklistGroupHandler({
  user,
  workflow,
  membership,
  params,
  body,
  set
}: Ctx<UpdateChecklistGroupBody, StageParams & { groupId: string }>) {
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

  try {
    const group = await updateChecklistTemplateGroup(stage.id, params.groupId, body);
    return { group };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function deleteChecklistGroupHandler({
  user,
  workflow,
  membership,
  params,
  query,
  set
}: Ctx<unknown, StageParams & { groupId: string }> & { query: { mode?: DeleteGroupMode } }) {
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

  try {
    await deleteChecklistTemplateGroup(stage.id, params.groupId, query.mode ?? 'move_up');
    return { ok: true };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function moveTemplateItemHandler({
  user,
  workflow,
  membership,
  params,
  body,
  set
}: Ctx<{ groupId: string | null }, StageParams & { templateId: string }>) {
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

  try {
    const template = await moveChecklistTemplateItem(stage.id, params.templateId, body.groupId);
    return { template };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}

export async function cardChecklistBoard({ workflow, membership, params, set }: Ctx<unknown, CardParams>) {
  if (!workflow || !membership) {
    set.status = 404;
    return { error: 'Workflow not found' };
  }

  const board = await getCardChecklistBoard(workflow.id, params.cardId);
  if (!board) {
    set.status = 404;
    return { error: 'Card not found' };
  }
  return { board };
}

export async function saveChecklistLayoutHandler({
  user,
  workflow,
  membership,
  params,
  body,
  set
}: Ctx<{ items: Array<{ id: string; groupId: string | null; position: number }> }, StageParams>) {
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

  try {
    await saveChecklistItemLayout(stage.id, body.items);
    return { ok: true };
  } catch (error) {
    return handleWorkflowError(error, set);
  }
}
