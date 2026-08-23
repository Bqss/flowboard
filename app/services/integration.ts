import {
  createCard,
  getCardDetail,
  getCardInWorkflow,
  getWorkflowInWorkspace,
  moveCardToStage,
  WorkflowError
} from './workflow';
import { createNotification } from './notification';
import { cancelFollowupJobsForCard } from './whatsapp';
import { cards, db } from '@db';
import { eq } from 'drizzle-orm';

export type McpToolName =
  | 'create_card'
  | 'notify_assignee'
  | 'move_stage'
  | 'stop_followups';

export const MCP_TOOLS = [
  {
    name: 'create_card' as const,
    description: 'Insert a customer card into a workflow (first stage).',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        wa: { type: 'string' },
        product: { type: 'string' },
        tag: { type: 'string' },
        source: { type: 'string', enum: ['mcp', 'manual'] }
      },
      required: ['workflowId', 'name', 'wa']
    }
  },
  {
    name: 'notify_assignee' as const,
    description: 'Send an in-app notification to the card assignee.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' },
        cardId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        body: { type: 'string' }
      },
      required: ['workflowId', 'cardId', 'title', 'body']
    }
  },
  {
    name: 'move_stage' as const,
    description: 'Move a card to another stage in the same workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' },
        cardId: { type: 'string', format: 'uuid' },
        stageId: { type: 'string', format: 'uuid' }
      },
      required: ['workflowId', 'cardId', 'stageId']
    }
  },
  {
    name: 'stop_followups' as const,
    description: 'Stop pending WA follow-ups for a card (e.g. after handover).',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' },
        cardId: { type: 'string', format: 'uuid' }
      },
      required: ['workflowId', 'cardId']
    }
  }
];

export const resolveIntegrationApiKey = () =>
  process.env.FLOWBOARD_API_KEY ?? 'dev-flowboard-key';

export const isValidIntegrationKey = (provided: string | null | undefined) =>
  Boolean(provided && provided === resolveIntegrationApiKey());

export const callMcpTool = async (
  workspaceId: string,
  tool: McpToolName,
  args: Record<string, unknown>
) => {
  switch (tool) {
    case 'create_card': {
      const workflowId = String(args.workflowId ?? '');
      const name = String(args.name ?? '').trim();
      const wa = String(args.wa ?? '').trim();
      if (!workflowId || !name || !wa) {
        throw new WorkflowError('workflowId, name, dan wa wajib diisi.');
      }

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

      const card = await getCardInWorkflow(workflowId, cardId);
      if (!card) throw new WorkflowError('Card not found.', 'not_found');
      if (!card.assigneeId) throw new WorkflowError('Card tidak punya assignee.');

      const notification = await createNotification({
        workspaceId,
        userId: card.assigneeId,
        cardId: card.id,
        type: 'customer_replied',
        title,
        body
      });

      return { notificationId: notification.id };
    }

    case 'move_stage': {
      const workflowId = String(args.workflowId ?? '');
      const cardId = String(args.cardId ?? '');
      const stageId = String(args.stageId ?? '');
      if (!workflowId || !cardId || !stageId) {
        throw new WorkflowError('workflowId, cardId, dan stageId wajib diisi.');
      }

      const card = await moveCardToStage(workflowId, cardId, stageId);
      return { cardId: card.id, stageId: card.stageId };
    }

    case 'stop_followups': {
      const workflowId = String(args.workflowId ?? '');
      const cardId = String(args.cardId ?? '');
      if (!workflowId || !cardId) {
        throw new WorkflowError('workflowId dan cardId wajib diisi.');
      }

      const card = await getCardInWorkflow(workflowId, cardId);
      if (!card) throw new WorkflowError('Card not found.', 'not_found');

      await db
        .update(cards)
        .set({ waFollowupsStopped: true, updatedAt: new Date() })
        .where(eq(cards.id, cardId));
      await cancelFollowupJobsForCard(cardId);

      return { cardId, waFollowupsStopped: true };
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
