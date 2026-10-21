import { Elysia } from 'elysia';
import { env } from '../config/env';
import { getBearerToken, getUserByMobileAccessToken, getUserBySession } from '../services';

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
const resolveUser = ({
  cookie,
  request
}: {
  cookie: Record<string, { value?: unknown }>;
  request: Request;
}) => {
  const bearerToken = getBearerToken(request);
  if (bearerToken) return getUserByMobileAccessToken(bearerToken);

  const sessionId = cookie[env.sessionCookie]?.value as string | undefined;
  return getUserBySession(sessionId);
};

export const createWithUser = () =>
  new Elysia().derive({ as: 'scoped' }, async (ctx) => ({ user: await resolveUser(ctx) }));

export const createRequireAuth = () =>
  new Elysia()
    .derive({ as: 'scoped' }, async (ctx) => ({ user: await resolveUser(ctx) }))
    .onBeforeHandle({ as: 'scoped' }, ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
    });

