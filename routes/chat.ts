import { Elysia } from 'elysia';
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
  SendChatMessageSchema,
  WorkspaceIdParam
} from '@validators';

export const createChatRoutes = () => {
  const workspaceMemberGuard = new Elysia()
    .derive({ as: 'scoped' }, async ({ cookie, params }) =>
      resolveWorkspaceMember(cookie, params.workspaceId)
    )
    .onBeforeHandle({ as: 'scoped' }, (ctx) => {
      const { workspace, membership, set } = ctx as typeof ctx & {
        workspace: unknown;
        membership: unknown;
      };
      if (!workspace || !membership) {
        set.status = 403;
        return { error: 'Forbidden' };
      }
    });

  return new Elysia({ prefix: '/workspaces/:workspaceId/chat' })
    .use(createRequireAuth())
    .use(workspaceMemberGuard)

    // Conversations
    .get('/conversations', chat.listConversationsHandler, { params: WorkspaceIdParam })
    .get('/unread', chat.getUnreadHandler, { params: WorkspaceIdParam })
    .get('/members', chat.getMembersHandler, { params: WorkspaceIdParam })
    .post('/direct', chat.createDirectHandler, {
      params: WorkspaceIdParam,
      body: CreateDirectSchema
    })
    .post('/rooms', chat.createGroupHandler, {
      params: WorkspaceIdParam,
      body: CreateGroupSchema
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
    });
};
