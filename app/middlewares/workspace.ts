import { Elysia } from 'elysia';
import { eq } from 'drizzle-orm';
import { env } from '@config/env';
import { db, workspaces } from '@db';
import { getMembership } from '@services/workspace';
import { getUserBySession } from '@services';

export const resolveWorkspaceMember = async (
  cookie: Record<string, { value?: unknown }>,
  workspaceId: string | undefined
) => {
  if (!workspaceId) {
    return { workspace: null, membership: null };
  }

  const sessionId = cookie[env.sessionCookie]?.value as string | undefined;
  const user = await getUserBySession(sessionId);
  if (!user) {
    return { workspace: null, membership: null };
  }

  const membership = await getMembership(workspaceId, user.id);
  if (!membership) {
    return { workspace: null, membership: null };
  }

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return {
    workspace: workspace ?? null,
    membership: { role: membership.role }
  };
};

/**
 * Resolves workspace from `:workspaceId` and verifies the current user is a member.
 * Derive + guard live in one plugin (same pattern as `requireAuth`) so scoped
 * lifecycle propagates correctly to nested route groups.
 */
export const createWithWorkspaceMember = () =>
  new Elysia().derive({ as: 'scoped' }, async ({ cookie, params }) =>
    resolveWorkspaceMember(cookie, params.workspaceId)
  );

export const createRequireWorkspaceMember = () =>
  new Elysia()
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

export const createRequireWorkspaceOwner = () =>
  new Elysia()
    .derive({ as: 'scoped' }, async ({ cookie, params }) =>
      resolveWorkspaceMember(cookie, params.workspaceId)
    )
    .onBeforeHandle({ as: 'scoped' }, (ctx) => {
      const { workspace, membership, set } = ctx as typeof ctx & {
        workspace: unknown;
        membership: { role: string } | null;
      };
      if (!workspace || !membership) {
        set.status = 403;
        return { error: 'Forbidden' };
      }
      if (membership.role !== 'owner') {
        set.status = 403;
        return { error: 'Owner access required' };
      }
    });

/** @deprecated Prefer `createWithWorkspaceMember()` when building route tables in dev. */
export const withWorkspaceMember = createWithWorkspaceMember();

/** @deprecated Prefer `createRequireWorkspaceMember()` when building route tables in dev. */
export const requireWorkspaceMember = createRequireWorkspaceMember();

/** @deprecated Prefer `createRequireWorkspaceOwner()` when building route tables in dev. */
export const requireWorkspaceOwner = createRequireWorkspaceOwner();
