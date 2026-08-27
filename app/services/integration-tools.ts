/**
 * MCP tool registry — single source of truth for tool names, descriptions,
 * and input schemas. Shared between:
 * - app/services/integration.ts (tool dispatcher / business logic)
 * - app/services/api-keys.ts (default tools per scope)
 * - mcp/server.ts (MCP Streamable HTTP server)
 * - app/services/mcp-guard.ts (scope guard)
 *
 * Keep this file free of database/service imports so it can be imported
 * by the standalone MCP server without pulling in the full app runtime.
 */

export const MCP_TOOL_NAMES = [
  'create_card',
  'notify_assignee',
  'move_stage',
  'stop_followups',
  'toggle_checklist_item',
  'list_workflows',
  'get_workflow_stages',
  'get_card',
  'find_card_by_wa',
  'list_cards'
] as const;

export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

export const MCP_READ_TOOLS: readonly McpToolName[] = [
  'list_workflows',
  'get_workflow_stages',
  'get_card',
  'find_card_by_wa',
  'list_cards'
];

export const MCP_WRITE_TOOLS: readonly McpToolName[] = [
  'create_card',
  'notify_assignee',
  'move_stage',
  'stop_followups',
  'toggle_checklist_item'
];

export type ToolInputSchema = {
  type: 'object';
  properties: Record<string, Record<string, unknown>>;
  required: string[];
};

export type ToolDefinition = {
  name: McpToolName;
  description: string;
  inputSchema: ToolInputSchema;
  readOnly: boolean;
  sideEffect?: boolean;
};

export const MCP_TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    name: 'create_card',
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
    },
    readOnly: false,
    sideEffect: true
  },
  {
    name: 'notify_assignee',
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
    },
    readOnly: false,
    sideEffect: true
  },
  {
    name: 'move_stage',
    description: 'Move a card to another stage in the same workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' },
        cardId: { type: 'string', format: 'uuid' },
        stageId: { type: 'string', format: 'uuid' }
      },
      required: ['workflowId', 'cardId', 'stageId']
    },
    readOnly: false,
    sideEffect: true
  },
  {
    name: 'stop_followups',
    description: 'Stop pending WA follow-ups for a card (e.g. after handover).',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' },
        cardId: { type: 'string', format: 'uuid' }
      },
      required: ['workflowId', 'cardId']
    },
    readOnly: false,
    sideEffect: true
  },
  {
    name: 'toggle_checklist_item',
    description: 'Mark a checklist item done or undone for a card.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' },
        cardId: { type: 'string', format: 'uuid' },
        itemId: { type: 'string', format: 'uuid' },
        done: { type: 'boolean' }
      },
      required: ['workflowId', 'cardId', 'itemId', 'done']
    },
    readOnly: false,
    sideEffect: true
  },
  {
    name: 'list_workflows',
    description: 'List all workflows accessible to this API key (filtered by scope).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    readOnly: true
  },
  {
    name: 'get_workflow_stages',
    description: 'List stages for a workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' }
      },
      required: ['workflowId']
    },
    readOnly: true
  },
  {
    name: 'get_card',
    description: 'Get full detail of a card: stage, checklist, assignee, customer, next stage.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' },
        cardId: { type: 'string', format: 'uuid' }
      },
      required: ['workflowId', 'cardId']
    },
    readOnly: true
  },
  {
    name: 'find_card_by_wa',
    description: 'Find cards by WhatsApp number across accessible workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        wa: { type: 'string' },
        workflowId: { type: 'string', format: 'uuid' }
      },
      required: ['wa']
    },
    readOnly: true
  },
  {
    name: 'list_cards',
    description: 'List cards in a workflow, optionally filtered by stage.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' },
        stageId: { type: 'string', format: 'uuid' }
      },
      required: ['workflowId']
    },
    readOnly: true
  }
];

export const getToolDefinition = (name: McpToolName): ToolDefinition | undefined =>
  MCP_TOOL_DEFINITIONS.find((t) => t.name === name);
