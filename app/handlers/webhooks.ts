import { type Ctx } from '@core';
import { handleInboundWhatsappReply } from '@services/whatsapp';

type WebhookBody = {
  wa: string;
  message?: string;
};

export async function whatsappReply({ body }: Ctx<WebhookBody>) {
  const result = await handleInboundWhatsappReply(body);
  return { ok: true, ...result };
}
