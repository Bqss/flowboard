import { and, eq, isNull } from 'drizzle-orm';
import {
  db,
  wajomConnections,
  type WajomConnection
} from '@db';
import {
  createConnectorToken,
  decryptSecret,
  encryptSecret,
  getTokenPrefix,
  hashConnectorToken
} from './integration-secrets';
import { env } from '@config/env';

export const WAJOM_TOOL_NAMES = [
  'get_onboarding_status',
  'register_customer',
  'complete_onboarding_step',
  'move_customer_stage',
  'handover_to_staff'
] as const;

export type WajomToolName = (typeof WAJOM_TOOL_NAMES)[number];

/**
 * Send endpoint is fixed at api.wajom.co/send.
 * Health endpoint is fixed at portal.wajom.co/api/internal/whatsapp/:instanceId/status.
 * Users do not configure them per-connection.
 */
const SEND_ENDPOINT = `${env.wajomApiBaseUrl}/send`;
const healthEndpointFor = (instanceId: string) =>
  `https://portal.wajom.co/api/internal/whatsapp/${instanceId}/status`;

export type WajomConnectionInput = {
  name: string;
  instanceId: string;
  countryCode?: string;
  sendApiKey?: string | null;
  enabledTools?: WajomToolName[];
};

export type PublicWajomConnection = {
  id: string;
  workspaceId: string;
  name: string;
  instanceId: string;
  countryCode: string;
  sendEndpoint: string;
  healthEndpoint: string | null;
  enabledTools: WajomToolName[];
  enabled: boolean;
  revokedAt: string | null;
  lastUsedAt: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  hasSendApiKey: boolean;
  connectorTokenPrefix: string;
  createdAt: string;
  updatedAt: string;
};

const cleanTools = (tools?: WajomToolName[]) => {
  const requested = tools?.filter((tool, index, all) => WAJOM_TOOL_NAMES.includes(tool) && all.indexOf(tool) === index);
  return requested?.length ? requested : [...WAJOM_TOOL_NAMES];
};

const validateCountryCode = (value?: string) => {
  const countryCode = value?.replace(/\D/g, '') || '60';
  if (countryCode.length < 1 || countryCode.length > 3) throw new Error('Kode negara WhatsApp tidak valid.');
  return countryCode;
};

const toPublicConnection = (row: WajomConnection): PublicWajomConnection => ({
  id: row.id,
  workspaceId: row.workspaceId,
  name: row.name,
  instanceId: row.instanceId,
  countryCode: row.countryCode,
  sendEndpoint: row.sendEndpoint,
  healthEndpoint: row.healthEndpoint,
  enabledTools: (row.enabledTools ?? []) as WajomToolName[],
  enabled: row.enabled,
  revokedAt: row.revokedAt?.toISOString() ?? null,
  lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
  lastError: row.lastError,
  hasSendApiKey: Boolean(row.sendApiKeyEncrypted),
  connectorTokenPrefix: row.connectorTokenPrefix,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

export const listWajomConnections = async (workspaceId: string) => {
  const rows = await db
    .select()
    .from(wajomConnections)
    .where(eq(wajomConnections.workspaceId, workspaceId))
    .orderBy(wajomConnections.createdAt);

  return rows.map(toPublicConnection);
};

export const getWajomConnection = async (workspaceId: string, connectionId: string) => {
  const [row] = await db
    .select()
    .from(wajomConnections)
    .where(and(eq(wajomConnections.id, connectionId), eq(wajomConnections.workspaceId, workspaceId)))
    .limit(1);

  return row ?? null;
};

export const createWajomConnection = async (workspaceId: string, input: WajomConnectionInput) => {
  const name = input.name.trim();
  const instanceId = input.instanceId.trim();
  if (!name || !instanceId) throw new Error('Nama koneksi dan instance ID wajib diisi.');

  const connectorToken = createConnectorToken();
  const [row] = await db
    .insert(wajomConnections)
    .values({
      workspaceId,
      name,
      instanceId,
      countryCode: validateCountryCode(input.countryCode),
      sendEndpoint: SEND_ENDPOINT,
      healthEndpoint: healthEndpointFor(instanceId),
      sendApiKeyEncrypted: input.sendApiKey?.trim() ? encryptSecret(input.sendApiKey.trim()) : null,
      connectorTokenHash: hashConnectorToken(connectorToken),
      connectorTokenPrefix: getTokenPrefix(connectorToken),
      enabledTools: cleanTools(input.enabledTools)
    })
    .returning();

  return { connection: toPublicConnection(row), connectorToken };
};

export const updateWajomConnection = async (
  workspaceId: string,
  connectionId: string,
  input: Partial<WajomConnectionInput> & { enabled?: boolean; clearSendApiKey?: boolean }
) => {
  const existing = await getWajomConnection(workspaceId, connectionId);
  if (!existing) return null;

  const [updated] = await db
    .update(wajomConnections)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.instanceId !== undefined ? { instanceId: input.instanceId.trim() } : {}),
      ...(input.countryCode !== undefined ? { countryCode: validateCountryCode(input.countryCode) } : {}),
      ...(input.sendApiKey !== undefined
        ? {
            sendApiKeyEncrypted: input.sendApiKey?.trim()
              ? encryptSecret(input.sendApiKey.trim())
              : null
          }
        : {}),
      ...(input.clearSendApiKey ? { sendApiKeyEncrypted: null } : {}),
      ...(input.enabledTools ? { enabledTools: cleanTools(input.enabledTools) } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      updatedAt: new Date()
    })
    .where(and(eq(wajomConnections.id, connectionId), eq(wajomConnections.workspaceId, workspaceId)))
    .returning();

  return updated ? toPublicConnection(updated) : null;
};

export const revokeWajomConnection = async (workspaceId: string, connectionId: string) => {
  const [updated] = await db
    .update(wajomConnections)
    .set({ enabled: false, revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(wajomConnections.id, connectionId), eq(wajomConnections.workspaceId, workspaceId)))
    .returning();

  return updated ? toPublicConnection(updated) : null;
};

export const rotateWajomConnectorToken = async (workspaceId: string, connectionId: string) => {
  const connectorToken = createConnectorToken();
  const [updated] = await db
    .update(wajomConnections)
    .set({
      connectorTokenHash: hashConnectorToken(connectorToken),
      connectorTokenPrefix: getTokenPrefix(connectorToken),
      enabled: true,
      revokedAt: null,
      updatedAt: new Date()
    })
    .where(and(eq(wajomConnections.id, connectionId), eq(wajomConnections.workspaceId, workspaceId)))
    .returning();

  return updated ? { connection: toPublicConnection(updated), connectorToken } : null;
};

export const findWajomConnectionByToken = async (token: string) => {
  const tokenHash = hashConnectorToken(token);
  const [row] = await db
    .select()
    .from(wajomConnections)
    .where(
      and(
        eq(wajomConnections.connectorTokenHash, tokenHash),
        eq(wajomConnections.enabled, true),
        isNull(wajomConnections.revokedAt)
      )
    )
    .limit(1);

  if (!row) return null;

  await db
    .update(wajomConnections)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(wajomConnections.id, row.id));

  return row;
};

/**
 * Find the active Wajom connection bound to a workspace.
 * Used by the WhatsApp scheduler to pick the channel that sends messages
 * for any workflow action (send/followup) in that workspace.
 */
export const findWajomConnectionForWorkspace = async (workspaceId: string) => {
  const [row] = await db
    .select()
    .from(wajomConnections)
    .where(
      and(
        eq(wajomConnections.workspaceId, workspaceId),
        eq(wajomConnections.enabled, true),
        isNull(wajomConnections.revokedAt)
      )
    )
    .orderBy(wajomConnections.createdAt)
    .limit(1);

  return row ?? null;
};

export const getWajomSendApiKey = (connection: WajomConnection) =>
  connection.sendApiKeyEncrypted ? decryptSecret(connection.sendApiKeyEncrypted) : null;

export const updateWajomHealth = async (connectionId: string, result: { ok: boolean; error?: string }) => {
  await db
    .update(wajomConnections)
    .set({
      lastCheckedAt: new Date(),
      lastError: result.ok ? null : result.error ?? 'Connection check failed.',
      updatedAt: new Date()
    })
    .where(eq(wajomConnections.id, connectionId));
};

export const hasWajomTool = (connection: WajomConnection, tool: WajomToolName) =>
  (connection.enabledTools ?? []).includes(tool);
