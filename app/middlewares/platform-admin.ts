import { Elysia } from 'elysia';
import { eq } from 'drizzle-orm';
import { db, users } from '@db';
import { env } from '@config/env';
import { getUserBySession } from '@services';

/**
 * Platform admin middleware.
 *
 * `platform_admin` is a flag on `users` (Phase 6), distinct from workspace
 * `owner`. It gates the `/admin/*` API surface — operator-only actions like
 * managing vouchers, comping subscriptions, and listing all workspaces.
 *
 * Resolves the user from the session cookie, then re-reads the `platform_admin`
 * column so a freshly-revoked admin is denied on the next request (the session
 * user object is cached for the request but the flag is checked live).
 */
const resolvePlatformAdmin = async (cookie: Record<string, { value?: unknown }>) => {
  const sessionId = cookie[env.sessionCookie]?.value as string | undefined;
  const sessionUser = await getUserBySession(sessionId);
  if (!sessionUser) return null;

  const [fresh] = await db
    .select({ platformAdmin: users.platformAdmin })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  if (!fresh?.platformAdmin) return null;
  return sessionUser;
};

export const createRequirePlatformAdmin = () =>
  new Elysia()
    .derive({ as: 'scoped' }, async (ctx) => ({ user: await resolvePlatformAdmin(ctx.cookie) }))
    .onBeforeHandle({ as: 'scoped' }, ({ user, set }) => {
      if (!user) {
        set.status = 403;
        return { error: 'Platform admin access required' };
      }
    });

