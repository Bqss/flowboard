import { and, eq } from 'drizzle-orm';
import webpush from 'web-push';
import { env } from '@config/env';
import { db, pushSubscriptions, type NotificationType } from '@db';

const allowedPushHosts = [
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com'
];

export class WebPushServiceError extends Error {
  constructor(
    message: string,
    public code: 'unavailable' | 'invalid_endpoint' | 'endpoint_in_use'
  ) {
    super(message);
    this.name = 'WebPushServiceError';
  }
}

const vapidDetails = () => ({
  subject: env.vapidSubject,
  publicKey: env.vapidPublicKey,
  privateKey: env.vapidPrivateKey
});

export const isWebPushConfigured = () => Boolean(env.vapidPublicKey && env.vapidPrivateKey);

export const getWebPushConfig = () => ({
  enabled: isWebPushConfigured(),
  publicKey: isWebPushConfigured() ? env.vapidPublicKey : null
});

export const isAllowedPushEndpoint = (endpoint: string) => {
  try {
    const url = new URL(endpoint);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      allowedPushHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
};

export const savePushSubscription = async (
  userId: string,
  input: { endpoint: string; keys: { p256dh: string; auth: string } }
) => {
  if (!isWebPushConfigured()) {
    throw new WebPushServiceError('Browser push is not configured.', 'unavailable');
  }
  if (!isAllowedPushEndpoint(input.endpoint)) {
    throw new WebPushServiceError('Unsupported push endpoint.', 'invalid_endpoint');
  }

  const [existing] = await db
    .select({ id: pushSubscriptions.id, userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, input.endpoint))
    .limit(1);

  if (existing && existing.userId !== userId) {
    throw new WebPushServiceError('Push endpoint is already registered to another user.', 'endpoint_in_use');
  }

  if (existing) {
    const [updated] = await db
      .update(pushSubscriptions)
      .set({ p256dh: input.keys.p256dh, auth: input.keys.auth, updatedAt: new Date() })
      .where(and(eq(pushSubscriptions.id, existing.id), eq(pushSubscriptions.userId, userId)))
      .returning({ id: pushSubscriptions.id });
    return { id: updated?.id ?? existing.id };
  }

  const [created] = await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth
    })
    .onConflictDoNothing({ target: pushSubscriptions.endpoint })
    .returning({ id: pushSubscriptions.id });

  if (created) return { id: created.id };

  const [conflict] = await db
    .select({ id: pushSubscriptions.id, userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, input.endpoint))
    .limit(1);
  if (!conflict || conflict.userId !== userId) {
    throw new WebPushServiceError('Push endpoint is already registered to another user.', 'endpoint_in_use');
  }

  const [updated] = await db
    .update(pushSubscriptions)
    .set({ p256dh: input.keys.p256dh, auth: input.keys.auth, updatedAt: new Date() })
    .where(and(eq(pushSubscriptions.id, conflict.id), eq(pushSubscriptions.userId, userId)))
    .returning({ id: pushSubscriptions.id });
  return { id: updated?.id ?? conflict.id };
};

export const removePushSubscription = async (userId: string, endpoint: string) => {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
  return { ok: true as const };
};

export type WebPushNotification = {
  notificationId: string;
  workspaceId: string;
  type: NotificationType;
  title: string;
  body: string;
  appBody: string;
  url: string;
};

export const sendWebPushNotification = async (userId: string, payload: WebPushNotification) => {
  if (!isWebPushConfigured()) return;

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          },
          JSON.stringify(payload),
          { TTL: 60 * 60, urgency: 'normal', vapidDetails: vapidDetails() }
        );
      } catch (error) {
        const statusCode =
          error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number'
            ? error.statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
          return;
        }
        console.error('[notification] web push send failed:', error);
      }
    })
  );
};
