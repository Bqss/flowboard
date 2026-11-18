import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db, workspaces } from '@db';
import * as chat from '@handlers/chat';
import { createRequireAuth } from '@middlewares';
import { resolveWorkspaceMember } from '@middlewares/workspace';
import {
  AddParticipantSchema,
  ChatAttachmentSchema,
  ChatConversationParam,
  ChatMessageParam,
  ChatParticipantParam,
  ChatReactionParam,
  CreateDirectSchema,
  CreateGroupSchema,
  EditChatMessageSchema,
  RenameRoomSchema,
  SendBuzzSchema,
  SendChatMessageSchema,
  WorkspaceIdParam
} from '@validators';

export const createChatRoutes = () => {
  const workspaceMemberGuard = new Elysia()
    .derive({ as: 'scoped' }, async ({ cookie, params, request }) =>
      resolveWorkspaceMember(cookie, params.workspaceId, request)
    )
    .onBeforeHandle({ as: 'scoped' }, async (ctx) => {
      const scoped = ctx as unknown as {
        workspace: typeof workspaces.$inferSelect | null;
        membership: { role: 'owner' | 'member' } | null;
        user: { id: string } | null;
        params: { workspaceId?: string; conversationId?: string };
        set: typeof ctx.set;
      };
      if (scoped.workspace && scoped.membership) return;
      const { user, params } = scoped;
      if (
        !user?.id ||
        !params.workspaceId ||
        !params.conversationId ||
        !(await chat.canAccessGlobalDirect(params.workspaceId, params.conversationId, user.id))
      ) {
        scoped.set.status = 403;
        return { error: 'Forbidden' };
      }
      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, params.workspaceId))
        .limit(1);
      if (!workspace) {
        scoped.set.status = 403;
        return { error: 'Forbidden' };
      }
      scoped.workspace = workspace;
      scoped.membership = { role: 'member' };
    });

  const inboxRoutes = new Elysia({ prefix: '/chat' })
    .use(createRequireAuth())
    .get('/inbox', chat.listAllChatInboxHandler)
    .get('/inbox/unread', chat.getAllChatUnreadHandler);

  return new Elysia()
    .use(inboxRoutes)
    .use(new Elysia({ prefix: '/workspaces/:workspaceId/chat' })
    .use(createRequireAuth())
    .use(workspaceMemberGuard)

    // Conversations
    .get('/conversations', chat.listConversationsHandler, { params: WorkspaceIdParam })
    .get('/unread', chat.getUnreadHandler, { params: WorkspaceIdParam })
    .get('/members', chat.getMembersHandler, { params: WorkspaceIdParam })
    .get('/presence', chat.getPresenceHandler, { params: WorkspaceIdParam })
    .get('/online-users', chat.getPresenceHandler, { params: WorkspaceIdParam })
    .post('/direct', chat.createDirectHandler, {
      params: WorkspaceIdParam,
      body: CreateDirectSchema
    })
    .post('/direct/global', chat.createGlobalDirectHandler, {
      params: WorkspaceIdParam,
      body: t.Object({ email: t.String({ format: 'email', maxLength: 320 }) })
    })
    .post('/rooms', chat.createGroupHandler, {
      params: WorkspaceIdParam,
      body: CreateGroupSchema
    })
    .get('/context/:contextType/:contextId', chat.getContextConversationHandler, {
      params: t.Object({
        workspaceId: t.String(),
        contextType: t.Union([t.Literal('taskboard'), t.Literal('workflow')]),
        contextId: t.String()
      })
    })

    // Conversation detail + management
    .get('/conversations/:conversationId', chat.getConversationHandler, {
      params: ChatConversationParam
    })
    .patch('/conversations/:conversationId', chat.renameConversationHandler, {
      params: ChatConversationParam,
      body: RenameRoomSchema
    })

    // Participants
    .post('/conversations/:conversationId/participants', chat.addParticipantHandler, {
      params: ChatConversationParam,
      body: AddParticipantSchema
    })
    .delete('/conversations/:conversationId/participants/:userId', chat.removeParticipantHandler, {
      params: ChatParticipantParam
    })

    // Messages
    .get('/conversations/:conversationId/messages', chat.getMessagesHandler, {
      params: ChatConversationParam
    })
    .post('/conversations/:conversationId/messages', chat.sendMessageHandler, {
      params: ChatConversationParam,
      body: SendChatMessageSchema
    })
    .patch('/conversations/:conversationId/messages/:messageId', chat.editMessageHandler, {
      params: ChatMessageParam,
      body: EditChatMessageSchema
    })
    .delete('/conversations/:conversationId/messages/:messageId', chat.deleteMessageHandler, {
      params: ChatMessageParam
    })
    .post('/conversations/:conversationId/messages/:messageId/pin', chat.togglePinMessageHandler, {
      params: ChatMessageParam
    })
    .post('/conversations/:conversationId/messages/:messageId/forward', chat.forwardMessageHandler, {
      params: ChatMessageParam,
      body: t.Object({
        targetConversationIds: t.Array(t.String({ format: 'uuid' }), { minItems: 1 })
      })
    })
    // Attachments
    .post('/conversations/:conversationId/attachments', chat.uploadAttachmentHandler, {
      params: ChatConversationParam,
      body: ChatAttachmentSchema
    })

    // Reactions
    .put(
      '/conversations/:conversationId/messages/:messageId/reactions/:reaction',
      chat.toggleReactionHandler,
      { params: ChatReactionParam }
    )

    // Read state
    .post('/conversations/:conversationId/read', chat.markReadHandler, {
      params: ChatConversationParam
    })
    // Bomb / Buzz (big sound & vibrate alert)
    .post('/buzz', chat.sendBuzzHandler, {
      params: WorkspaceIdParam,
      body: SendBuzzSchema
    })
    .post('/conversations/:conversationId/buzz', chat.sendBuzzHandler, {
      params: ChatConversationParam,
      body: SendBuzzSchema
    }));
};
