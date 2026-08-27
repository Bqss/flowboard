import { env } from '@config/env';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send email via Resend API. When RESEND_API_KEY is empty (dev), the email is
 * logged to stdout instead of being sent. This keeps the notification flow
 * testable without an email provider.
 */
export const sendEmail = async (message: EmailMessage): Promise<{ ok: boolean; id?: string; error?: string }> => {
  if (!env.emailResendApiKey) {
    console.info('[email:dev] would send:', { to: message.to, subject: message.subject });
    return { ok: true, id: 'dev' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.emailResendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: message.to,
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {})
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { ok: false, error: `Resend API returned ${response.status}: ${body.slice(0, 200)}` };
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email send failed.';
    return { ok: false, error: message };
  }
};
