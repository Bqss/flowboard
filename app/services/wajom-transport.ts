import { env } from '@config/env';
import { getWajomSendApiKey, updateWajomHealth } from './wajom-connections';
import type { WajomConnection, WhatsappJob } from '@db';

export type WajomDeliveryState = 'queued' | 'sent' | 'delivered' | 'read';

export type WajomSendResult = {
  status: WajomDeliveryState;
  providerMessageId: string | null;
  providerStatus: string | null;
};

const withTimeout = async (input: RequestInfo | URL, init: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.wajomRequestTimeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const readJson = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
};

const deliveryState = (value: unknown): WajomDeliveryState => {
  if (value === 'queued' || value === 'sent' || value === 'delivered' || value === 'read') return value;
  return 'sent';
};

export const sendWajomMessage = async (connection: WajomConnection | null, job: WhatsappJob): Promise<WajomSendResult> => {
  if (!connection || !connection.sendEndpoint) {
    if (!env.whatsappMock) throw new Error('Wajom connection belum dikonfigurasi.');
    console.info('[WA:mock] outbound test/job accepted', { jobId: job.id, connectionId: connection?.id ?? null });
    return {
      status: 'sent',
      providerMessageId: `mock:${job.id}`,
      providerStatus: 'sent'
    };
  }

  const apiKey = getWajomSendApiKey(connection);
  if (!apiKey) throw new Error('Wajom send API key belum dikonfigurasi.');
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-flowboard-instance-id': connection.instanceId
  };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const response = await withTimeout(connection.sendEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      api_key: apiKey,
      text: job.messageBody,
      phone: job.toWa
    })
  });
  const payload = await readJson(response);

  if (!response.ok) {
    const message =
      typeof payload?.error === 'string' ? payload.error : `Wajom send API returned ${response.status}.`;
    throw new Error(message);
  }

  return {
    status: deliveryState(payload?.status),
    providerMessageId:
      typeof payload?.providerMessageId === 'string'
        ? payload.providerMessageId
        : typeof payload?.messageId === 'string'
          ? payload.messageId
          : null,
    providerStatus: typeof payload?.status === 'string' ? payload.status : null
  };
};

export const sendWajomTestMessage = async (
  connection: WajomConnection,
  input: { to: string; message: string }
) => {
  if (env.whatsappMock) {
    console.info('[WA:mock] outbound test accepted', { connectionId: connection.id });
    return { status: 'sent' as const, providerMessageId: `mock:test:${crypto.randomUUID()}` };
  }

  if (!connection.sendEndpoint) throw new Error('Wajom connection belum dikonfigurasi.');
  const apiKey = getWajomSendApiKey(connection);
  if (!apiKey) throw new Error('Wajom send API key belum dikonfigurasi.');
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-flowboard-instance-id': connection.instanceId
  };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const response = await withTimeout(connection.sendEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      api_key: apiKey,
      text: input.message,
      phone: input.to
    })
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' ? payload.error : `Wajom send API returned ${response.status}.`
    );
  }
  return {
    status: deliveryState(payload?.status),
    providerMessageId:
      typeof payload?.providerMessageId === 'string'
        ? payload.providerMessageId
        : typeof payload?.messageId === 'string'
          ? payload.messageId
          : null
  };
};

export const checkWajomConnection = async (connection: WajomConnection) => {
  if (!connection.healthEndpoint) {
    await updateWajomHealth(connection.id, { ok: true });
    return { ok: true as const, checked: false, message: 'Health endpoint belum dikonfigurasi.' };
  }

  try {
    const apiKey = getWajomSendApiKey(connection);
    const headers: Record<string, string> = { 'x-flowboard-instance-id': connection.instanceId };
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;
    const response = await withTimeout(connection.healthEndpoint, { headers });
    const payload = await readJson(response);
    if (!response.ok) throw new Error(`Health endpoint returned ${response.status}.`);
    await updateWajomHealth(connection.id, { ok: true });
    return { ok: true as const, checked: true, payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Wajom health check failed.';
    await updateWajomHealth(connection.id, { ok: false, error: message });
    return { ok: false as const, checked: true, error: message };
  }
};
