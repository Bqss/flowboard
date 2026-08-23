import { and, eq, gt, isNull } from 'drizzle-orm';
import { db, users, workspaceInvites, workspaceMembers, workspaces } from '@db';
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
