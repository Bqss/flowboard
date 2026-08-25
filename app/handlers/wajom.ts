import { type Ctx } from '@core';
import {
  createWajomConnection,
  getWajomConnection,
  listWajomConnections,
  revokeWajomConnection,
  rotateWajomConnectorToken,
  updateWajomConnection
} from '@services/wajom-connections';
import {
  getWajomToolDefinitions,
  executeWajomTool,
  WajomToolError,
  WAJOM_TOOL_DEFINITIONS
} from '@services/wajom-tools';
import {
  completeIdempotencyKey,
  createRequestId,
  getIdempotentResponse,
  recordIntegrationAudit,
  releaseIdempotencyKey,
  reserveIdempotencyKey
} from '@services/integration-security';
import { handleInboundWhatsappReply, listWhatsappJobs, updateWhatsappJobStatus } from '@services/whatsapp';
import { checkWajomConnection, sendWajomTestMessage } from '@services/wajom-transport';
import { getWajomActionManifest } from '@services/wajom-manifest';
import {
  WAJOM_TOOL_NAMES,
  type WajomConnectionInput,
  type WajomToolName
} from '@services/wajom-connections';

type WorkspaceParams = { workspaceId: string };
type ConnectionParams = WorkspaceParams & { connectionId: string };
type JobsQuery = { connectionId?: string };

type CreateConnectionBody = WajomConnectionInput;
type UpdateConnectionBody = Partial<WajomConnectionInput> & {
  enabled?: boolean;
  clearSendApiKey?: boolean;
};

type ToolCallBody = {
  tool: WajomToolName;
  arguments: Record<string, unknown>;
  idempotencyKey?: string;
  requestId?: string;
};

type ReplyBody = { wa: string; message?: string; requestId: string };
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

const statusForToolError = (code: WajomToolError['code']) => {
  if (code === 'not_found') return 404;
  if (code === 'permission_denied' || code === 'tool_disabled') return 403;
  if (code === 'conflict') return 409;
  return 422;
};

const auditSafely = async (input: Parameters<typeof recordIntegrationAudit>[0]) => {
  try {
    await recordIntegrationAudit(input);
  } catch (error) {
    console.error('[integration] audit failed:', error);
  }
};

const makeToolResponse = (tool: WajomToolName, result: unknown) => ({
  ok: true as const,
  tool,
  result
});

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

  try {
    return await createWajomConnection(workspace.id, body);
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

export async function rotateConnection({
  user,
  workspace,
  membership,
  params,
  set
}: Ctx<unknown, ConnectionParams>) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };

  const rotated = await rotateWajomConnectorToken(workspace.id, params.connectionId);
  if (!rotated) {
    set.status = 404;
    return { error: 'Wajom connection not found' };
  }
  return rotated;
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

export function listTools({ wajomConnection }: Ctx<unknown>) {
  if (!wajomConnection) return { provider: 'flowboard', tools: [] };
  return {
    provider: 'flowboard',
    version: 1,
    tools: getWajomToolDefinitions(wajomConnection)
  };
}

export function manifest({ wajomConnection }: Ctx<unknown>) {
  if (!wajomConnection) return { provider: 'flowboard', actions: [] };
  return getWajomActionManifest(wajomConnection);
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

export async function callTool({ wajomConnection, body, set }: Ctx<ToolCallBody>) {
  if (!wajomConnection) {
    set.status = 401;
    return { ok: false, error: 'Unauthorized', code: 'unauthorized' };
  }

  const requestId = createRequestId(body.requestId);
  set.headers['x-request-id'] = requestId;
  const startedAt = Date.now();

  const toolDefinition = WAJOM_TOOL_DEFINITIONS.find((definition) => definition.name === body.tool);
  const requiresIdempotency = toolDefinition && 'sideEffect' in toolDefinition && toolDefinition.sideEffect;
  if (requiresIdempotency && !body.idempotencyKey) {
    set.status = 422;
    await auditSafely({
      workspaceId: wajomConnection.workspaceId,
      connectionId: wajomConnection.id,
      requestId,
      tool: body.tool,
      method: 'tool_call',
      inputKeys: Object.keys(body.arguments ?? {}),
      success: false,
      statusCode: 422,
      latencyMs: Date.now() - startedAt,
      errorCode: 'invalid_input',
      errorMessage: 'Write tools require an idempotencyKey.'
    });
    return {
      ok: false,
      error: 'Write tools require an idempotencyKey.',
      code: 'invalid_input',
      requestId
    };
  }

  if (body.idempotencyKey) {
    const existing = await getIdempotentResponse(wajomConnection.id, body.idempotencyKey, body.tool);
    if (existing?.status === 'completed' && existing.response) return existing.response;
    if (existing?.status === 'processing') {
      set.status = 409;
      return {
        ok: false,
        error: 'Request with this idempotency key is already processing.',
        code: 'conflict',
        requestId
      };
    }

    const reserved = await reserveIdempotencyKey(wajomConnection.id, body.idempotencyKey, body.tool);
    if (!reserved) {
      const raced = await getIdempotentResponse(wajomConnection.id, body.idempotencyKey, body.tool);
      if (raced?.status === 'completed' && raced.response) return raced.response;
      set.status = 409;
      return {
        ok: false,
        error: 'Request with this idempotency key is already processing.',
        code: 'conflict',
        requestId
      };
    }
  }

  try {
    const result = await executeWajomTool(wajomConnection, body.tool, body.arguments ?? {});
    const response = makeToolResponse(body.tool, result);
    if (body.idempotencyKey) {
      await completeIdempotencyKey(wajomConnection.id, body.idempotencyKey, response, 200);
    }
    await auditSafely({
      workspaceId: wajomConnection.workspaceId,
      connectionId: wajomConnection.id,
      requestId,
      tool: body.tool,
      method: 'tool_call',
      inputKeys: Object.keys(body.arguments ?? {}),
      success: true,
      statusCode: 200,
      latencyMs: Date.now() - startedAt,
      resultSummary: { keys: Object.keys(result ?? {}) }
    });
    return response;
  } catch (error) {
    if (body.idempotencyKey) await releaseIdempotencyKey(wajomConnection.id, body.idempotencyKey);

    if (error instanceof WajomToolError) {
      const status = statusForToolError(error.code);
      set.status = status;
      await auditSafely({
        workspaceId: wajomConnection.workspaceId,
        connectionId: wajomConnection.id,
        requestId,
        tool: body.tool,
        method: 'tool_call',
        inputKeys: Object.keys(body.arguments ?? {}),
        success: false,
        statusCode: status,
        latencyMs: Date.now() - startedAt,
        errorCode: error.code,
        errorMessage: error.message
      });
      return { ok: false, tool: body.tool, error: error.message, code: error.code, requestId };
    }

    console.error('[integration] Wajom tool failed:', error);
    set.status = 500;
    return { ok: false, tool: body.tool, error: 'Integration tool failed.', code: 'internal', requestId };
  }
}

export async function inboundReply({ wajomConnection, body, set }: Ctx<ReplyBody>) {
  if (!wajomConnection) {
    set.status = 401;
    return { ok: false, error: 'Unauthorized', code: 'unauthorized' };
  }

  const requestId = createRequestId(body.requestId);
  set.headers['x-request-id'] = requestId;
  const key = body.requestId?.trim();
  const startedAt = Date.now();

  if (key) {
    const existing = await getIdempotentResponse(wajomConnection.id, key, 'inbound_reply');
    if (existing?.status === 'completed' && existing.response) return existing.response;
    if (existing?.status === 'processing') {
      set.status = 409;
      return {
        ok: false,
        error: 'Inbound reply with this request id is already processing.',
        code: 'conflict',
        requestId
      };
    }
    const reserved = await reserveIdempotencyKey(wajomConnection.id, key, 'inbound_reply');
    if (!reserved) {
      set.status = 409;
      return {
        ok: false,
        error: 'Inbound reply with this request id is already processing.',
        code: 'conflict',
        requestId
      };
    }
  }

  try {
    const result = await handleInboundWhatsappReply({
      ...body,
      workspaceId: wajomConnection.workspaceId,
      countryCode: wajomConnection.countryCode,
      workflowId: wajomConnection.defaultWorkflowId ?? undefined
    });
    const response = { ok: true as const, ...result };
    if (key) await completeIdempotencyKey(wajomConnection.id, key, response, 200);
    await auditSafely({
      workspaceId: wajomConnection.workspaceId,
      connectionId: wajomConnection.id,
      requestId,
      tool: 'inbound_reply',
      method: 'inbound_reply',
      inputKeys: Object.keys(body),
      success: true,
      statusCode: 200,
      latencyMs: Date.now() - startedAt,
      resultSummary: { matchedCards: result.matchedCards }
    });
    return response;
  } catch (error) {
    if (key) await releaseIdempotencyKey(wajomConnection.id, key);
    await auditSafely({
      workspaceId: wajomConnection.workspaceId,
      connectionId: wajomConnection.id,
      requestId,
      tool: 'inbound_reply',
      method: 'inbound_reply',
      inputKeys: Object.keys(body),
      success: false,
      statusCode: 500,
      latencyMs: Date.now() - startedAt,
      errorCode: 'internal',
      errorMessage: error instanceof Error ? error.message : 'Inbound reply failed.'
    });
    set.status = 500;
    return { ok: false, error: 'Inbound reply failed.', code: 'internal', requestId };
  }
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
