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
  ownerId: t.Optional(t.String({ format: 'uuid' })),
  defaultAssigneeId: t.Optional(t.Union([t.String({ format: 'uuid' }), t.Null()])),
  defaultAssigneeIds: t.Optional(t.Array(t.String({ format: 'uuid' })))
});

export const UpdateWorkflowSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
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
  workspaceId: t.String({ format: 'uuid' }),
  tool: t.Union([
    t.Literal('create_card'),
    t.Literal('notify_assignee'),
    t.Literal('move_stage'),
    t.Literal('stop_followups')
  ]),
  arguments: t.Record(t.String(), t.Unknown())
});

export const IntegrationCreateCardSchema = t.Object({
  workspaceId: t.String({ format: 'uuid' }),
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
  defaultWorkflowId: t.String({ format: 'uuid' }),
  sendEndpoint: t.String({ minLength: 1, maxLength: 1000 }),
  healthEndpoint: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
  sendApiKey: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  enabledTools: WajomEnabledTools
});

export const UpdateWajomConnectionSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  instanceId: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  countryCode: t.Optional(t.String({ minLength: 1, maxLength: 3 })),
  defaultWorkflowId: t.Optional(t.String({ format: 'uuid' })),
  sendEndpoint: t.Optional(t.String({ minLength: 1, maxLength: 1000 })),
  healthEndpoint: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
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
