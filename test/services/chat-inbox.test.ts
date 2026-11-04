import { expect, test } from 'bun:test';
import { mergeWorkspaceConversations, type ChatInboxWorkspace } from '../../app/services/chatInbox';

const workspaceA: ChatInboxWorkspace = { id: 'workspace-a', name: 'Alpha', slug: 'alpha' };
const workspaceB: ChatInboxWorkspace = { id: 'workspace-b', name: 'Beta', slug: 'beta' };

const conversation = (id: string, updatedAt: string, lastMessageAt?: string) => ({
  id,
  kind: 'direct' as const,
  category: 'personal' as const,
  contextId: null,
  groupId: null,
  name: null,
  partner: null,
  lastMessage: lastMessageAt
    ? {
        id: `message-${id}`,
        body: `Message for ${id}`,
        senderId: 'sender-1',
        senderName: 'Sender',
        createdAt: new Date(lastMessageAt),
        deletedAt: null
      }
    : null,
  unreadCount: 0,
  updatedAt: new Date(updatedAt)
});

test('mergeWorkspaceConversations globally sorts and attaches workspace context', () => {
  const merged = mergeWorkspaceConversations([
    {
      workspace: workspaceA,
      conversations: [
        conversation('a-newest', '2025-05-01T10:00:00.000Z', '2025-05-01T10:00:00.000Z'),
        conversation('a-oldest', '2025-05-01T08:00:00.000Z', '2025-05-01T07:00:00.000Z')
      ]
    },
    {
      workspace: workspaceB,
      conversations: [conversation('b-fallback', '2025-05-01T09:00:00.000Z')]
    }
  ]);

  expect(merged.map(({ id, workspaceId, workspaceName, workspaceSlug }) => ({
    id,
    workspaceId,
    workspaceName,
    workspaceSlug
  }))).toEqual([
    { id: 'a-newest', workspaceId: 'workspace-a', workspaceName: 'Alpha', workspaceSlug: 'alpha' },
    { id: 'b-fallback', workspaceId: 'workspace-b', workspaceName: 'Beta', workspaceSlug: 'beta' },
    { id: 'a-oldest', workspaceId: 'workspace-a', workspaceName: 'Alpha', workspaceSlug: 'alpha' }
  ]);
});

test('mergeWorkspaceConversations returns an empty list for no batches', () => {
  expect(mergeWorkspaceConversations([])).toEqual([]);
});
