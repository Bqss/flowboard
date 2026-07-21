import { and, eq, gt } from 'drizzle-orm';
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { db, sessions, users, type User } from '@/db';
import { env } from '@/config/env';

/**
 * Authentication service: password hashing and session lifecycle. Pure
 * functions over the database — no HTTP concerns live here, so handlers and
 * scripts (seed, tests) can reuse them.
 *
 * Hashing uses `node:crypto` scrypt rather than `Bun.password`: the API runs
 * under Node in dev (inside the Vite dev server) and under Bun in prod, so a
 * runtime-agnostic primitive keeps one code path everywhere. Hashes are stored
 * self-describing as `scrypt$N$r$p$salt$key` (salt/key base64), so parameters
 * can evolve without a schema change.
 */

// scrypt cost parameters. N must be a power of two; these match Node's defaults
// and give ~64MB memory use per hash (N * r * 128 bytes).
const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

const derive = (password: string, salt: Buffer, keyLen: number, opts: ScryptOptions): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, keyLen, opts, (err, key) => (err ? reject(err) : resolve(key)));
  });

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await derive(password, salt, KEY_LEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parts = hash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p] = parts.map(Number);
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  const actual = await derive(password, salt, expected.length, {
    N: n,
    r,
    p,
    maxmem: 128 * n * r * 2
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// A valid scrypt hash of a throwaway value. Verifying the submitted password
// against this when a user is NOT found makes the "no such user" and "wrong
// password" paths take the same time, closing a timing side-channel that would
// otherwise let an attacker enumerate registered emails. Computed lazily on
// first use so importing this module stays side-effect free.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword('timing-attack-dummy-password'));

/**
 * Verify a password in constant time relative to user existence. Pass the
 * stored hash when the user exists, or `null` when it does not — either way the
 * work (one scrypt derivation) is the same, so response time does not leak
 * whether the email is registered.
 */
export async function verifyPasswordConstantTime(
  password: string,
  hash: string | null
): Promise<boolean> {
  const valid = await verifyPassword(password, hash ?? (await getDummyHash()));
  return hash !== null && valid;
}

export async function updatePassword(userId: string, passwordHash: string): Promise<void> {
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Delete every session for a user. Use to force re-login on other devices. */
export async function destroyUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + env.sessionTtlDays * 24 * 60 * 60 * 1000);
  const [session] = await db.insert(sessions).values({ userId, expiresAt }).returning();
  return session.id;
}

export async function getUserBySession(sessionId: string | undefined): Promise<User | null> {
  if (!sessionId) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
}

export async function destroySession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return;
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/** Cookie attributes for the session cookie, centralised for reuse. */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.nodeEnv === 'production',
  path: '/',
  maxAge: env.sessionTtlDays * 24 * 60 * 60
};
