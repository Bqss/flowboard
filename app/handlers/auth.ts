
import { mkdir } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, users } from '@/db';
import { env } from '@/config/env';
import { toPublicUser, toPublicWorkspace, type Ctx, type PublicUser } from '@/core';
import {
  hashPassword,
  verifyPassword,
  verifyPasswordConstantTime,
  updatePassword,
  destroyUserSessions,
  createSession,
  destroySession,
  getUserBySession,
  accountSessionCookieName,
  setSessionCookies,
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
type SwitchAccountBody = { userId: string };

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
  setSessionCookies(cookie, user.id, sessionId);

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
  setSessionCookies(cookie, user.id, sessionId);

  logger.logAuth('login_success', { userId: user.id, ip });
  const ctx = await getActiveWorkspaceContext(user.id, user.activeWorkspaceId);

  return {
    user: toPublicUser(user),
    workspace: ctx ? toPublicWorkspace(ctx.workspace, ctx.role) : null
  };
}

export async function logout({ cookie, user }: Ctx) {
  const sessionId = cookie[env.sessionCookie]?.value as string | undefined;
  await destroySession(sessionId);
  cookie[env.sessionCookie].remove();
  const impersonatorCookieKey = `${env.sessionCookie}_impersonator`;
  cookie[impersonatorCookieKey]?.remove?.();
  if (user?.id) cookie[accountSessionCookieName(user.id)]?.remove?.();
  logger.logAuth('logout', { userId: user?.id });
  return { ok: true };
}

export async function listAccounts({ cookie, user, set }: Ctx) {
  if (!user) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }

  const currentSessionId = cookie[env.sessionCookie]?.value as string | undefined;
  if (currentSessionId) {
    cookie[accountSessionCookieName(user.id)].set({
      value: currentSessionId,
      ...sessionCookieOptions
    });
  }

  const prefix = `${env.sessionCookie}_account_`;
  const accounts = new Map<string, PublicUser>();

  for (const cookieName of Object.keys(cookie)) {
    if (!cookieName.startsWith(prefix)) continue;
    const sessionId = cookie[cookieName]?.value as string | undefined;
    const account = await getUserBySession(sessionId);
    if (!account) {
      cookie[cookieName]?.remove?.();
      continue;
    }
    accounts.set(account.id, toPublicUser(account));
  }

  accounts.set(user.id, toPublicUser(user));
  return {
    accounts: Array.from(accounts.values()).sort((a, b) => {
      if (a.id === user.id) return -1;
      if (b.id === user.id) return 1;
      return a.name.localeCompare(b.name);
    })
  };
}

export async function switchAccount({ body, cookie, user, set }: Ctx<SwitchAccountBody>) {
  if (!user) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }

  if (body.userId === user.id) {
    const ctx = await getActiveWorkspaceContext(user.id, user.activeWorkspaceId);
    return {
      user: toPublicUser(user),
      workspace: ctx ? toPublicWorkspace(ctx.workspace, ctx.role) : null
    };
  }

  const accountCookieName = accountSessionCookieName(body.userId);
  const sessionId = cookie[accountCookieName]?.value as string | undefined;
  const target = await getUserBySession(sessionId);
  if (!target || target.id !== body.userId || !sessionId) {
    cookie[accountCookieName]?.remove?.();
    set.status = 401;
    return { error: 'This account session has expired. Sign in again.' };
  }

  setSessionCookies(cookie, target.id, sessionId);
  const ctx = await getActiveWorkspaceContext(target.id, target.activeWorkspaceId);
  logger.logAuth('account_switched', { userId: target.id });
  return {
    user: toPublicUser(target),
    workspace: ctx ? toPublicWorkspace(ctx.workspace, ctx.role) : null
  };
}

export async function changePassword({ body, user, cookie, set, clientIp }: Ctx<ChangePasswordBody>) {
  if (!user) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }

  if (!user.passwordHash) {
    set.status = 400;
    return { error: 'This account uses Google sign-in. Set a password first.' };
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
  setSessionCookies(cookie, user.id, sessionId);

  logger.logAuth('password_changed', { userId: user.id, ip: clientIp });
  return { ok: true };
}

export async function me({ user, cookie, set }: Ctx) {
  if (!user) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }

  const ctx = await getActiveWorkspaceContext(user.id, user.activeWorkspaceId);

  const impersonatorCookieKey = `${env.sessionCookie}_impersonator`;
  const impersonatorSessionId = cookie[impersonatorCookieKey]?.value as string | undefined;
  let impersonator: { id: string; name: string; email: string } | null = null;

  if (impersonatorSessionId) {
    const adminUser = await getUserBySession(impersonatorSessionId);
    if (adminUser?.platformAdmin) {
      impersonator = {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email
      };
    } else {
      cookie[impersonatorCookieKey]?.remove?.();
    }
  }

  return {
    user: toPublicUser(user),
    workspace: ctx ? toPublicWorkspace(ctx.workspace, ctx.role) : null,
    impersonator
  };
}

export async function stopImpersonating({ cookie, set }: Ctx) {
  const impersonatorCookieKey = `${env.sessionCookie}_impersonator`;
  const adminSessionId = cookie[impersonatorCookieKey]?.value as string | undefined;

  if (!adminSessionId) {
    set.status = 400;
    return { error: 'Not currently impersonating' };
  }

  const adminUser = await getUserBySession(adminSessionId);
  if (!adminUser || !adminUser.platformAdmin) {
    cookie[impersonatorCookieKey]?.remove?.();
    set.status = 403;
    return { error: 'Invalid admin impersonator session' };
  }

  const currentSessionId = cookie[env.sessionCookie]?.value as string | undefined;
  if (currentSessionId && currentSessionId !== adminSessionId) {
    await destroySession(currentSessionId);
  }

  cookie[env.sessionCookie].set({
    value: adminSessionId,
    ...sessionCookieOptions
  });
  cookie[impersonatorCookieKey]?.remove?.();

  const ctx = await getActiveWorkspaceContext(adminUser.id, adminUser.activeWorkspaceId);
  logger.logAuth('admin_impersonation_stopped', { adminId: adminUser.id });

  return {
    user: toPublicUser(adminUser),
    workspace: ctx ? toPublicWorkspace(ctx.workspace, ctx.role) : null,
    impersonator: null
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
