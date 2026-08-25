import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

export const workspaceRoleEnum = pgEnum('workspace_role', ['owner', 'member']);
export const checklistActionKindEnum = pgEnum('checklist_action_kind', ['none', 'send', 'followup']);
export const whatsappJobStatusEnum = pgEnum('whatsapp_job_status', [
  'pending',
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
  'cancelled'
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'wa_failed',
  'customer_replied',
  'card_overdue',
  'handover'
]);
export const cardSourceEnum = pgEnum('card_source', ['manual', 'csv', 'mcp', 'estafet']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  activeWorkspaceId: uuid('active_workspace_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: workspaceRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('workspace_members_workspace_user_idx').on(table.workspaceId, table.userId)]
);

export const workspaceInvites = pgTable('workspace_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: workspaceRoleEnum('role').notNull().default('member'),
  token: text('token').notNull().unique(),
  invitedById: uuid('invited_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  defaultAssigneeId: uuid('default_assignee_id').references(() => users.id, { onDelete: 'set null' }),
  defaultAssigneeIds: text('default_assignee_ids').array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const wajomConnections = pgTable(
  'wajom_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    defaultWorkflowId: uuid('default_workflow_id').references(() => workflows.id, {
      onDelete: 'set null'
    }),
    name: text('name').notNull(),
    instanceId: text('instance_id').notNull(),
    countryCode: text('country_code').notNull().default('62'),
    sendEndpoint: text('send_endpoint').notNull(),
    healthEndpoint: text('health_endpoint'),
    sendApiKeyEncrypted: text('send_api_key_encrypted'),
    connectorTokenHash: text('connector_token_hash').notNull().unique(),
    connectorTokenPrefix: text('connector_token_prefix').notNull(),
    enabledTools: text('enabled_tools')
      .array()
      .notNull()
      .default(
        sql`ARRAY['get_onboarding_status', 'register_customer', 'complete_onboarding_step', 'move_customer_stage', 'handover_to_staff']::text[]`
      ),
    enabled: boolean('enabled').notNull().default(true),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('wajom_connections_workspace_idx').on(table.workspaceId),
    uniqueIndex('wajom_connections_workspace_workflow_idx').on(
      table.workspaceId,
      table.defaultWorkflowId
    )
  ]
);

export const integrationAuditLogs = pgTable(
  'integration_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id').references(() => wajomConnections.id, {
      onDelete: 'set null'
    }),
    requestId: text('request_id').notNull(),
    tool: text('tool').notNull(),
    method: text('method').notNull(),
    inputKeys: text('input_keys').array().notNull().default(sql`ARRAY[]::text[]`),
    success: boolean('success').notNull(),
    statusCode: integer('status_code').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    resultSummary: jsonb('result_summary'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('integration_audit_logs_workspace_created_idx').on(table.workspaceId, table.createdAt),
    index('integration_audit_logs_connection_created_idx').on(table.connectionId, table.createdAt)
  ]
);

export const integrationIdempotencyKeys = pgTable(
  'integration_idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => wajomConnections.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    tool: text('tool').notNull(),
    status: text('status').notNull().default('processing'),
    response: jsonb('response'),
    statusCode: integer('status_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('integration_idempotency_connection_key_idx').on(table.connectionId, table.key)
  ]
);

export const stages = pgTable(
  'stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('indigo'),
    position: integer('position').notNull().default(0),
    onReplyNotify: boolean('on_reply_notify').notNull().default(false),
    overdueReminderHours: integer('overdue_reminder_hours'),
    nextWorkflowId: uuid('next_workflow_id').references(() => workflows.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('stages_workflow_position_idx').on(table.workflowId, table.position)]
);

export const checklistTemplates = pgTable('checklist_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  stageId: uuid('stage_id')
    .notNull()
    .references(() => stages.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  required: boolean('required').notNull().default(true),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const checklistActions = pgTable('checklist_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => checklistTemplates.id, { onDelete: 'cascade' }),
  kind: checklistActionKindEnum('kind').notNull().default('none'),
  messageTemplate: text('message_template'),
  delayMinutes: integer('delay_minutes').notNull().default(0),
  followupIfNoReply: boolean('followup_if_no_reply').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [uniqueIndex('checklist_actions_template_idx').on(table.templateId)]);

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    wa: text('wa').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('customers_workspace_wa_idx').on(table.workspaceId, table.wa)]
);

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),
  stageId: uuid('stage_id')
    .notNull()
    .references(() => stages.id, { onDelete: 'restrict' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'restrict' }),
  product: text('product'),
  tag: text('tag'),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  stageEnteredAt: timestamp('stage_entered_at', { withTimezone: true }).notNull().defaultNow(),
  waFollowupsStopped: boolean('wa_followups_stopped').notNull().default(false),
  handoverReason: text('handover_reason'),
  handedOverAt: timestamp('handed_over_at', { withTimezone: true }),
  waErrorFlag: boolean('wa_error_flag').notNull().default(false),
  source: cardSourceEnum('source').notNull().default('manual'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardId: uuid('card_id')
    .notNull()
    .references(() => cards.id, { onDelete: 'cascade' }),
  stageId: uuid('stage_id')
    .notNull()
    .references(() => stages.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').references(() => checklistTemplates.id, { onDelete: 'set null' }),
  label: text('label').notNull(),
  required: boolean('required').notNull().default(true),
  done: boolean('done').notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const whatsappJobs = pgTable(
  'whatsapp_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id').references(() => wajomConnections.id, {
      onDelete: 'set null'
    }),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    checklistItemId: uuid('checklist_item_id').references(() => checklistItems.id, {
      onDelete: 'set null'
    }),
    templateId: uuid('template_id').references(() => checklistTemplates.id, { onDelete: 'set null' }),
    toWa: text('to_wa').notNull(),
    messageBody: text('message_body').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    status: whatsappJobStatusEnum('status').notNull().default('pending'),
    providerMessageId: text('provider_message_id'),
    providerStatus: text('provider_status'),
    attempts: integer('attempts').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('whatsapp_jobs_due_idx').on(table.status, table.scheduledAt),
    index('whatsapp_jobs_connection_idx').on(table.connectionId, table.status),
    index('whatsapp_jobs_provider_message_idx').on(table.providerMessageId)
  ]
);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id').references(() => cards.id, { onDelete: 'set null' }),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;
export type WorkspaceRole = (typeof workspaceRoleEnum.enumValues)[number];
export type Workflow = typeof workflows.$inferSelect;
export type Stage = typeof stages.$inferSelect;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type ChecklistAction = typeof checklistActions.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type WhatsappJob = typeof whatsappJobs.$inferSelect;
export type WajomConnection = typeof wajomConnections.$inferSelect;
export type IntegrationAuditLog = typeof integrationAuditLogs.$inferSelect;
export type IntegrationIdempotencyKey = typeof integrationIdempotencyKeys.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ChecklistActionKind = (typeof checklistActionKindEnum.enumValues)[number];
export type WhatsappJobStatus = (typeof whatsappJobStatusEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
export type CardSource = (typeof cardSourceEnum.enumValues)[number];
