import { mkdir } from 'node:fs/promises';
import type { Ctx } from '@core';
import {
  addParticipant,
  countUnread,
  createAttachment,
  createGroupRoom,
  deleteMessage,
  editMessage,
  findOrCreateDirect,
  getConversationDetail,
  getMessages,
  listConversations,
  listWorkspaceMembersForChat,
  markRead,
  removeParticipant,
  renameRoom,
  sendMessage,
  toggleReaction
} from '@services/chat';

type WorkspaceParams = { workspaceId: string };
type ConversationParams = WorkspaceParams & { conversationId: string };
type MessageParams = ConversationParams & { messageId: string };
type ReactionParams = MessageParams & { reaction: string };
type ParticipantParams = ConversationParams & { userId: string };

type ListQuery = { search?: string };
type MessagesQuery = { before?: string; limit?: string };
type UploadAttachmentBody = { file: File };
type SendMessageBody = { body: string; clientMessageId: string; replyToMessageId?: string; attachmentIds?: string[] };
type EditMessageBody = { body: string };
type CreateDirectBody = { memberId: string };
type CreateGroupBody = { name: string; memberIds: string[] };
type AddParticipantBody = { userId: string };
type RenameBody = { name: string };

const hasWorkspaceAccess = (
  ctx: Pick<Ctx, 'user' | 'workspace' | 'membership'>
): ctx is typeof ctx & {
  user: NonNullable<Ctx['user']>;
  workspace: NonNullable<Ctx['workspace']>;
  membership: NonNullable<Ctx['membership']>;
} => Boolean(ctx.user && ctx.workspace && ctx.membership);

/* ------------------------------------------------------- conversations */

export async function listConversationsHandler(ctx: Ctx<unknown, WorkspaceParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const conversations = await listConversations(ctx.workspace.id, ctx.user.id, ctx.query.search);
  return { conversations };
}

export async function getUnreadHandler(ctx: Ctx<unknown, WorkspaceParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  return { unread: await countUnread(ctx.workspace.id, ctx.user.id) };
}

export async function getMembersHandler(ctx: Ctx<unknown, WorkspaceParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const members = await listWorkspaceMembersForChat(ctx.workspace.id, ctx.user.id);
  return { members };
}

/* ------------------------------------------------------- direct + group */

export async function createDirectHandler(ctx: Ctx<CreateDirectBody, WorkspaceParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  if (ctx.body.memberId === ctx.user.id) {
    ctx.set.status = 400;
    return { error: 'You cannot start a conversation with yourself' };
  }
  const result = await findOrCreateDirect(ctx.workspace.id, ctx.user.id, ctx.body.memberId);
  if (!result) {
    ctx.set.status = 404;
    return { error: 'Workspace member not found' };
  }
  return result;
}

export async function createGroupHandler(ctx: Ctx<CreateGroupBody, WorkspaceParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const name = ctx.body.name?.trim();
  if (!name) {
    ctx.set.status = 400;
    return { error: 'Room name is required' };
  }
  if (!ctx.body.memberIds || ctx.body.memberIds.length < 1) {
    ctx.set.status = 400;
    return { error: 'At least 1 member is required' };
  }
  const result = await createGroupRoom(ctx.workspace.id, ctx.user.id, name, ctx.body.memberIds);
  if (!result) {
    ctx.set.status = 400;
    return { error: 'Could not create group room — check that all members belong to this workspace' };
  }
  return result;
}

/* ------------------------------------------------------- conversation detail */

export async function getConversationHandler(ctx: Ctx<unknown, ConversationParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const result = await getConversationDetail(ctx.workspace.id, ctx.params.conversationId, ctx.user.id);
  if (!result) {
    ctx.set.status = 404;
    return { error: 'Conversation not found' };
  }
  return result;
}

export async function renameConversationHandler(ctx: Ctx<RenameBody, ConversationParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const name = ctx.body.name?.trim();
  if (!name) {
    ctx.set.status = 400;
    return { error: 'Room name is required' };
  }
  const ok = await renameRoom(ctx.workspace.id, ctx.params.conversationId, ctx.user.id, name);
  if (!ok) {
    ctx.set.status = 403;
    return { error: 'Only room admins can rename' };
  }
  return { ok: true };
}

/* ------------------------------------------------------- participants */

export async function addParticipantHandler(ctx: Ctx<AddParticipantBody, ConversationParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const ok = await addParticipant(ctx.workspace.id, ctx.params.conversationId, ctx.user.id, ctx.body.userId);
  if (!ok) {
    ctx.set.status = 403;
    return { error: 'Only room admins can add participants' };
  }
  return { ok: true };
}

export async function removeParticipantHandler(ctx: Ctx<unknown, ParticipantParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const ok = await removeParticipant(ctx.workspace.id, ctx.params.conversationId, ctx.user.id, ctx.params.userId);
  if (!ok) {
    ctx.set.status = 403;
    return { error: 'Cannot remove this participant' };
  }
  return { ok: true };
}

/* ------------------------------------------------------- messages */

export async function getMessagesHandler(ctx: Ctx<unknown, ConversationParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  let before: { createdAt: Date; id: string } | undefined;
  if (ctx.query.before) {
    const [createdAtStr, id] = ctx.query.before.split(':');
    if (createdAtStr && id) {
      before = { createdAt: new Date(createdAtStr), id };
    }
  }
  const messages = await getMessages(ctx.workspace.id, ctx.params.conversationId, ctx.user.id, before);
  return { messages };
}

export async function sendMessageHandler(ctx: Ctx<SendMessageBody, ConversationParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const body = ctx.body.body?.trim();
  if (!body && (!ctx.body.attachmentIds || ctx.body.attachmentIds.length === 0)) {
    ctx.set.status = 400;
    return { error: 'Message cannot be empty without attachments' };
  }
  if (!ctx.body.clientMessageId) {
    ctx.set.status = 400;
    return { error: 'clientMessageId is required' };
  }
  const result = await sendMessage(
    ctx.workspace.id,
    ctx.params.conversationId,
    ctx.user.id,
    body || '',
    ctx.body.clientMessageId,
    ctx.body.replyToMessageId,
    ctx.body.attachmentIds
  );
  if (!result) {
    ctx.set.status = 404;
    return { error: 'Conversation not found or you are not a participant' };
  }
  return { message: result };
}

export async function editMessageHandler(ctx: Ctx<EditMessageBody, MessageParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const body = ctx.body.body?.trim();
  if (!body) {
    ctx.set.status = 400;
    return { error: 'Message cannot be empty' };
  }
  const ok = await editMessage(ctx.workspace.id, ctx.params.conversationId, ctx.params.messageId, ctx.user.id, body);
  if (!ok) {
    ctx.set.status = 403;
    return { error: 'You can only edit your own non-deleted messages' };
  }
  return { ok: true };
}

export async function deleteMessageHandler(ctx: Ctx<unknown, MessageParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const ok = await deleteMessage(ctx.workspace.id, ctx.params.conversationId, ctx.params.messageId, ctx.user.id);
  if (!ok) {
    ctx.set.status = 403;
    return { error: 'You can only delete your own messages' };
  }
  return { ok: true };
}

/* ------------------------------------------------------- reactions */

export async function toggleReactionHandler(ctx: Ctx<unknown, ReactionParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const result = await toggleReaction(
    ctx.workspace.id,
    ctx.params.conversationId,
    ctx.params.messageId,
    ctx.user.id,
    decodeURIComponent(ctx.params.reaction)
  );
  if (!result) {
    ctx.set.status = 404;
    return { error: 'Message not found or you are not a participant' };
  }
  return { action: result };
}

/* ------------------------------------------------------- read */

export async function markReadHandler(ctx: Ctx<unknown, ConversationParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const ok = await markRead(ctx.workspace.id, ctx.params.conversationId, ctx.user.id);
  if (!ok) {
    ctx.set.status = 404;
    return { error: 'Conversation not found or you are not a participant' };
  }
  return { ok: true };
}

/* ------------------------------------------------------- attachments */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_FILE_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
  'text/plain', 'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function uploadAttachmentHandler(ctx: Ctx<UploadAttachmentBody, ConversationParams>) {
  if (!hasWorkspaceAccess(ctx)) {
    ctx.set.status = 403;
    return { error: 'Forbidden' };
  }
  const file = ctx.body.file;
  if (!file || !file.name) {
    ctx.set.status = 400;
    return { error: 'No file uploaded' };
  }
  if (file.size > MAX_FILE_SIZE) {
    ctx.set.status = 413;
    return { error: 'File too large (max 50 MB)' };
  }
  // Determine content type — use the file's type or infer from extension
  let fileType = file.type || 'application/octet-stream';
  if (!file.type) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const extMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm',
      mov: 'video/quicktime', pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown',
      doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    fileType = extMap[ext] ?? 'application/octet-stream';
  }

  // Save file to static/chat-uploads/
  const ext = file.name.split('.').pop() || 'bin';
  const filename = `${ctx.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await mkdir('static/chat-uploads', { recursive: true });
  await Bun.write(`static/chat-uploads/${filename}`, file);

  // Get image dimensions for images
  let width: number | null = null;
  let height: number | null = null;
  // Image dimensions are detected client-side after upload; left null here.

  const attachment = await createAttachment(
    ctx.workspace.id,
    ctx.params.conversationId,
    ctx.user.id,
    file.name,
    `/chat-uploads/${filename}`,
    fileType,
    file.size,
    width,
    height
  );
  if (!attachment) {
    ctx.set.status = 404;
    return { error: 'Conversation not found or you are not a participant' };
  }
  return { attachment };
}
