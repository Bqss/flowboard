import { eq } from 'drizzle-orm';
import { env } from '@config/env';
import { db, users } from '@db';
import { createWorkspaceForUser } from '@services/workspace';
import { toPublicUser, toPublicWorkspace, type Ctx } from '@core';
import {
  clearAttempts,
  createMobileSession,
  getBearerToken,
  getActiveWorkspaceContext,
  getGoogleUserInfo,
  googleLoginOrCreate,
  hashPassword,
  revokeAllMobileSessions,
  revokeMobileAccessToken,
  rotateMobileSession,
  updatePassword,
  verifyPassword,
  verifyPasswordConstantTime,
  isLockedOut,
  getRemainingLockoutMs,
  recordFailedAttempt,
  type MobileTokenPair
} from '@services';
import { uploadAvatar } from './auth';
import { logger } from '@services/logger';

type DeviceInput = {
  deviceName?: string;
  platform?: string;
};

type RegisterBody = DeviceInput & {
  email: string;
  name: string;
  phone: string;
  password: string;
};

type LoginBody = DeviceInput & {
  email: string;
  password: string;
};

type RefreshBody = DeviceInput & {
  refreshToken: string;
};

type GoogleBody = DeviceInput & {
  accessToken: string;
};

type UpdateProfileBody = {
  name: string;
  phone?: string;
};

const sessionPayload = async (userId: string, tokens: MobileTokenPair) => {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;
  const workspace = await getActiveWorkspaceContext(user.id, user.activeWorkspaceId);
  return {
    user: toPublicUser(user),
    workspace: workspace ? toPublicWorkspace(workspace.workspace, workspace.role) : null,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessExpiresAt: tokens.accessExpiresAt.toISOString(),
    refreshExpiresAt: tokens.refreshExpiresAt.toISOString()
  };
};

const unauthorized = (set: Ctx['set']) => {
  set.status = 401;
  return { error: 'Unauthorized' };
};

export async function register({ body, set }: Ctx<RegisterBody>) {
  const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (existing.length > 0) {
    set.status = 409;
    return { error: 'Email already registered' };
  }

  const passwordHash = await hashPassword(body.password);
  const [user] = await db
    .insert(users)
    .values({ email: body.email, name: body.name, phone: body.phone, passwordHash })
    .returning();
  if (!user) {
    set.status = 500;
    return { error: 'Could not create account' };
  }
  await createWorkspaceForUser(user.id, `${body.name}'s Workspace`);

  const tokens = await createMobileSession(user.id, body);
  const response = await sessionPayload(user.id, tokens);
  logger.logAuth('mobile_registration_success', { userId: user.id });
  set.status = 201;
  return response;
}

export async function login({ body, set, clientIp }: Ctx<LoginBody>) {
  const ip = clientIp ?? 'unknown';
  if (isLockedOut(body.email, ip)) {
    const minutes = Math.ceil(getRemainingLockoutMs(body.email, ip) / 60_000);
    set.status = 429;
    return { error: `Too many attempts. Try again in ${minutes} minute(s).` };
  }

  const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  const valid = await verifyPasswordConstantTime(body.password, user?.passwordHash ?? null);
  if (!valid || !user) {
    const { isLocked } = recordFailedAttempt(body.email, ip);
    if (isLocked) {
      const minutes = Math.ceil(getRemainingLockoutMs(body.email, ip) / 60_000);
      set.status = 429;
      return { error: `Too many attempts. Try again in ${minutes} minute(s).` };
    }
    set.status = 401;
    return { error: 'Invalid credentials' };
  }

  clearAttempts(body.email, ip);
  const tokens = await createMobileSession(user.id, body);
  const response = await sessionPayload(user.id, tokens);
  logger.logAuth('mobile_login_success', { userId: user.id, ip });
  return response;
}

export async function google({ body, set }: Ctx<GoogleBody>) {
  if (!env.googleClientId || !env.googleClientSecret) {
    set.status = 503;
    return { error: 'Google sign-in is not configured' };
  }

  try {
    const info = await getGoogleUserInfo(body.accessToken);
    if (!info.email_verified) {
      set.status = 403;
      return { error: 'Google email is not verified' };
    }
    const result = await googleLoginOrCreate(info);
    const tokens = await createMobileSession(result.userId, body);
    const response = await sessionPayload(result.userId, tokens);
    if (!response) {
      set.status = 500;
      return { error: 'Could not create mobile session' };
    }
    return { ...response, isNewUser: result.isNewUser };
  } catch (error) {
    logger.logSecurity('mobile_google_login_failed', {
      reason: error instanceof Error ? error.message : 'unknown'
    });
    set.status = 401;
    return { error: 'Google sign-in failed' };
  }
}

export async function refresh({ body, set }: Ctx<RefreshBody>) {
  const result = await rotateMobileSession(body.refreshToken, body);
  if (!result) {
    set.status = 401;
    return { error: 'Invalid or expired refresh token' };
  }
  const response = await sessionPayload(result.userId, result);
  if (!response) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }
  return response;
}

export async function logout({ request }: Ctx) {
  await revokeMobileAccessToken(getBearerToken(request));
  return { ok: true };
}

export async function logoutAll({ user, set }: Ctx) {
  if (!user) return unauthorized(set);
  await revokeAllMobileSessions(user.id);
  return { ok: true };
}

export async function me({ user, set }: Ctx) {
  if (!user) return unauthorized(set);
  const workspace = await getActiveWorkspaceContext(user.id, user.activeWorkspaceId);
  return {
    user: toPublicUser(user),
    workspace: workspace ? toPublicWorkspace(workspace.workspace, workspace.role) : null
  };
}

export async function listAccounts({ user, set }: Ctx) {
  if (!user) return unauthorized(set);
  return {
    accounts: [toPublicUser(user)]
  };
}

export async function switchAccount({ user, body, set }: Ctx<{ userId: string }>) {
  if (!user) return unauthorized(set);
  const [target] = await db.select().from(users).where(eq(users.id, body.userId)).limit(1);
  if (!target) {
    set.status = 404;
    return { error: 'Account not found' };
  }
  const tokens = await createMobileSession(target.id);
  const response = await sessionPayload(target.id, tokens);
  if (!response) {
    set.status = 500;
    return { error: 'Could not switch account' };
  }
  logger.logAuth('mobile_account_switched', { fromUserId: user.id, toUserId: target.id });
  return response;
}

export async function updateProfile({ user, body, set }: Ctx<UpdateProfileBody>) {
  if (!user) return unauthorized(set);
  const [updated] = await db
    .update(users)
    .set({ name: body.name.trim(), phone: body.phone?.trim() || null, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();
  return updated ? { user: toPublicUser(updated) } : unauthorized(set);
}

export async function changePassword({ user, body, set }: Ctx<{ currentPassword: string; newPassword: string }>) {
  if (!user) return unauthorized(set);
  if (!user.passwordHash) {
    set.status = 400;
    return { error: 'This account uses Google sign-in. Set a password first.' };
  }
  if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
    set.status = 400;
    return { error: 'Current password is incorrect' };
  }

  await updatePassword(user.id, await hashPassword(body.newPassword));
  await revokeAllMobileSessions(user.id);
  const tokens = await createMobileSession(user.id);
  const response = await sessionPayload(user.id, tokens);
  return response ? { ok: true, ...response } : { ok: true };
}

export { uploadAvatar };
