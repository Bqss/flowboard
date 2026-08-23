import { and, asc, eq, gt, inArray, isNotNull, lte } from 'drizzle-orm';
import {
  cards,
  checklistActions,
  checklistItems,
  checklistTemplates,
  customers,
  db,
  stages,
  whatsappJobs,
  workflows,
  type ChecklistActionKind
} from '@db';
import { createNotification, hasRecentNotification } from './notification';
import { normalizeWa } from './customer';

type TemplateVars = {
  nama: string;
  wa: string;
  product?: string | null;
  tag?: string | null;
};

export const renderMessageTemplate = (template: string, vars: TemplateVars) =>
  template
    .replaceAll('{{nama}}', vars.nama)
    .replaceAll('{{wa}}', vars.wa)
    .replaceAll('{{product}}', vars.product ?? '')
    .replaceAll('{{tag}}', vars.tag ?? '')
    .replaceAll('{{link}}', 'https://flowboard.app');

const sendWhatsAppMessage = async (toWa: string, body: string) => {
  if (!toWa || toWa.length < 8) {
    throw new Error('Nomor WhatsApp tidak valid.');
  }

  if (process.env.WA_MOCK_FAIL === '1') {
    throw new Error('Simulasi kegagalan pengiriman WA.');
  }

  console.info(`[WA] → ${toWa}: ${body.slice(0, 120)}${body.length > 120 ? '…' : ''}`);
  return { ok: true as const };
};

export const getChecklistActionForTemplate = async (templateId: string) => {
  const [row] = await db
    .select()
    .from(checklistActions)
    .where(eq(checklistActions.templateId, templateId))
    .limit(1);

  return row ?? null;
};

export const upsertChecklistAction = async (
  templateId: string,
  input: {
    kind: ChecklistActionKind;
    messageTemplate?: string | null;
    delayMinutes?: number;
    followupIfNoReply?: boolean;
  }
) => {
  const existing = await getChecklistActionForTemplate(templateId);

  if (input.kind === 'none') {
    if (existing) {
      await db.delete(checklistActions).where(eq(checklistActions.id, existing.id));
    }
    return null;
  }

  const payload = {
    kind: input.kind,
    messageTemplate: input.messageTemplate?.trim() || null,
    delayMinutes: Math.max(0, input.delayMinutes ?? 0),
    followupIfNoReply: input.followupIfNoReply ?? input.kind === 'followup',
    updatedAt: new Date()
  };

  if (existing) {
    const [row] = await db
      .update(checklistActions)
      .set(payload)
      .where(eq(checklistActions.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(checklistActions)
    .values({ templateId, ...payload })
    .returning();

  return row;
};

export const listActionsForStageTemplates = async (stageId: string) => {
  const templates = await db
    .select({ id: checklistTemplates.id })
    .from(checklistTemplates)
    .where(eq(checklistTemplates.stageId, stageId));

  if (templates.length === 0) return [];

  const templateIds = templates.map((t) => t.id);
  return db
    .select()
    .from(checklistActions)
    .where(inArray(checklistActions.templateId, templateIds));
};

export const cancelPendingJobsForCard = async (cardId: string) => {
  await db
    .update(whatsappJobs)
    .set({ status: 'cancelled' })
    .where(and(eq(whatsappJobs.cardId, cardId), eq(whatsappJobs.status, 'pending')));
};

export const cancelFollowupJobsForCard = async (cardId: string) => {
  const pending = await db
    .select({ id: whatsappJobs.id, templateId: whatsappJobs.templateId })
    .from(whatsappJobs)
    .where(and(eq(whatsappJobs.cardId, cardId), eq(whatsappJobs.status, 'pending')));

  if (pending.length === 0) return;

  const templateIds = pending.map((job) => job.templateId).filter(Boolean) as string[];
  if (templateIds.length === 0) return;

  const followupTemplateIds = await db
    .select({ templateId: checklistActions.templateId })
    .from(checklistActions)
    .where(
      and(
        inArray(checklistActions.templateId, templateIds),
        eq(checklistActions.kind, 'followup')
      )
    );

  const followupSet = new Set(followupTemplateIds.map((row) => row.templateId));
  const jobIds = pending.filter((job) => job.templateId && followupSet.has(job.templateId)).map((j) => j.id);

  if (jobIds.length === 0) return;

  await db
    .update(whatsappJobs)
    .set({ status: 'cancelled' })
    .where(inArray(whatsappJobs.id, jobIds));
};

export const scheduleJobsForCard = async (cardId: string, stageId: string, stageEnteredAt: Date) => {
  const [context] = await db
    .select({
      card: cards,
      customer: customers,
      workflow: workflows
    })
    .from(cards)
    .innerJoin(customers, eq(cards.customerId, customers.id))
    .innerJoin(workflows, eq(cards.workflowId, workflows.id))
    .where(eq(cards.id, cardId))
    .limit(1);

  if (!context || context.card.stageId !== stageId) return [];

  const templates = await db
    .select({
      template: checklistTemplates,
      action: checklistActions
    })
    .from(checklistTemplates)
    .leftJoin(checklistActions, eq(checklistActions.templateId, checklistTemplates.id))
    .where(eq(checklistTemplates.stageId, stageId))
    .orderBy(asc(checklistTemplates.position));

  const items = await db
    .select()
    .from(checklistItems)
    .where(and(eq(checklistItems.cardId, cardId), eq(checklistItems.stageId, stageId)));

  const itemByTemplate = new Map(
    items.filter((item) => item.templateId).map((item) => [item.templateId as string, item])
  );

  const jobs = [];

  for (const row of templates) {
    const action = row.action;
    if (!action || action.kind === 'none' || !action.messageTemplate?.trim()) continue;

    const item = row.template.id ? itemByTemplate.get(row.template.id) : undefined;
    const scheduledAt = new Date(stageEnteredAt.getTime() + action.delayMinutes * 60 * 1000);
    const messageBody = renderMessageTemplate(action.messageTemplate, {
      nama: context.customer.name,
      wa: context.customer.wa,
      product: context.card.product,
      tag: context.card.tag
    });

    const [job] = await db
      .insert(whatsappJobs)
      .values({
        workspaceId: context.workflow.workspaceId,
        cardId,
        checklistItemId: item?.id ?? null,
        templateId: row.template.id,
        toWa: context.customer.wa,
        messageBody,
        scheduledAt
      })
      .returning();

    jobs.push(job);
  }

  return jobs;
};

export const onCardEnteredStage = async (cardId: string, stageId: string) => {
  const now = new Date();

  await db
    .update(cards)
    .set({
      stageEnteredAt: now,
      waFollowupsStopped: false,
      waErrorFlag: false,
      updatedAt: now
    })
    .where(eq(cards.id, cardId));

  await cancelPendingJobsForCard(cardId);
  return scheduleJobsForCard(cardId, stageId, now);
};

const notifyAssignee = async (
  workspaceId: string,
  assigneeId: string | null,
  cardId: string,
  type: 'wa_failed' | 'customer_replied' | 'card_overdue',
  title: string,
  body: string
) => {
  if (!assigneeId) return;
  await createNotification({ workspaceId, userId: assigneeId, cardId, type, title, body });
};

export const processDueWhatsappJobs = async (limit = 50) => {
  const now = new Date();
  const dueJobs = await db
    .select()
    .from(whatsappJobs)
    .where(and(eq(whatsappJobs.status, 'pending'), lte(whatsappJobs.scheduledAt, now)))
    .orderBy(asc(whatsappJobs.scheduledAt))
    .limit(limit);

  for (const job of dueJobs) {
    const [card] = await db.select().from(cards).where(eq(cards.id, job.cardId)).limit(1);
    if (!card || card.stageId === null) {
      await db
        .update(whatsappJobs)
        .set({ status: 'cancelled' })
        .where(eq(whatsappJobs.id, job.id));
      continue;
    }

    const [action] = job.templateId
      ? await db
          .select()
          .from(checklistActions)
          .where(eq(checklistActions.templateId, job.templateId))
          .limit(1)
      : [];

    if (action?.kind === 'followup' && action.followupIfNoReply && card.waFollowupsStopped) {
      await db
        .update(whatsappJobs)
        .set({ status: 'cancelled' })
        .where(eq(whatsappJobs.id, job.id));
      continue;
    }

    try {
      await sendWhatsAppMessage(job.toWa, job.messageBody);

      await db
        .update(whatsappJobs)
        .set({ status: 'sent', sentAt: new Date(), errorMessage: null })
        .where(eq(whatsappJobs.id, job.id));

      if (job.checklistItemId) {
        await db
          .update(checklistItems)
          .set({ done: true, updatedAt: new Date() })
          .where(eq(checklistItems.id, job.checklistItemId));
      }

      await db
        .update(cards)
        .set({ waErrorFlag: false, updatedAt: new Date() })
        .where(eq(cards.id, job.cardId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengirim WA.';

      await db
        .update(whatsappJobs)
        .set({ status: 'failed', errorMessage: message })
        .where(eq(whatsappJobs.id, job.id));

      await db
        .update(cards)
        .set({ waErrorFlag: true, updatedAt: new Date() })
        .where(eq(cards.id, job.cardId));

      const [workflow] = await db
        .select({ workspaceId: workflows.workspaceId })
        .from(workflows)
        .innerJoin(cards, eq(cards.workflowId, workflows.id))
        .where(eq(cards.id, job.cardId))
        .limit(1);

      if (workflow) {
        await notifyAssignee(
          workflow.workspaceId,
          card.assigneeId,
          job.cardId,
          'wa_failed',
          'Gagal kirim WhatsApp',
          message
        );
      }
    }
  }

  return dueJobs.length;
};

export const processOverdueCardReminders = async () => {
  const reminderStages = await db
    .select()
    .from(stages)
    .where(and(isNotNull(stages.overdueReminderHours), gt(stages.overdueReminderHours, 0)));

  let notified = 0;

  for (const stage of reminderStages) {
    const hours = stage.overdueReminderHours ?? 0;
    if (hours <= 0) continue;

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const stuckCards = await db
      .select({
        card: cards,
        customerName: customers.name,
        workflow: workflows
      })
      .from(cards)
      .innerJoin(customers, eq(cards.customerId, customers.id))
      .innerJoin(workflows, eq(cards.workflowId, workflows.id))
      .where(and(eq(cards.stageId, stage.id), lte(cards.stageEnteredAt, cutoff)));

    for (const row of stuckCards) {
      if (!row.card.assigneeId) continue;

      const recent = await hasRecentNotification(
        row.card.assigneeId,
        row.card.id,
        'card_overdue',
        hours
      );
      if (recent) continue;

      await createNotification({
        workspaceId: row.workflow.workspaceId,
        userId: row.card.assigneeId,
        cardId: row.card.id,
        type: 'card_overdue',
        title: 'Card tertahan di stage',
        body: `${row.customerName} sudah ${hours} jam di stage ini.`
      });
      notified += 1;
    }
  }

  return notified;
};

export const handleInboundWhatsappReply = async (input: { wa: string; message?: string }) => {
  const wa = normalizeWa(input.wa);
  if (!wa) return { matchedCards: 0 };

  const allCustomers = await db.select().from(customers);
  const customerRows = allCustomers.filter((c) => normalizeWa(c.wa) === wa);
  if (customerRows.length === 0) return { matchedCards: 0 };

  let matchedCards = 0;

  for (const customer of customerRows) {
    const activeCards = await db
      .select({
        card: cards,
        stage: stages,
        workflow: workflows,
        customerName: customers.name
      })
      .from(cards)
      .innerJoin(stages, eq(cards.stageId, stages.id))
      .innerJoin(workflows, eq(cards.workflowId, workflows.id))
      .innerJoin(customers, eq(cards.customerId, customers.id))
      .where(eq(cards.customerId, customer.id));

    for (const row of activeCards) {
      matchedCards += 1;

      await db
        .update(cards)
        .set({ waFollowupsStopped: true, updatedAt: new Date() })
        .where(eq(cards.id, row.card.id));

      await cancelFollowupJobsForCard(row.card.id);

      if (row.stage.onReplyNotify && row.card.assigneeId) {
        await createNotification({
          workspaceId: row.workflow.workspaceId,
          userId: row.card.assigneeId,
          cardId: row.card.id,
          type: 'customer_replied',
          title: 'Pelanggan membalas WhatsApp',
          body: `${row.customerName} membalas${input.message ? `: "${input.message.slice(0, 80)}"` : '.'}`
        });
      }
    }
  }

  return { matchedCards };
};
