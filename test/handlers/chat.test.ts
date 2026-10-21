import { beforeEach, expect, mock, test } from 'bun:test';

const findOrCreateDirectMock = mock(() =>
  Promise.resolve({
    conversation: { id: 'conv-1', kind: 'direct' as const },
    partner: { id: 'member-2', name: 'Member', email: 'member@test.app', avatarUrl: null, role: 'member' }
  })
);
const createGroupRoomMock = mock(() =>
  Promise.resolve({
    conversation: { id: 'conv-2', kind: 'group' as const, name: 'Test Room' },
    participants: [
      { userId: 'user-1', name: 'User', role: 'admin' },
      { userId: 'member-2', name: 'Member', role: 'member' },
      { userId: 'member-3', name: 'Member 3', role: 'member' }
    ]
  })
);
const sendMessageMock = mock(
  (_ws: string, _convId: string, _userId: string, body: string, _clientMsgId: string, _replyToId?: string) =>
    Promise.resolve({
      id: 'message-1',
      conversationId: 'conv-1',
      senderId: 'user-1',
      senderName: 'User',
      senderAvatarUrl: null,
      body,
      replyToMessageId: null,
      editedAt: null,
      deletedAt: null,
      createdAt: new Date()
    })
);
const listConversationsMock = mock(() => Promise.resolve([]));
const countUnreadMock = mock(() => Promise.resolve(0));
const listWorkspaceMembersForChatMock = mock(() => Promise.resolve([]));
const getMessagesMock = mock(() => Promise.resolve([]));
const editMessageMock = mock(() => Promise.resolve(true));
const deleteMessageMock = mock(() => Promise.resolve(true));
const toggleReactionMock = mock(() => Promise.resolve('added' as const));
const markReadMock = mock(() => Promise.resolve(true));
const getConversationDetailMock = mock(() => Promise.resolve(null));
const renameRoomMock = mock(() => Promise.resolve(true));
const addParticipantMock = mock(() => Promise.resolve(true));
const removeParticipantMock = mock(() => Promise.resolve(true));

mock.module('@services/chat', () => ({
  findOrCreateDirect: findOrCreateDirectMock,
  createGroupRoom: createGroupRoomMock,
  sendMessage: sendMessageMock,
  listConversations: listConversationsMock,
  countUnread: countUnreadMock,
  listWorkspaceMembersForChat: listWorkspaceMembersForChatMock,
  getMessages: getMessagesMock,
  editMessage: editMessageMock,
  deleteMessage: deleteMessageMock,
  toggleReaction: toggleReactionMock,
  markRead: markReadMock,
  getConversationDetail: getConversationDetailMock,
  renameRoom: renameRoomMock,
  addParticipant: addParticipantMock,
  removeParticipant: removeParticipantMock,
  createAttachment: mock(() => Promise.resolve(null))
}));

const {
  createDirectHandler,
  createGroupHandler,
  sendMessageHandler,
  getMessagesHandler,
  editMessageHandler,
  deleteMessageHandler,
  toggleReactionHandler,
  markReadHandler
} = await import('@handlers/chat');

const user = {
  id: 'user-1',
  email: 'user@test.app',
  name: 'User',
  phone: null,
  avatarUrl: null,
  activeWorkspaceId: 'workspace-1',
  platformAdmin: false,
  passwordHash: null,
  provider: null,
  providerId: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

const workspace = {
  id: 'workspace-1',
  name: 'Workspace',
  slug: 'workspace',
  createdAt: new Date(),
  updatedAt: new Date()
};

const context = (overrides: Record<string, unknown> = {}) => ({
  body: { body: ' Hello there ', clientMessageId: 'client-1' },
  params: { workspaceId: workspace.id, conversationId: 'conv-1', messageId: 'msg-1', reaction: '👍', userId: 'member-2' },
  query: {},
  set: { status: undefined as number | undefined, headers: {} },
  cookie: {},
  user,
  workspace,
  membership: { role: 'member' },
  ...overrides
});

beforeEach(() => {
  findOrCreateDirectMock.mockClear();
  createGroupRoomMock.mockClear();
  sendMessageMock.mockClear();
  editMessageMock.mockClear();
  deleteMessageMock.mockClear();
  toggleReactionMock.mockClear();
  markReadMock.mockClear();
});

test('sendChatMessage trims message text before persistence', async () => {
  const result = await sendMessageHandler(context() as never);

  expect(sendMessageMock).toHaveBeenCalledTimes(1);
  expect(sendMessageMock.mock.calls[0]).toEqual([
    workspace.id,
    'conv-1',
    user.id,
    'Hello there',
    'client-1',
    undefined
  ]);
  expect(result).toMatchObject({ message: { body: 'Hello there' } });
});

test('sendChatMessage rejects whitespace-only messages', async () => {
  const ctx = context({ body: { body: '   ', clientMessageId: 'client-1' } });
  const result = await sendMessageHandler(ctx as never);

  expect(ctx.set.status).toBe(400);
  expect(result).toEqual({ error: 'Message cannot be empty without attachments' });
  expect(sendMessageMock).not.toHaveBeenCalled();
});

test('sendChatMessage requires clientMessageId', async () => {
  const ctx = context({ body: { body: 'Hello', clientMessageId: '' } });
  const result = await sendMessageHandler(ctx as never);

  expect(ctx.set.status).toBe(400);
  expect(result).toEqual({ error: 'clientMessageId is required' });
  expect(sendMessageMock).not.toHaveBeenCalled();
});

test('createDirect rejects conversations with the current user', async () => {
  const ctx = context({
    body: { memberId: user.id },
    params: { workspaceId: workspace.id }
  });
  const result = await createDirectHandler(ctx as never);

  expect(ctx.set.status).toBe(400);
  expect(result).toEqual({ error: 'You cannot start a conversation with yourself' });
  expect(findOrCreateDirectMock).not.toHaveBeenCalled();
});

test('createDirect hides users outside the active workspace', async () => {
  findOrCreateDirectMock.mockResolvedValueOnce(null as never);
  const ctx = context({
    body: { memberId: 'member-2' },
    params: { workspaceId: workspace.id }
  });
  const result = await createDirectHandler(ctx as never);

  expect(ctx.set.status).toBe(404);
  expect(result).toEqual({ error: 'Workspace member not found' });
});

test('createGroup accepts one other workspace member', async () => {
  const ctx = context({
    body: { name: 'Test Room', memberIds: ['member-2'] },
    params: { workspaceId: workspace.id }
  });
  const result = await createGroupHandler(ctx as never);

  expect(ctx.set.status).toBeUndefined();
  expect(createGroupRoomMock).toHaveBeenCalledWith(
    workspace.id,
    user.id,
    'Test Room',
    ['member-2']
  );
  expect(result).toMatchObject({ conversation: { kind: 'group', name: 'Test Room' } });
});

test('createGroup requires a name', async () => {
  const ctx = context({
    body: { name: '  ', memberIds: ['member-2', 'member-3'] },
    params: { workspaceId: workspace.id }
  });
  const result = await createGroupHandler(ctx as never);

  expect(ctx.set.status).toBe(400);
  expect(result).toEqual({ error: 'Room name is required' });
  expect(createGroupRoomMock).not.toHaveBeenCalled();
});

test('sendChatMessage requires authenticated workspace membership', async () => {
  const ctx = context({ membership: null });
  const result = await sendMessageHandler(ctx as never);

  expect(ctx.set.status).toBe(403);
  expect(result).toEqual({ error: 'Forbidden' });
  expect(sendMessageMock).not.toHaveBeenCalled();
});

test('editMessage requires auth', async () => {
  const ctx = context({ membership: null, body: { body: 'Edited' } });
  const result = await editMessageHandler(ctx as never);

  expect(ctx.set.status).toBe(403);
  expect(result).toEqual({ error: 'Forbidden' });
  expect(editMessageMock).not.toHaveBeenCalled();
});

test('deleteMessage requires auth', async () => {
  const ctx = context({ membership: null });
  const result = await deleteMessageHandler(ctx as never);

  expect(ctx.set.status).toBe(403);
  expect(result).toEqual({ error: 'Forbidden' });
  expect(deleteMessageMock).not.toHaveBeenCalled();
});

test('toggleReaction requires auth', async () => {
  const ctx = context({ membership: null });
  const result = await toggleReactionHandler(ctx as never);

  expect(ctx.set.status).toBe(403);
  expect(result).toEqual({ error: 'Forbidden' });
  expect(toggleReactionMock).not.toHaveBeenCalled();
});

test('markRead requires auth', async () => {
  const ctx = context({ membership: null });
  const result = await markReadHandler(ctx as never);

  expect(ctx.set.status).toBe(403);
  expect(result).toEqual({ error: 'Forbidden' });
  expect(markReadMock).not.toHaveBeenCalled();
});
