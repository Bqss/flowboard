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
  'card_due_soon',
  'handover',
  'workflow_action'
]);
export const urgencyEnum = pgEnum('urgency', ['high', 'medium', 'low']);
export const deadlineUnitEnum = pgEnum('deadline_unit', ['hours', 'days']);
export const repeatRuleEnum = pgEnum('repeat_rule', ['none', 'daily', 'weekly', 'monthly']);
export const closureByEnum = pgEnum('closure_by', ['initiator', 'assignee']);
export const cardSourceEnum = pgEnum('card_source', ['manual', 'csv', 'mcp', 'estafet']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trial',
  'active',
  'past_due',
  'canceled'
]);
export const planIntervalEnum = pgEnum('plan_interval', ['monthly', 'yearly']);
export const voucherTypeEnum = pgEnum('voucher_type', ['percent', 'fixed', 'trial_days']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  provider: text('provider'),
  providerId: text('provider_id'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  activeWorkspaceId: uuid('active_workspace_id'),
  platformAdmin: boolean('platform_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('users_provider_provider_id_idx').on(table.provider, table.providerId).where(sql`provider IS NOT NULL`)
]);
// Partial unique index: only one OAuth account per (provider, provider_id) pair.
// Users who registered with email/password have NULL provider — excluded from the index.

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
  description: text('description'),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  defaultAssigneeId: uuid('default_assignee_id').references(() => users.id, { onDelete: 'set null' }),
  defaultAssigneeIds: text('default_assignee_ids').array().notNull().default(sql`'{}'::text[]`),
  urgency: urgencyEnum('urgency').notNull().default('medium'),
  deadlineValue: integer('deadline_value'),
  deadlineUnit: deadlineUnitEnum('deadline_unit').notNull().default('days'),
  reminderBeforeValue: integer('reminder_before_value'),
  reminderBeforeUnit: deadlineUnitEnum('reminder_before_unit').notNull().default('hours'),
  repeatRule: repeatRuleEnum('repeat_rule').notNull().default('none'),
  closureBy: closureByEnum('closure_by').notNull().default('initiator'),
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
    name: text('name').notNull(),
    instanceId: text('instance_id').notNull(),
    countryCode: text('country_code').notNull().default('60'),
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
  (table) => [index('wajom_connections_workspace_idx').on(table.workspaceId)]
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
    autoMoveOnComplete: boolean('auto_move_on_complete').notNull().default(false),
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
  deadlineHours: integer('deadline_hours'),
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
  dueAt: timestamp('due_at', { withTimezone: true }),
  dueSoonNotifiedAt: timestamp('due_soon_notified_at', { withTimezone: true }),
  overdueNotifiedAt: timestamp('overdue_notified_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  completedById: uuid('completed_by_id').references(() => users.id, { onDelete: 'set null' }),
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

export const notificationSettings = pgTable(
  'notification_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    waFailed: boolean('wa_failed').notNull().default(true),
    customerReplied: boolean('customer_replied').notNull().default(true),
    cardOverdue: boolean('card_overdue').notNull().default(true),
    handover: boolean('handover').notNull().default(true),
    emailWaFailed: boolean('email_wa_failed').notNull().default(false),
    emailCustomerReplied: boolean('email_customer_replied').notNull().default(false),
    emailCardOverdue: boolean('email_card_overdue').notNull().default(true),
    emailHandover: boolean('email_handover').notNull().default(true),
    emailDigest: boolean('email_digest').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('notification_settings_workspace_user_idx').on(table.workspaceId, table.userId)]
);

export const plans = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    priceCents: integer('price_cents').notNull().default(0),
    currency: text('currency').notNull().default('MYR'),
    interval: planIntervalEnum('interval').notNull().default('monthly'),
    seatsLimit: integer('seats_limit').notNull().default(0),
    workflowsLimit: integer('workflows_limit').notNull().default(0),
    waMessagesPerMonth: integer('wa_messages_per_month').notNull().default(0),
    trialDays: integer('trial_days').notNull().default(0),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('plans_active_sort_idx').on(table.active, table.sortOrder)]
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .unique()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),
    status: subscriptionStatusEnum('status').notNull().default('trial'),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    graceEndsAt: timestamp('grace_ends_at', { withTimezone: true }),
    chipPurchaseId: text('chip_purchase_id'),
    chipRecurringToken: text('chip_recurring_token'),
    chipClientEmail: text('chip_client_email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('subscriptions_status_idx').on(table.status)]
);

export const vouchers = pgTable(
  'vouchers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    type: voucherTypeEnum('type').notNull(),
    value: integer('value').notNull(),
    // For percent/fixed: how many billing cycles the discount applies (null = forever).
    durationCycles: integer('duration_cycles'),
    // Optional: restrict redemption to a specific plan.
    planId: uuid('plan_id').references(() => plans.id, { onDelete: 'set null' }),
    maxRedemptions: integer('max_redemptions'),
    maxRedemptionsPerWorkspace: integer('max_redemptions_per_workspace').notNull().default(1),
    redeemedCount: integer('redeemed_count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    active: boolean('active').notNull().default(true),
    note: text('note'),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('vouchers_active_idx').on(table.active)]
);

export const voucherRedemptions = pgTable(
  'voucher_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    voucherId: uuid('voucher_id')
      .notNull()
      .references(() => vouchers.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, {
      onDelete: 'set null'
    }),
    redeemedById: uuid('redeemed_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('voucher_redemptions_voucher_workspace_idx').on(table.voucherId, table.workspaceId),
    index('voucher_redemptions_workspace_idx').on(table.workspaceId)
  ]
);

export const workflowInboundEndpoints = pgTable(
  'workflow_inbound_endpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    apiKeyHash: text('api_key_hash').notNull().unique(),
    apiKeyPrefix: text('api_key_prefix').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    lastRequestAt: timestamp('last_request_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('workflow_inbound_endpoints_workflow_idx').on(table.workflowId),
    index('workflow_inbound_endpoints_workspace_idx').on(table.workspaceId)
  ]
);

export const inboundRequestLogs = pgTable(
  'inbound_request_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    endpointId: uuid('endpoint_id')
      .notNull()
      .references(() => workflowInboundEndpoints.id, { onDelete: 'cascade' }),
    requestId: text('request_id').notNull(),
    source: text('source'),
    payloadSummary: jsonb('payload_summary'),
    success: boolean('success').notNull(),
    statusCode: integer('status_code').notNull(),
    cardId: uuid('card_id').references(() => cards.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    idempotentReplay: boolean('idempotent_replay').notNull().default(false),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('inbound_request_logs_endpoint_created_idx').on(table.endpointId, table.createdAt),
    index('inbound_request_logs_workspace_created_idx').on(table.workspaceId, table.createdAt)
  ]
);

export const inboundIdempotencyKeys = pgTable(
  'inbound_idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    endpointId: uuid('endpoint_id')
      .notNull()
      .references(() => workflowInboundEndpoints.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    status: text('status').notNull().default('processing'),
    response: jsonb('response'),
    statusCode: integer('status_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('inbound_idempotency_endpoint_key_idx').on(table.endpointId, table.key)
  ]
);

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
export type WorkflowInboundEndpoint = typeof workflowInboundEndpoints.$inferSelect;
export type InboundRequestLog = typeof inboundRequestLogs.$inferSelect;
export type InboundIdempotencyKey = typeof inboundIdempotencyKeys.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Voucher = typeof vouchers.$inferSelect;
export type VoucherRedemption = typeof voucherRedemptions.$inferSelect;
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];
export type PlanInterval = (typeof planIntervalEnum.enumValues)[number];
export type VoucherType = (typeof voucherTypeEnum.enumValues)[number];
export type ChecklistActionKind = (typeof checklistActionKindEnum.enumValues)[number];
export type WhatsappJobStatus = (typeof whatsappJobStatusEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type CardSource = (typeof cardSourceEnum.enumValues)[number];
export type Urgency = (typeof urgencyEnum.enumValues)[number];
export type DeadlineUnit = (typeof deadlineUnitEnum.enumValues)[number];
export type RepeatRule = (typeof repeatRuleEnum.enumValues)[number];
export type ClosureBy = (typeof closureByEnum.enumValues)[number];

export const mcpApiKeys = pgTable(
  'mcp_api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    keyHash: text('key_hash').notNull().unique(),
    keyPrefix: text('key_prefix').notNull(),
    scopeMode: text('scope_mode').notNull().default('all'),
    enabledTools: text('enabled_tools').array().notNull().default(sql`'{}'::text[]`),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('mcp_api_keys_workspace_idx').on(table.workspaceId)]
);

export type McpApiKey = typeof mcpApiKeys.$inferSelect;

export const mcpApiKeyWorkflows = pgTable(
  'mcp_api_key_workflows',
  {
    apiKeyId: uuid('api_key_id')
      .notNull()
      .references(() => mcpApiKeys.id, { onDelete: 'cascade' }),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('mcp_api_key_workflows_key_workflow_idx').on(table.apiKeyId, table.workflowId),
    index('mcp_api_key_workflows_workflow_idx').on(table.workflowId)
  ]
);

export type McpApiKeyWorkflow = typeof mcpApiKeyWorkflows.$inferSelect;

export const onboardingState = pgTable(
  'onboarding_state',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Which challenges the user has completed (array of challenge keys)
    completedChallenges: jsonb('completed_challenges').notNull().default([]),
    // Which page tours the user has seen (array of route keys)
    seenTours: jsonb('seen_tours').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('onboarding_state_user_idx').on(table.userId)]
);

export type OnboardingState = typeof onboardingState.$inferSelect;
export type NewOnboardingState = typeof onboardingState.$inferInsert;
