import { type Ctx } from '@core';
import {
  createWajomConnection,
  getWajomConnection,
  listWajomConnections,
  revokeWajomConnection,
  updateWajomConnection,
  WAJOM_TOOL_NAMES,
  type WajomConnectionInput
} from '@services/wajom-connections';
import { listWhatsappJobs, updateWhatsappJobStatus } from '@services/whatsapp';
import { checkWajomConnection, resolveWajomInstance, sendWajomTestMessage } from '@services/wajom-transport';
import { getWajomCustomActionExport } from '@services/wajom-manifest';

type WorkspaceParams = { workspaceId: string };
type ConnectionParams = WorkspaceParams & { connectionId: string };
type JobsQuery = { connectionId?: string };

type CreateConnectionBody = WajomConnectionInput;
type UpdateConnectionBody = Partial<WajomConnectionInput> & {
  enabled?: boolean;
};

type DeliveryBody = {
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
  providerMessageId?: string;
  errorMessage?: string;
  requestId?: string;
};

type TestSendBody = { to: string; message: string };

const requireOwner = (ctx: Pick<Ctx, 'user' | 'workspace' | 'membership' | 'set'>) => {
  if (!ctx.user || !ctx.workspace || !ctx.membership) {
    ctx.set.status = 403;
    return { error: 'Forbidden' } as const;
  }
  if (ctx.membership.role !== 'owner') {
    ctx.set.status = 403;
    return { error: 'Workspace owner required' } as const;
  }
  return null;
};

const handleSettingsError = (error: unknown, set: Ctx['set']) => {
  if (error instanceof Error) {
    set.status = 400;
    return { error: error.message };
  }
  throw error;
};
export async function listConnections({ workspace, membership, set }: Ctx<unknown, WorkspaceParams>) {
  if (!workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }
  return { connections: await listWajomConnections(workspace.id) };
}

export async function listJobs({
  user,
  workspace,
  membership,
  query,
  set
}: Ctx<unknown, WorkspaceParams> & { query: JobsQuery }) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };
  return { jobs: await listWhatsappJobs(workspace.id, query.connectionId) };
}

export async function createConnection({
  user,
  workspace,
  membership,
  body,
  set
}: Ctx<CreateConnectionBody, WorkspaceParams>) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };

  if (!body.sendApiKey?.trim()) {
    set.status = 400;
    return { error: 'API key wajib diisi untuk resolve instance ID.' };
  }

  try {
    const instance = await resolveWajomInstance(body.sendApiKey.trim());
    return await createWajomConnection(workspace.id, {
      ...body,
      instanceId: instance.id,
      countryCode: body.countryCode ?? instance.phone?.slice(0, 2) ?? '62'
    });
  } catch (error) {
    return handleSettingsError(error, set);
  }
}

export async function updateConnection({
  user,
  workspace,
  membership,
  params,
  body,
  set
}: Ctx<UpdateConnectionBody, ConnectionParams>) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };

  try {
    const connection = await updateWajomConnection(workspace.id, params.connectionId, body);
    if (!connection) {
      set.status = 404;
      return { error: 'Wajom connection not found' };
    }
    return { connection };
  } catch (error) {
    return handleSettingsError(error, set);
  }
}

export async function revokeConnection({
  user,
  workspace,
  membership,
  params,
  set
}: Ctx<unknown, ConnectionParams>) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };

  const connection = await revokeWajomConnection(workspace.id, params.connectionId);
  if (!connection) {
    set.status = 404;
    return { error: 'Wajom connection not found' };
  }
  return { connection };
}

export async function testConnection({
  user,
  workspace,
  membership,
  params,
  set
}: Ctx<unknown, ConnectionParams>) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };

  const connection = await getWajomConnection(workspace.id, params.connectionId);
  if (!connection) {
    set.status = 404;
    return { error: 'Wajom connection not found' };
  }

  const result = await checkWajomConnection(connection);
  return { result };
}

export async function testSend({
  user,
  workspace,
  membership,
  params,
  body,
  set
}: Ctx<TestSendBody, ConnectionParams>) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };

  const connection = await getWajomConnection(workspace.id, params.connectionId);
  if (!connection) {
    set.status = 404;
    return { error: 'Wajom connection not found' };
  }
  if (!connection.enabled || connection.revokedAt) {
    set.status = 409;
    return { error: 'Wajom connection is revoked or disabled.', code: 'conflict' };
  }

  try {
    const result = await sendWajomTestMessage(connection, body);
    return { ok: true, result };
  } catch (error) {
    set.status = 502;
    return { error: error instanceof Error ? error.message : 'Wajom test send failed.' };
  }
}


export async function exportActions({
  user,
  workspace,
  membership,
  params,
  set
}: Ctx<unknown, ConnectionParams>) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };

  const connection = await getWajomConnection(workspace.id, params.connectionId);
  if (!connection) {
    set.status = 404;
    return { error: 'Wajom connection not found' };
  }

  return { export: getWajomCustomActionExport(connection) };
}

export async function connectorHealth({ wajomConnection }: Ctx<unknown>) {
  if (!wajomConnection) return { ok: false, error: 'Connection unavailable', code: 'unauthorized' };
  return {
    ok: true,
    connectionId: wajomConnection.id,
    instanceId: wajomConnection.instanceId,
    enabledTools: wajomConnection.enabledTools,
    lastCheckedAt: wajomConnection.lastCheckedAt,
    lastError: wajomConnection.lastError
  };
}

export async function deliveryStatus({ wajomConnection, params, body, set }: Ctx<DeliveryBody, { jobId: string }>) {
  if (!wajomConnection) {
    set.status = 401;
    return { ok: false, error: 'Unauthorized', code: 'unauthorized' };
  }

  try {
    const job = await updateWhatsappJobStatus({
      jobId: params.jobId,
      connectionId: wajomConnection.id,
      status: body.status,
      providerMessageId: body.providerMessageId,
      errorMessage: body.errorMessage
    });
    if (!job) {
      set.status = 404;
      return { ok: false, error: 'WhatsApp job not found', code: 'not_found' };
    }
    return { ok: true, job };
  } catch (error) {
    if (error instanceof Error) {
      set.status = 409;
      return { ok: false, error: error.message, code: 'conflict' };
    }
    throw error;
  }
}

export const flowboardWajomTools = WAJOM_TOOL_NAMES;
