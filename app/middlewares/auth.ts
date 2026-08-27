import { Elysia } from 'elysia';
import { env } from '../config/env';
import { getUserBySession } from '../services';

/**
 * Auth middlewares as composable Elysia plugins.
 *
 * `withUser` derives the current user from the session cookie and adds `user`
 * (User | null) to the context. `requireAuth` does the same but also rejects
 * with 401 when no user is present. Route tables `.use()` these as needed.
 *
 * Factory functions return a fresh plugin instance so Vite HMR can rebuild the
 * API graph without Elysia deduplicating named plugins from a previous instance.
 */
const resolveUser = ({ cookie }: { cookie: Record<string, { value?: unknown }> }) => {
  const sessionId = cookie[env.sessionCookie]?.value as string | undefined;
  return getUserBySession(sessionId);
};

export const createWithUser = () =>
  new Elysia().derive({ as: 'scoped' }, async (ctx) => ({ user: await resolveUser(ctx) }));

export const createRequireAuth = () =>
  new Elysia()
    .derive({ as: 'scoped' }, async (ctx) => {
      const sid = ctx.cookie[env.sessionCookie]?.value as string | undefined;
      console.log('[auth] requireAuth derive — sid:', sid ? `${sid.slice(0, 8)}...` : 'MISSING');
      const user = await resolveUser(ctx);
      console.log('[auth] requireAuth derive — user:', user ? user.email : 'NULL');
      return { user };
    })
    .onBeforeHandle({ as: 'scoped' }, ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
    });

/** @deprecated Prefer `createWithUser()` when building route tables in dev. */
export const withUser = createWithUser();

/** @deprecated Prefer `createRequireAuth()` when building route tables in dev. */
export const requireAuth = createRequireAuth();
