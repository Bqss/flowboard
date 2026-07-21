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
 * `requireAuth` resolves the user itself rather than layering on `withUser`:
 * Elysia's `as: 'scoped'` only propagates a hook/derive one boundary up, so a
 * `withUser` derive nested inside `requireAuth` would not reach a route table
 * that `.use()`s `requireAuth` (leaving `user` undefined and 401ing every
 * request). Keeping the derive and the guard in one instance avoids that hop.
 */
const resolveUser = ({ cookie }: { cookie: Record<string, { value?: unknown }> }) => {
  const sessionId = cookie[env.sessionCookie]?.value as string | undefined;
  return getUserBySession(sessionId);
};

export const withUser = new Elysia({ name: 'withUser' }).derive(
  { as: 'scoped' },
  async (ctx) => ({ user: await resolveUser(ctx) })
);

export const requireAuth = new Elysia({ name: 'requireAuth' })
  .derive({ as: 'scoped' }, async (ctx) => ({ user: await resolveUser(ctx) }))
  .onBeforeHandle({ as: 'scoped' }, ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
  });
