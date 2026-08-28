
import { mkdir } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, users } from '@/db';
import { env } from '@/config/env';
import { toPublicUser, toPublicWorkspace, type Ctx } from '@/core';
import {
  hashPassword,
  verifyPassword,
  verifyPasswordConstantTime,
  updatePassword,
  destroyUserSessions,
  createSession,
  destroySession,
  sessionCookieOptions
} from '@/services';
import { createWorkspaceForUser, getActiveWorkspaceContext } from '@/services/workspace';
import { logger } from '@/services/logger';
import { isLockedOut, getRemainingLockoutMs, recordFailedAttempt, clearAttempts } from '@/services/throttle';

/**
 * Auth handlers. Plain functions over a minimal `Ctx` — routing and input
 * validation live in `routes/auth.ts`, so these can be read (and tested) as
 * straight request→response logic.
 */

type RegisterBody = { email: string; name: string; phone: string; password: string };
type LoginBody = { email: string; password: string };
type ChangePasswordBody = { currentPassword: string; newPassword: string };

export async function register({ body, cookie, set, clientIp }: Ctx<RegisterBody>) {
  const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (existing.length > 0) {
    logger.logSecurity('registration blocked - duplicate email', { email: body.email, ip: clientIp });
    set.status = 409;
    return { error: 'Email already registered' };
  }

  const passwordHash = await hashPassword(body.password);
  const [user] = await db
    .insert(users)
    .values({ email: body.email, name: body.name, phone: body.phone, passwordHash })
    .returning();

  await createWorkspaceForUser(user.id, `${body.name}'s Workspace`);

  const sessionId = await createSession(user.id);
  cookie[env.sessionCookie].set({ value: sessionId, ...sessionCookieOptions });

  logger.logAuth('registration_success', { userId: user.id, ip: clientIp });
  set.status = 201;

  const refreshed = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const ctx = await getActiveWorkspaceContext(refreshed[0].id, refreshed[0].activeWorkspaceId);

  return {
    user: toPublicUser(refreshed[0]),
    workspace: ctx ? toPublicWorkspace(ctx.workspace, ctx.role) : null
  };
}

export async function login({ body, cookie, set, clientIp }: Ctx<LoginBody>) {
  const ip = clientIp ?? 'unknown';
  const identifier = body.email;

  if (isLockedOut(identifier, ip)) {
    const minutes = Math.ceil(getRemainingLockoutMs(identifier, ip) / 60_000);
    logger.logSecurity('login blocked - locked out', { identifier, ip });
    set.status = 429;
    return { error: `Too many attempts. Try again in ${minutes} minute(s).` };
  }

  const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);

  // Constant-time verify: runs one hash whether or not the user exists, so the
  // response time does not reveal which emails are registered.
  const valid = await verifyPasswordConstantTime(body.password, user?.passwordHash ?? null);

  if (!valid) {
    const { isLocked } = recordFailedAttempt(identifier, ip);
    logger.logSecurity('login_failed', { identifier, ip, reason: user ? 'bad_password' : 'no_user' });
    if (isLocked) {
      const minutes = Math.ceil(getRemainingLockoutMs(identifier, ip) / 60_000);
      set.status = 429;
      return { error: `Too many attempts. Try again in ${minutes} minute(s).` };
    }
    set.status = 401;
    return { error: 'Invalid credentials' };
  }

  clearAttempts(identifier, ip);
  const sessionId = await createSession(user.id);
  cookie[env.sessionCookie].set({ value: sessionId, ...sessionCookieOptions });

  logger.logAuth('login_success', { userId: user.id, ip });
  const ctx = await getActiveWorkspaceContext(user.id, user.activeWorkspaceId);

  return {
    user: toPublicUser(user),
    workspace: ctx ? toPublicWorkspace(ctx.workspace, ctx.role) : null
  };
}

export async function logout({ cookie, user }: Ctx) {
  await destroySession(cookie[env.sessionCookie]?.value);
  cookie[env.sessionCookie].remove();
  logger.logAuth('logout', { userId: user?.id });
  return { ok: true };
}

export async function changePassword({ body, user, cookie, set, clientIp }: Ctx<ChangePasswordBody>) {
  if (!user) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }

  const valid = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!valid) {
    logger.logSecurity('change_password_failed - bad current password', { userId: user.id, ip: clientIp });
    set.status = 400;
    return { error: 'Current password is incorrect' };
  }

  const passwordHash = await hashPassword(body.newPassword);
  await updatePassword(user.id, passwordHash);

  // Invalidate every session (including this one), then issue a fresh session so
  // the current device stays logged in while other devices are forced to re-auth.
  await destroyUserSessions(user.id);
  const sessionId = await createSession(user.id);
  cookie[env.sessionCookie].set({ value: sessionId, ...sessionCookieOptions });

  logger.logAuth('password_changed', { userId: user.id, ip: clientIp });
  return { ok: true };
}

export async function me({ user, set }: Ctx) {
  if (!user) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }

  const ctx = await getActiveWorkspaceContext(user.id, user.activeWorkspaceId);

  return {
    user: toPublicUser(user),
    workspace: ctx ? toPublicWorkspace(ctx.workspace, ctx.role) : null
  };
}

export async function uploadAvatar({ user, body, set }: Ctx<{ avatar: File }>) {
  if (!user) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }

  const file = body.avatar;
  if (!file || !file.name) {
    set.status = 400;
    return { error: 'No file uploaded' };
  }

  // In a real app, save to S3 or similar. Here we write to the static folder.
  const ext = file.name.split('.').pop() || 'png';
  const filename = `${user.id}-${Date.now()}.${ext}`;

  await mkdir('static/avatars', { recursive: true });
  await Bun.write(`static/avatars/${filename}`, file);


  const avatarUrl = `/avatars/${filename}`;

  await db.update(users).set({ avatarUrl }).where(eq(users.id, user.id));

  return { ok: true, avatarUrl };
}
