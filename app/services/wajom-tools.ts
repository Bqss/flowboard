import { and, eq } from 'drizzle-orm';
import {
  cards,
  customers,
  db,
  type WajomConnection,
  workflows
} from '@db';
import { normalizeWa } from './customer';
import {
  createCard,
  getCardDetail,
  listStages,
  moveCardToStage,
  toggleChecklistItem,
  WorkflowError
} from './workflow';
import { cancelFollowupJobsForCard } from './whatsapp';
import { createNotification } from './notification';
import { hasWajomTool, type WajomToolName } from './wajom-connections';

export class WajomToolError extends Error {
  constructor(
    message: string,
    public code:
      | 'not_found'
      | 'invalid_input'
      | 'permission_denied'
      | 'conflict'
      | 'tool_disabled'
  ) {
    super(message);
    this.name = 'WajomToolError';
  }
}

export const WAJOM_TOOL_DEFINITIONS = [
  {
    name: 'get_onboarding_status' as const,
    description: 'Read onboarding cards, stage, checklist, assignee, and follow-up state for a WhatsApp number in a specific workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        wa: { type: 'string', minLength: 8 },
        workflow: { type: 'string', minLength: 1, maxLength: 120 }
      },
      required: ['wa', 'workflow']
    },
    readOnly: true
  },
  {
    name: 'register_customer' as const,
    description: 'Register a customer in a specific workflow and start its first-stage automation.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 200 },
        wa: { type: 'string', minLength: 8 },
        workflow: { type: 'string', minLength: 1, maxLength: 120 },
        product: { type: 'string', maxLength: 200 },
        tag: { type: 'string', maxLength: 80 }
      },
      required: ['name', 'wa', 'workflow']
    },
    readOnly: false,
    sideEffect: true
  },
  {
    name: 'complete_onboarding_step' as const,
    description: 'Mark a checklist step complete or incomplete for the active onboarding card in a specific workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        wa: { type: 'string', minLength: 8 },
        workflow: { type: 'string', minLength: 1, maxLength: 120 },
        step: { type: 'string', minLength: 1, maxLength: 200 },
        done: { type: 'boolean' }
      },
      required: ['wa', 'workflow', 'step']
    },
    readOnly: false,
    sideEffect: true
  },
  {
    name: 'move_customer_stage' as const,
    description: 'Move the active customer card to another stage in a specific workflow while enforcing required checklist rules.',
    inputSchema: {
      type: 'object',
      properties: {
        wa: { type: 'string', minLength: 8 },
        workflow: { type: 'string', minLength: 1, maxLength: 120 },
        stage: { type: 'string', minLength: 1, maxLength: 120 }
      },
      required: ['wa', 'workflow', 'stage']
    },
    readOnly: false,
    sideEffect: true,
    requiresConfirmation: true
  },
  {
    name: 'handover_to_staff' as const,
    description: 'Stop pending customer follow-ups in a specific workflow and notify the assigned staff member with a handover reason.',
    inputSchema: {
      type: 'object',
      properties: {
        wa: { type: 'string', minLength: 8 },
        workflow: { type: 'string', minLength: 1, maxLength: 120 },
        reason: { type: 'string', minLength: 1, maxLength: 1000 }
      },
      required: ['wa', 'workflow', 'reason']
    },
    readOnly: false,
    sideEffect: true,
    requiresConfirmation: true
  }
] as const;

export type WajomToolDefinition = (typeof WAJOM_TOOL_DEFINITIONS)[number];

const requireWorkflow = async (connection: WajomConnection, workflowName?: string) => {
  if (!workflowName || !workflowName.trim()) {
    throw new WajomToolError('workflow wajib diisi.', 'invalid_input');
  }

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(
      and(
        eq(workflows.workspaceId, connection.workspaceId),
        eq(workflows.name, workflowName.trim())
      )
    )
    .limit(1);

  if (!workflow) throw new WajomToolError('Workflow tidak ditemukan di workspace ini.', 'not_found');
  return workflow;
};

const normalizeStageKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
const optionalText = (value: unknown, field: string) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new WajomToolError(`${field} harus berupa teks.`, 'invalid_input');
  return value.trim();
};
const findCardForConnection = async (
  connection: WajomConnection,
  rawWa: string,
  requestedWorkflowName?: string
) => {
  if (!requestedWorkflowName || !requestedWorkflowName.trim()) {
    throw new WajomToolError('workflow wajib diisi.', 'invalid_input');
  }
  const workflow = await requireWorkflow(connection, requestedWorkflowName);
  const wa = normalizeWa(rawWa, connection.countryCode);
  if (!wa) throw new WajomToolError('Nomor WhatsApp tidak valid.', 'invalid_input');

  const rows = await db
    .select({ card: cards, customer: customers, workflow: workflows })
    .from(cards)
    .innerJoin(customers, eq(cards.customerId, customers.id))
    .innerJoin(workflows, eq(cards.workflowId, workflows.id))
    .where(
      and(
        eq(customers.workspaceId, connection.workspaceId),
        eq(customers.wa, wa),
        eq(workflows.workspaceId, connection.workspaceId)
      )
    );

  const row = rows.find((candidate) => candidate.workflow.id === workflow.id) ?? null;
  return { workflow, wa, row, rows };
};

const getStatus = async (connection: WajomConnection, args: Record<string, unknown>) => {
  const rawWa = typeof args.wa === 'string' ? args.wa.trim() : '';
  if (!rawWa) throw new WajomToolError('wa wajib diisi.', 'invalid_input');

  if (typeof args.workflow !== 'string' || !args.workflow.trim()) {
    throw new WajomToolError('workflow wajib diisi.', 'invalid_input');
  }
  const { workflow, wa, row, rows } = await findCardForConnection(
    connection,
    rawWa,
    args.workflow
  );
  const relevantRows = rows.filter((candidate) => candidate.workflow.id === workflow.id);
  const orderedRows = row
    ? [row, ...relevantRows.filter((candidate) => candidate.card.id !== row.card.id)]
    : relevantRows;
  if (orderedRows.length === 0) {
    return {
      found: false,
      wa,
      workflow: { id: workflow.id, name: workflow.name },
      cards: []
    };
  }

  const detailedCards = (
    await Promise.all(
      orderedRows.map(async (candidate) => ({
        row: candidate,
        detail: await getCardDetail(candidate.workflow.id, candidate.card.id)
      }))
    )
  ).filter((candidate): candidate is { row: (typeof orderedRows)[number]; detail: NonNullable<typeof candidate.detail> } =>
    Boolean(candidate.detail)
  );
  if (detailedCards.length === 0) {
    throw new WajomToolError('Card onboarding tidak ditemukan.', 'not_found');
  }

  const selected = detailedCards[0];
  const required = selected.detail.checklist.filter((item) => item.required);
  const cardsResult = detailedCards.map(({ row: candidate, detail }) => ({
    workflow: { id: candidate.workflow.id, name: candidate.workflow.name },
    card: {
      id: detail.card.id,
      product: detail.card.product,
      tag: detail.card.tag,
      createdAt: detail.card.createdAt,
      updatedAt: detail.card.updatedAt
    },
    stage: detail.stage,
    assignee: { id: detail.card.assigneeId, name: detail.assigneeName },
    checklist: {
      done: detail.checklist.filter((item) => item.required && item.done).length,
      total: detail.checklist.filter((item) => item.required).length,
      items: detail.checklist
    },
    followupsStopped: detail.waFollowupsStopped,
    handoverReason: detail.card.handoverReason,
    handedOverAt: detail.card.handedOverAt
  }));

  return {
    found: true,
    customer: selected.detail.customer,
    workflow: { id: selected.row.workflow.id, name: selected.row.workflow.name },
    card: cardsResult[0].card,
    stage: cardsResult[0].stage,
    assignee: cardsResult[0].assignee,
    checklist: {
      done: required.filter((item) => item.done).length,
      total: required.length,
      items: selected.detail.checklist
    },
    followupsStopped: selected.detail.waFollowupsStopped,
    handoverReason: selected.detail.card.handoverReason,
    handedOverAt: selected.detail.card.handedOverAt,
    cards: cardsResult
  };
};

const registerCustomer = async (connection: WajomConnection, args: Record<string, unknown>) => {
  if (typeof args.workflow !== 'string' || !args.workflow.trim()) {
    throw new WajomToolError('workflow wajib diisi.', 'invalid_input');
  }
  const workflow = await requireWorkflow(connection, args.workflow);
  const name = typeof args.name === 'string' ? args.name.trim() : '';
  const rawWa = typeof args.wa === 'string' ? args.wa.trim() : '';
  const wa = normalizeWa(rawWa, connection.countryCode);
  if (!name || !wa) throw new WajomToolError('name dan wa wajib diisi.', 'invalid_input');

  const product = optionalText(args.product, 'product');
  const tag = optionalText(args.tag, 'tag');

  const workflowStages = await listStages(workflow.id);
  const initialStage = workflowStages[0];
  if (!initialStage) throw new WajomToolError('Workflow tidak memiliki stage.', 'not_found');

  const existing = await findCardForConnection(connection, wa, args.workflow);
  if (existing.row) {
    return {
      created: false,
      duplicate: true,
      cardId: existing.row.card.id,
      customerId: existing.row.customer.id,
      stageId: existing.row.card.stageId,
      stage: {
        id: existing.row.card.stageId,
        name: workflowStages.find((stage) => stage.id === existing.row?.card.stageId)?.name ?? null
      },
      customer: { id: existing.row.customer.id, name: existing.row.customer.name, wa: existing.row.customer.wa },
      assignee: { id: existing.row.card.assigneeId },
      workflow: { id: workflow.id, name: workflow.name }
    };
  }

  try {
    const { card, customer } = await createCard(workflow, {
      name,
      wa,
      countryCode: connection.countryCode,
      product,
      tag,
      source: 'mcp',
      allowDuplicate: false
    });

    return {
      created: true,
      duplicate: false,
      cardId: card.id,
      customerId: customer.id,
      stage: { id: initialStage.id, name: initialStage.name },
      assignee: { id: card.assigneeId },
      initialStage: { id: initialStage.id, name: initialStage.name },
      workflow: { id: workflow.id, name: workflow.name },
      customer: { id: customer.id, name: customer.name, wa: customer.wa }
    };
  } catch (error) {
    if (error instanceof WorkflowError) {
      throw new WajomToolError(error.message, error.code === 'not_found' ? 'not_found' : 'conflict');
    }
    throw error;
  }
};

const completeOnboardingStep = async (connection: WajomConnection, args: Record<string, unknown>) => {
  const step = typeof args.step === 'string' ? args.step.trim().toLowerCase() : '';
  const wa = typeof args.wa === 'string' ? args.wa : '';
  const done = args.done === undefined ? true : args.done;
  const workflowName = typeof args.workflow === 'string' ? args.workflow : undefined;
  if (!step || !wa || typeof done !== 'boolean') {
    throw new WajomToolError('wa, step, dan done yang valid wajib diisi.', 'invalid_input');
  }

  const { workflow, row } = await findCardForConnection(connection, wa, workflowName);
  if (!row) throw new WajomToolError('Customer belum terdaftar di workflow ini.', 'not_found');

  const detail = await getCardDetail(workflow.id, row.card.id);
  const item = detail?.checklist.find((candidate) => candidate.label.trim().toLowerCase() === step);
  if (!item) throw new WajomToolError('Checklist step tidak ditemukan di stage aktif.', 'not_found');

  const updated = await toggleChecklistItem(workflow.id, row.card.id, item.id, done);
  return {
    cardId: row.card.id,
    checklistItem: { id: updated.id, label: updated.label, done: updated.done, required: updated.required },
    progress: await getStatus(connection, { wa: row.customer.wa, workflow: workflowName })
  };
};

const moveCustomerStage = async (connection: WajomConnection, args: Record<string, unknown>) => {
  const target = typeof args.stage === 'string' ? args.stage.trim().toLowerCase() : '';
  const wa = typeof args.wa === 'string' ? args.wa : '';
  const workflowName = typeof args.workflow === 'string' ? args.workflow : undefined;
  if (!target || !wa) throw new WajomToolError('wa dan stage wajib diisi.', 'invalid_input');

  const { workflow, row } = await findCardForConnection(connection, wa, workflowName);
  if (!row) throw new WajomToolError('Customer belum terdaftar di workflow ini.', 'not_found');

  const stages = await listStages(workflow.id);
  const targetStage = stages.find((stage) => normalizeStageKey(stage.name) === normalizeStageKey(target));
  if (!targetStage) throw new WajomToolError('Stage tujuan tidak ditemukan.', 'not_found');
  const fromStage = stages.find((stage) => stage.id === row.card.stageId);

  try {
    const updated = await moveCardToStage(workflow.id, row.card.id, targetStage.id);
    return {
      cardId: updated.id,
      fromStage: fromStage ? { id: fromStage.id, name: fromStage.name } : null,
      fromStageId: row.card.stageId,
      toStage: { id: targetStage.id, name: targetStage.name },
      status: await getStatus(connection, { wa: row.customer.wa, workflow: workflowName })
    };
  } catch (error) {
    if (error instanceof WorkflowError) {
      throw new WajomToolError(error.message, error.code === 'not_found' ? 'not_found' : 'conflict');
    }
    throw error;
  }
};
const handoverToStaff = async (connection: WajomConnection, args: Record<string, unknown>) => {
  const reason = typeof args.reason === 'string' ? args.reason.trim() : '';
  const wa = typeof args.wa === 'string' ? args.wa : '';
  const workflowName = typeof args.workflow === 'string' ? args.workflow : undefined;
  if (!reason || !wa) throw new WajomToolError('wa dan reason wajib diisi.', 'invalid_input');

  const { workflow, row } = await findCardForConnection(connection, wa, workflowName);
  if (!row) throw new WajomToolError('Customer belum terdaftar di workflow ini.', 'not_found');

  if (
    row.card.waFollowupsStopped &&
    row.card.handoverReason?.trim() === reason &&
    row.card.handedOverAt
  ) {
    return {
      cardId: row.card.id,
      assignee: { id: row.card.assigneeId },
      followupsStopped: true,
      notificationId: null,
      reason,
      handedOverAt: row.card.handedOverAt.toISOString(),
      duplicate: true
    };
  }

  const now = new Date();
  await db
    .update(cards)
    .set({
      waFollowupsStopped: true,
      handoverReason: reason,
      handedOverAt: now,
      updatedAt: now
    })
    .where(eq(cards.id, row.card.id));
  await cancelFollowupJobsForCard(row.card.id);

  let notificationId: string | null = null;
  if (row.card.assigneeId) {
    const notification = await createNotification({
      workspaceId: workflow.workspaceId,
      userId: row.card.assigneeId,
      cardId: row.card.id,
      type: 'handover',
      title: 'Handover customer dari WhatsApp',
      body: `${row.customer.name}: ${reason}`
    });
    notificationId = notification?.id ?? null;
  }

  return {
    cardId: row.card.id,
    assignee: { id: row.card.assigneeId },
    followupsStopped: true,
    notificationId,
    reason,
    handedOverAt: now.toISOString()
  };
};

export const executeWajomTool = async (
  connection: WajomConnection,
  tool: WajomToolName,
  args: Record<string, unknown>
) => {
  if (!hasWajomTool(connection, tool)) {
    throw new WajomToolError('Tool tidak diaktifkan pada koneksi ini.', 'tool_disabled');
  }

  switch (tool) {
    case 'get_onboarding_status':
      return getStatus(connection, args);
    case 'register_customer':
      return registerCustomer(connection, args);
    case 'complete_onboarding_step':
      return completeOnboardingStep(connection, args);
    case 'move_customer_stage':
      return moveCustomerStage(connection, args);
    case 'handover_to_staff':
      return handoverToStaff(connection, args);
  }
};

export const getWajomToolDefinitions = (connection: WajomConnection) =>
  WAJOM_TOOL_DEFINITIONS.filter((tool) => hasWajomTool(connection, tool.name));
