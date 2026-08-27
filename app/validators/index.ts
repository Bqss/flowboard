import { t } from 'elysia';

/**
 * Request schemas, one place for all input validation. Route tables attach
 * these; Elysia validates before a handler runs, so handlers can trust `body`.
 */

export const RegisterSchema = t.Object({
  email: t.String({ format: 'email' }),
  name: t.String({ minLength: 1 }),
  password: t.String({ minLength: 8 })
});

export const LoginSchema = t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 1 })
});

export const ChangePasswordSchema = t.Object({
  currentPassword: t.String({ minLength: 1 }),
  newPassword: t.String({ minLength: 8 })
});

export const AvatarSchema = t.Object({
  avatar: t.File()
});

export const UserIdParam = t.Object({
  id: t.String({ format: 'uuid' })
});

export const UpdateUserSchema = t.Object({
  name: t.String({ minLength: 1 })
});

export const WorkspaceIdParam = t.Object({
  workspaceId: t.String({ format: 'uuid' })
});

export const WorkspaceMemberParam = t.Object({
  workspaceId: t.String({ format: 'uuid' }),
  userId: t.String({ format: 'uuid' })
});

export const UpdateWorkspaceSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 })
});

export const CreateInviteSchema = t.Object({
  email: t.String({ format: 'email' }),
  role: t.Optional(t.Union([t.Literal('member')]))
});

export const AcceptInviteSchema = t.Object({
  token: t.String({ minLength: 1 })
});

export const InviteTokenParam = t.Object({
  token: t.String({ minLength: 1 })
});

export const WorkflowIdParam = t.Object({
  workspaceId: t.String({ format: 'uuid' }),
  workflowId: t.String({ format: 'uuid' })
});

export const WorkflowStageParam = t.Object({
  workspaceId: t.String({ format: 'uuid' }),
  workflowId: t.String({ format: 'uuid' }),
  stageId: t.String({ format: 'uuid' })
});

export const WorkflowStageTemplateParam = t.Object({
  workspaceId: t.String({ format: 'uuid' }),
  workflowId: t.String({ format: 'uuid' }),
  stageId: t.String({ format: 'uuid' }),
  templateId: t.String({ format: 'uuid' })
});

export const WorkflowCardParam = t.Object({
  workspaceId: t.String({ format: 'uuid' }),
  workflowId: t.String({ format: 'uuid' }),
  cardId: t.String({ format: 'uuid' })
});

export const WorkflowCardItemParam = t.Object({
  workspaceId: t.String({ format: 'uuid' }),
  workflowId: t.String({ format: 'uuid' }),
  cardId: t.String({ format: 'uuid' }),
  itemId: t.String({ format: 'uuid' })
});

export const CreateWorkflowSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  description: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  ownerId: t.Optional(t.String({ format: 'uuid' })),
  defaultAssigneeId: t.Optional(t.Union([t.String({ format: 'uuid' }), t.Null()])),
  defaultAssigneeIds: t.Optional(t.Array(t.String({ format: 'uuid' })))
});

export const UpdateWorkflowSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  description: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  ownerId: t.Optional(t.String({ format: 'uuid' })),
  defaultAssigneeId: t.Optional(t.Union([t.String({ format: 'uuid' }), t.Null()])),
  defaultAssigneeIds: t.Optional(t.Array(t.String({ format: 'uuid' })))
});

export const CreateStageSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  color: t.Optional(t.String({ minLength: 1, maxLength: 50 }))
});

export const UpdateStageSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  color: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
  onReplyNotify: t.Optional(t.Boolean()),
  overdueReminderHours: t.Optional(t.Union([t.Integer({ minimum: 1, maximum: 720 }), t.Null()])),
  nextWorkflowId: t.Optional(t.Union([t.String({ format: 'uuid' }), t.Null()]))
});

export const BulkReassignSchema = t.Object({
  cardIds: t.Array(t.String({ format: 'uuid' }), { minItems: 1, maxItems: 100 }),
  assigneeId: t.Union([t.String({ format: 'uuid' }), t.Null()])
});

export const UpdateChecklistActionSchema = t.Object({
  kind: t.Union([t.Literal('none'), t.Literal('send'), t.Literal('followup')]),
  messageTemplate: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  delayMinutes: t.Optional(t.Integer({ minimum: 0, maximum: 10080 })),
  followupIfNoReply: t.Optional(t.Boolean())
});

export const WhatsappWebhookSchema = t.Object({
  wa: t.String({ minLength: 8, maxLength: 20 }),
  message: t.Optional(t.String({ maxLength: 2000 }))
});

export const NotificationIdParam = t.Object({
  workspaceId: t.String({ format: 'uuid' }),
  notificationId: t.String({ format: 'uuid' })
});

const ChecklistActionDraftSchema = t.Object({
  kind: t.Union([t.Literal('none'), t.Literal('send'), t.Literal('followup')]),
  messageTemplate: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  delayMinutes: t.Optional(t.Integer({ minimum: 0, maximum: 10080 })),
  followupIfNoReply: t.Optional(t.Boolean())
});

export const WorkflowDraftSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  stages: t.Array(
    t.Object({
      name: t.String({ minLength: 1, maxLength: 120 }),
      color: t.Optional(t.String({ maxLength: 50 })),
      onReplyNotify: t.Optional(t.Boolean()),
      overdueReminderHours: t.Optional(t.Union([t.Integer({ minimum: 1, maximum: 720 }), t.Null()])),
      checklists: t.Array(
        t.Object({
          label: t.String({ minLength: 1, maxLength: 200 }),
          required: t.Optional(t.Boolean()),
          action: t.Optional(ChecklistActionDraftSchema)
        })
      )
    }),
    { minItems: 1 }
  )
});

export const GenerateWorkflowDraftSchema = t.Object({
  prompt: t.String({ minLength: 3, maxLength: 2000 })
});

export const McpCallSchema = t.Object({
  // workspaceId is required for legacy global-key mode (x-workspace-id header).
  // For DB-managed per-workspace keys, the workspace is resolved from the key
  // and this field is ignored.
  workspaceId: t.Optional(t.String({ format: 'uuid' })),
  tool: t.Union([
    t.Literal('create_card'),
    t.Literal('notify_assignee'),
    t.Literal('move_stage'),
    t.Literal('stop_followups'),
    t.Literal('toggle_checklist_item'),
    t.Literal('list_workflows'),
    t.Literal('get_workflow_stages'),
    t.Literal('get_card'),
    t.Literal('find_card_by_wa'),
    t.Literal('list_cards')
  ]),
  arguments: t.Record(t.String(), t.Unknown())
});

export const IntegrationCreateCardSchema = t.Object({
  workspaceId: t.Optional(t.String({ format: 'uuid' })),
  workflowId: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1, maxLength: 200 }),
  wa: t.String({ minLength: 8, maxLength: 20 }),
  product: t.Optional(t.String({ maxLength: 200 })),
  tag: t.Optional(t.String({ maxLength: 80 })),
  source: t.Optional(t.Union([t.Literal('mcp'), t.Literal('manual')]))
});

export const ReorderStagesSchema = t.Object({
  stageIds: t.Array(t.String({ format: 'uuid' }))
});

export const CreateChecklistTemplateSchema = t.Object({
  label: t.String({ minLength: 1, maxLength: 200 }),
  required: t.Optional(t.Boolean())
});

export const UpdateChecklistTemplateSchema = t.Object({
  label: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  required: t.Optional(t.Boolean())
});

export const CreateCardSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 200 }),
  wa: t.String({ minLength: 8, maxLength: 20 }),
  product: t.Optional(t.String({ maxLength: 200 })),
  tag: t.Optional(t.String({ maxLength: 80 })),
  assigneeId: t.Optional(t.Union([t.String({ format: 'uuid' }), t.Null()])),
  source: t.Optional(
    t.Union([t.Literal('manual'), t.Literal('csv'), t.Literal('mcp'), t.Literal('estafet')])
  )
});

export const UpdateCardAssigneeSchema = t.Object({
  assigneeId: t.Union([t.String({ format: 'uuid' }), t.Null()])
});

export const ImportCardsSchema = t.Object({
  csv: t.String({ minLength: 1 }),
  mode: t.Optional(t.Union([t.Literal('skip'), t.Literal('update')]))
});

export const MoveCardSchema = t.Object({
  stageId: t.String({ format: 'uuid' })
});

export const ToggleChecklistItemSchema = t.Object({
  done: t.Boolean()
});

const WajomToolLiteral = t.Union([
  t.Literal('get_onboarding_status'),
  t.Literal('register_customer'),
  t.Literal('complete_onboarding_step'),
  t.Literal('move_customer_stage'),
  t.Literal('handover_to_staff')
]);

export const WajomToolCallSchema = t.Object({
  tool: WajomToolLiteral,
  arguments: t.Record(t.String(), t.Unknown()),
  idempotencyKey: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  requestId: t.Optional(t.String({ minLength: 1, maxLength: 200 }))
});

export const WajomInboundReplySchema = t.Object({
  wa: t.String({ minLength: 8, maxLength: 24 }),
  message: t.Optional(t.String({ maxLength: 2000 })),
  requestId: t.String({ minLength: 1, maxLength: 200 })
});

export const WajomDeliveryStatusSchema = t.Object({
  status: t.Union([
    t.Literal('queued'),
    t.Literal('sent'),
    t.Literal('delivered'),
    t.Literal('read'),
    t.Literal('failed'),
    t.Literal('cancelled')
  ]),
  providerMessageId: t.Optional(t.String({ maxLength: 200 })),
  errorMessage: t.Optional(t.String({ maxLength: 2000 })),
  requestId: t.Optional(t.String({ minLength: 1, maxLength: 200 }))
});

export const WajomConnectionParam = t.Object({
  workspaceId: t.String({ format: 'uuid' }),
  connectionId: t.String({ format: 'uuid' })
});

const WajomEnabledTools = t.Optional(
  t.Array(WajomToolLiteral, { minItems: 1, maxItems: 5 })
);

export const CreateWajomConnectionSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  instanceId: t.String({ minLength: 1, maxLength: 160 }),
  countryCode: t.Optional(t.String({ minLength: 1, maxLength: 3 })),
  sendApiKey: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  enabledTools: WajomEnabledTools
});

export const UpdateWajomConnectionSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  instanceId: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  countryCode: t.Optional(t.String({ minLength: 1, maxLength: 3 })),
  sendApiKey: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  clearSendApiKey: t.Optional(t.Boolean()),
  enabledTools: WajomEnabledTools,
  enabled: t.Optional(t.Boolean())
});

export const WajomJobsQuery = t.Object({
  connectionId: t.Optional(t.String({ format: 'uuid' }))
});
export const WajomJobParam = t.Object({
  jobId: t.String({ format: 'uuid' })
});
export const WajomTestSendSchema = t.Object({
  to: t.String({ minLength: 8, maxLength: 24 }),
  message: t.String({ minLength: 1, maxLength: 2000 })
});

/* --------------------------------------------------------------- admin / billing */

export const CreatePlanSchema = t.Object({
  slug: t.String({ minLength: 2, maxLength: 60 }),
  name: t.String({ minLength: 1, maxLength: 120 }),
  description: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()])),
  priceCents: t.Integer({ minimum: 0 }),
  currency: t.Optional(t.String({ minLength: 3, maxLength: 3 })),
  interval: t.Union([t.Literal('monthly'), t.Literal('yearly')]),
  seatsLimit: t.Integer({ minimum: 0 }),
  workflowsLimit: t.Integer({ minimum: 0 }),
  waMessagesPerMonth: t.Integer({ minimum: 0 }),
  trialDays: t.Optional(t.Integer({ minimum: 0, maximum: 365 })),
  sortOrder: t.Optional(t.Integer({ minimum: 0 }))
});

export const UpdatePlanSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  description: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()])),
  priceCents: t.Optional(t.Integer({ minimum: 0 })),
  currency: t.Optional(t.String({ minLength: 3, maxLength: 3 })),
  interval: t.Optional(t.Union([t.Literal('monthly'), t.Literal('yearly')])),
  seatsLimit: t.Optional(t.Integer({ minimum: 0 })),
  workflowsLimit: t.Optional(t.Integer({ minimum: 0 })),
  waMessagesPerMonth: t.Optional(t.Integer({ minimum: 0 })),
  trialDays: t.Optional(t.Integer({ minimum: 0, maximum: 365 })),
  active: t.Optional(t.Boolean()),
  sortOrder: t.Optional(t.Integer({ minimum: 0 }))
});

export const CreateVoucherSchema = t.Object({
  code: t.String({ minLength: 4, maxLength: 40 }),
  type: t.Union([t.Literal('percent'), t.Literal('fixed'), t.Literal('trial_days')]),
  value: t.Integer({ minimum: 0 }),
  durationCycles: t.Optional(t.Union([t.Integer({ minimum: 1, maximum: 120 }), t.Null()])),
  planId: t.Optional(t.Union([t.String({ format: 'uuid' }), t.Null()])),
  maxRedemptions: t.Optional(t.Union([t.Integer({ minimum: 1 }), t.Null()])),
  maxRedemptionsPerWorkspace: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  expiresAt: t.Optional(t.Union([t.String({ format: 'date-time' }), t.Null()])),
  note: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()]))
});

export const UpdateVoucherSchema = t.Object({
  value: t.Optional(t.Integer({ minimum: 0 })),
  durationCycles: t.Optional(t.Union([t.Integer({ minimum: 1, maximum: 120 }), t.Null()])),
  planId: t.Optional(t.Union([t.String({ format: 'uuid' }), t.Null()])),
  maxRedemptions: t.Optional(t.Union([t.Integer({ minimum: 1 }), t.Null()])),
  maxRedemptionsPerWorkspace: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  expiresAt: t.Optional(t.Union([t.String({ format: 'date-time' }), t.Null()])),
  active: t.Optional(t.Boolean()),
  note: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()]))
});

export const AdminChangePlanSchema = t.Object({
  planId: t.String({ format: 'uuid' })
});

export const AdminExtendTrialSchema = t.Object({
  days: t.Integer({ minimum: 1, maximum: 365 })
});

export const AdminSetStatusSchema = t.Object({
  status: t.Union([
    t.Literal('trial'),
    t.Literal('active'),
    t.Literal('past_due'),
    t.Literal('canceled')
  ])
});

export const PlanIdParam = t.Object({
  planId: t.String({ format: 'uuid' })
});

export const VoucherIdParam = t.Object({
  voucherId: t.String({ format: 'uuid' })
});

export const AdminWorkspaceIdParam = t.Object({
  workspaceId: t.String({ format: 'uuid' })
});

/* --------------------------------------------------------------- MCP API keys */

export const CreateApiKeySchema = t.Object({
  label: t.String({ minLength: 1, maxLength: 80 }),
  scopeMode: t.Optional(t.Union([t.Literal('all'), t.Literal('selected')])),
  enabledTools: t.Optional(t.Array(t.String())),
  workflowIds: t.Optional(t.Array(t.String({ format: 'uuid' })))
});

export const ApiKeyParam = t.Object({
  workspaceId: t.String({ format: 'uuid' }),
  keyId: t.String({ format: 'uuid' })
});

export const UpdateApiKeySchema = t.Object({
  label: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
  scopeMode: t.Optional(t.Union([t.Literal('all'), t.Literal('selected')])),
  enabledTools: t.Optional(t.Array(t.String())),
  workflowIds: t.Optional(t.Array(t.String({ format: 'uuid' })))
});

export const RevokeApiKeySchema = t.Object({
  keyId: t.String({ format: 'uuid' })
});

export const UpdateNotificationSettingsSchema = t.Object({
  waFailed: t.Optional(t.Boolean()),
  customerReplied: t.Optional(t.Boolean()),
  cardOverdue: t.Optional(t.Boolean()),
  handover: t.Optional(t.Boolean()),
  emailWaFailed: t.Optional(t.Boolean()),
  emailCustomerReplied: t.Optional(t.Boolean()),
  emailCardOverdue: t.Optional(t.Boolean()),
  emailHandover: t.Optional(t.Boolean()),
  emailDigest: t.Optional(t.Boolean())
});
