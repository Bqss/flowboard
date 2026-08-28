import { env } from '@/config/env';
import { sessionCookieOptions } from '@/services/auth';
import {
  generateState,
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  googleLoginOrCreate
} from '@/services/oauth';
import { logger } from '@/services/logger';
import type { Ctx } from '@/core';

/**
 * OAuth handlers. These are GET endpoints that redirect the browser —
 * they don't use the standard JSON Ctx pattern since they return 302s.
 */

const STATE_COOKIE = 'oauth_state';
const DESTINATION_COOKIE = 'oauth_dest';

/** GET /api/auth/google — redirect to Google consent screen. */
export async function googleRedirect({ query, cookie, set }: Ctx) {
  if (!env.googleClientId || !env.googleClientSecret) {
    set.status = 503;
    return { error: 'Google OAuth is not configured.' };
  }

  const state = generateState();
  cookie[STATE_COOKIE].set({
    value: state,
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: 10 * 60 // 10 minutes — enough for the OAuth round-trip
  });

  // Remember where to go after login (default: /dashboard)
  const dest = query.redirect ?? '/dashboard';
  cookie[DESTINATION_COOKIE].set({
    value: dest,
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: 10 * 60
  });

  set.headers['Location'] = getGoogleAuthUrl(state);
  set.status = 302;
  return '';
}

/** GET /api/auth/google/callback — exchange code, create session, redirect. */
export async function googleCallback({ query, cookie, set }: Ctx) {
  const { code, state } = query;
  const storedState = cookie[STATE_COOKIE]?.value;

  // Clean up state cookie regardless of outcome
  cookie[STATE_COOKIE]?.remove?.();

  if (!code || !state) {
    set.headers['Location'] = '/login?error=oauth_cancelled';
    set.status = 302;
    return '';
  }

  if (!storedState || state !== storedState) {
    logger.logSecurity('oauth state mismatch', { providedState: state, storedState });
    set.headers['Location'] = '/login?error=oauth_state_mismatch';
    set.status = 302;
    return '';
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    if (!userInfo.email_verified) {
      set.headers['Location'] = '/login?error=oauth_email_not_verified';
      set.status = 302;
      return '';
    }
    const { sessionId } = await googleLoginOrCreate(userInfo);
    cookie[env.sessionCookie].set({ value: sessionId, ...sessionCookieOptions });

    const dest = cookie[DESTINATION_COOKIE]?.value ?? '/dashboard';
    cookie[DESTINATION_COOKIE]?.remove?.();

    logger.logAuth('oauth_google_success', { email: userInfo.email });

    set.headers['Location'] = dest;
    set.status = 302;
    return '';
  } catch (err) {
    logger.error('oauth_google_callback_error', { message: err instanceof Error ? err.message : String(err) });
    set.headers['Location'] = '/login?error=oauth_failed';
    set.status = 302;
    return '';
  }
}
