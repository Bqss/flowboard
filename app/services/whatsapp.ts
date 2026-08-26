import { and, asc, desc, eq, gt, inArray, isNotNull, lte, or } from 'drizzle-orm';
import {
  cards,
  checklistActions,
  checklistItems,
  checklistTemplates,
  customers,
  db,
  stages,
  wajomConnections,
  whatsappJobs,
  workflows,
  type ChecklistActionKind
} from '@db';
import { createNotification, hasRecentNotification } from './notification';
import { normalizeWa } from './customer';
import { findWajomConnectionForWorkflow } from './wajom-connections';
import { sendWajomMessage } from './wajom-transport';
import { env } from '@config/env';
import { advanceCardIfChecklistComplete } from './workflow';
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

export const resolveFollowupJobsOnReply = async (cardId: string) => {
  const pending = await db
    .select({ checklistItemId: whatsappJobs.checklistItemId })
    .from(whatsappJobs)
    .innerJoin(checklistActions, eq(checklistActions.templateId, whatsappJobs.templateId))
    .where(
      and(
        eq(whatsappJobs.cardId, cardId),
        eq(whatsappJobs.status, 'pending'),
        eq(checklistActions.kind, 'followup'),
        eq(checklistActions.followupIfNoReply, true)
      )
    );

  const checklistItemIds = pending
    .map((job) => job.checklistItemId)
    .filter(Boolean) as string[];
  if (checklistItemIds.length > 0) {
    await db
      .update(checklistItems)
      .set({ done: true, updatedAt: new Date() })
      .where(inArray(checklistItems.id, checklistItemIds));
  }
  if (checklistItemIds.length > 0) {
    await advanceCardIfChecklistComplete(cardId);
  }

  await cancelFollowupJobsForCard(cardId);
  return checklistItemIds.length;
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

  const connection = await findWajomConnectionForWorkflow(
    context.workflow.workspaceId,
    context.workflow.id
  );
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
        connectionId: connection?.id ?? null,
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

export const listWhatsappJobs = async (workspaceId: string, connectionId?: string) =>
  db
    .select()
    .from(whatsappJobs)
    .where(
      and(
        eq(whatsappJobs.workspaceId, workspaceId),
        ...(connectionId ? [eq(whatsappJobs.connectionId, connectionId)] : [])
      )
    )
    .orderBy(desc(whatsappJobs.updatedAt))
    .limit(100);

export const onCardEnteredStage = async (cardId: string, stageId: string) => {
  const now = new Date();

  await db
    .update(cards)
    .set({
      stageEnteredAt: now,
      waFollowupsStopped: false,
      handoverReason: null,
      handedOverAt: null,
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
  const staleQueuedAt = new Date(
    Date.now() - Math.max(env.wajomRequestTimeoutMs * 2, 5 * 60 * 1000)
  );
  const dueJobs = await db
    .select()
    .from(whatsappJobs)
    .where(
      or(
        and(eq(whatsappJobs.status, 'pending'), lte(whatsappJobs.scheduledAt, now)),
        and(eq(whatsappJobs.status, 'queued'), lte(whatsappJobs.lastAttemptAt, staleQueuedAt))
      )
    )
    .orderBy(asc(whatsappJobs.scheduledAt))
    .limit(limit);

  for (const job of dueJobs) {
    const [claimed] = await db
      .update(whatsappJobs)
      .set({
        status: 'queued',
        attempts: job.attempts + 1,
        lastAttemptAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(whatsappJobs.id, job.id),
          or(
            eq(whatsappJobs.status, 'pending'),
            and(eq(whatsappJobs.status, 'queued'), lte(whatsappJobs.lastAttemptAt, staleQueuedAt))
          )
        )
      )
      .returning();

    if (!claimed) continue;

    const [card] = await db.select().from(cards).where(eq(cards.id, claimed.cardId)).limit(1);
    if (!card || card.stageId === null) {
      await db
        .update(whatsappJobs)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(whatsappJobs.id, claimed.id));
      continue;
    }

    const [action] = claimed.templateId
      ? await db
          .select()
          .from(checklistActions)
          .where(eq(checklistActions.templateId, claimed.templateId))
          .limit(1)
      : [];

    if (action?.kind === 'followup' && action.followupIfNoReply && card.waFollowupsStopped) {
      await db
        .update(whatsappJobs)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(whatsappJobs.id, claimed.id));
      continue;
    }

    const [connection] = claimed.connectionId
      ? await db
          .select()
          .from(wajomConnections)
          .where(eq(wajomConnections.id, claimed.connectionId))
          .limit(1)
      : [];

    if (claimed.connectionId && (!connection || !connection.enabled || connection.revokedAt)) {
      const errorMessage = 'Wajom connection is unavailable or revoked.';
      await db
        .update(whatsappJobs)
        .set({ status: 'failed', errorMessage, updatedAt: new Date() })
        .where(eq(whatsappJobs.id, claimed.id));
      await db
        .update(cards)
        .set({ waErrorFlag: true, updatedAt: new Date() })
        .where(eq(cards.id, claimed.cardId));
      await notifyAssignee(
        claimed.workspaceId,
        card.assigneeId,
        claimed.cardId,
        'wa_failed',
        'Gagal kirim WhatsApp',
        errorMessage
      );
      continue;
    }

    try {
      const delivery = await sendWajomMessage(connection ?? null, claimed);
      const completedAt = new Date();
      await db
        .update(whatsappJobs)
        .set({
          status: delivery.status,
          providerMessageId: delivery.providerMessageId,
          providerStatus: delivery.providerStatus,
          sentAt: delivery.status === 'queued' ? null : completedAt,
          errorMessage: null,
          updatedAt: completedAt
        })
        .where(eq(whatsappJobs.id, claimed.id));

      if (delivery.status !== 'queued' && claimed.checklistItemId) {
        await db
          .update(checklistItems)
          .set({ done: true, updatedAt: completedAt })
          .where(eq(checklistItems.id, claimed.checklistItemId));
        await advanceCardIfChecklistComplete(claimed.cardId);
      }

      await db
        .update(cards)
        .set({ waErrorFlag: false, updatedAt: completedAt })
        .where(eq(cards.id, claimed.cardId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengirim WA.';
      const shouldRetry = claimed.attempts < env.whatsappMaxAttempts;
      const retryAt = new Date(
        Date.now() + env.whatsappRetryDelayMinutes * 60 * 1000 * Math.max(1, claimed.attempts)
      );

      await db
        .update(whatsappJobs)
        .set({
          status: shouldRetry ? 'pending' : 'failed',
          scheduledAt: shouldRetry ? retryAt : claimed.scheduledAt,
          errorMessage: message,
          updatedAt: new Date()
        })
        .where(eq(whatsappJobs.id, claimed.id));

      await db
        .update(cards)
        .set({ waErrorFlag: true, updatedAt: new Date() })
        .where(eq(cards.id, claimed.cardId));

      if (!shouldRetry) {
        const [workflow] = await db
          .select({ workspaceId: workflows.workspaceId })
          .from(workflows)
          .innerJoin(cards, eq(cards.workflowId, workflows.id))
          .where(eq(cards.id, claimed.cardId))
          .limit(1);

        if (workflow) {
          await notifyAssignee(
            workflow.workspaceId,
            card.assigneeId,
            claimed.cardId,
            'wa_failed',
            'Gagal kirim WhatsApp',
            message
          );
        }
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

export const updateWhatsappJobStatus = async (input: {
  jobId: string;
  connectionId: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
  providerMessageId?: string;
  errorMessage?: string;
}) => {
  const [existing] = await db
    .select()
    .from(whatsappJobs)
    .where(eq(whatsappJobs.id, input.jobId))
    .limit(1);
  if (!existing) return null;
  if (existing.connectionId !== input.connectionId) {
    throw new Error('WhatsApp job tidak dimiliki koneksi ini.');
  }

  const now = new Date();
  const deliveryComplete = input.status === 'sent' || input.status === 'delivered' || input.status === 'read';
  const [updated] = await db
    .update(whatsappJobs)
    .set({
      status: input.status,
      providerMessageId: input.providerMessageId ?? existing.providerMessageId,
      providerStatus: input.status,
      sentAt: deliveryComplete ? existing.sentAt ?? now : existing.sentAt,
      deliveredAt: input.status === 'delivered' || input.status === 'read' ? existing.deliveredAt ?? now : existing.deliveredAt,
      readAt: input.status === 'read' ? existing.readAt ?? now : existing.readAt,
      errorMessage: input.errorMessage ?? (input.status === 'failed' ? existing.errorMessage : null),
      updatedAt: now
    })
    .where(eq(whatsappJobs.id, input.jobId))
    .returning();

  if (deliveryComplete && existing.checklistItemId) {
    await db
      .update(checklistItems)
      .set({ done: true, updatedAt: now })
      .where(eq(checklistItems.id, existing.checklistItemId));
    await advanceCardIfChecklistComplete(existing.cardId);
  }

  if (deliveryComplete || input.status === 'failed') {
    await db
      .update(cards)
      .set({ waErrorFlag: !deliveryComplete, updatedAt: now })
      .where(eq(cards.id, existing.cardId));
  }

  return updated ?? null;
};

export const handleInboundWhatsappReply = async (input: {
  wa: string;
  message?: string;
  workspaceId?: string;
  workflowId?: string;
  countryCode?: string;
}) => {
  const wa = normalizeWa(input.wa, input.countryCode);
  if (!wa) return { matchedCards: 0 };

  const customerRows = input.workspaceId
    ? await db
        .select()
        .from(customers)
        .where(and(eq(customers.workspaceId, input.workspaceId), eq(customers.wa, wa)))
    : await db.select().from(customers).where(eq(customers.wa, wa));
  if (customerRows.length === 0) return { matchedCards: 0 };

  let matchedCards = 0;

  for (const customer of customerRows) {
    const activeCards = input.workspaceId
      ? await db
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
          .where(
            and(
              eq(cards.customerId, customer.id),
              eq(workflows.workspaceId, input.workspaceId),
              ...(input.workflowId ? [eq(cards.workflowId, input.workflowId)] : [])
            )
          )
      : await db
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
          .where(
            and(
              eq(cards.customerId, customer.id),
              ...(input.workflowId ? [eq(cards.workflowId, input.workflowId)] : [])
            )
          );

    for (const row of activeCards) {
      matchedCards += 1;

      await db
        .update(cards)
        .set({ waFollowupsStopped: true, updatedAt: new Date() })
        .where(eq(cards.id, row.card.id));

      await resolveFollowupJobsOnReply(row.card.id);

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
