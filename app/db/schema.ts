import { sql } from 'drizzle-orm';
import { boolean, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const workspaceRoleEnum = pgEnum('workspace_role', ['owner', 'member']);
export const checklistActionKindEnum = pgEnum('checklist_action_kind', ['none', 'send', 'followup']);
export const whatsappJobStatusEnum = pgEnum('whatsapp_job_status', [
  'pending',
  'sent',
  'failed',
  'cancelled'
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'wa_failed',
  'customer_replied',
  'card_overdue'
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

export const whatsappJobs = pgTable('whatsapp_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
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
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

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
export type Notification = typeof notifications.$inferSelect;
export type ChecklistActionKind = (typeof checklistActionKindEnum.enumValues)[number];
export type WhatsappJobStatus = (typeof whatsappJobStatusEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
export type CardSource = (typeof cardSourceEnum.enumValues)[number];
