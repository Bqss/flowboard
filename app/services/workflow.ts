import { and, asc, count, eq, inArray, or, sql } from 'drizzle-orm';
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
import { parseCustomerCsv } from '../lib/csv';
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
      ownerId: workflows.ownerId,
      defaultAssigneeId: workflows.defaultAssigneeId,
      defaultAssigneeIds: workflows.defaultAssigneeIds,
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
    ownerId: string;
    defaultAssigneeId?: string | null;
    defaultAssigneeIds?: string[];
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
      ownerId: input.ownerId,
      defaultAssigneeId,
      defaultAssigneeIds
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
      defaultAssigneeIds: [ownerId]
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
        overdueReminderHours: stageDraft.overdueReminderHours ?? null
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
    ownerId?: string;
    defaultAssigneeId?: string | null;
    defaultAssigneeIds?: string[];
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
      ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
      ...(defaultAssigneeId !== undefined ? { defaultAssigneeId } : {}),
      ...(defaultAssigneeIds !== undefined ? { defaultAssigneeIds } : {}),
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
      source: input.source ?? 'manual'
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
  mode: 'skip' | 'update' = 'skip'
): Promise<ImportCardsResult> => {
  const rows = parseCustomerCsv(csvText);
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

  return updated;
};

export const moveCardToStage = async (workflowId: string, cardId: string, toStageId: string) => {
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

  const [updated] = await db
    .update(cards)
    .set({ stageId: toStageId, updatedAt: new Date() })
    .where(eq(cards.id, cardId))
    .returning();

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
