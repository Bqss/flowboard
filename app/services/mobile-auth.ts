import { and, eq, gt, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { db, mobileSessions, users, type User } from '@db';
import { env } from '@config/env';

export type MobileTokenPair = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
};

type MobileSessionInput = {
  deviceName?: string;
  platform?: string;
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const createToken = (prefix: string) => `${prefix}_${randomBytes(32).toString('base64url')}`;

const buildTokenPair = (): MobileTokenPair => {
  const now = Date.now();
  return {
    accessToken: createToken('fb_at'),
    refreshToken: createToken('fb_rt'),
    accessExpiresAt: new Date(now + env.mobileAccessTokenTtlMinutes * 60_000),
    refreshExpiresAt: new Date(now + env.mobileRefreshTokenTtlDays * 86_400_000)
  };
};

export const createMobileSession = async (
  userId: string,
  input: MobileSessionInput = {}
): Promise<MobileTokenPair> => {
  const tokens = buildTokenPair();
  await db.insert(mobileSessions).values({
    userId,
    accessTokenHash: hashToken(tokens.accessToken),
    refreshTokenHash: hashToken(tokens.refreshToken),
    accessExpiresAt: tokens.accessExpiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt,
    deviceName: input.deviceName?.trim() || null,
    platform: input.platform?.trim() || null
  });
  return tokens;
};

export const getUserByMobileAccessToken = async (token: string | undefined): Promise<User | null> => {
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(mobileSessions)
    .innerJoin(users, eq(mobileSessions.userId, users.id))
    .where(
      and(
        eq(mobileSessions.accessTokenHash, hashToken(token)),
        gt(mobileSessions.accessExpiresAt, new Date()),
        isNull(mobileSessions.revokedAt)
      )
    )
    .limit(1);
  return rows[0]?.user ?? null;
};

export const getBearerToken = (request?: Request): string | undefined => {
  const value = request?.headers.get('authorization');
  if (!value?.startsWith('Bearer ')) return undefined;
  const token = value.slice(7).trim();
  return token || undefined;
};

export const rotateMobileSession = async (
  refreshToken: string,
  input: MobileSessionInput = {}
): Promise<MobileTokenPair & { userId: string } | null> => {
  const now = new Date();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: mobileSessions.id, userId: mobileSessions.userId })
      .from(mobileSessions)
      .where(
        and(
          eq(mobileSessions.refreshTokenHash, hashToken(refreshToken)),
          gt(mobileSessions.refreshExpiresAt, now),
          isNull(mobileSessions.revokedAt)
        )
      )
      .limit(1);
    const session = rows[0];
    if (!session) return null;

    const revoked = await tx
      .update(mobileSessions)
      .set({ revokedAt: now })
      .where(and(eq(mobileSessions.id, session.id), isNull(mobileSessions.revokedAt)))
      .returning({ id: mobileSessions.id });
    if (revoked.length === 0) return null;

    const tokens = buildTokenPair();
    await tx.insert(mobileSessions).values({
      userId: session.userId,
      accessTokenHash: hashToken(tokens.accessToken),
      refreshTokenHash: hashToken(tokens.refreshToken),
      accessExpiresAt: tokens.accessExpiresAt,
      refreshExpiresAt: tokens.refreshExpiresAt,
      deviceName: input.deviceName?.trim() || null,
      platform: input.platform?.trim() || null
    });
    return { ...tokens, userId: session.userId };
  });
};

export const revokeMobileAccessToken = async (token: string | undefined): Promise<void> => {
  if (!token) return;
  await db
    .update(mobileSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(mobileSessions.accessTokenHash, hashToken(token)), isNull(mobileSessions.revokedAt)));
};

export const revokeAllMobileSessions = async (userId: string): Promise<void> => {
  await db
    .update(mobileSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(mobileSessions.userId, userId), isNull(mobileSessions.revokedAt)));
};
