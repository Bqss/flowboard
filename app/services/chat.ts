import { and, asc, desc, eq, gt, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { db, chatAttachments, chatConversations, chatParticipants, chatMessages, chatReactions, users, workspaceMembers } from '@db';
import { broadcastToUsers } from '@services/chatSocket';

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
  return participant ?? null;
};

/** Get conversation, verifying it belongs to `workspaceId`. */
const getConversation = async (workspaceId: string, conversationId: string) => {
  const [conversation] = await db
    .select()
    .from(chatConversations)
    .where(
      and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.workspaceId, workspaceId)
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
  kind: 'direct' | 'group';
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
        eq(chatConversations.workspaceId, workspaceId)
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
      kind: conv.kind as 'direct' | 'group',
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
    .where(
      and(
        eq(chatParticipants.workspaceId, workspaceId),
        eq(chatParticipants.userId, userId),
        isNull(chatParticipants.leftAt),
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
  // Validate at least 1 other member
  if (memberIds.length < 1) return null;

  // Verify all members are in the workspace
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

  if (!created) throw new Error('Group room could not be created');

  // Add creator as admin, others as members
  const participantValues = [
    { conversationId: created.id, workspaceId, userId, role: 'admin' as const },
    ...memberIds.map((mid) => ({
      conversationId: created.id,
      workspaceId,
      userId: mid,
      role: 'member' as const
    }))
  ];

  await db.insert(chatParticipants).values(participantValues);

  const participants = await getParticipants(created.id);

  return {
    conversation: { id: created.id, kind: 'group', name: created.name! },
    participants: participants.map((p) => ({
      userId: p.userId,
      name: p.name,
      role: p.role
    }))
  };
};

/* ------------------------------------------------------- conversation detail */

type ConversationDetail = {
  id: string;
  kind: 'direct' | 'group';
  name: string | null;
  partner: { id: string; name: string; email: string; avatarUrl: string | null; role: string } | null;
  participants: Array<{ userId: string; name: string; email: string; avatarUrl: string | null; role: string }>;
  userRole: 'admin' | 'member';
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
    kind: conversation.kind as 'direct' | 'group',
    name: conversation.name,
    partner,
    participants: participants.map((p) => ({
      userId: p.userId,
      name: p.name,
      email: p.email,
      avatarUrl: p.avatarUrl,
      role: p.role
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
  if (!conversation || conversation.kind !== 'group') return false;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation || participation.role !== 'admin') return false;

  await db
    .update(chatConversations)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(chatConversations.id, conversationId));

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
  if (!conversation || conversation.kind !== 'group') return false;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation || participation.role !== 'admin') return false;

  // Verify new member is in workspace
  await db
    .insert(chatParticipants)
    .values({
      conversationId,
      workspaceId,
      userId: newMemberId,
      role: 'member'
    })
    .onConflictDoUpdate({
      target: [chatParticipants.conversationId, chatParticipants.userId],
      set: { leftAt: null }
    });

  await db
    .update(chatConversations)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversations.id, conversationId));

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
  if (!conversation || conversation.kind !== 'group') return false;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return false;

  // Self-leave: anyone can leave
  if (userId === targetUserId) {
    // Admin must transfer or ensure another admin exists before leaving
    if (participation.role === 'admin') {
      const otherAdmins = await db
        .select({ id: chatParticipants.id })
        .from(chatParticipants)
        .where(
          and(
            eq(chatParticipants.conversationId, conversationId),
            eq(chatParticipants.role, 'admin'),
            ne(chatParticipants.userId, userId),
            isNull(chatParticipants.leftAt)
          )
        );
      if (otherAdmins.length === 0) return false; // Must transfer first
    }

    await db
      .update(chatParticipants)
      .set({ leftAt: new Date() })
      .where(
        and(
          eq(chatParticipants.conversationId, conversationId),
          eq(chatParticipants.userId, userId)
        )
      );
    return true;
  }

  // Remove others: admin only
  if (participation.role !== 'admin') return false;

  await db
    .update(chatParticipants)
    .set({ leftAt: new Date() })
    .where(
      and(
        eq(chatParticipants.conversationId, conversationId),
        eq(chatParticipants.userId, targetUserId),
        isNull(chatParticipants.leftAt)
      )
    );

  await db
    .update(chatConversations)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversations.id, conversationId));

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
  senderName: string;
  senderAvatarUrl: string | null;
  body: string;
  replyToMessageId: string | null;
  editedAt: Date | null;
  deletedAt: Date | null;
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
      body: chatMessages.body,
      replyToMessageId: chatMessages.replyToMessageId,
      editedAt: chatMessages.editedAt,
      deletedAt: chatMessages.deletedAt,
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
        body: chatMessages.body,
        replyToMessageId: chatMessages.replyToMessageId,
        editedAt: chatMessages.editedAt,
        deletedAt: chatMessages.deletedAt,
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

  // Broadcast to all conversation participants via WebSocket
  const participantIds = await getParticipantUserIds(conversationId);
  broadcastToUsers(workspaceId, participantIds, {
    type: 'message:new',
    conversationId,
    message: result
  });

  return result;
};

/* ------------------------------------------------------- messages: edit */

export const editMessage = async (
  workspaceId: string,
  conversationId: string,
  messageId: string,
  userId: string,
  body: string
): Promise<boolean> => {
  const conversation = await getConversation(workspaceId, conversationId);
  if (!conversation) return false;

  const participation = await assertParticipant(conversationId, userId);
  if (!participation) return false;

  const trimmed = body.trim();
  if (!trimmed) return false;

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
  return Boolean(result);
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

  // Verify message exists in this conversation and is not deleted
  const [message] = await db
    .select({ id: chatMessages.id })
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

  // Try to insert — if exists, remove instead
  const [inserted] = await db
    .insert(chatReactions)
    .values({ messageId, userId, reaction })
    .onConflictDoNothing({
      target: [chatReactions.messageId, chatReactions.userId, chatReactions.reaction]
    })
    .returning({ id: chatReactions.id });

  const action: 'added' | 'removed' = inserted ? 'added' : 'removed';

  const participantIds = await getParticipantUserIds(conversationId);
  broadcastToUsers(workspaceId, participantIds, {
    type: 'reaction:toggle',
    conversationId,
    messageId,
    userId,
    reaction,
    action
  });

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
