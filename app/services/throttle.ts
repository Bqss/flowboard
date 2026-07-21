import { env } from '@/config/env';
import { logger } from '@/services/logger';

/**
 * In-memory login throttle. Tracks failed attempts per identifier (email) AND
 * per IP, locking out whichever crosses the threshold first. State lives in a
 * process-local Map — fine for a single instance; swap for a shared store
 * (Redis) if you run multiple.
 *
 * Adapted from nara's LoginThrottle, trimmed to what the starter's auth flow
 * needs: check → record failure → clear on success.
 */

interface Entry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const store = new Map<string, Entry>();

const maxAttempts = env.loginMaxAttempts;
const windowMs = env.loginLockoutMs;

// Evict stale entries so the Map does not grow unbounded. `unref` keeps this
// timer from holding the process open.
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, e] of store.entries()) {
    const expire = Math.max(e.firstAttempt + windowMs, e.lockedUntil ?? 0);
    if (now > expire + 60_000) store.delete(key);
  }
}, 60_000);
cleanup.unref();

const idKey = (identifier: string) => `id:${identifier.toLowerCase()}`;
const ipKey = (ip: string) => `ip:${ip}`;

function getEntry(key: string): Entry {
  let entry = store.get(key);
  if (!entry) {
    entry = { attempts: 0, firstAttempt: Date.now(), lockedUntil: null };
    store.set(key, entry);
  }
  return entry;
}

function resetIfExpired(entry: Entry): void {
  const now = Date.now();
  if (now - entry.firstAttempt > windowMs) {
    entry.attempts = 0;
    entry.firstAttempt = now;
    entry.lockedUntil = null;
  }
}

/** True when either the identifier or the IP is currently locked out. */
export function isLockedOut(identifier: string, ip: string): boolean {
  const now = Date.now();
  const id = store.get(idKey(identifier));
  const ipEntry = store.get(ipKey(ip));
  return (
    (id?.lockedUntil != null && id.lockedUntil > now) ||
    (ipEntry?.lockedUntil != null && ipEntry.lockedUntil > now)
  );
}

/** Milliseconds until the longest-running lockout for this id/ip clears. */
export function getRemainingLockoutMs(identifier: string, ip: string): number {
  const now = Date.now();
  let max = 0;
  const id = store.get(idKey(identifier));
  const ipEntry = store.get(ipKey(ip));
  if (id?.lockedUntil && id.lockedUntil > now) max = Math.max(max, id.lockedUntil - now);
  if (ipEntry?.lockedUntil && ipEntry.lockedUntil > now) max = Math.max(max, ipEntry.lockedUntil - now);
  return max;
}

/** Record one failed login. Locks the id/ip once the threshold is crossed. */
export function recordFailedAttempt(identifier: string, ip: string): { isLocked: boolean } {
  const now = Date.now();
  const id = getEntry(idKey(identifier));
  const ipEntry = getEntry(ipKey(ip));

  resetIfExpired(id);
  resetIfExpired(ipEntry);

  id.attempts++;
  ipEntry.attempts++;

  const worst = Math.max(id.attempts, ipEntry.attempts);
  if (worst >= maxAttempts) {
    const lockUntil = now + windowMs;
    if (id.attempts >= maxAttempts) id.lockedUntil = lockUntil;
    if (ipEntry.attempts >= maxAttempts) ipEntry.lockedUntil = lockUntil;
    logger.logSecurity('login lockout triggered', {
      identifier,
      ip,
      lockoutMinutes: Math.ceil(windowMs / 60_000)
    });
    return { isLocked: true };
  }

  logger.logSecurity('failed login attempt', {
    identifier,
    ip,
    remainingAttempts: maxAttempts - worst
  });
  return { isLocked: false };
}

/** Clear all attempt/lockout state for an id+ip pair (call on success). */
export function clearAttempts(identifier: string, ip: string): void {
  store.delete(idKey(identifier));
  store.delete(ipKey(ip));
}
