import { eq, and } from 'drizzle-orm';
import { db, users } from '@/db';
import { env } from '@/config/env';
import { createWorkspaceForUser } from './workspace';
import { createSession } from './auth';

/**
 * Google OAuth service: authorization URL generation, token exchange,
 * userinfo fetch, and user creation/linking.
 *
 * Uses plain fetch — no external OAuth library needed for a single provider.
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

const SCOPES = ['openid', 'email', 'profile'].join(' ');

/** Generate a random state string for CSRF protection. */
export function generateState(): string {
  return crypto.randomUUID() + crypto.randomUUID();
}

/** Build the Google authorization URL with the given state. */
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: 'code',
    scope: SCOPES,
    state,
    access_type: 'online',
    prompt: 'select_account'
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type GoogleTokens = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
};

/** Exchange the authorization code for access/id tokens. */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: env.googleRedirectUri
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<GoogleTokens>;
}

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
};

/** Fetch the authenticated user's profile from Google. */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google userinfo fetch failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<GoogleUserInfo>;
}

/**
 * Find or create a user from a Google profile, then create a session.
 *
 * Linking strategy:
 * 1. If a user with (provider='google', providerId=sub) exists → log them in.
 * 2. If a user with the same email exists → link Google to that account.
 * 3. Otherwise → create a new user with provider='google'.
 *
 * Returns the session ID.
 */
export async function googleLoginOrCreate(info: GoogleUserInfo): Promise<{ sessionId: string; isNewUser: boolean }> {
  // 1. Existing Google-linked user
  const existingOAuth = await db
    .select()
    .from(users)
    .where(and(eq(users.provider, 'google'), eq(users.providerId, info.sub)))
    .limit(1);

  if (existingOAuth.length > 0) {
    const sessionId = await createSession(existingOAuth[0].id);
    return { sessionId, isNewUser: false };
  }

  // 2. Existing email user → link Google
  const existingEmail = await db
    .select()
    .from(users)
    .where(eq(users.email, info.email))
    .limit(1);

  if (existingEmail.length > 0) {
    const [updated] = await db
      .update(users)
      .set({ provider: 'google', providerId: info.sub, avatarUrl: info.picture ?? existingEmail[0].avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, existingEmail[0].id))
      .returning();

    const sessionId = await createSession(updated.id);
    return { sessionId, isNewUser: false };
  }

  // 3. New user
  const [user] = await db
    .insert(users)
    .values({
      email: info.email,
      name: info.name,
      provider: 'google',
      providerId: info.sub,
      avatarUrl: info.picture ?? null
    })
    .returning();

  await createWorkspaceForUser(user.id, `${info.name}'s Workspace`);

  const sessionId = await createSession(user.id);
  return { sessionId, isNewUser: true };
}
