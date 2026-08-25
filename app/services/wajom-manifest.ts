import { getWajomToolDefinitions } from './wajom-tools';
import type { WajomConnection } from '@db';

export const FLOWBOARD_WAJOM_ACTION_PRESET = {
  id: 'flowboard-onboarding',
  provider: 'flowboard',
  manifestVersion: '1.0.0',
  transport: {
    call: { method: 'POST', path: '/api/integrations/wajom/call' },
    health: { method: 'GET', path: '/api/integrations/wajom/health' },
    inboundReply: { method: 'POST', path: '/api/integrations/wajom/inbound/reply' },
    deliveryStatus: { method: 'POST', path: '/api/integrations/wajom/jobs/{jobId}/status' }
  },
  authentication: {
    type: 'bearer',
    header: 'Authorization',
    prefix: 'Bearer'
  },
  idempotency: {
    writeTools: 'required',
    inboundReply: 'requestId-required'
  },
  errorCodes: ['not_found', 'invalid_input', 'permission_denied', 'conflict', 'tool_disabled', 'rate_limited'] as const,
  response: {
    success: { ok: true, fields: ['tool', 'result'] },
    error: { ok: false, fields: ['code', 'error', 'requestId'] }
  },
  request: {
    call: {
      contentType: 'application/json',
      fields: ['tool', 'arguments', 'idempotencyKey', 'requestId']
    }
  }
} as const;

export const getWajomActionManifest = (connection: WajomConnection) => ({
  ...FLOWBOARD_WAJOM_ACTION_PRESET,
  connection: {
    id: connection.id,
    instanceId: connection.instanceId,
    enabled: connection.enabled,
    enabledTools: connection.enabledTools
  },
  actions: getWajomToolDefinitions(connection)
});
