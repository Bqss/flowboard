import { and, desc, eq, gte, isNotNull } from 'drizzle-orm';
import { db, notifications, notificationSettings, users, workspaces } from '@db';
import { sendEmail } from './email';
import { env } from '@config/env';

const DIGEST_WINDOW_HOURS = 24;

type DigestRow = {
  userId: string;
  email: string;
  workspaceName: string;
  items: Array<{ title: string; body: string; type: string; createdAt: Date }>;
};

/**
 * Collect unread notifications from the last DIGEST_WINDOW_HOURS for users
 * who have emailDigest enabled, group by user, and send a single digest email.
 */
export const processDigestEmails = async (): Promise<number> => {
  if (!env.emailResendApiKey) return 0;

  const cutoff = new Date(Date.now() - DIGEST_WINDOW_HOURS * 60 * 60 * 1000);

  // Find users with digest mode enabled.
  const digestUsers = await db
    .select({
      userId: notificationSettings.userId,
      workspaceId: notificationSettings.workspaceId
    })
    .from(notificationSettings)
    .where(eq(notificationSettings.emailDigest, true));

  if (digestUsers.length === 0) return 0;

  let sent = 0;

  for (const { userId, workspaceId } of digestUsers) {
    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user?.email) continue;

    const [workspace] = await db
      .select({ name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    const items = await db
      .select({
        title: notifications.title,
        body: notifications.body,
        type: notifications.type,
        createdAt: notifications.createdAt
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.read, false),
          gte(notifications.createdAt, cutoff)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    if (items.length === 0) continue;

    const html = buildDigestHtml(user.name ?? 'User', workspace?.name ?? 'Workspace', items);
    const text = buildDigestText(items);

    try {
      await sendEmail({
        to: user.email,
        subject: `actjom digest — ${items.length} notifikasi di ${workspace?.name ?? 'workspace'}`,
        html,
        text
      });
      sent += 1;
    } catch (error) {
      console.error('[digest] failed to send to', user.email, error);
    }
  }

  if (sent > 0) {
    console.info(`[digest] sent ${sent} digest email(s)`);
  }

  return sent;
};

function buildDigestHtml(
  userName: string,
  workspaceName: string,
  items: Array<{ title: string; body: string; type: string; createdAt: Date }>
): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-weight:600;color:#111818;">${escapeHtml(item.title)}</div>
          <div style="color:#6b7280;font-size:13px;margin-top:2px;">${escapeHtml(item.body)}</div>
          <div style="color:#9ca3af;font-size:11px;margin-top:4px;">${item.createdAt.toLocaleString()}</div>
        </td>
      </tr>`
    )
    .join('');

  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h1 style="font-size:18px;color:#111818;margin:0 0 4px;">actjom Digest</h1>
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">
        Halo ${escapeHtml(userName)}, berikut ${items.length} notifikasi terbaru di ${escapeHtml(workspaceName)} dalam 24 jam terakhir.
      </p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
        Anda menerima email ini karena digest mode aktif. Nonaktifkan di Settings → Notifications.
      </p>
    </div>`;
}

function buildDigestText(
  items: Array<{ title: string; body: string; type: string; createdAt: Date }>
): string {
  const lines = items.map(
    (item) => `- ${item.title}\n  ${item.body}\n  ${item.createdAt.toLocaleString()}`
  );
  return `actjom Digest\n\n${lines.join('\n\n')}\n\nNonaktifkan digest di Settings → Notifications.`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
