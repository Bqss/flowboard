import { and, eq, gt, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import {
  db,
  chatConversations,
  chatParticipants,
  users,
  workspaceInvites,
  workspaceMemberGroupMembers,
  workspaceMemberGroups,
  workspaceMembers,
  workspaces
} from '@db';
import type { Workspace, WorkspaceRole } from '@db';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'workspace';

export const uniqueWorkspaceSlug = async (name: string): Promise<string> => {
  const base = slugify(name);
  let candidate = base;
  let n = 0;

  while (true) {
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, candidate))
      .limit(1);

    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
};

export const createWorkspaceForUser = async (
  userId: string,
  name: string,
  role: WorkspaceRole = 'owner'
) => {
  const slug = await uniqueWorkspaceSlug(name);

  const [workspace] = await db
    .insert(workspaces)
    .values({ name, slug })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId,
    role
  });

  await db
    .update(users)
    .set({ activeWorkspaceId: workspace.id, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return workspace;
};

export const getMembership = async (workspaceId: string, userId: string) => {
  const [row] = await db
    .select({
      id: workspaceMembers.id,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt
    })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);

  return row ?? null;
};

export const getActiveWorkspaceContext = async (userId: string, activeWorkspaceId: string | null) => {
  if (!activeWorkspaceId) return null;

  const [row] = await db
    .select({
      workspace: workspaces,
      role: workspaceMembers.role
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, activeWorkspaceId))
    )
    .limit(1);

  return row ?? null;
};

export const listWorkspacesForUser = async (userId: string) => {
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId));
};

export const listWorkspaceMembers = async (workspaceId: string) => {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
};

export const updateWorkspace = async (workspaceId: string, name: string): Promise<Workspace> => {
  const [workspace] = await db
    .update(workspaces)
    .set({ name, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId))
    .returning();

  return workspace;
};

export const createWorkspaceInvite = async ({
  workspaceId,
  email,
  role,
  invitedById
}: {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedById: string;
}) => {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const [invite] = await db
    .insert(workspaceInvites)
    .values({
      workspaceId,
      email: email.toLowerCase(),
      role,
      token,
      invitedById,
      expiresAt
    })
    .returning();

  return invite;
};

export const getInviteByToken = async (token: string) => {
  const [invite] = await db
    .select({
      invite: workspaceInvites,
      workspaceName: workspaces.name
    })
    .from(workspaceInvites)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
    .where(eq(workspaceInvites.token, token))
    .limit(1);

  return invite ?? null;
};

export const acceptWorkspaceInvite = async (token: string, userId: string, userEmail: string) => {
  const row = await getInviteByToken(token);
  if (!row) return { error: 'Invite not found' as const };

  const { invite } = row;

  if (invite.acceptedAt) return { error: 'Invite already used' as const };
  if (invite.expiresAt < new Date()) return { error: 'Invite expired' as const };
  if (invite.email !== userEmail.toLowerCase()) {
    return { error: 'Invite email does not match your account' as const };
  }

  const existing = await getMembership(invite.workspaceId, userId);
  if (existing) {
    await db
      .update(workspaceInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvites.id, invite.id));

    await db
      .update(users)
      .set({ activeWorkspaceId: invite.workspaceId, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { workspaceId: invite.workspaceId, alreadyMember: true as const };
  }

  await db.insert(workspaceMembers).values({
    workspaceId: invite.workspaceId,
    userId,
    role: invite.role
  });

  await db
    .update(workspaceInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(workspaceInvites.id, invite.id));

  await db
    .update(users)
    .set({ activeWorkspaceId: invite.workspaceId, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { workspaceId: invite.workspaceId, alreadyMember: false as const };
};

export const removeWorkspaceMember = async (workspaceId: string, userId: string) => {
  const deleted = await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .returning({ id: workspaceMembers.id });

  return deleted.length > 0;
};

export const countWorkspaceOwners = async (workspaceId: string) => {
  const rows = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, 'owner')));

  return rows.length;
};

export const setActiveWorkspace = async (userId: string, workspaceId: string) => {
  const membership = await getMembership(workspaceId, userId);
  if (!membership) return { error: 'Not a workspace member' as const };

  await db
    .update(users)
    .set({ activeWorkspaceId: workspaceId, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { ok: true as const };
};

export const listPendingInvites = async (workspaceId: string) => {
  return db
    .select({
      id: workspaceInvites.id,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      expiresAt: workspaceInvites.expiresAt,
      createdAt: workspaceInvites.createdAt
    })
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.workspaceId, workspaceId),
        isNull(workspaceInvites.acceptedAt),
        gt(workspaceInvites.expiresAt, new Date())
      )
    );
};

export const listPendingInvitesForEmail = async (email: string) => {
  return db
    .select({
      id: workspaceInvites.id,
      token: workspaceInvites.token,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      expiresAt: workspaceInvites.expiresAt,
      workspaceName: workspaces.name
    })
    .from(workspaceInvites)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
    .where(
      and(
        eq(workspaceInvites.email, email.toLowerCase()),
        isNull(workspaceInvites.acceptedAt),
        gt(workspaceInvites.expiresAt, new Date())
      )
    );
};

export const deleteInvite = async (workspaceId: string, inviteId: string) => {
  const [deleted] = await db
    .delete(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.id, inviteId),
        eq(workspaceInvites.workspaceId, workspaceId),
        isNull(workspaceInvites.acceptedAt)
      )
    )
    .returning({ id: workspaceInvites.id });

  return deleted !== undefined;
};

export const getInviteById = async (workspaceId: string, inviteId: string) => {
  const [row] = await db
    .select({
      invite: workspaceInvites,
      workspaceName: workspaces.name
    })
    .from(workspaceInvites)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
    .where(
      and(
        eq(workspaceInvites.id, inviteId),
        eq(workspaceInvites.workspaceId, workspaceId)
      )
    )
    .limit(1);

  return row ?? null;
};


const validateGroupMembers = async (workspaceId: string, memberIds: string[]) => {
  const uniqueIds = [...new Set(memberIds)];
  if (uniqueIds.length === 0) throw new Error('A group must include at least one member.');

  const rows = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), inArray(workspaceMembers.userId, uniqueIds)));

  if (rows.length !== uniqueIds.length) {
    throw new Error('All group members must belong to this workspace.');
  }
  return uniqueIds;
};

export const listWorkspaceMemberGroups = async (workspaceId: string, userId?: string) => {
  const groups = await db
    .select()
    .from(workspaceMemberGroups)
    .where(
      userId
        ? and(
            eq(workspaceMemberGroups.workspaceId, workspaceId),
            inArray(
              workspaceMemberGroups.id,
              db
                .select({ groupId: workspaceMemberGroupMembers.groupId })
                .from(workspaceMemberGroupMembers)
                .where(eq(workspaceMemberGroupMembers.userId, userId))
            )
          )
        : eq(workspaceMemberGroups.workspaceId, workspaceId)
    )
    .orderBy(workspaceMemberGroups.name);

  if (groups.length === 0) return [];
  const groupIds = groups.map((g) => g.id);

  const channels = await db
    .select({
      id: chatConversations.id,
      groupId: chatConversations.groupId,
      name: chatConversations.name,
      contextType: chatConversations.contextType,
      contextId: chatConversations.contextId
    })
    .from(chatConversations)
    .where(
      and(
        eq(chatConversations.workspaceId, workspaceId),
        inArray(chatConversations.groupId, groupIds),
        isNull(chatConversations.archivedAt)
      )
    )
    .orderBy(chatConversations.createdAt);

  const channelsByGroup = new Map<string, typeof channels>();
  for (const channel of channels) {
    if (!channel.groupId) continue;
    const bucket = channelsByGroup.get(channel.groupId) ?? [];
    bucket.push(channel);
    channelsByGroup.set(channel.groupId, bucket);
  }

  const memberships = await db
    .select({
      groupId: workspaceMemberGroupMembers.groupId,
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl
    })
    .from(workspaceMemberGroupMembers)
    .innerJoin(users, eq(users.id, workspaceMemberGroupMembers.userId))
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.userId, workspaceMemberGroupMembers.userId),
        eq(workspaceMembers.workspaceId, workspaceId)
      )
    )
    .where(inArray(workspaceMemberGroupMembers.groupId, groupIds));

  const membersByGroup = new Map<string, typeof memberships>();
  for (const member of memberships) {
    const bucket = membersByGroup.get(member.groupId) ?? [];
    bucket.push(member);
    membersByGroup.set(member.groupId, bucket);
  }

  return groups.map((group) => {
    const groupChannels = channelsByGroup.get(group.id) ?? [];
    return {
      ...group,
      chatConversationId: groupChannels[0]?.id ?? null,
      channels: groupChannels,
      members: membersByGroup.get(group.id) ?? []
    };
  });
};

export const createWorkspaceMemberGroup = async (
  workspaceId: string,
  createdById: string,
  input: { name: string; memberIds: string[] }
) => {
  const name = input.name.trim();
  if (!name) throw new Error('Nama kumpulan ahli wajib diisi.');

  const [existing] = await db
    .select({ id: workspaceMemberGroups.id })
    .from(workspaceMemberGroups)
    .where(
      and(
        eq(workspaceMemberGroups.workspaceId, workspaceId),
        sql`LOWER(${workspaceMemberGroups.name}) = LOWER(${name})`
      )
    )
    .limit(1);

  if (existing) {
    throw new Error(`Kumpulan ahli dengan nama "${name}" sudah ada.`);
  }

  const memberIds = await validateGroupMembers(workspaceId, [...input.memberIds, createdById]);
  const created = await db.transaction(async (tx) => {
    const [group] = await tx
      .insert(workspaceMemberGroups)
      .values({ workspaceId, name, createdById })
      .returning({ id: workspaceMemberGroups.id });

    await tx.insert(workspaceMemberGroupMembers).values(
      memberIds.map((userId) => ({ groupId: group.id, userId }))
    );

    const [conversation] = await tx
      .insert(chatConversations)
      .values({
        workspaceId,
        kind: 'group',
        contextType: 'group',
        groupId: group.id,
        name,
        createdById
      })
      .returning({ id: chatConversations.id });

    await tx.insert(chatParticipants).values(
      memberIds.map((userId) => ({
        conversationId: conversation.id,
        workspaceId,
        userId,
        role: userId === createdById ? ('admin' as const) : ('member' as const)
      }))
    );

    return { groupId: group.id };
  });

  return (await listWorkspaceMemberGroups(workspaceId)).find((item) => item.id === created.groupId) ?? null;
};

export const updateWorkspaceMemberGroup = async (
  workspaceId: string,
  groupId: string,
  input: { name?: string; memberIds?: string[] }
) => {
  const [group] = await db
    .select()
    .from(workspaceMemberGroups)
    .where(and(eq(workspaceMemberGroups.id, groupId), eq(workspaceMemberGroups.workspaceId, workspaceId)))
    .limit(1);
  if (!group) return null;

  const memberIds = input.memberIds
    ? await validateGroupMembers(workspaceId, [...input.memberIds, group.createdById])
    : undefined;
  const nextName = input.name?.trim();
  if (input.name !== undefined && !nextName) throw new Error('Nama kumpulan ahli wajib diisi.');

  if (nextName !== undefined) {
    const [existing] = await db
      .select({ id: workspaceMemberGroups.id })
      .from(workspaceMemberGroups)
      .where(
        and(
          eq(workspaceMemberGroups.workspaceId, workspaceId),
          ne(workspaceMemberGroups.id, groupId),
          sql`LOWER(${workspaceMemberGroups.name}) = LOWER(${nextName})`
        )
      )
      .limit(1);

    if (existing) {
      throw new Error(`Kumpulan ahli dengan nama "${nextName}" sudah ada.`);
    }
  }

  await db.transaction(async (tx) => {
    if (nextName !== undefined) {
      await tx
        .update(workspaceMemberGroups)
        .set({ name: nextName, updatedAt: new Date() })
        .where(eq(workspaceMemberGroups.id, groupId));
      await tx
        .update(chatConversations)
        .set({ name: nextName, updatedAt: new Date() })
        .where(eq(chatConversations.groupId, groupId));
    }
    const groupConversations = await tx
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(and(eq(chatConversations.groupId, groupId), isNull(chatConversations.archivedAt)));

    if (groupConversations.length === 0) {
      const [conversation] = await tx
        .insert(chatConversations)
        .values({
          workspaceId,
          kind: 'group',
          contextType: 'group',
          groupId,
          name: nextName ?? group.name,
          createdById: group.createdById
        })
        .returning({ id: chatConversations.id });
      groupConversations.push(conversation);
    }

    if (memberIds) {
      const now = new Date();
      await tx.delete(workspaceMemberGroupMembers).where(eq(workspaceMemberGroupMembers.groupId, groupId));
      await tx.insert(workspaceMemberGroupMembers).values(
        memberIds.map((userId) => ({ groupId, userId }))
      );

      for (const conversation of groupConversations) {
        await tx
          .update(chatParticipants)
          .set({ leftAt: now })
          .where(
            and(
              eq(chatParticipants.conversationId, conversation.id),
              notInArray(chatParticipants.userId, memberIds),
              isNull(chatParticipants.leftAt)
            )
          );
        await tx
          .insert(chatParticipants)
          .values(
            memberIds.map((userId) => ({
              conversationId: conversation.id,
              workspaceId,
              userId,
              role: userId === group.createdById ? ('admin' as const) : ('member' as const)
            }))
          )
          .onConflictDoUpdate({
            target: [chatParticipants.conversationId, chatParticipants.userId],
            set: { leftAt: null }
          });
      }
    }
  });

  return (await listWorkspaceMemberGroups(workspaceId)).find((item) => item.id === groupId) ?? null;
};

export const deleteWorkspaceMemberGroup = async (workspaceId: string, groupId: string) => {
  const [group] = await db
    .select({ id: workspaceMemberGroups.id })
    .from(workspaceMemberGroups)
    .where(and(eq(workspaceMemberGroups.id, groupId), eq(workspaceMemberGroups.workspaceId, workspaceId)))
    .limit(1);
  if (!group) return false;

  await db.transaction(async (tx) => {
    await tx
      .update(chatConversations)
      .set({ groupId: null, archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(chatConversations.groupId, groupId));
    await tx
      .delete(workspaceMemberGroups)
      .where(and(eq(workspaceMemberGroups.id, groupId), eq(workspaceMemberGroups.workspaceId, workspaceId)));
  });
  return true;
};
export const createScopedChatConversation = async (input: {
  workspaceId: string;
  createdById: string;
  contextType: 'taskboard' | 'workflow';
  contextId: string;
  name: string;
  groupId?: string | null;
}) => {
  const memberRows = input.groupId
    ? await db
      .select({ userId: workspaceMemberGroupMembers.userId })
      .from(workspaceMemberGroupMembers)
      .innerJoin(
        workspaceMemberGroups,
        and(
          eq(workspaceMemberGroups.id, workspaceMemberGroupMembers.groupId),
          eq(workspaceMemberGroups.workspaceId, input.workspaceId)
        )
      )
      .where(eq(workspaceMemberGroupMembers.groupId, input.groupId))
    : await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, input.workspaceId));

  if (input.groupId && memberRows.length === 0) {
    throw new Error('Member group not found.');
  }

  const [conversation] = await db
    .insert(chatConversations)
    .values({
      workspaceId: input.workspaceId,
      kind: input.contextType,
      contextType: input.contextType,
      contextId: input.contextId,
      groupId: input.groupId ?? null,
      name: input.name.trim(),
      createdById: input.createdById
    })
    .returning({ id: chatConversations.id });

  const participantIds = [...new Set(memberRows.map((row) => row.userId).concat(input.createdById))];
  await db.insert(chatParticipants).values(
    participantIds.map((userId) => ({
      conversationId: conversation.id,
      workspaceId: input.workspaceId,
      userId,
      role: userId === input.createdById ? ('admin' as const) : ('member' as const)
    }))
  );

  return conversation.id;
};


export const isWorkspaceMemberInGroup = async (workspaceId: string, groupId: string, userId: string) => {
  const [row] = await db
    .select({ id: workspaceMemberGroupMembers.id })
    .from(workspaceMemberGroupMembers)
    .innerJoin(workspaceMemberGroups, and(
      eq(workspaceMemberGroups.id, workspaceMemberGroupMembers.groupId),
      eq(workspaceMemberGroups.workspaceId, workspaceId)
    ))
    .where(and(eq(workspaceMemberGroupMembers.groupId, groupId), eq(workspaceMemberGroupMembers.userId, userId)))
    .limit(1);
  return Boolean(row);
};
export const extendInviteExpiry = async (inviteId: string) => {
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const [updated] = await db
    .update(workspaceInvites)
    .set({ expiresAt })
    .where(eq(workspaceInvites.id, inviteId))
    .returning();

  return updated;
};
