/**
 * MCP tool dispatcher.
 *
 * Tools are workspace-scoped: the workspace is resolved from the API key
 * (DB-managed per-workspace key) or from the x-workspace-id header (legacy
 * global FLOWBOARD_API_KEY mode). The caller never trusts a workspaceId in
 * the request body for authentication — it is only used to address a specific
 * workflow/card within the already-authenticated workspace.
 *
 * Workflow scope (all | selected) and enabled tools are enforced via
 * assertToolEnabled + assertWorkflowAllowed before any business logic runs.
 */
import {
  createCard,
  getCardDetail,
  getCardInWorkflow,
  getWorkflowInWorkspace,
  listStages,
  listWorkflows,
  moveCardToStage,
  toggleChecklistItem,
  WorkflowError
} from './workflow';
import { createNotification, resolveNotifyTarget } from './notification';
import { cancelFollowupJobsForCard } from './whatsapp';
import { findCustomerByWa, normalizeWa } from './customer';
import { cards, customers, db } from '@db';
import { and, eq, inArray } from 'drizzle-orm';
import { env } from '@config/env';
import { type McpToolName } from './integration-tools';
import type { ResolvedApiKey } from './api-keys';

export type { McpToolName } from './integration-tools';

/* ----------------------------------------------------- legacy global key auth */

/**
 * Legacy: validate the global FLOWBOARD_API_KEY env var.
 * Kept for backward compatibility — DB-managed keys are preferred.
 */
export const isValidIntegrationKey = (provided: string | null | undefined) =>
  Boolean(provided && env.flowboardApiKey && provided === env.flowboardApiKey);

/* ----------------------------------------------------------- scope guard */

export class McpScopeError extends Error {
  code: 'tool_disabled' | 'workflow_not_allowed' | 'card_not_in_workflow';
  constructor(message: string, code: McpScopeError['code']) {
    super(message);
    this.code = code;
  }
}

/** Throw if the API key does not have this tool enabled. */
export const assertToolEnabled = (auth: ResolvedApiKey, tool: McpToolName): void => {
  if (!auth.enabledTools.includes(tool)) {
    throw new McpScopeError(`Tool "${tool}" is not enabled for this API key.`, 'tool_disabled');
  }
};

/** Throw if the workflow is outside the API key's scope. */
export const assertWorkflowAllowed = async (
  auth: ResolvedApiKey,
  workflowId: string
): Promise<void> => {
  const workflow = await getWorkflowInWorkspace(auth.workspaceId, workflowId);
  if (!workflow) throw new WorkflowError('Workflow not found.', 'not_found');
  if (auth.scopeMode === 'selected' && !auth.allowedWorkflowIds.includes(workflowId)) {
    throw new McpScopeError('Workflow is outside this API key scope.', 'workflow_not_allowed');
  }
};

/** Throw if the card is not in an allowed workflow. */
const assertCardInAllowedWorkflow = async (
  auth: ResolvedApiKey,
  workflowId: string,
  cardId: string
): Promise<void> => {
  await assertWorkflowAllowed(auth, workflowId);
  const card = await getCardInWorkflow(workflowId, cardId);
  if (!card) throw new WorkflowError('Card not found.', 'not_found');
};

/** Resolve the list of workflow IDs allowed for this key. */
const allowedWorkflowIdsFor = (auth: ResolvedApiKey): string[] | null => {
  if (auth.scopeMode === 'all') return null; // null = no filter
  return auth.allowedWorkflowIds;
};

/* ----------------------------------------------------------- tool dispatcher */

export const callMcpTool = async (
  auth: ResolvedApiKey,
  tool: McpToolName,
  args: Record<string, unknown>
) => {
  assertToolEnabled(auth, tool);
  const workspaceId = auth.workspaceId;
  switch (tool) {
    case 'create_card': {
      const workflowId = String(args.workflowId ?? '');
      const name = String(args.name ?? '').trim();
      const wa = String(args.wa ?? '').trim();
      if (!workflowId || !name || !wa) {
        throw new WorkflowError('workflowId, name, dan wa wajib diisi.');
      }

      await assertWorkflowAllowed(auth, workflowId);
      const workflow = await getWorkflowInWorkspace(workspaceId, workflowId);
      if (!workflow) throw new WorkflowError('Workflow not found.', 'not_found');

      const { card, customer } = await createCard(workflow, {
        name,
        wa,
        product: args.product ? String(args.product) : undefined,
        tag: args.tag ? String(args.tag) : undefined,
        source: args.source === 'manual' ? 'manual' : 'mcp',
        allowDuplicate: false
      });

      return {
        cardId: card.id,
        customerId: customer.id,
        stageId: card.stageId,
        source: card.source
      };
    }

    case 'notify_assignee': {
      const workflowId = String(args.workflowId ?? '');
      const cardId = String(args.cardId ?? '');
      const title = String(args.title ?? '').trim();
      const body = String(args.body ?? '').trim();
      if (!workflowId || !cardId || !title || !body) {
        throw new WorkflowError('workflowId, cardId, title, dan body wajib diisi.');
      }

      await assertCardInAllowedWorkflow(auth, workflowId, cardId);
      const card = await getCardInWorkflow(workflowId, cardId);
      if (!card) throw new WorkflowError('Card not found.', 'not_found');

      const targetUserId = await resolveNotifyTarget(workspaceId, card.assigneeId);
      if (!targetUserId) throw new WorkflowError('Tidak ada penerima notifikasi.');

      const notification = await createNotification({
        workspaceId,
        userId: targetUserId,
        cardId: card.id,
        type: 'workflow_action',
        title,
        body
      });

      return { notificationId: notification?.id ?? null };
    }

    case 'move_stage': {
      const workflowId = String(args.workflowId ?? '');
      const cardId = String(args.cardId ?? '');
      const stageId = String(args.stageId ?? '');
      if (!workflowId || !cardId || !stageId) {
        throw new WorkflowError('workflowId, cardId, dan stageId wajib diisi.');
      }

      await assertCardInAllowedWorkflow(auth, workflowId, cardId);
      const card = await moveCardToStage(workflowId, cardId, stageId);
      return { cardId: card.id, stageId: card.stageId };
    }

    case 'stop_followups': {
      const workflowId = String(args.workflowId ?? '');
      const cardId = String(args.cardId ?? '');
      if (!workflowId || !cardId) {
        throw new WorkflowError('workflowId dan cardId wajib diisi.');
      }

      await assertCardInAllowedWorkflow(auth, workflowId, cardId);
      await db
        .update(cards)
        .set({ waFollowupsStopped: true, updatedAt: new Date() })
        .where(eq(cards.id, cardId));
      await cancelFollowupJobsForCard(cardId);

      return { cardId, waFollowupsStopped: true };
    }

    case 'toggle_checklist_item': {
      const workflowId = String(args.workflowId ?? '');
      const cardId = String(args.cardId ?? '');
      const itemId = String(args.itemId ?? '');
      const done = Boolean(args.done);
      if (!workflowId || !cardId || !itemId) {
        throw new WorkflowError('workflowId, cardId, dan itemId wajib diisi.');
      }

      await assertCardInAllowedWorkflow(auth, workflowId, cardId);
      const item = await toggleChecklistItem(workflowId, cardId, itemId, done);
      return { itemId: item.id, done: item.done };
    }

    case 'list_workflows': {
      const scopeFilter = allowedWorkflowIdsFor(auth);
      let workflowRows = await listWorkflows(workspaceId);
      if (scopeFilter) {
        const allowed = new Set(scopeFilter);
        workflowRows = workflowRows.filter((w) => allowed.has(w.id));
      }
      return {
        workflows: workflowRows.map((w) => ({
          id: w.id,
          name: w.name,
          description: w.description ?? null,
          ownerId: w.ownerId,
          defaultAssigneeId: w.defaultAssigneeId,
          createdAt: w.createdAt
        }))
      };
    }

    case 'get_workflow_stages': {
      const workflowId = String(args.workflowId ?? '');
      if (!workflowId) throw new WorkflowError('workflowId wajib diisi.');

      await assertWorkflowAllowed(auth, workflowId);
      const stages = await listStages(workflowId);
      return {
        workflowId,
        stages: stages.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          position: s.position,
          nextWorkflowId: s.nextWorkflowId ?? null
        }))
      };
    }

    case 'get_card': {
      const workflowId = String(args.workflowId ?? '');
      const cardId = String(args.cardId ?? '');
      if (!workflowId || !cardId) {
        throw new WorkflowError('workflowId dan cardId wajib diisi.');
      }

      await assertWorkflowAllowed(auth, workflowId);
      const detail = await getCardDetail(workflowId, cardId);
      if (!detail) throw new WorkflowError('Card not found.', 'not_found');
      return detail;
    }

    case 'find_card_by_wa': {
      const wa = normalizeWa(String(args.wa ?? '').trim());
      if (!wa) throw new WorkflowError('wa wajib diisi.');

      const customer = await findCustomerByWa(workspaceId, wa);
      if (!customer) return { cards: [] };

      const workflowIdFilter = args.workflowId ? String(args.workflowId) : null;
      if (workflowIdFilter) {
        await assertWorkflowAllowed(auth, workflowIdFilter);
      }
      const scopeFilter = allowedWorkflowIdsFor(auth);
      const rows = await db
        .select({
          id: cards.id,
          workflowId: cards.workflowId,
          stageId: cards.stageId,
          customerName: customers.name,
          wa: customers.wa,
          product: cards.product,
          tag: cards.tag,
          assigneeId: cards.assigneeId,
          source: cards.source,
          waFollowupsStopped: cards.waFollowupsStopped,
          createdAt: cards.createdAt,
          updatedAt: cards.updatedAt
        })
        .from(cards)
        .innerJoin(customers, eq(cards.customerId, customers.id))
        .where(
          and(
            eq(cards.customerId, customer.id),
            workflowIdFilter ? eq(cards.workflowId, workflowIdFilter) : undefined,
            scopeFilter ? inArray(cards.workflowId, scopeFilter) : undefined
          )
        );

      return { cards: rows };
    }

    case 'list_cards': {
      const workflowId = String(args.workflowId ?? '');
      const stageId = args.stageId ? String(args.stageId) : null;
      if (!workflowId) throw new WorkflowError('workflowId wajib diisi.');

      await assertWorkflowAllowed(auth, workflowId);
      const rows = await db
        .select({
          id: cards.id,
          stageId: cards.stageId,
          customerName: customers.name,
          wa: customers.wa,
          product: cards.product,
          tag: cards.tag,
          assigneeId: cards.assigneeId,
          source: cards.source,
          waFollowupsStopped: cards.waFollowupsStopped,
          createdAt: cards.createdAt
        })
        .from(cards)
        .innerJoin(customers, eq(cards.customerId, customers.id))
        .where(
          and(
            eq(cards.workflowId, workflowId),
            stageId ? eq(cards.stageId, stageId) : undefined
          )
        );

      return { cards: rows };
    }

    default:
      throw new WorkflowError(`Unknown tool: ${tool}`);
  }
};

export const getCardSnapshot = async (workspaceId: string, workflowId: string, cardId: string) => {
  const workflow = await getWorkflowInWorkspace(workspaceId, workflowId);
  if (!workflow) return null;
  return getCardDetail(workflowId, cardId);
};
