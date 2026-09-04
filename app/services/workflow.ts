import { and, asc, count, eq, inArray, isNotNull, isNull, lte, gte, or, sql } from 'drizzle-orm';
import {
  cards,
  checklistItems,
  checklistTemplates,
  customers,
  db,
  stages,
  users,
  workflows,
  type Workflow
} from '@db';
import { findOrCreateCustomer, normalizeWa } from './customer';
import { parseCustomerCsv, type ColumnMapping } from '../lib/csv';
import { createNotification, hasRecentNotification, resolveNotifyTarget } from './notification';
import { getChecklistActionForTemplate, onCardEnteredStage, upsertChecklistAction } from './whatsapp';
import type { ChecklistActionKind, CardSource } from '@db';
import type { WorkflowDraft } from './ai-workflow';
import { normalizeWorkflowDraft } from './ai-workflow';

export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: 'not_found' | 'forbidden' | 'validation' = 'validation'
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

const DEFAULT_STAGES: { name: string; color: string }[] = [
  { name: 'Pending', color: 'indigo' },
  { name: 'In Progress', color: 'amber' },
  { name: 'Done', color: 'emerald' }
];

export const getWorkflowInWorkspace = async (workspaceId: string, workflowId: string) => {
  const [row] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, workflowId), eq(workflows.workspaceId, workspaceId)))
    .limit(1);

  return row ?? null;
};

export const canManageWorkflow = (
  membershipRole: 'owner' | 'member',
  userId: string,
  workflow: Pick<Workflow, 'ownerId'>
) => membershipRole === 'owner' || workflow.ownerId === userId;
export const listWorkflows = async (workspaceId: string) =>
  db
    .select({
      id: workflows.id,
      name: workflows.name,
      description: workflows.description,
      ownerId: workflows.ownerId,
      defaultAssigneeId: workflows.defaultAssigneeId,
      defaultAssigneeIds: workflows.defaultAssigneeIds,
      urgency: workflows.urgency,
      deadlineValue: workflows.deadlineValue,
      deadlineUnit: workflows.deadlineUnit,
      reminderBeforeValue: workflows.reminderBeforeValue,
      reminderBeforeUnit: workflows.reminderBeforeUnit,
      repeatRule: workflows.repeatRule,
      closureBy: workflows.closureBy,
      createdAt: workflows.createdAt,
      updatedAt: workflows.updatedAt,
      ownerName: users.name
    })
    .from(workflows)
    .innerJoin(users, eq(workflows.ownerId, users.id))
    .where(eq(workflows.workspaceId, workspaceId))
    .orderBy(asc(workflows.name));

export const createWorkflow = async (
  workspaceId: string,
  input: {
    name: string;
    description?: string | null;
    ownerId: string;
    defaultAssigneeId?: string | null;
    defaultAssigneeIds?: string[];
    urgency?: 'high' | 'medium' | 'low';
    deadlineValue?: number | null;
    deadlineUnit?: 'hours' | 'days';
    reminderBeforeValue?: number | null;
    reminderBeforeUnit?: 'hours' | 'days';
    repeatRule?: 'none' | 'daily' | 'weekly' | 'monthly';
    closureBy?: 'initiator' | 'assignee';
  }
) => {
  const defaultAssigneeIds =
    input.defaultAssigneeIds !== undefined
      ? input.defaultAssigneeIds
      : input.defaultAssigneeId
        ? [input.defaultAssigneeId]
        : [input.ownerId];

  const defaultAssigneeId =
    input.defaultAssigneeId !== undefined
      ? input.defaultAssigneeId
      : (defaultAssigneeIds[0] ?? input.ownerId);

  const [workflow] = await db
    .insert(workflows)
    .values({
      workspaceId,
      name: input.name.trim(),
      description: input.description ?? null,
      ownerId: input.ownerId,
      defaultAssigneeId,
      defaultAssigneeIds,
      urgency: input.urgency ?? 'medium',
      deadlineValue: input.deadlineValue ?? null,
      deadlineUnit: input.deadlineUnit ?? 'days',
      reminderBeforeValue: input.reminderBeforeValue ?? null,
      reminderBeforeUnit: input.reminderBeforeUnit ?? 'hours',
      repeatRule: input.repeatRule ?? 'none',
      closureBy: input.closureBy ?? 'initiator'
    })
    .returning();

  const createdStages = await db
    .insert(stages)
    .values(
      DEFAULT_STAGES.map((stage, index) => ({
        workflowId: workflow.id,
        name: stage.name,
        color: stage.color,
        position: index
      }))
    )
    .returning();

  return { workflow, stages: createdStages };
};

export const createWorkflowFromDraft = async (
  workspaceId: string,
  ownerId: string,
  draftInput: WorkflowDraft
) => {
  const draft = normalizeWorkflowDraft(draftInput);
  if (draft.stages.length === 0) {
    throw new WorkflowError('Draft workflow harus punya minimal 1 stage.');
  }

  const [workflow] = await db
    .insert(workflows)
    .values({
      workspaceId,
      name: draft.name,
      ownerId,
      defaultAssigneeId: ownerId,
      defaultAssigneeIds: [ownerId],
      urgency: draft.urgency ?? 'medium',
      deadlineValue: draft.deadlineValue ?? null,
      deadlineUnit: draft.deadlineUnit ?? 'days',
      reminderBeforeValue: draft.reminderBeforeValue ?? null,
      reminderBeforeUnit: draft.reminderBeforeUnit ?? 'hours',
      repeatRule: draft.repeatRule ?? 'none',
      closureBy: draft.closureBy ?? 'initiator'
    })
    .returning();

  const createdStages = [];

  for (let index = 0; index < draft.stages.length; index += 1) {
    const stageDraft = draft.stages[index];
    const [stage] = await db
      .insert(stages)
      .values({
        workflowId: workflow.id,
        name: stageDraft.name,
        color: stageDraft.color ?? 'indigo',
        position: index,
        onReplyNotify: stageDraft.onReplyNotify ?? false,
        overdueReminderHours: stageDraft.overdueReminderHours ?? null,
        autoMoveOnComplete: stageDraft.autoMoveOnComplete ?? false
      })
      .returning();

    for (let cIndex = 0; cIndex < stageDraft.checklists.length; cIndex += 1) {
      const checklist = stageDraft.checklists[cIndex];
      const [template] = await db
        .insert(checklistTemplates)
        .values({
          stageId: stage.id,
          label: checklist.label,
          required: checklist.required ?? true,
          deadlineHours: checklist.deadlineHours ?? null,
          position: cIndex
        })
        .returning();

      if (checklist.action && checklist.action.kind !== 'none') {
        await upsertChecklistAction(template.id, checklist.action);
      }
    }

    createdStages.push(stage);
  }

  return { workflow, stages: createdStages };
};

export const updateWorkflow = async (
  workflowId: string,
  input: {
    name?: string;
    description?: string | null;
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
  }
) => {
  let defaultAssigneeIds = input.defaultAssigneeIds;
  let defaultAssigneeId = input.defaultAssigneeId;

  if (defaultAssigneeIds !== undefined && defaultAssigneeId === undefined) {
    defaultAssigneeId = defaultAssigneeIds[0] ?? null;
  } else if (defaultAssigneeId !== undefined && defaultAssigneeIds === undefined) {
    defaultAssigneeIds = defaultAssigneeId ? [defaultAssigneeId] : [];
  }

  const [workflow] = await db
    .update(workflows)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
      ...(defaultAssigneeId !== undefined ? { defaultAssigneeId } : {}),
      ...(defaultAssigneeIds !== undefined ? { defaultAssigneeIds } : {}),
      ...(input.urgency !== undefined ? { urgency: input.urgency } : {}),
      ...(input.deadlineValue !== undefined ? { deadlineValue: input.deadlineValue } : {}),
      ...(input.deadlineUnit !== undefined ? { deadlineUnit: input.deadlineUnit } : {}),
      ...(input.reminderBeforeValue !== undefined ? { reminderBeforeValue: input.reminderBeforeValue } : {}),
      ...(input.reminderBeforeUnit !== undefined ? { reminderBeforeUnit: input.reminderBeforeUnit } : {}),
      ...(input.repeatRule !== undefined ? { repeatRule: input.repeatRule } : {}),
      ...(input.closureBy !== undefined ? { closureBy: input.closureBy } : {}),
      updatedAt: new Date()
    })
    .where(eq(workflows.id, workflowId))
    .returning();

  return workflow ?? null;
};

export const deleteWorkflow = async (workflowId: string) => {
  const [deleted] = await db.delete(workflows).where(eq(workflows.id, workflowId)).returning();
  return deleted ?? null;
};

export const listStages = async (workflowId: string) =>
  db
    .select()
    .from(stages)
    .where(eq(stages.workflowId, workflowId))
    .orderBy(asc(stages.position), asc(stages.createdAt));

export const getStageInWorkflow = async (workflowId: string, stageId: string) => {
  const [row] = await db
    .select()
    .from(stages)
    .where(and(eq(stages.id, stageId), eq(stages.workflowId, workflowId)))
    .limit(1);

  return row ?? null;
};

export const createStage = async (
  workflowId: string,
  input: { name: string; color?: string }
) => {
  const existing = await listStages(workflowId);
  const position = existing.length;

  const [stage] = await db
    .insert(stages)
    .values({
      workflowId,
      name: input.name.trim(),
      color: input.color?.trim() || 'indigo',
      position
    })
    .returning();

  return stage;
};

export const updateStage = async (
  stageId: string,
  input: {
    name?: string;
    color?: string;
    position?: number;
    onReplyNotify?: boolean;
    overdueReminderHours?: number | null;
    nextWorkflowId?: string | null;
  }
) => {
  if (input.nextWorkflowId) {
    const [stageRow] = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
    if (stageRow) {
      const [target] = await db
        .select({ id: workflows.id, workspaceId: workflows.workspaceId })
        .from(workflows)
        .where(eq(workflows.id, input.nextWorkflowId))
        .limit(1);
      const [sourceWf] = await db
        .select({ workspaceId: workflows.workspaceId })
        .from(workflows)
        .where(eq(workflows.id, stageRow.workflowId))
        .limit(1);
      if (!target || !sourceWf || target.workspaceId !== sourceWf.workspaceId) {
        throw new WorkflowError('Workflow tujuan estafet tidak valid.');
      }
      if (target.id === stageRow.workflowId) {
        throw new WorkflowError('Workflow tujuan tidak boleh sama dengan workflow saat ini.');
      }
    }
  }

  const [stage] = await db
    .update(stages)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.color !== undefined ? { color: input.color.trim() || 'indigo' } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.onReplyNotify !== undefined ? { onReplyNotify: input.onReplyNotify } : {}),
      ...(input.overdueReminderHours !== undefined
        ? { overdueReminderHours: input.overdueReminderHours }
        : {}),
      ...(input.nextWorkflowId !== undefined ? { nextWorkflowId: input.nextWorkflowId } : {}),
      updatedAt: new Date()
    })
    .where(eq(stages.id, stageId))
    .returning();

  return stage ?? null;
};

export const deleteStage = async (workflowId: string, stageId: string) => {
  const workflowStages = await listStages(workflowId);
  if (workflowStages.length <= 1) {
    throw new WorkflowError('Workflow must have at least one stage.');
  }

  const [cardCount] = await db
    .select({ value: count() })
    .from(cards)
    .where(eq(cards.stageId, stageId));

  if (Number(cardCount?.value ?? 0) > 0) {
    throw new WorkflowError('Move or remove cards before deleting this stage.');
  }

  const [deleted] = await db.delete(stages).where(eq(stages.id, stageId)).returning();
  if (!deleted) return null;

  const remaining = workflowStages.filter((stage) => stage.id !== stageId);
  await Promise.all(
    remaining.map((stage, index) =>
      db.update(stages).set({ position: index, updatedAt: new Date() }).where(eq(stages.id, stage.id))
    )
  );

  return deleted;
};

export const reorderStages = async (workflowId: string, orderedStageIds: string[]) => {
  const workflowStages = await listStages(workflowId);
  const existingIds = new Set(workflowStages.map((s) => s.id));
  if (
    orderedStageIds.length !== workflowStages.length ||
    !orderedStageIds.every((id) => existingIds.has(id))
  ) {
    throw new WorkflowError('Daftar stage tidak valid untuk workflow ini.');
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedStageIds.length; i++) {
      await tx
        .update(stages)
        .set({ position: -(i + 1000) })
        .where(eq(stages.id, orderedStageIds[i]));
    }
    for (let i = 0; i < orderedStageIds.length; i++) {
      await tx
        .update(stages)
        .set({ position: i, updatedAt: new Date() })
        .where(eq(stages.id, orderedStageIds[i]));
    }
  });

  return listStages(workflowId);
};

export const listChecklistTemplates = async (stageId: string) =>
  db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.stageId, stageId))
    .orderBy(asc(checklistTemplates.position), asc(checklistTemplates.createdAt));

export const createChecklistTemplate = async (
  stageId: string,
  input: { label: string; required?: boolean }
) => {
  const existing = await listChecklistTemplates(stageId);

  const [template] = await db
    .insert(checklistTemplates)
    .values({
      stageId,
      label: input.label.trim(),
      required: input.required ?? true,
      position: existing.length
    })
    .returning();

  return template;
};

export const updateChecklistTemplate = async (
  templateId: string,
  input: { label?: string; required?: boolean; position?: number }
) => {
  const [template] = await db
    .update(checklistTemplates)
    .set({
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(input.required !== undefined ? { required: input.required } : {}),
      ...(input.position !== undefined ? { position: input.position } : {})
    })
    .where(eq(checklistTemplates.id, templateId))
    .returning();

  return template ?? null;
};

export const deleteChecklistTemplate = async (templateId: string) => {
  const [deleted] = await db
    .delete(checklistTemplates)
    .where(eq(checklistTemplates.id, templateId))
    .returning();

  return deleted ?? null;
};

const copyChecklistTemplatesToCard = async (cardId: string, stageId: string) => {
  const templates = await listChecklistTemplates(stageId);
  if (templates.length === 0) return [];

  return db
    .insert(checklistItems)
    .values(
      templates.map((template, index) => ({
        cardId,
        stageId,
        templateId: template.id,
        label: template.label,
        required: template.required,
        position: index
      }))
    )
    .returning();
};

export const findCardByCustomerInWorkflow = async (workflowId: string, customerId: string) => {
  const [row] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.workflowId, workflowId), eq(cards.customerId, customerId)))
    .limit(1);

  return row ?? null;
};
/**
 * Compute the due date for a card based on the workflow deadline config.
 * Returns null if the workflow has no deadline configured.
 */
export const computeDueAt = (workflow: Workflow, from: Date = new Date()): Date | null => {
  if (!workflow.deadlineValue || workflow.deadlineValue <= 0) return null;
  const ms = workflow.deadlineUnit === 'hours'
    ? workflow.deadlineValue * 60 * 60 * 1000
    : workflow.deadlineValue * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + ms);
};

export const createCard = async (
  workflow: Workflow,
  input: {
    name: string;
    wa: string;
    countryCode?: string;
    product?: string | null;
    tag?: string | null;
    assigneeId?: string | null;
    allowDuplicate?: boolean;
    source?: CardSource;
  }
) => {
  const workflowStages = await listStages(workflow.id);
  const firstStage = workflowStages[0];
  if (!firstStage) {
    throw new WorkflowError('Workflow has no stages.');
  }

  const customer = await findOrCreateCustomer(workflow.workspaceId, {
    name: input.name,
    wa: input.wa,
    countryCode: input.countryCode
  });

  const existing = await findCardByCustomerInWorkflow(workflow.id, customer.id);
  if (existing && !input.allowDuplicate) {
    throw new WorkflowError('Pelanggan ini sudah punya card di workflow ini.');
  }

  let assignedUserId: string | null = null;
  if (input.assigneeId !== undefined) {
    assignedUserId = input.assigneeId;
  } else {
    const defaultIds = workflow.defaultAssigneeIds ?? [];
    if (defaultIds.length > 1) {
      const [{ count: cardCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(cards)
        .where(eq(cards.workflowId, workflow.id));
      assignedUserId = defaultIds[cardCount % defaultIds.length] ?? null;
    } else if (defaultIds.length === 1) {
      assignedUserId = defaultIds[0] ?? null;
    } else {
      assignedUserId = workflow.defaultAssigneeId ?? null;
    }
  }

  const [card] = await db
    .insert(cards)
    .values({
      workflowId: workflow.id,
      stageId: firstStage.id,
      customerId: customer.id,
      product: input.product?.trim() || null,
      tag: input.tag?.trim() || null,
      assigneeId: assignedUserId,
      source: input.source ?? 'manual',
      dueAt: computeDueAt(workflow)
    })
    .returning();

  await copyChecklistTemplatesToCard(card.id, firstStage.id);
  await onCardEnteredStage(card.id, firstStage.id);
  return { card, customer };
};

export const updateCardAssignee = async (
  workflowId: string,
  cardId: string,
  assigneeId: string | null
) => {
  const card = await getCardInWorkflow(workflowId, cardId);
  if (!card) throw new WorkflowError('Card not found.', 'not_found');

  const [updated] = await db
    .update(cards)
    .set({ assigneeId, updatedAt: new Date() })
    .where(eq(cards.id, cardId))
    .returning();

  return updated;
};

export type ImportCardsResult = {
  created: number;
  skipped: number;
  updated: number;
  errors: Array<{ row: number; reason: string }>;
};

export const importCardsFromCsv = async (
  workflow: Workflow,
  csvText: string,
  mode: 'skip' | 'update' = 'skip',
  columnMapping?: ColumnMapping
): Promise<ImportCardsResult> => {
  const rows = parseCustomerCsv(csvText, columnMapping);
  const result: ImportCardsResult = { created: 0, skipped: 0, updated: 0, errors: [] };

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNum = index + 1;

    if (!row.name.trim() || !row.wa.trim()) {
      result.errors.push({ row: rowNum, reason: 'Nama dan WA wajib diisi.' });
      continue;
    }

    const wa = normalizeWa(row.wa);
    if (!wa) {
      result.errors.push({ row: rowNum, reason: 'Nomor WA tidak valid.' });
      continue;
    }

    try {
      const customer = await findOrCreateCustomer(workflow.workspaceId, {
        name: row.name.trim(),
        wa: row.wa
      });

      const existing = await findCardByCustomerInWorkflow(workflow.id, customer.id);
      if (existing) {
        if (mode === 'update') {
          await db
            .update(cards)
            .set({
              product: row.product?.trim() || existing.product,
              tag: row.tag?.trim() || existing.tag,
              updatedAt: new Date()
            })
            .where(eq(cards.id, existing.id));
          result.updated += 1;
        } else {
          result.skipped += 1;
        }
        continue;
      }

      await createCard(workflow, {
        name: row.name.trim(),
        wa: row.wa,
        product: row.product,
        tag: row.tag,
        allowDuplicate: true,
        source: 'csv'
      });
      result.created += 1;
    } catch (error) {
      result.errors.push({
        row: rowNum,
        reason: error instanceof Error ? error.message : 'Gagal memproses baris.'
      });
    }
  }

  return result;
};

export const getCardInWorkflow = async (workflowId: string, cardId: string) => {
  const [row] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.workflowId, workflowId)))
    .limit(1);

  return row ?? null;
};
export const deleteCard = async (workflowId: string, cardId: string) => {
  const card = await getCardInWorkflow(workflowId, cardId);
  if (!card) throw new WorkflowError('Card not found.', 'not_found');

  const [deleted] = await db.delete(cards).where(eq(cards.id, cardId)).returning();
  return deleted ?? null;
};

export const getCardChecklistForStage = async (cardId: string, stageId: string) =>
  db
    .select()
    .from(checklistItems)
    .where(and(eq(checklistItems.cardId, cardId), eq(checklistItems.stageId, stageId)))
    .orderBy(asc(checklistItems.position), asc(checklistItems.createdAt));

const getChecklistProgress = async (cardId: string, stageId: string) => {
  const items = await getCardChecklistForStage(cardId, stageId);
  const required = items.filter((item) => item.required);
  const done = required.filter((item) => item.done);
  return { done: done.length, total: required.length, items };
};
export const advanceCardIfChecklistComplete = async (cardId: string) => {
  const [card] = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  if (!card) return null;

  const progress = await getChecklistProgress(card.id, card.stageId);
  if (progress.total === 0 || progress.done < progress.total) return null;

  const workflowStages = await listStages(card.workflowId);
  const currentIndex = workflowStages.findIndex((stage) => stage.id === card.stageId);
  const nextStage = currentIndex >= 0 ? workflowStages[currentIndex + 1] : undefined;
  if (!nextStage) return null;

  return moveCardToStage(card.workflowId, card.id, nextStage.id);
};


export const getBoard = async (workflowId: string) => {
  const workflowStages = await listStages(workflowId);
  const workflowCards = await db
    .select({
      card: cards,
      assigneeName: users.name,
      customerName: customers.name,
      customerWa: customers.wa
    })
    .from(cards)
    .innerJoin(customers, eq(cards.customerId, customers.id))
    .leftJoin(users, eq(cards.assigneeId, users.id))
    .where(eq(cards.workflowId, workflowId))
    .orderBy(asc(cards.createdAt));

  const cardIds = workflowCards.map((row) => row.card.id);
  const allItems =
    cardIds.length === 0
      ? []
      : await db
          .select()
          .from(checklistItems)
          .where(inArray(checklistItems.cardId, cardIds))
          .orderBy(asc(checklistItems.position));

  const itemsByCardStage = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const key = `${item.cardId}:${item.stageId}`;
    const bucket = itemsByCardStage.get(key) ?? [];
    bucket.push(item);
    itemsByCardStage.set(key, bucket);
  }

  const columns = workflowStages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    position: stage.position,
    cards: workflowCards
      .filter((row) => row.card.stageId === stage.id)
      .map((row) => {
        const stageItems = itemsByCardStage.get(`${row.card.id}:${stage.id}`) ?? [];
        const required = stageItems.filter((item) => item.required);
        const done = required.filter((item) => item.done);

        return {
          id: row.card.id,
          customerName: row.customerName,
          customerWa: row.customerWa,
          product: row.card.product,
          tag: row.card.tag,
          assigneeId: row.card.assigneeId,
          assigneeName: row.assigneeName,
          stageId: row.card.stageId,
          checklistDone: done.length,
          checklistTotal: required.length,
          waErrorFlag: row.card.waErrorFlag,
          dueAt: row.card.dueAt,
          completedAt: row.card.completedAt,
          createdAt: row.card.createdAt
        };
      })
  }));

  return { stages: workflowStages, columns };
};

export const getCardDetail = async (workflowId: string, cardId: string) => {
  const card = await getCardInWorkflow(workflowId, cardId);
  if (!card) return null;

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, card.customerId))
    .limit(1);

  const [assignee] = card.assigneeId
    ? await db.select({ name: users.name }).from(users).where(eq(users.id, card.assigneeId)).limit(1)
    : [];

  const stage = await getStageInWorkflow(workflowId, card.stageId);
  const checklist = stage ? await getCardChecklistForStage(cardId, stage.id) : [];
  const workflowStages = await listStages(workflowId);
  const stageIndex = workflowStages.findIndex((item) => item.id === card.stageId);
  const nextStage = stageIndex >= 0 ? workflowStages[stageIndex + 1] : undefined;

  const nextWorkflow = stage?.nextWorkflowId
    ? (
        await db
          .select({ id: workflows.id, name: workflows.name })
          .from(workflows)
          .where(eq(workflows.id, stage.nextWorkflowId))
          .limit(1)
      )[0] ?? null
    : null;

  return {
    card,
    customer: customer ?? null,
    stage,
    checklist,
    assigneeName: assignee?.name ?? null,
    nextStage: nextStage ?? null,
    nextWorkflow,
    waErrorFlag: card.waErrorFlag,
    waFollowupsStopped: card.waFollowupsStopped
  };
};

export const relayCardToNextWorkflow = async (sourceWorkflowId: string, cardId: string) => {
  const card = await getCardInWorkflow(sourceWorkflowId, cardId);
  if (!card) throw new WorkflowError('Card not found.', 'not_found');

  const stage = await getStageInWorkflow(sourceWorkflowId, card.stageId);
  if (!stage?.nextWorkflowId) {
    throw new WorkflowError('Stage ini belum dikonfigurasi untuk estafet.');
  }

  const targetWorkflow = await getWorkflowInWorkspace(
    (
      await db
        .select({ workspaceId: workflows.workspaceId })
        .from(workflows)
        .where(eq(workflows.id, sourceWorkflowId))
        .limit(1)
    )[0]?.workspaceId ?? '',
    stage.nextWorkflowId
  );

  if (!targetWorkflow) {
    throw new WorkflowError('Workflow tujuan estafet tidak ditemukan.', 'not_found');
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, card.customerId))
    .limit(1);

  if (!customer) throw new WorkflowError('Pelanggan tidak ditemukan.', 'not_found');

  const existing = await findCardByCustomerInWorkflow(targetWorkflow.id, customer.id);
  if (existing) {
    throw new WorkflowError('Pelanggan sudah punya card di workflow tujuan.');
  }

  const { card: newCard } = await createCard(targetWorkflow, {
    name: customer.name,
    wa: customer.wa,
    product: card.product,
    tag: card.tag,
    source: 'estafet'
  });

  return {
    sourceCardId: card.id,
    card: newCard,
    workflow: { id: targetWorkflow.id, name: targetWorkflow.name }
  };
};

export const listWaitingActionCards = async (workspaceId: string) =>
  db
    .select({
      cardId: cards.id,
      workflowId: workflows.id,
      workflowName: workflows.name,
      customerName: customers.name,
      customerWa: customers.wa,
      stageName: stages.name,
      assigneeId: cards.assigneeId,
      assigneeName: users.name,
      waErrorFlag: cards.waErrorFlag,
      waFollowupsStopped: cards.waFollowupsStopped,
      product: cards.product,
      tag: cards.tag
    })
    .from(cards)
    .innerJoin(workflows, eq(cards.workflowId, workflows.id))
    .innerJoin(customers, eq(cards.customerId, customers.id))
    .innerJoin(stages, eq(cards.stageId, stages.id))
    .leftJoin(users, eq(cards.assigneeId, users.id))
    .where(
      and(
        eq(workflows.workspaceId, workspaceId),
        or(eq(cards.waErrorFlag, true), eq(cards.waFollowupsStopped, true))
      )
    )
    .orderBy(asc(cards.updatedAt));

export const bulkReassignCards = async (
  workspaceId: string,
  cardIds: string[],
  assigneeId: string | null
) => {
  if (cardIds.length === 0) return { updated: 0 };

  const rows = await db
    .select({ cardId: cards.id, workflowId: cards.workflowId })
    .from(cards)
    .innerJoin(workflows, eq(cards.workflowId, workflows.id))
    .where(and(eq(workflows.workspaceId, workspaceId), inArray(cards.id, cardIds)));

  if (rows.length !== cardIds.length) {
    throw new WorkflowError('Beberapa card tidak valid untuk workspace ini.');
  }

  await db
    .update(cards)
    .set({ assigneeId, updatedAt: new Date() })
    .where(inArray(cards.id, cardIds));

  return { updated: rows.length };
};

export const toggleChecklistItem = async (
  workflowId: string,
  cardId: string,
  itemId: string,
  done: boolean
) => {
  const card = await getCardInWorkflow(workflowId, cardId);
  if (!card) throw new WorkflowError('Card not found.', 'not_found');

  const [item] = await db
    .select()
    .from(checklistItems)
    .where(and(eq(checklistItems.id, itemId), eq(checklistItems.cardId, cardId)))
    .limit(1);

  if (!item) throw new WorkflowError('Checklist item not found.', 'not_found');
  if (item.stageId !== card.stageId) {
    throw new WorkflowError('Checklist item does not belong to the current stage.');
  }

  const [updated] = await db
    .update(checklistItems)
    .set({ done, updatedAt: new Date() })
    .where(eq(checklistItems.id, itemId))
    .returning();

  if (done) {
    await advanceCardIfChecklistComplete(cardId);
  }

  return updated;
};

export const moveCardToStage = async (
  workflowId: string,
  cardId: string,
  toStageId: string,
  actor?: { userId: string }
) => {
  const card = await getCardInWorkflow(workflowId, cardId);
  if (!card) throw new WorkflowError('Card not found.', 'not_found');

  const targetStage = await getStageInWorkflow(workflowId, toStageId);
  if (!targetStage) throw new WorkflowError('Stage not found.', 'not_found');

  if (card.stageId === toStageId) {
    return card;
  }

  const workflowStages = await listStages(workflowId);
  const fromIndex = workflowStages.findIndex((stage) => stage.id === card.stageId);
  const toIndex = workflowStages.findIndex((stage) => stage.id === toStageId);

  if (fromIndex < 0 || toIndex < 0) {
    throw new WorkflowError('Invalid stage.');
  }

  if (toIndex > fromIndex) {
    const progress = await getChecklistProgress(card.id, card.stageId);
    if (progress.total > 0 && progress.done < progress.total) {
      throw new WorkflowError('Selesaikan checklist wajib sebelum pindah stage.');
    }
  }

  // Closure permission: moving to the last stage (Completed) requires the right person.
  const isLastStage = toIndex === workflowStages.length - 1;
  if (isLastStage && actor) {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);
    if (workflow) {
      if (workflow.closureBy === 'initiator') {
        if (actor.userId !== workflow.ownerId) {
          throw new WorkflowError('Hanya initiator (PIC workflow) yang boleh menutup task.', 'forbidden');
        }
      } else if (workflow.closureBy === 'assignee') {
        if (actor.userId !== card.assigneeId) {
          throw new WorkflowError('Hanya assignee yang boleh menutup task.', 'forbidden');
        }
      }
    }
  }

  const updateSet: Record<string, unknown> = { stageId: toStageId, updatedAt: new Date() };
  if (isLastStage) {
    updateSet.completedAt = new Date();
    if (actor) updateSet.completedById = actor.userId;
  }

  const [updated] = await db
    .update(cards)
    .set(updateSet)
    .where(and(eq(cards.id, cardId), eq(cards.stageId, card.stageId)))
    .returning();

  if (!updated) {
    const current = await getCardInWorkflow(workflowId, cardId);
    if (current?.stageId === toStageId) return current;
    throw new WorkflowError('Card stage changed. Try again.');
  }

  const existingItems = await getCardChecklistForStage(cardId, toStageId);
  if (existingItems.length === 0) {
    await copyChecklistTemplatesToCard(cardId, toStageId);
  }

  await onCardEnteredStage(cardId, toStageId);

  return updated;
};

export const getDashboardStats = async (workspaceId: string, workflowId?: string) => {
  const workflowRows = workflowId
    ? await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.workspaceId, workspaceId), eq(workflows.id, workflowId)))
    : await db.select().from(workflows).where(eq(workflows.workspaceId, workspaceId));

  let pending = 0;
  let progress = 0;
  let waiting = 0;
  let done = 0;

  for (const wf of workflowRows) {
    const stagesList = await listStages(wf.id);
    if (stagesList.length === 0) continue;

    const firstStageId = stagesList[0].id;
    const lastStageId = stagesList[stagesList.length - 1].id;
    const wfCards = await db.select().from(cards).where(eq(cards.workflowId, wf.id));

    for (const card of wfCards) {
      if (card.waErrorFlag || card.waFollowupsStopped) {
        waiting += 1;
      } else if (card.stageId === firstStageId) {
        pending += 1;
      } else if (card.stageId === lastStageId) {
        done += 1;
      } else {
        progress += 1;
      }
    }
  }

  const [[customerRow]] = await Promise.all([
    db
      .select({ value: count(customers.id) })
      .from(customers)
      .where(eq(customers.workspaceId, workspaceId))
  ]);

  return {
    totalCards: pending + progress + waiting + done,
    totalCustomers: Number(customerRow?.value ?? 0),
    pending,
    progress,
    waiting,
    done
  };
};

export type WorkflowStageStat = {
  stageId: string;
  stageName: string;
  position: number;
  total: number;
  overdue: number;
};

export type WorkflowAssigneeStat = {
  assigneeId: string | null;
  assigneeName: string | null;
  active: number;
  overdue: number;
  waiting: number;
  done: number;
};

export type WorkflowTimeBucket = {
  date: string; // ISO date string YYYY-MM-DD
  created: number;
  completed: number;
};

export type WorkflowStats = {
  workflowId: string;
  totals: {
    active: number;
    waiting: number;
    overdue: number;
    done: number;
  };
  byStage: WorkflowStageStat[];
  byAssignee: WorkflowAssigneeStat[];
  byTime: WorkflowTimeBucket[];
};

export const getWorkflowStats = async (workflowId: string, rangeDays = 30): Promise<WorkflowStats> => {
  const workflowStages = await listStages(workflowId);
  if (workflowStages.length === 0) {
    return {
      workflowId,
      totals: { active: 0, waiting: 0, overdue: 0, done: 0 },
      byStage: [],
      byAssignee: [],
      byTime: []
    };
  }

  const firstStageId = workflowStages[0].id;
  const lastStageId = workflowStages[workflowStages.length - 1].id;

  const allCards = await db.select().from(cards).where(eq(cards.workflowId, workflowId));

  let active = 0;
  let waiting = 0;
  let overdue = 0;
  let done = 0;

  const stageStatsMap = new Map<string, WorkflowStageStat>();
  for (const stage of workflowStages) {
    stageStatsMap.set(stage.id, {
      stageId: stage.id,
      stageName: stage.name,
      position: stage.position,
      total: 0,
      overdue: 0
    });
  }

  const now = Date.now();
  for (const card of allCards) {
    const stageStat = stageStatsMap.get(card.stageId);
    if (stageStat) stageStat.total += 1;

    if (card.waErrorFlag || card.waFollowupsStopped) {
      waiting += 1;
    } else if (card.stageId === firstStageId) {
      active += 1;
    } else if (card.stageId === lastStageId) {
      done += 1;
    } else {
      active += 1;
    }

    // Overdue: card stuck in a stage longer than stage.overdueReminderHours
    const stage = workflowStages.find((s) => s.id === card.stageId);
    if (stage?.overdueReminderHours && stage.overdueReminderHours > 0) {
      const cutoff = now - stage.overdueReminderHours * 60 * 60 * 1000;
      if (card.stageEnteredAt.getTime() <= cutoff) {
        overdue += 1;
        if (stageStat) stageStat.overdue += 1;
      }
    }
  }

  // Per-assignee breakdown
  const assigneeMap = new Map<string, WorkflowAssigneeStat>();
  for (const card of allCards) {
    const key = card.assigneeId ?? 'unassigned';
    const existing = assigneeMap.get(key) ?? {
      assigneeId: card.assigneeId,
      assigneeName: null,
      active: 0,
      overdue: 0,
      waiting: 0,
      done: 0
    };

    if (card.waErrorFlag || card.waFollowupsStopped) {
      existing.waiting += 1;
    } else if (card.stageId === lastStageId) {
      existing.done += 1;
    } else {
      existing.active += 1;
    }

    const stage = workflowStages.find((s) => s.id === card.stageId);
    if (stage?.overdueReminderHours && stage.overdueReminderHours > 0) {
      const cutoff = now - stage.overdueReminderHours * 60 * 60 * 1000;
      if (card.stageEnteredAt.getTime() <= cutoff) {
        existing.overdue += 1;
      }
    }

    assigneeMap.set(key, existing);
  }

  // Resolve assignee names
  const assigneeIds = [...assigneeMap.keys()].filter((id) => id !== 'unassigned');
  if (assigneeIds.length > 0) {
    const assigneeRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, assigneeIds));
    for (const row of assigneeRows) {
      const entry = assigneeMap.get(row.id);
      if (entry) entry.assigneeName = row.name;
    }
  }


  // Per-day breakdown for the selected range
  const days = Math.min(Math.max(rangeDays, 1), 365);
  const startDate = new Date(now - (days - 1) * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  const dayBuckets: WorkflowTimeBucket[] = [];
  for (let d = 0; d < days; d++) {
    const dayStart = new Date(startDate.getTime() + d * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dateStr = dayStart.toISOString().slice(0, 10);

    const created = allCards.filter(
      (c) => c.createdAt >= dayStart && c.createdAt < dayEnd
    ).length;
    const completed = allCards.filter(
      (c) => c.stageId === lastStageId && c.stageEnteredAt >= dayStart && c.stageEnteredAt < dayEnd
    ).length;

    dayBuckets.push({ date: dateStr, created, completed });
  }
  return {
    workflowId,
    totals: { active, waiting, overdue, done },
    byStage: [...stageStatsMap.values()].sort((a, b) => a.position - b.position),
    byAssignee: [...assigneeMap.values()],
    byTime: dayBuckets
  };
};

export const updateTemplateAction = async (
  templateId: string,
  input: {
    kind: ChecklistActionKind;
    messageTemplate?: string | null;
    delayMinutes?: number;
    followupIfNoReply?: boolean;
  }
) => upsertChecklistAction(templateId, input);

export const getWorkflowSetup = async (workflowId: string) => {
  const workflowStages = await listStages(workflowId);
  const templatesByStage = await Promise.all(
    workflowStages.map(async (stage) => {
      const templates = await listChecklistTemplates(stage.id);
      const withActions = await Promise.all(
        templates.map(async (template) => ({
          template,
          action: await getChecklistActionForTemplate(template.id)
        }))
      );

      return { stage, templates: withActions };
    })
  );

  return templatesByStage;
};

/* --------------------------------------------------------- deadline notifications */

/**
 * Process cards approaching their due date.
 * Sends a `card_due_soon` notification when `now >= dueAt - reminderBefore`
 * and the card hasn't been notified yet and isn't completed.
 */
export const processDueSoonNotifications = async (): Promise<number> => {
  const now = Date.now();

  // Find workflows with a reminder configured.
  const reminderWorkflows = await db
    .select()
    .from(workflows)
    .where(and(
      isNotNull(workflows.reminderBeforeValue),
      sql`${workflows.reminderBeforeValue} > 0`
    ));

  let notified = 0;

  for (const wf of reminderWorkflows) {
    if (!wf.reminderBeforeValue) continue;
    const reminderMs = wf.reminderBeforeUnit === 'hours'
      ? wf.reminderBeforeValue * 60 * 60 * 1000
      : wf.reminderBeforeValue * 24 * 60 * 60 * 1000;
    const threshold = new Date(now + reminderMs);

    // Cards with dueAt approaching, not yet notified, not completed.
    const approaching = await db
      .select({
        card: cards,
        customerName: customers.name,
        workflowName: workflows.name
      })
      .from(cards)
      .innerJoin(customers, eq(cards.customerId, customers.id))
      .innerJoin(workflows, eq(cards.workflowId, workflows.id))
      .where(and(
        eq(cards.workflowId, wf.id),
        isNotNull(cards.dueAt),
        lte(cards.dueAt, threshold),
        isNull(cards.dueSoonNotifiedAt),
        isNull(cards.completedAt)
      ));

    for (const row of approaching) {
      const targetUserId = await resolveNotifyTarget(wf.workspaceId, row.card.assigneeId);
      if (!targetUserId) continue;

      const dueStr = row.card.dueAt!.toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      await createNotification({
        workspaceId: wf.workspaceId,
        userId: targetUserId,
        cardId: row.card.id,
        type: 'card_due_soon',
        title: 'Deadline mendekat',
        body: `${row.customerName} — ${row.workflowName} jatuh tempo ${dueStr}.`
      });

      await db
        .update(cards)
        .set({ dueSoonNotifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(cards.id, row.card.id));

      notified += 1;
    }
  }

  return notified;
};

/**
 * Process cards that have passed their due date without being completed.
 * Sends a `card_overdue` notification (distinct from the stage-overdue reminder).
 */
export const processOverdueNotifications = async (): Promise<number> => {
  const now = new Date();

  const overdueCards = await db
    .select({
      card: cards,
      customerName: customers.name,
      workflowName: workflows.name,
      workspaceId: workflows.workspaceId
    })
    .from(cards)
    .innerJoin(customers, eq(cards.customerId, customers.id))
    .innerJoin(workflows, eq(cards.workflowId, workflows.id))
    .where(and(
      isNotNull(cards.dueAt),
      lte(cards.dueAt, now),
      isNull(cards.overdueNotifiedAt),
      isNull(cards.completedAt)
    ));

  let notified = 0;

  for (const row of overdueCards) {
    const targetUserId = await resolveNotifyTarget(row.workspaceId, row.card.assigneeId);
    if (!targetUserId) continue;

    const dueStr = row.card.dueAt!.toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    await createNotification({
      workspaceId: row.workspaceId,
      userId: targetUserId,
      cardId: row.card.id,
      type: 'card_overdue',
      title: 'Task melewati deadline',
      body: `${row.customerName} — ${row.workflowName} terlambat. Deadline: ${dueStr}.`
    });

    await db
      .update(cards)
      .set({ overdueNotifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(cards.id, row.card.id));

    notified += 1;
  }

  return notified;
};

/* --------------------------------------------------------- recurrence */

/**
 * Process recurring workflows: spawn new cards for each customer at the cycle boundary.
 * For each workflow with repeatRule != 'none', find customers who had a card in the previous
 * cycle and create a new card for the current cycle if one doesn't already exist.
 */
export const processRecurringWorkflows = async (): Promise<number> => {
  const recurringWorkflows = await db
    .select()
    .from(workflows)
    .where(sql`${workflows.repeatRule} != 'none'`);

  let spawned = 0;
  const now = new Date();

  for (const wf of recurringWorkflows) {
    const cycleStart = getCycleStart(wf.repeatRule, now);
    const cycleEnd = getCycleEnd(wf.repeatRule, now);

    // Find all customers who had a card in this workflow in the previous cycle.
    const prevCycleCards = await db
      .select({ customerId: cards.customerId })
      .from(cards)
      .where(and(
        eq(cards.workflowId, wf.id),
        gte(cards.createdAt, cycleStart),
        lte(cards.createdAt, cycleEnd)
      ))
      .groupBy(cards.customerId);

    for (const { customerId } of prevCycleCards) {
      // Check if a card already exists for this cycle.
      const existing = await db
        .select({ id: cards.id })
        .from(cards)
        .where(and(
          eq(cards.workflowId, wf.id),
          eq(cards.customerId, customerId),
          gte(cards.createdAt, now)
        ))
        .limit(1);

      if (existing.length > 0) continue;

      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1);

      if (!customer) continue;

      const workflowStages = await listStages(wf.id);
      const firstStage = workflowStages[0];
      if (!firstStage) continue;

      const defaultIds = wf.defaultAssigneeIds ?? [];
      let assignedUserId: string | null = null;
      if (defaultIds.length > 1) {
        const [{ count: cardCount }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(cards)
          .where(eq(cards.workflowId, wf.id));
        assignedUserId = defaultIds[cardCount % defaultIds.length] ?? null;
      } else if (defaultIds.length === 1) {
        assignedUserId = defaultIds[0] ?? null;
      } else {
        assignedUserId = wf.defaultAssigneeId ?? null;
      }

      await db
        .insert(cards)
        .values({
          workflowId: wf.id,
          stageId: firstStage.id,
          customerId: customer.id,
          assigneeId: assignedUserId,
          source: 'manual',
          dueAt: computeDueAt(wf)
        })
        .returning();

      spawned += 1;
    }
  }

  return spawned;
};

/**
 * Returns the start of the previous cycle for a given repeat rule.
 * For monthly: first day of the current month.
 * For weekly: start of the current week (Monday).
 * For daily: start of today.
 */
const getCycleStart = (rule: string, now: Date): Date => {
  const d = new Date(now);
  if (rule === 'monthly') {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  if (rule === 'weekly') {
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  }
  // daily
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/**
 * Returns the end of the previous cycle (same as cycle start for spawn purposes).
 * We look at cards created in the current cycle to determine who should get a new one.
 */
const getCycleEnd = (rule: string, now: Date): Date => {
  return now;
};
