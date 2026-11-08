import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lt, ne, or, sql } from 'drizzle-orm';
import {
  db,
  chatAttachments,
  chatConversations,
  chatParticipants,
  chatMessages,
  chatReactions,
  users,
  workspaceMemberGroupMembers,
  workspaceMemberGroups,
  workspaceMembers,
  tasks,
  taskBoards,
  workflows
} from '@db';
import { createWorkspaceMemberGroup, listWorkspacesForUser } from '@services/workspace';
import { broadcastToUsers, type ChatSocketEvent } from './chatSocket';
import { createNotification } from '@services/notification';
import { mergeWorkspaceConversations, type ChatInboxWorkspace } from './chatInbox';
export { mergeWorkspaceConversations, type ChatInboxWorkspace } from './chatInbox';

const THREAD_LIMIT = 50;
const LIST_LIMIT = 50;

/* ------------------------------------------------------------------ helpers */

/** Normalized pair key for direct conversations: `min:max` (UUIDs are lowercase). */
const directKey = (userId: string, memberId: string) => {
  const a = userId.toLowerCase();
  const b = memberId.toLowerCase();
  return a < b ? `${a}:${b}` : `${b}:${a}`;
};

/** Verify that `memberId` is an active member of `workspaceId`. */
const findWorkspaceMember = async (workspaceId: string, memberId: string) => {
  const [member] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: workspaceMembers.role
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, memberId)
      )
    )
    .limit(1);

  return member ?? null;
};

/** Check if a user has access to a taskboard or workflow */
export const checkContextAccess = async (
  workspaceId: string,
  contextType: 'taskboard' | 'workflow' | string | null | undefined,
  contextId: string | null | undefined,
  groupId: string | null | undefined,
  userId: string
): Promise<boolean> => {
  if (!contextId || (contextType !== 'taskboard' && contextType !== 'workflow')) return false;

  const [workspaceMember] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);

  if (!workspaceMember) return false;
  if (workspaceMember.role === 'owner') return true;

  if (contextType === 'taskboard') {
    const [board] = await db
      .select({
        ownerId: taskBoards.ownerId,
        workspaceMemberGroupId: taskBoards.workspaceMemberGroupId,
        workspaceMemberGroupIds: taskBoards.workspaceMemberGroupIds,
        allowedUserIds: taskBoards.allowedUserIds
      })
      .from(taskBoards)
      .where(and(eq(taskBoards.id, contextId), eq(taskBoards.workspaceId, workspaceId)))
      .limit(1);

    if (!board) return false;
    if (board.ownerId === userId) return true;

    const groupIds = (board.workspaceMemberGroupIds && board.workspaceMemberGroupIds.length > 0)
      ? board.workspaceMemberGroupIds
      : (board.workspaceMemberGroupId ? [board.workspaceMemberGroupId] : []);
    const allowedUsers = board.allowedUserIds ?? [];

    if (groupIds.length === 0 && allowedUsers.length === 0) return true;
    if (allowedUsers.includes(userId)) return true;

    if (groupIds.length > 0) {
      const [groupMember] = await db
        .select({ id: workspaceMemberGroupMembers.id })
        .from(workspaceMemberGroupMembers)
        .where(
          and(
            inArray(workspaceMemberGroupMembers.groupId, groupIds),
            eq(workspaceMemberGroupMembers.userId, userId)
          )
        )
        .limit(1);

      return Boolean(groupMember);
    }
    return false;
  }

  if (contextType === 'workflow') {
    const [wf] = await db
      .select({
        ownerId: workflows.ownerId,
        workspaceMemberGroupId: workflows.workspaceMemberGroupId,
        workspaceMemberGroupIds: workflows.workspaceMemberGroupIds,
        allowedUserIds: workflows.allowedUserIds
      })
      .from(workflows)
      .where(and(eq(workflows.id, contextId), eq(workflows.workspaceId, workspaceId)))
      .limit(1);

    if (!wf) return false;
    if (wf.ownerId === userId) return true;

    const groupIds = (wf.workspaceMemberGroupIds && wf.workspaceMemberGroupIds.length > 0)
      ? wf.workspaceMemberGroupIds
      : (wf.workspaceMemberGroupId ? [wf.workspaceMemberGroupId] : []);
    const allowedUsers = wf.allowedUserIds ?? [];

    if (groupIds.length === 0 && allowedUsers.length === 0) return true;
    if (allowedUsers.includes(userId)) return true;

    if (groupIds.length > 0) {
      const [groupMember] = await db
        .select({ id: workspaceMemberGroupMembers.id })
        .from(workspaceMemberGroupMembers)
        .where(
          and(
            inArray(workspaceMemberGroupMembers.groupId, groupIds),
            eq(workspaceMemberGroupMembers.userId, userId)
          )
        )
        .limit(1);

      return Boolean(groupMember);
    }
    return false;
  }

  return false;
};

/** Ensure all workspace/group members who have access to a context conversation are enrolled as participants */
export const syncContextParticipants = async (conversationId: string) => {
  const [conversation] = await db
    .select({
      id: chatConversations.id,
      workspaceId: chatConversations.workspaceId,
      contextType: chatConversations.contextType,
      contextId: chatConversations.contextId,
      groupId: chatConversations.groupId,
      createdById: chatConversations.createdById
    })
    .from(chatConversations)
    .where(eq(chatConversations.id, conversationId))
    .limit(1);

  if (!conversation || !conversation.contextId || (conversation.contextType !== 'taskboard' && conversation.contextType !== 'workflow')) {
    return;
  }

  let eligibleUserIds: string[] = [];

  const wsMembers = await db
    .select({ userId: workspaceMembers.userId, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, conversation.workspaceId));

  const workspaceOwnerIds = wsMembers.filter((m) => m.role === 'owner').map((m) => m.userId);

  if (conversation.contextType === 'taskboard') {
    const [board] = await db
      .select({
        ownerId: taskBoards.ownerId,
        workspaceMemberGroupId: taskBoards.workspaceMemberGroupId,
        workspaceMemberGroupIds: taskBoards.workspaceMemberGroupIds,
        allowedUserIds: taskBoards.allowedUserIds
      })
      .from(taskBoards)
      .where(eq(taskBoards.id, conversation.contextId))
      .limit(1);

    if (board) {
      const groupIds = (board.workspaceMemberGroupIds && board.workspaceMemberGroupIds.length > 0)
        ? board.workspaceMemberGroupIds
        : (board.workspaceMemberGroupId ? [board.workspaceMemberGroupId] : []);
      const allowedUsers = board.allowedUserIds ?? [];

      if (groupIds.length === 0 && allowedUsers.length === 0) {
        eligibleUserIds = wsMembers.map((m) => m.userId);
      } else {
        const groupMembers = groupIds.length > 0
          ? await db
              .select({ userId: workspaceMemberGroupMembers.userId })
              .from(workspaceMemberGroupMembers)
              .where(inArray(workspaceMemberGroupMembers.groupId, groupIds))
          : [];
        eligibleUserIds = [
          ...new Set([
            ...groupMembers.map((m) => m.userId),
            ...allowedUsers,
            board.ownerId,
            ...workspaceOwnerIds
          ])
        ];
      }
    }
  } else if (conversation.contextType === 'workflow') {
    const [wf] = await db
      .select({
        ownerId: workflows.ownerId,
        workspaceMemberGroupId: workflows.workspaceMemberGroupId,
        workspaceMemberGroupIds: workflows.workspaceMemberGroupIds,
        allowedUserIds: workflows.allowedUserIds
      })
      .from(workflows)
      .where(eq(workflows.id, conversation.contextId))
      .limit(1);

    if (wf) {
      const groupIds = (wf.workspaceMemberGroupIds && wf.workspaceMemberGroupIds.length > 0)
        ? wf.workspaceMemberGroupIds
        : (wf.workspaceMemberGroupId ? [wf.workspaceMemberGroupId] : []);
      const allowedUsers = wf.allowedUserIds ?? [];

      if (groupIds.length === 0 && allowedUsers.length === 0) {
        eligibleUserIds = wsMembers.map((m) => m.userId);
      } else {
        const groupMembers = groupIds.length > 0
          ? await db
              .select({ userId: workspaceMemberGroupMembers.userId })
              .from(workspaceMemberGroupMembers)
              .where(inArray(workspaceMemberGroupMembers.groupId, groupIds))
          : [];
        eligibleUserIds = [
          ...new Set([
            ...groupMembers.map((m) => m.userId),
            ...allowedUsers,
            wf.ownerId,
            ...workspaceOwnerIds
          ])
        ];
      }
    }
  }

  if (eligibleUserIds.length > 0) {
    await db
      .insert(chatParticipants)
      .values(
        eligibleUserIds.map((userId) => ({
          conversationId,
          workspaceId: conversation.workspaceId,
          userId,
          role: userId === conversation.createdById ? ('admin' as const) : ('member' as const)
        }))
      )
      .onConflictDoNothing();
  }
};

/** Verify that `userId` is an active participant of `conversationId`. */
const assertParticipant = async (conversationId: string, userId: string) => {
  const [participant] = await db
    .select()
    .from(chatParticipants)
    .where(
      and(
        eq(chatParticipants.conversationId, conversationId),
        eq(chatParticipants.userId, userId),
        isNull(chatParticipants.leftAt)
      )
    )
    .limit(1);

  if (participant) return participant;

  // Auto-sync for context conversations (taskboard / workflow)
  const [conversation] = await db
    .select({
      id: chatConversations.id,
      workspaceId: chatConversations.workspaceId,
      contextType: chatConversations.contextType,
      contextId: chatConversations.contextId,
      groupId: chatConversations.groupId
    })
    .from(chatConversations)
    .where(eq(chatConversations.id, conversationId))
    .limit(1);

  if (conversation && (conversation.contextType === 'taskboard' || conversation.contextType === 'workflow') && conversation.contextId) {
    const hasAccess = await checkContextAccess(conversation.workspaceId, conversation.contextType, conversation.contextId, conversation.groupId, userId);
    if (hasAccess) {
      const [newParticipant] = await db
        .insert(chatParticipants)
        .values({
          conversationId,
          workspaceId: conversation.workspaceId,
          userId,
          role: 'member'
        })
        .onConflictDoUpdate({
          target: [chatParticipants.conversationId, chatParticipants.userId],
          set: { leftAt: null }
        })
        .returning();
      return newParticipant ?? null;
    }
  }

  return null;
};

/** Get conversation, verifying it belongs to `workspaceId`. */
const getConversation = async (workspaceId: string, conversationId: string) => {
  const [conversation] = await db
    .select()
    .from(chatConversations)
    .where(
      and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.workspaceId, workspaceId),
        isNull(chatConversations.archivedAt)
      )
    )
    .limit(1);
  return conversation ?? null;
};

/** Get all active participants with user info for a conversation. */
const getParticipants = async (conversationId: string) => {
  return db
    .select({
      id: chatParticipants.id,
      userId: chatParticipants.userId,
      role: chatParticipants.role,
      joinedAt: chatParticipants.joinedAt,
      leftAt: chatParticipants.leftAt,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl
    })
    .from(chatParticipants)
    .innerJoin(users, eq(users.id, chatParticipants.userId))
    .where(
      and(
        eq(chatParticipants.conversationId, conversationId),
        isNull(chatParticipants.leftAt)
      )
    );
};

/** Get just the userIds of active participants for broadcasting. */
const getParticipantUserIds = async (conversationId: string): Promise<string[]> => {
  const rows = await db
    .select({ userId: chatParticipants.userId })
    .from(chatParticipants)
    .where(
      and(
        eq(chatParticipants.conversationId, conversationId),
        isNull(chatParticipants.leftAt)
      )
    );
  return rows.map((r) => r.userId);
};

/** For direct conversations, get the other participant's info. */
const getDirectPartner = async (conversationId: string, userId: string) => {
  const [participant] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: workspaceMembers.role
    })
    .from(chatParticipants)
    .innerJoin(users, eq(users.id, chatParticipants.userId))
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, chatParticipants.workspaceId),
        eq(workspaceMembers.userId, users.id)
      )
    )
    .where(
      and(
        eq(chatParticipants.conversationId, conversationId),
        ne(chatParticipants.userId, userId),
        isNull(chatParticipants.leftAt)
      )
    )
    .limit(1);
  return participant ?? null;
};

/* ------------------------------------------------------- conversation list */

type ConversationListItem = {
  id: string;
  kind: 'direct' | 'group' | 'taskboard' | 'workflow';
  contextType?: 'group' | 'taskboard' | 'workflow' | null;
  category: 'personal' | 'group' | 'taskboard' | 'workflow';
  contextId: string | null;
  groupId: string | null;
  name: string | null;
  partner: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  lastMessage: {
    id: string;
    body: string;
    senderId: string;
    senderName: string;
    createdAt: Date;
    deletedAt: Date | null;
  } | null;
  unreadCount: number;
  updatedAt: Date;
};

export const listConversations = async (
  workspaceId: string,
  userId: string,
  search?: string
): Promise<ConversationListItem[]> => {
  // Auto-sync active context conversations in this workspace that the user has access to
  const contextConvs = await db
    .select({
      id: chatConversations.id,
      contextType: chatConversations.contextType,
      contextId: chatConversations.contextId,
      groupId: chatConversations.groupId
    })
    .from(chatConversations)
    .where(
      and(
        eq(chatConversations.workspaceId, workspaceId),
        inArray(chatConversations.contextType, ['taskboard', 'workflow']),
        isNull(chatConversations.archivedAt)
      )
    );

  for (const conv of contextConvs) {
    if (conv.contextId && (conv.contextType === 'taskboard' || conv.contextType === 'workflow')) {
      const hasAccess = await checkContextAccess(workspaceId, conv.contextType, conv.contextId, conv.groupId, userId);
      if (hasAccess) {
        await db
          .insert(chatParticipants)
          .values({
            conversationId: conv.id,
            workspaceId,
            userId,
            role: 'member'
          })
          .onConflictDoNothing();
      }
    }
  }

  // Get all active conversations for the user in this workspace
  const participantRows = await db
    .select({
      conversationId: chatParticipants.conversationId,
      lastReadAt: chatParticipants.lastReadAt
    })
    .from(chatParticipants)
    .where(
      and(
        eq(chatParticipants.workspaceId, workspaceId),
        eq(chatParticipants.userId, userId),
        isNull(chatParticipants.leftAt)
      )
    );

  if (participantRows.length === 0) return [];

  const conversationIds = participantRows.map((r) => r.conversationId);
  const lastReadMap = new Map(participantRows.map((r) => [r.conversationId, r.lastReadAt]));

  // Fetch conversations
  let conversationsQuery = db
    .select()
    .from(chatConversations)
    .where(
      and(
        sql`${chatConversations.id} = ANY(${sql.raw(`ARRAY['${conversationIds.join("','")}']::uuid[]`)})`,
        eq(chatConversations.workspaceId, workspaceId),
        isNull(chatConversations.archivedAt)
      )
    );

  let conversations = await conversationsQuery;

  // For direct conversations, fetch partner info and filter by search
  const directIds = conversations.filter((c) => c.kind === 'direct').map((c) => c.id);
  const groupIds = conversations.filter((c) => c.kind === 'group').map((c) => c.id);

  const partnerMap = new Map<string, { id: string; name: string; email: string; avatarUrl: string | null }>();
  for (const convId of directIds) {
    const partner = await getDirectPartner(convId, userId);
    if (partner) {
      partnerMap.set(convId, {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        avatarUrl: partner.avatarUrl
      });
    }
  }

  // Apply search filter
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    conversations = conversations.filter((c) => {
      if (c.kind === 'group') {
        return c.name?.toLowerCase().includes(q);
      }
      const partner = partnerMap.get(c.id);
      return partner?.name.toLowerCase().includes(q) || partner?.email.toLowerCase().includes(q);
    });
  }

  if (conversations.length === 0) return [];

  // Fetch last message and unread count for each conversation
  const items: ConversationListItem[] = [];
  for (const conv of conversations) {
    const convId = conv.id;
    const lastReadAt = lastReadMap.get(convId) ?? null;

    // Last message
    const [lastMsg] = await db
      .select({
        id: chatMessages.id,
        body: chatMessages.body,
        senderId: chatMessages.senderId,
        senderName: users.name,
        createdAt: chatMessages.createdAt,
        deletedAt: chatMessages.deletedAt
      })
      .from(chatMessages)
      .innerJoin(users, eq(users.id, chatMessages.senderId))
      .where(eq(chatMessages.conversationId, convId))
      .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
      .limit(1);

    // Unread count: messages after lastReadAt, not from self, not deleted
    const [unreadRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, convId),
          ne(chatMessages.senderId, userId),
          isNull(chatMessages.deletedAt),
          lastReadAt ? gt(chatMessages.createdAt, lastReadAt) : sql`TRUE`
        )
      );
    items.push({
      id: convId,
      kind: conv.kind as 'direct' | 'group' | 'taskboard' | 'workflow',
      contextType: conv.contextType,
      category:
        conv.kind === 'direct'
          ? 'personal'
          : conv.contextType === 'taskboard'
            ? 'taskboard'
            : conv.contextType === 'workflow'
              ? 'workflow'
              : 'group',
      contextId: conv.contextId,
      groupId: conv.groupId,
      name: conv.name,
      partner: partnerMap.get(convId) ?? null,
      lastMessage: lastMsg
        ? {
            id: lastMsg.id,
            body: lastMsg.body,
            senderId: lastMsg.senderId,
            senderName: lastMsg.senderName,
            createdAt: lastMsg.createdAt,
            deletedAt: lastMsg.deletedAt
          }
        : null,
      unreadCount: unreadRow?.count ?? 0,
      updatedAt: conv.updatedAt
    });
  }

  // Sort by last message time (or updatedAt), most recent first
  items.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt.getTime() ?? a.updatedAt.getTime();
    const bTime = b.lastMessage?.createdAt.getTime() ?? b.updatedAt.getTime();
    return bTime - aTime;
  });

  return items;
};

/* ------------------------------------------------------- unread total */

export const countUnread = async (workspaceId: string, userId: string) => {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(chatMessages)
    .innerJoin(chatParticipants, eq(chatParticipants.conversationId, chatMessages.conversationId))
    .innerJoin(chatConversations, eq(chatConversations.id, chatMessages.conversationId))
    .where(
      and(
        eq(chatParticipants.workspaceId, workspaceId),
        eq(chatParticipants.userId, userId),
        isNull(chatParticipants.leftAt),
        isNull(chatConversations.archivedAt),
        ne(chatMessages.senderId, userId),
        isNull(chatMessages.deletedAt),
        or(
          isNull(chatParticipants.lastReadAt),
          gt(chatMessages.createdAt, chatParticipants.lastReadAt)
        )
      )
    );

  return row?.count ?? 0;
};

export type ChatInboxConversation = ConversationListItem & {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
};

export const listAllChatConversations = async (
  userId: string,
  search?: string
): Promise<{ workspaces: ChatInboxWorkspace[]; conversations: ChatInboxConversation[] }> => {
  const workspaces = await listWorkspacesForUser(userId);
  if (workspaces.length === 0) return { workspaces: [], conversations: [] };

  const batches = await Promise.all(
    workspaces.map(async ({ id, name, slug }) => ({
      workspace: { id, name, slug },
      conversations: await listConversations(id, userId, search)
    }))
  );

  return {
    workspaces: workspaces.map(({ id, name, slug }) => ({ id, name, slug })),
    conversations: mergeWorkspaceConversations(batches)
  };
};

export const countAllChatUnread = async (userId: string): Promise<number> => {
  const workspaces = await listWorkspacesForUser(userId);
  const counts = await Promise.all(workspaces.map(({ id }) => countUnread(id, userId)));
  return counts.reduce((total, count) => total + count, 0);
};

/* ------------------------------------------------------- direct: find-or-create */

type DirectConversationResult = {
  conversation: { id: string; kind: 'direct' };
  partner: { id: string; name: string; email: string; avatarUrl: string | null; role: string };
};

export const findOrCreateDirect = async (
  workspaceId: string,
  userId: string,
  memberId: string
): Promise<DirectConversationResult | null> => {
  const member = await findWorkspaceMember(workspaceId, memberId);
  if (!member) return null;

  const key = directKey(userId, memberId);

  // Try to find existing
  const [existing] = await db
    .select()
    .from(chatConversations)
    .where(
      and(
        eq(chatConversations.workspaceId, workspaceId),
        eq(chatConversations.directKey, key)
      )
    )
    .limit(1);

  if (existing) {
    // Verify user is still a participant
    const participation = await assertParticipant(existing.id, userId);
    if (!participation) {
      // Rejoin if they left (edge case: user was removed from workspace then re-added)
      await db
        .insert(chatParticipants)
        .values({
          conversationId: existing.id,
          workspaceId,
          userId,
          role: 'member'
        })
        .onConflictDoUpdate({
          target: [chatParticipants.conversationId, chatParticipants.userId],
          set: { leftAt: null, role: 'member' }
        });
    }
    return {
      conversation: { id: existing.id, kind: 'direct' },
      partner: {
        id: member.id,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
        role: member.role
      }
    };
  }

  // Create new direct conversation
  const [created] = await db
    .insert(chatConversations)
    .values({
      workspaceId,
      kind: 'direct',
      directKey: key,
      createdById: userId
    })
    .onConflictDoNothing({
      target: [chatConversations.workspaceId, chatConversations.directKey]
    })
    .returning();

  if (!created) {
    // Race condition: another request created it first
    const [raceWinner] = await db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.workspaceId, workspaceId),
          eq(chatConversations.directKey, key)
        )
      )
      .limit(1);

    if (!raceWinner) throw new Error('Direct conversation could not be created');
    // Add participants if not already there
    await db
      .insert(chatParticipants)
      .values([
        { conversationId: raceWinner.id, workspaceId, userId, role: 'member' },
        { conversationId: raceWinner.id, workspaceId, userId: memberId, role: 'member' }
      ])
      .onConflictDoUpdate({
        target: [chatParticipants.conversationId, chatParticipants.userId],
        set: { leftAt: null }
      });

    return {
      conversation: { id: raceWinner.id, kind: 'direct' },
      partner: {
        id: member.id,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
        role: member.role
      }
    };
  }

  // Add both participants
  await db.insert(chatParticipants).values([
    { conversationId: created.id, workspaceId, userId, role: 'member' },
    { conversationId: created.id, workspaceId, userId: memberId, role: 'member' }
  ]);

  return {
    conversation: { id: created.id, kind: 'direct' },
    partner: {
      id: member.id,
      name: member.name,
      email: member.email,
      avatarUrl: member.avatarUrl,
      role: member.role
    }
  };
};

/* ------------------------------------------------------- group: create */

type GroupRoomResult = {
  conversation: { id: string; kind: 'group'; name: string };
  participants: Array<{ userId: string; name: string; role: string }>;
};

export const createGroupRoom = async (
  workspaceId: string,
  userId: string,
  name: string,
  memberIds: string[]
): Promise<GroupRoomResult | null> => {
  if (memberIds.length < 1) return null;

  for (const memberId of memberIds) {
    const member = await findWorkspaceMember(workspaceId, memberId);
    if (!member) return null;
  }

  const [created] = await db
    .insert(chatConversations)
    .values({
      workspaceId,
      kind: 'group',
      name: name.trim(),
      createdById: userId
    })
    .returning();

  if (!created) return null;

  const allParticipantIds = [...new Set([...memberIds, userId])];
  await db.insert(chatParticipants).values(
    allParticipantIds.map((mid) => ({
      conversationId: created.id,
      workspaceId,
      userId: mid,
      role: mid === userId ? ('admin' as const) : ('member' as const)
    }))
  );

  const participants = await getParticipants(created.id);
  return {
    conversation: {
      id: created.id,
      kind: 'group',
      name: created.name!
    },
    participants: participants.map((participant) => ({
      userId: participant.userId,
      name: participant.name,
      role: participant.role
    }))
  };
};

/* ------------------------------------------------------- conversation detail */

type ConversationDetail = {
  id: string;
  kind: 'direct' | 'group' | 'taskboard' | 'workflow';
  contextType: 'group' | 'taskboard' | 'workflow' | null;
  contextId: string | null;
  groupId: string | null;
  name: string | null;
  description?: string | null;
  ownerId?: string | null;
  isOwner?: boolean;
  canManageMembers?: boolean;
  mediaCount?: number;
  starredCount?: number;
  partner: { id: string; name: string; email: string; avatarUrl: string | null; role: string } | null;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
    isOwner?: boolean;
  }>;
  userRole: 'admin' | 'member';
};

export const getConversationOwnerInfo = async (
  workspaceId: string,
  conversation: {
    id: string;
    kind: string;
    contextType: 'group' | 'taskboard' | 'workflow' | null;
    contextId: string | null;
    groupId: string | null;
    createdById: string;
  }
): Promise<{ ownerId: string | null; description: string | null }> => {
  let ownerId: string | null = conversation.createdById;
  let description: string | null = null;

  if (conversation.contextType === 'taskboard' && conversation.contextId) {
    const [board] = await db
      .select({ ownerId: taskBoards.ownerId, description: taskBoards.description })
      .from(taskBoards)
      .where(and(eq(taskBoards.id, conversation.contextId), eq(taskBoards.workspaceId, workspaceId)))
      .limit(1);
    if (board) {
      ownerId = board.ownerId;
      description = board.description;
    }
  } else if (conversation.contextType === 'workflow' && conversation.contextId) {
    const [wf] = await db
      .select({ ownerId: workflows.ownerId, description: workflows.description })
      .from(workflows)
      .where(and(eq(workflows.id, conversation.contextId), eq(workflows.workspaceId, workspaceId)))
      .limit(1);
    if (wf) {
      ownerId = wf.ownerId;
      description = wf.description;
    }
  } else if (conversation.groupId) {
    const [grp] = await db
      .select({ createdById: workspaceMemberGroups.createdById })
      .from(workspaceMemberGroups)
      .where(and(eq(workspaceMemberGroups.id, conversation.groupId), eq(workspaceMemberGroups.workspaceId, workspaceId)))
      .limit(1);
    if (grp) {
      ownerId = grp.createdById;
    }
  }

  return { ownerId, description };
};

export const canUserManageConversation = async (
  workspaceId: string,
  conversation: {
    id: string;
    kind: string;
    contextType: 'group' | 'taskboard' | 'workflow' | null;
    contextId: string | null;
    groupId: string | null;
    createdById: string;
  },
  userId: string,
  userParticipantRole?: string
): Promise<boolean> => {
  if (conversation.createdById === userId) return true;

  const { ownerId } = await getConversationOwnerInfo(workspaceId, conversation);
  if (ownerId && ownerId === userId) return true;

  if (userParticipantRole === 'admin') return true;

  const [wm] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (wm?.role === 'owner') return true;

  return false;
};

export const getConversationDetail = async (
  workspaceId: string,
  conversationId: string,
  userId: string
): Promise<ConversationDetail | null> => {
  const conversation = await getConversation(workspaceId, conversationId);
  if (!conversation) return null;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return null;

  const participants = await getParticipants(conversationId);
  const { ownerId, description } = await getConversationOwnerInfo(workspaceId, conversation);
  const isOwner = await canUserManageConversation(workspaceId, conversation, userId, participation.role);

  const [attachmentRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatAttachments)
    .where(eq(chatAttachments.conversationId, conversationId));

  const [pinnedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.conversationId, conversationId),
        isNotNull(chatMessages.pinnedAt),
        isNull(chatMessages.deletedAt)
      )
    );

  let partner: ConversationDetail['partner'] = null;
  if (conversation.kind === 'direct') {
    const p = await getDirectPartner(conversationId, userId);
    if (p) {
      partner = {
        id: p.id,
        name: p.name,
        email: p.email,
        avatarUrl: p.avatarUrl,
        role: p.role
      };
    }
  }

  return {
    id: conversation.id,
    kind: conversation.kind as 'direct' | 'group' | 'taskboard' | 'workflow',
    contextType: conversation.contextType,
    contextId: conversation.contextId,
    groupId: conversation.groupId,
    name: conversation.name,
    description,
    ownerId,
    isOwner,
    canManageMembers: isOwner,
    mediaCount: attachmentRow?.count ?? 0,
    starredCount: pinnedRow?.count ?? 0,
    partner,
    participants: participants.map((p) => ({
      userId: p.userId,
      name: p.name,
      email: p.email,
      avatarUrl: p.avatarUrl,
      role: p.role,
      isOwner: p.userId === ownerId || p.userId === conversation.createdById
    })),
    userRole: participation.role as 'admin' | 'member'
  };
};

/* ------------------------------------------------------- rename group */

export const renameRoom = async (
  workspaceId: string,
  conversationId: string,
  userId: string,
  name: string
): Promise<boolean> => {
  const conversation = await getConversation(workspaceId, conversationId);
  const nextName = name.trim();
  if (!conversation || conversation.kind === 'direct' || !nextName) return false;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return false;

  const canManage = await canUserManageConversation(workspaceId, conversation, userId, participation.role);
  if (!canManage) return false;

  await db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .update(chatConversations)
      .set({ name: nextName, updatedAt: now })
      .where(eq(chatConversations.id, conversationId));

    if (conversation.groupId) {
      await tx
        .update(workspaceMemberGroups)
        .set({ name: nextName, updatedAt: now })
        .where(
          and(
            eq(workspaceMemberGroups.id, conversation.groupId),
            eq(workspaceMemberGroups.workspaceId, workspaceId)
          )
        );
    }
  });

  const participantIds = await getParticipantUserIds(conversationId);
  broadcastToUsers(workspaceId, participantIds, {
    type: 'conversation:update',
    conversationId
  });

  return true;
};

/* ------------------------------------------------------- add participant */

export const addParticipant = async (
  workspaceId: string,
  conversationId: string,
  userId: string,
  newMemberId: string
): Promise<boolean> => {
  const conversation = await getConversation(workspaceId, conversationId);
  if (!conversation || conversation.kind === 'direct') return false;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return false;

  const canManage = await canUserManageConversation(workspaceId, conversation, userId, participation.role);
  if (!canManage) return false;

  if (!(await findWorkspaceMember(workspaceId, newMemberId))) return false;

  await db.transaction(async (tx) => {
    await tx
      .insert(chatParticipants)
      .values({
        conversationId,
        workspaceId,
        userId: newMemberId,
        role: 'member' as const
      })
      .onConflictDoUpdate({
        target: [chatParticipants.conversationId, chatParticipants.userId],
        set: { leftAt: null }
      });

    await tx
      .update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, conversationId));
  });

  const participantIds = await getParticipantUserIds(conversationId);
  broadcastToUsers(workspaceId, participantIds, {
    type: 'conversation:update',
    conversationId
  });

  return true;
};

/* ------------------------------------------------------- remove participant */

export const removeParticipant = async (
  workspaceId: string,
  conversationId: string,
  userId: string,
  targetUserId: string
): Promise<boolean> => {
  const conversation = await getConversation(workspaceId, conversationId);
  if (!conversation || conversation.kind === 'direct') return false;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return false;

  const { ownerId } = await getConversationOwnerInfo(workspaceId, conversation);

  if (userId === targetUserId) {
    if (userId === ownerId || userId === conversation.createdById) {
      return false;
    }
  } else {
    const canManage = await canUserManageConversation(workspaceId, conversation, userId, participation.role);
    if (!canManage) return false;

    if (targetUserId === ownerId || targetUserId === conversation.createdById) {
      return false;
    }
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(chatParticipants)
      .set({ leftAt: now })
      .where(
        and(
          eq(chatParticipants.conversationId, conversationId),
          eq(chatParticipants.userId, targetUserId),
          isNull(chatParticipants.leftAt)
        )
      );

    await tx
      .update(chatConversations)
      .set({ updatedAt: now })
      .where(eq(chatConversations.id, conversationId));
  });

  const remainingParticipantIds = await getParticipantUserIds(conversationId);
  const affectedUserIds = [...new Set([...remainingParticipantIds, targetUserId])];
  broadcastToUsers(workspaceId, affectedUserIds, {
    type: 'conversation:update',
    conversationId
  });

  return true;
};

/* ------------------------------------------------------- messages: list */

type MessageRow = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  body: string;
  replyToMessageId: string | null;
  replyToBody: string | null;
  replyToSenderName: string | null;
  replyToDeleted: boolean | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  pinnedAt: Date | null;
  pinnedById: string | null;
  createdAt: Date;
  reactions: Array<{ reaction: string; userId: string; userName: string }>;
  attachments: Array<{ id: string; fileName: string; filePath: string; fileType: string; fileSize: number; width: number | null; height: number | null }>;
};

export const getMessages = async (
  workspaceId: string,
  conversationId: string,
  userId: string,
  before?: { createdAt: Date; id: string }
): Promise<MessageRow[]> => {
  const conversation = await getConversation(workspaceId, conversationId);
  if (!conversation) return [];

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return [];

  // Build query with optional cursor
  const conditions = [eq(chatMessages.conversationId, conversationId)];
  if (before) {
    conditions.push(
      or(
        lt(chatMessages.createdAt, before.createdAt),
        and(
          eq(chatMessages.createdAt, before.createdAt),
          lt(chatMessages.id, before.id)
        )
      )!
    );
  }

  const messages = await db
    .select({
      id: chatMessages.id,
      senderId: chatMessages.senderId,
      senderName: users.name,
      senderAvatarUrl: users.avatarUrl,
      body: chatMessages.body,
      replyToMessageId: chatMessages.replyToMessageId,
      editedAt: chatMessages.editedAt,
      deletedAt: chatMessages.deletedAt,
      pinnedAt: chatMessages.pinnedAt,
      pinnedById: chatMessages.pinnedById,
      createdAt: chatMessages.createdAt
    })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.senderId))
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
    .limit(THREAD_LIMIT);

  if (messages.length === 0) return [];

  // Fetch reply targets
  const replyIds = messages.filter((m) => m.replyToMessageId).map((m) => m.replyToMessageId!);
  const replyMap = new Map<string, { body: string; senderName: string; deletedAt: Date | null }>();
  if (replyIds.length > 0) {
    const replies = await db
      .select({
        id: chatMessages.id,
        body: chatMessages.body,
        senderName: users.name,
        deletedAt: chatMessages.deletedAt
      })
      .from(chatMessages)
      .innerJoin(users, eq(users.id, chatMessages.senderId))
      .where(sql`${chatMessages.id} = ANY(${sql.raw(`ARRAY['${replyIds.join("','")}']::uuid[]`)})`);
    for (const r of replies) {
      replyMap.set(r.id, { body: r.body, senderName: r.senderName, deletedAt: r.deletedAt });
    }
  }

  // Fetch reactions for all messages
  const messageIds = messages.map((m) => m.id);
  const reactions = await db
    .select({
      messageId: chatReactions.messageId,
      reaction: chatReactions.reaction,
      userId: chatReactions.userId,
      userName: users.name
    })
    .from(chatReactions)
    .innerJoin(users, eq(users.id, chatReactions.userId))
    .where(sql`${chatReactions.messageId} = ANY(${sql.raw(`ARRAY['${messageIds.join("','")}']::uuid[]`)})`);

  const reactionMap = new Map<string, Array<{ reaction: string; userId: string; userName: string }>>();
  for (const r of reactions) {
    const arr = reactionMap.get(r.messageId) ?? [];
    arr.push({ reaction: r.reaction, userId: r.userId, userName: r.userName });
    reactionMap.set(r.messageId, arr);
  }

  // Fetch attachments for all messages
  const attachmentRows = await db
    .select({
      id: chatAttachments.id,
      messageId: chatAttachments.messageId,
      fileName: chatAttachments.fileName,
      filePath: chatAttachments.filePath,
      fileType: chatAttachments.fileType,
      fileSize: chatAttachments.fileSize,
      width: chatAttachments.width,
      height: chatAttachments.height
    })
    .from(chatAttachments)
    .where(sql`${chatAttachments.messageId} = ANY(${sql.raw(`ARRAY['${messageIds.join("','")}']::uuid[]`)})`);

  const attachmentMap = new Map<string, MessageRow['attachments']>();
  for (const a of attachmentRows) {
    const arr = attachmentMap.get(a.messageId!) ?? [];
    arr.push({ id: a.id, fileName: a.fileName, filePath: a.filePath, fileType: a.fileType, fileSize: a.fileSize, width: a.width, height: a.height });
    attachmentMap.set(a.messageId!, arr);
  }


  const result: MessageRow[] = messages.map((m) => {
    const reply = m.replyToMessageId ? replyMap.get(m.replyToMessageId) : null;
    return {
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      senderAvatarUrl: m.senderAvatarUrl,
      body: m.body,
      replyToMessageId: m.replyToMessageId,
      replyToBody: reply?.body ?? null,
      replyToSenderName: reply?.senderName ?? null,
      replyToDeleted: reply?.deletedAt ? true : null,
      editedAt: m.editedAt,
      deletedAt: m.deletedAt,
      pinnedAt: m.pinnedAt,
      pinnedById: m.pinnedById,
      createdAt: m.createdAt,
      reactions: reactionMap.get(m.id) ?? [],
      attachments: attachmentMap.get(m.id) ?? []
    };
  });

  return result.reverse();
};

/* ------------------------------------------------------- messages: send */

type SendMessageResult = {
  id: string;
  conversationId: string;
  senderId: string;
  clientMessageId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  body: string;
  replyToMessageId: string | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  pinnedAt: Date | null;
  pinnedById: string | null;
  createdAt: Date;
  reactions: Array<{ reaction: string; userId: string; userName: string }>;
  attachments: Array<{ id: string; fileName: string; filePath: string; fileType: string; fileSize: number; width: number | null; height: number | null }>;
};
export const sendMessage = async (
  workspaceId: string,
  conversationId: string,
  userId: string,
  body: string,
  clientMessageId: string,
  replyToMessageId?: string,
  attachmentIds?: string[]
): Promise<SendMessageResult | null> => {
  const conversation = await getConversation(workspaceId, conversationId);
  if (!conversation) return null;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return null;

  // If replying, verify target message is in same conversation
  if (replyToMessageId) {
    const [target] = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.id, replyToMessageId),
          eq(chatMessages.conversationId, conversationId)
        )
      )
      .limit(1);
    if (!target) return null;
  }

  const trimmed = body.trim();
  // Allow empty body only if there are attachments
  if (!trimmed && (!attachmentIds || attachmentIds.length === 0)) return null;

  // Insert with idempotency — on conflict, fetch existing
  const [inserted] = await db
    .insert(chatMessages)
    .values({
      conversationId,
      senderId: userId,
      clientMessageId,
      body: trimmed || '',
      replyToMessageId: replyToMessageId ?? null
    })
    .onConflictDoNothing({
      target: [
        chatMessages.conversationId,
        chatMessages.senderId,
        chatMessages.clientMessageId
      ]
    })
    .returning({
      id: chatMessages.id,
      conversationId: chatMessages.conversationId,
      senderId: chatMessages.senderId,
      clientMessageId: chatMessages.clientMessageId,
      body: chatMessages.body,
      replyToMessageId: chatMessages.replyToMessageId,
      editedAt: chatMessages.editedAt,
      deletedAt: chatMessages.deletedAt,
      pinnedAt: chatMessages.pinnedAt,
      pinnedById: chatMessages.pinnedById,
      createdAt: chatMessages.createdAt
    });

  let message = inserted;
  if (!message) {
    // Idempotent retry — fetch existing
    const [existing] = await db
      .select({
        id: chatMessages.id,
        conversationId: chatMessages.conversationId,
        senderId: chatMessages.senderId,
        clientMessageId: chatMessages.clientMessageId,
        body: chatMessages.body,
        replyToMessageId: chatMessages.replyToMessageId,
        editedAt: chatMessages.editedAt,
        deletedAt: chatMessages.deletedAt,
        pinnedAt: chatMessages.pinnedAt,
        pinnedById: chatMessages.pinnedById,
        createdAt: chatMessages.createdAt
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          eq(chatMessages.senderId, userId),
          eq(chatMessages.clientMessageId, clientMessageId)
        )
      )
      .limit(1);
    if (!existing) throw new Error('Message could not be created');
    message = existing;
  }

  // Link attachments to this message
  let linkedAttachments: SendMessageResult['attachments'] = [];
  if (attachmentIds && attachmentIds.length > 0) {
    await db
      .update(chatAttachments)
      .set({ messageId: message.id })
      .where(
        and(
          sql`${chatAttachments.id} = ANY(${sql.raw(`ARRAY['${attachmentIds.join("','")}']::uuid[]`)})`,
          eq(chatAttachments.uploaderId, userId),
          eq(chatAttachments.conversationId, conversationId)
        )
      );
    const rows = await db
      .select({
        id: chatAttachments.id,
        fileName: chatAttachments.fileName,
        filePath: chatAttachments.filePath,
        fileType: chatAttachments.fileType,
        fileSize: chatAttachments.fileSize,
        width: chatAttachments.width,
        height: chatAttachments.height
      })
      .from(chatAttachments)
      .where(sql`${chatAttachments.id} = ANY(${sql.raw(`ARRAY['${attachmentIds.join("','")}']::uuid[]`)})`);
    linkedAttachments = rows.map((r) => ({ ...r, width: r.width, height: r.height }));
  }

  // Update conversation updatedAt
  await db
    .update(chatConversations)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversations.id, conversationId));

  // Fetch sender info
  const [sender] = await db
    .select({ name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const result = {
    ...message,
    senderName: sender?.name ?? 'Unknown',
    senderAvatarUrl: sender?.avatarUrl ?? null,
    reactions: [],
    attachments: linkedAttachments
  };

  // If this conversation is scoped to a taskboard or workflow, sync participants before broadcasting
  if (conversation.contextType === 'taskboard' || conversation.contextType === 'workflow') {
    await syncContextParticipants(conversationId);
  }

  // Broadcast to all conversation participants via WebSocket
  const participantIds = await getParticipantUserIds(conversationId);
  broadcastToUsers(workspaceId, participantIds, {
    type: 'message:new',
    conversationId,
    message: result
  });
  if (inserted) {
    let preview = 'New message.';
    if (trimmed) {
      if (trimmed.startsWith('sticker:')) {
        try {
          const raw = trimmed.slice('sticker:'.length).trim();
          if (raw.startsWith('{')) {
            const parsed = JSON.parse(raw);
            preview = `🎨 Stiker: ${parsed.url || parsed.name || 'Stiker'}`;
          } else {
            const [url] = raw.split('|');
            preview = `🎨 Stiker: ${url}`;
          }
        } catch {
          preview = '🎨 Stiker';
        }
      } else {
        preview = trimmed.length > 140 ? `${trimmed.slice(0, 137)}…` : trimmed;
      }
    } else if (linkedAttachments.length > 0) {
      preview = 'Sent an attachment.';
    }
    const senderName = sender?.name ?? 'Someone';
    const conversationTitle =
      conversation.name && conversation.kind !== 'direct'
        ? `${senderName} (${conversation.name})`
        : senderName;
    await Promise.all(
      participantIds
        .filter((participantId) => participantId !== userId)
        .map(async (participantId) => {
          try {
            await createNotification({
              workspaceId,
              userId: participantId,
              conversationId,
              type: 'chat_message',
              title: conversationTitle,
              body: preview
            });
          } catch (error) {
            console.error('[notification] chat message notification failed:', error);
          }
        })
    );
  }

  return result;
};

/* ------------------------------------------------------- messages: edit */

export const editMessage = async (
  workspaceId: string,
  conversationId: string,
  messageId: string,
  userId: string,
  body: string
): Promise<{ ok: boolean; error?: string }> => {
  const conversation = await getConversation(workspaceId, conversationId);
  if (!conversation) return { ok: false, error: 'Percakapan tidak ditemukan' };

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return { ok: false, error: 'Bukan peserta percakapan' };

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: 'Pesan tidak boleh kosong' };

  const [targetMessage] = await db
    .select({
      id: chatMessages.id,
      senderId: chatMessages.senderId,
      createdAt: chatMessages.createdAt,
      deletedAt: chatMessages.deletedAt
    })
    .from(chatMessages)
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.conversationId, conversationId)))
    .limit(1);

  if (!targetMessage || targetMessage.deletedAt) {
    return { ok: false, error: 'Pesan tidak ditemukan atau sudah dihapus' };
  }

  if (targetMessage.senderId !== userId) {
    return { ok: false, error: 'Hanya pengirim yang boleh mengedit pesan ini' };
  }

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const elapsed = Date.now() - new Date(targetMessage.createdAt).getTime();
  if (elapsed > THREE_HOURS_MS) {
    return { ok: false, error: 'Pesan hanya boleh diedit dalam tempoh 3 jam selepas dihantar' };
  }

  const [result] = await db
    .update(chatMessages)
    .set({ body: trimmed, editedAt: new Date() })
    .where(
      and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.conversationId, conversationId),
        eq(chatMessages.senderId, userId),
        isNull(chatMessages.deletedAt)
      )
    )
    .returning({ id: chatMessages.id });

  if (result) {
    const editedAt = new Date().toISOString();
    const participantIds = await getParticipantUserIds(conversationId);
    broadcastToUsers(workspaceId, participantIds, {
      type: 'message:edit',
      conversationId,
      messageId,
      body: trimmed,
      editedAt
    });
  }
  return { ok: true };
};

export const togglePinMessage = async (
  workspaceId: string,
  conversationId: string,
  messageId: string,
  userId: string
): Promise<{ ok: boolean; pinnedAt: string | null; pinnedById: string | null; error?: string }> => {
  const conversation = await getConversation(workspaceId, conversationId);
  if (!conversation) return { ok: false, pinnedAt: null, pinnedById: null, error: 'Percakapan tidak ditemukan' };

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return { ok: false, pinnedAt: null, pinnedById: null, error: 'Bukan peserta percakapan' };

  const [targetMessage] = await db
    .select({
      id: chatMessages.id,
      pinnedAt: chatMessages.pinnedAt,
      pinnedById: chatMessages.pinnedById,
      deletedAt: chatMessages.deletedAt
    })
    .from(chatMessages)
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.conversationId, conversationId)))
    .limit(1);

  if (!targetMessage || targetMessage.deletedAt) {
    return { ok: false, pinnedAt: null, pinnedById: null, error: 'Pesan tidak ditemukan atau sudah dihapus' };
  }

  const isCurrentlyPinned = Boolean(targetMessage.pinnedAt);
  const newPinnedAt = isCurrentlyPinned ? null : new Date();
  const newPinnedById = isCurrentlyPinned ? null : userId;

  await db
    .update(chatMessages)
    .set({ pinnedAt: newPinnedAt, pinnedById: newPinnedById })
    .where(eq(chatMessages.id, messageId));

  const participantIds = await getParticipantUserIds(conversationId);
  const pinnedAtStr = newPinnedAt ? newPinnedAt.toISOString() : null;
  broadcastToUsers(workspaceId, participantIds, {
    type: 'message:pin',
    conversationId,
    messageId,
    pinnedAt: pinnedAtStr,
    pinnedById: newPinnedById
  } as ChatSocketEvent);

  return {
    ok: true,
    pinnedAt: pinnedAtStr,
    pinnedById: newPinnedById
  };
};

export const forwardMessage = async (
  workspaceId: string,
  sourceConversationId: string,
  messageId: string,
  targetConversationIds: string[],
  userId: string
): Promise<{ ok: boolean; count: number; error?: string }> => {
  const sourcePart = await assertParticipant(sourceConversationId, userId);
  if (!sourcePart) return { ok: false, count: 0, error: 'Akses ke percakapan asal ditolak' };

  const [sourceMessage] = await db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      deletedAt: chatMessages.deletedAt
    })
    .from(chatMessages)
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.conversationId, sourceConversationId)))
    .limit(1);

  if (!sourceMessage || sourceMessage.deletedAt) {
    return { ok: false, count: 0, error: 'Pesan tidak ditemukan atau sudah dihapus' };
  }

  const sourceAttachments = await db
    .select({
      fileName: chatAttachments.fileName,
      filePath: chatAttachments.filePath,
      fileType: chatAttachments.fileType,
      fileSize: chatAttachments.fileSize,
      width: chatAttachments.width,
      height: chatAttachments.height
    })
    .from(chatAttachments)
    .where(eq(chatAttachments.messageId, messageId));

  const [sender] = await db
    .select({ name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  let forwardedCount = 0;

  for (const targetConvId of targetConversationIds) {
    const targetPart = await assertParticipant(targetConvId, userId);
    if (!targetPart) continue;

    const clientMsgId = `fwd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const [inserted] = await db
      .insert(chatMessages)
      .values({
        conversationId: targetConvId,
        senderId: userId,
        clientMessageId: clientMsgId,
        body: sourceMessage.body,
        replyToMessageId: null
      })
      .returning({
        id: chatMessages.id,
        conversationId: chatMessages.conversationId,
        senderId: chatMessages.senderId,
        clientMessageId: chatMessages.clientMessageId,
        body: chatMessages.body,
        replyToMessageId: chatMessages.replyToMessageId,
        editedAt: chatMessages.editedAt,
        deletedAt: chatMessages.deletedAt,
        pinnedAt: chatMessages.pinnedAt,
        pinnedById: chatMessages.pinnedById,
        createdAt: chatMessages.createdAt
      });

    if (!inserted) continue;

    let linkedAttachments: SendMessageResult['attachments'] = [];
    if (sourceAttachments.length > 0) {
      const cloned = await db
        .insert(chatAttachments)
        .values(
          sourceAttachments.map((att) => ({
            conversationId: targetConvId,
            workspaceId,
            uploaderId: userId,
            messageId: inserted.id,
            fileName: att.fileName,
            filePath: att.filePath,
            fileType: att.fileType,
            fileSize: att.fileSize,
            width: att.width,
            height: att.height
          }))
        )
        .returning();
      linkedAttachments = cloned.map((r) => ({ ...r, width: r.width, height: r.height }));
    }

    await db
      .update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, targetConvId));

    const participantIds = await getParticipantUserIds(targetConvId);
    broadcastToUsers(workspaceId, participantIds, {
      type: 'message:new',
      conversationId: targetConvId,
      message: {
        ...inserted,
        senderName: sender?.name ?? 'Unknown',
        senderAvatarUrl: sender?.avatarUrl ?? null,
        reactions: [],
        attachments: linkedAttachments
      }
    });

    forwardedCount++;
  }

  return { ok: forwardedCount > 0, count: forwardedCount };
};

/* ------------------------------------------------------- messages: delete */

export const deleteMessage = async (
  workspaceId: string,
  conversationId: string,
  messageId: string,
  userId: string
): Promise<boolean> => {
  const conversation = await getConversation(workspaceId, conversationId);
  if (!conversation) return false;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return false;

  const [result] = await db
    .update(chatMessages)
    .set({ deletedAt: new Date(), body: '', editedAt: null })
    .where(
      and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.conversationId, conversationId),
        eq(chatMessages.senderId, userId),
        isNull(chatMessages.deletedAt)
      )
    )
    .returning({ id: chatMessages.id });

  if (result) {
    const deletedAt = new Date().toISOString();
    const participantIds = await getParticipantUserIds(conversationId);
    broadcastToUsers(workspaceId, participantIds, {
      type: 'message:delete',
      conversationId,
      messageId,
      deletedAt
    });
  }
  return Boolean(result);
};

/* ------------------------------------------------------- reactions */

export const toggleReaction = async (
  workspaceId: string,
  conversationId: string,
  messageId: string,
  userId: string,
  reaction: string
): Promise<'added' | 'removed' | null> => {
  const conversation = await getConversation(workspaceId, conversationId);
  if (!conversation) return null;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return null;

  const [message] = await db
    .select({
      id: chatMessages.id,
      senderId: chatMessages.senderId,
      body: chatMessages.body
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.conversationId, conversationId),
        isNull(chatMessages.deletedAt)
      )
    )
    .limit(1);
  if (!message) return null;

  const existingReactions = await db
    .select({ reaction: chatReactions.reaction })
    .from(chatReactions)
    .where(and(eq(chatReactions.messageId, messageId), eq(chatReactions.userId, userId)));
  const alreadyReacted = existingReactions.some((item) => item.reaction === reaction);
  const removedReactions = existingReactions.map((item) => item.reaction);
  let action: 'added' | 'removed';

  await db
    .delete(chatReactions)
    .where(and(eq(chatReactions.messageId, messageId), eq(chatReactions.userId, userId)));

  if (alreadyReacted) {
    action = 'removed';
  } else {
    await db.insert(chatReactions).values({ messageId, userId, reaction });
    action = 'added';
  }

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const userName = user?.name ?? 'Someone';
  const participantIds = await getParticipantUserIds(conversationId);

  for (const removedReaction of removedReactions) {
    broadcastToUsers(workspaceId, participantIds, {
      type: 'reaction:toggle',
      conversationId,
      messageId,
      userId,
      userName,
      reaction: removedReaction,
      action: 'removed'
    });
  }
  if (action === 'added') {
    broadcastToUsers(workspaceId, participantIds, {
      type: 'reaction:toggle',
      conversationId,
      messageId,
      userId,
      userName,
      reaction,
      action
    });
  }

  if (action === 'added' && message.senderId !== userId) {
    try {
      let previewMsg = message.body || 'pesan Anda';
      if (previewMsg.startsWith('sticker:')) {
        previewMsg = 'stiker';
      } else if (previewMsg.length > 30) {
        previewMsg = `${previewMsg.slice(0, 27)}…`;
      }

      await createNotification({
        workspaceId,
        userId: message.senderId,
        conversationId,
        type: 'chat_reaction',
        title: 'Reaksi baru',
        body: `${userName} bereaksi ${reaction} pada "${previewMsg}"`
      });
    } catch (err) {
      console.error('[notification] chat reaction notification failed:', err);
    }
  }

  return action;
};

/* ------------------------------------------------------- mark read */

export const markRead = async (
  workspaceId: string,
  conversationId: string,
  userId: string
): Promise<boolean> => {
  const conversation = await getConversation(workspaceId, conversationId);
  if (!conversation) return false;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return false;

  await db
    .update(chatParticipants)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(chatParticipants.conversationId, conversationId),
        eq(chatParticipants.userId, userId),
        isNull(chatParticipants.leftAt)
      )
    );

  const participantIds = await getParticipantUserIds(conversationId);
  broadcastToUsers(workspaceId, participantIds, {
    type: 'read',
    conversationId,
    userId
  });
  return true;
};

/* ------------------------------------------------------- attachments */

type AttachmentResult = {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
};

export const createAttachment = async (
  workspaceId: string,
  conversationId: string,
  userId: string,
  fileName: string,
  filePath: string,
  fileType: string,
  fileSize: number,
  width?: number | null,
  height?: number | null
): Promise<AttachmentResult | null> => {
  const conversation = await getConversation(workspaceId, conversationId);
  if (!conversation) return null;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return null;

  const [inserted] = await db
    .insert(chatAttachments)
    .values({
      conversationId,
      workspaceId,
      uploaderId: userId,
      fileName,
      filePath,
      fileType,
      fileSize,
      width: width ?? null,
      height: height ?? null
    })
    .returning({
      id: chatAttachments.id,
      fileName: chatAttachments.fileName,
      filePath: chatAttachments.filePath,
      fileType: chatAttachments.fileType,
      fileSize: chatAttachments.fileSize,
      width: chatAttachments.width,
      height: chatAttachments.height
    });

  return inserted;
};

/* ------------------------------------------------------- workspace members for picker */

export const listWorkspaceMembersForChat = async (workspaceId: string, userId: string) => {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: workspaceMembers.role
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        ne(workspaceMembers.userId, userId)
      )
    )
    .orderBy(asc(users.name));

  return rows;
};

/* ------------------------------------------------------- Bomb / Buzz service */

const buzzCooldowns = new Map<string, number>();
const BUZZ_COOLDOWN_MS = 10_000; // 10 seconds cooldown

export type SendBuzzInput = {
  conversationId?: string;
  targetUserId?: string;
  taskId?: string;
  note?: string;
};

export type SendBuzzResult = {
  success: boolean;
  message?: unknown;
  cooldownUntil?: string;
  error?: string;
};

export const sendBuzz = async (
  workspaceId: string,
  userId: string,
  input: SendBuzzInput
): Promise<SendBuzzResult> => {
  const targetKey = `${userId}:${input.conversationId || input.taskId || input.targetUserId || 'general'}`;
  const now = Date.now();
  const lastSent = buzzCooldowns.get(targetKey);

  if (lastSent && now - lastSent < BUZZ_COOLDOWN_MS) {
    const remainingSec = Math.ceil((BUZZ_COOLDOWN_MS - (now - lastSent)) / 1000);
    return {
      success: false,
      error: `Sila tunggu ${remainingSec} saat sebelum menghantar buzz seterusnya`,
      cooldownUntil: new Date(lastSent + BUZZ_COOLDOWN_MS).toISOString()
    };
  }

  // Fetch sender name
  const [sender] = await db
    .select({ name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const senderName = sender?.name ?? 'Seseorang';
  let createdMessage: unknown = null;

  // Case 1: Buzz inside a chat conversation
  if (input.conversationId) {
    const conversation = await getConversation(workspaceId, input.conversationId);
    if (!conversation) {
      return { success: false, error: 'Perbualan tidak dijumpai' };
    }

    const participantIds = await getParticipantUserIds(input.conversationId);
    if (!participantIds.includes(userId)) {
      return { success: false, error: 'Anda bukan ahli perbualan ini' };
    }

    // Insert a special Buzz message in the chat
    const clientMessageId = `buzz-${now}-${Math.random().toString(36).slice(2, 9)}`;
    const buzzBody = `💥 BUZZ! ${input.note ? input.note : 'Perhatian! Mesej penting memerlukan tindakan anda segera!'}`;

    createdMessage = await sendMessage(
      workspaceId,
      input.conversationId,
      userId,
      buzzBody,
      clientMessageId
    );

    // Broadcast instant buzz:send event to all other participants
    const recipients = participantIds.filter((id) => id !== userId);
    broadcastToUsers(workspaceId, recipients, {
      type: 'buzz:send',
      workspaceId,
      senderId: userId,
      senderName,
      conversationId: input.conversationId,
      note: input.note || 'Perhatian! Sila semak perbualan ini sekarang!',
      createdAt: new Date().toISOString()
    });

    buzzCooldowns.set(targetKey, now);
    return {
      success: true,
      message: createdMessage,
      cooldownUntil: new Date(now + BUZZ_COOLDOWN_MS).toISOString()
    };
  }

  // Case 2: Buzz for a Task
  if (input.taskId) {
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        boardId: tasks.boardId,
        assigneeId: tasks.assigneeId,
        createdById: tasks.createdById
      })
      .from(tasks)
      .where(eq(tasks.id, input.taskId))
      .limit(1);

    if (!task) {
      return { success: false, error: 'Tugasan tidak dijumpai' };
    }

    const targetUserId = input.targetUserId || task.assigneeId;
    if (!targetUserId) {
      return { success: false, error: 'Tugasan ini belum mempunyai PIC/assignee untuk di-buzz' };
    }

    if (targetUserId === userId) {
      return { success: false, error: 'Anda tidak boleh menghantar buzz kepada diri sendiri' };
    }

    // Broadcast instant buzz event to assignee
    broadcastToUsers(workspaceId, [targetUserId], {
      type: 'buzz:send',
      workspaceId,
      senderId: userId,
      senderName,
      taskId: task.id,
      taskTitle: task.title,
      targetUserId,
      note: input.note || `Tugasan: "${task.title}" memerlukan perhatian segera!`,
      createdAt: new Date().toISOString()
    });

    // Create high-priority in-app notification
    await createNotification({
      workspaceId,
      userId: targetUserId,
      boardId: task.boardId,
      taskId: task.id,
      type: 'task_assigned',
      title: `💥 BOMB! Tugasan: ${task.title}`,
      body: input.note || `${senderName} menghantar Buzz untuk mengingatkan tugasan ini!`
    }).catch((err) => {
      console.warn('[buzz] Failed to create notification for task buzz:', err);
    });

    buzzCooldowns.set(targetKey, now);
    return {
      success: true,
      cooldownUntil: new Date(now + BUZZ_COOLDOWN_MS).toISOString()
    };
  }

  // Case 3: Direct user buzz
  if (input.targetUserId) {
    if (input.targetUserId === userId) {
      return { success: false, error: 'Anda tidak boleh menghantar buzz kepada diri sendiri' };
    }

    broadcastToUsers(workspaceId, [input.targetUserId], {
      type: 'buzz:send',
      workspaceId,
      senderId: userId,
      senderName,
      targetUserId: input.targetUserId,
      note: input.note || 'Perhatian! Sila semak tugasan/mesej anda.',
      createdAt: new Date().toISOString()
    });

    buzzCooldowns.set(targetKey, now);
    return {
      success: true,
      cooldownUntil: new Date(now + BUZZ_COOLDOWN_MS).toISOString()
    };
  }

  return { success: false, error: 'Sila nyatakan conversationId, taskId, atau targetUserId' };
};

export const getOrCreateContextConversation = async (
  workspaceId: string,
  userId: string,
  contextType: 'taskboard' | 'workflow',
  contextId: string
): Promise<ConversationDetail | null> => {
  const hasAccess = await checkContextAccess(workspaceId, contextType, contextId, null, userId);
  if (!hasAccess) return null;

  const [existing] = await db
    .select({ id: chatConversations.id })
    .from(chatConversations)
    .where(
      and(
        eq(chatConversations.workspaceId, workspaceId),
        eq(chatConversations.contextType, contextType),
        eq(chatConversations.contextId, contextId),
        isNull(chatConversations.archivedAt)
      )
    )
    .limit(1);

  let conversationId = existing?.id;

  if (!conversationId) {
    let name = contextType === 'workflow' ? 'Chat Workflow' : 'Chat Board';
    let groupId: string | null = null;
    let ownerId = userId;

    if (contextType === 'taskboard') {
      const [board] = await db
        .select({ name: taskBoards.name, groupId: taskBoards.workspaceMemberGroupId, ownerId: taskBoards.ownerId })
        .from(taskBoards)
        .where(and(eq(taskBoards.id, contextId), eq(taskBoards.workspaceId, workspaceId)))
        .limit(1);
      if (board) {
        name = board.name;
        groupId = board.groupId;
        ownerId = board.ownerId;
      }
    } else if (contextType === 'workflow') {
      const [wf] = await db
        .select({ name: workflows.name, groupId: workflows.workspaceMemberGroupId, ownerId: workflows.ownerId })
        .from(workflows)
        .where(and(eq(workflows.id, contextId), eq(workflows.workspaceId, workspaceId)))
        .limit(1);
      if (wf) {
        name = wf.name;
        groupId = wf.groupId;
        ownerId = wf.ownerId;
      }
    }

    const [inserted] = await db
      .insert(chatConversations)
      .values({
        workspaceId,
        kind: contextType,
        contextType,
        contextId,
        groupId,
        name,
        createdById: ownerId
      })
      .onConflictDoUpdate({
        target: [chatConversations.workspaceId, chatConversations.contextType, chatConversations.contextId],
        set: { updatedAt: new Date(), archivedAt: null }
      })
      .returning({ id: chatConversations.id });

    conversationId = inserted.id;
  }

  await syncContextParticipants(conversationId);
  return getConversationDetail(workspaceId, conversationId, userId);
};
