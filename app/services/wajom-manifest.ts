import { getWajomToolDefinitions } from './wajom-tools';
import type { WajomToolDefinition } from './wajom-tools';
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

const FLOWBOARD_CUSTOM_ACTION_TOKEN_PLACEHOLDER = '{{FLOWBOARD_CONNECTOR_TOKEN}}';
const FLOWBOARD_CUSTOM_ACTION_BASE_URL_PLACEHOLDER = '{{FLOWBOARD_BASE_URL}}';

const parameterDescriptions: Record<string, string> = {
  wa: 'Customer WhatsApp number including country code.',
  workflow: 'Optional workflow name to search.',
  name: 'Customer name.',
  product: 'Optional product or onboarding context.',
  tag: 'Optional customer tag.',
  step: 'Checklist step label.',
  stage: 'Target stage name.',
  reason: 'Reason for handing the customer to staff.'
};

type ToolDefinition = WajomToolDefinition;

const toCustomAction = (tool: ToolDefinition) => {
  const properties = tool.inputSchema.properties as Record<string, Record<string, unknown>>;
  const exportableProperties = Object.keys(properties).filter(
    (key) => !(tool.name === 'complete_onboarding_step' && key === 'done')
  );
  const requiredParams: string[] = [...(tool.inputSchema.required ?? [])].filter((key) =>
    exportableProperties.includes(key)
  );
  const parameters: Record<string, Record<string, unknown>> = {};
  for (const key of exportableProperties) {
    parameters[key] = {
      ...properties[key],
      description: parameterDescriptions[key] ?? `Input for ${tool.name}.`
    };
  }
  const payloadArguments = Object.fromEntries(
    exportableProperties.map((key) => [key, `{{${key}}}`])
  );
  const sideEffect = 'sideEffect' in tool && tool.sideEffect;

  if (sideEffect) {
    parameters.request_id = {
      type: 'string',
      description: 'Generate a new UUID for each new operation and reuse it for retries.'
    };
    requiredParams.push('request_id');
  }

  return {
    name: tool.name,
    description: tool.description,
    action_type: 'api_call' as const,
    method: 'POST' as const,
    endpoint: `${FLOWBOARD_CUSTOM_ACTION_BASE_URL_PLACEHOLDER}/api/integrations/wajom/call`,
    headers: {
      Authorization: `Bearer ${FLOWBOARD_CUSTOM_ACTION_TOKEN_PLACEHOLDER}`,
      'Content-Type': 'application/json'
    },
    payload_template: {
      tool: tool.name,
      arguments: payloadArguments,
      ...(sideEffect
        ? {
            idempotencyKey: '{{request_id}}',
            requestId: '{{request_id}}'
          }
        : {})
    },
    query_params: [],
    parameters,
    required_params: requiredParams,
    is_active: true,
    metadata: {
      readOnly: 'readOnly' in tool && tool.readOnly,
      sideEffect,
      requiresConfirmation: 'requiresConfirmation' in tool && tool.requiresConfirmation
    }
  };
};

export const getWajomCustomActionExport = (connection: WajomConnection) => ({
  format: 'wajom-custom-actions',
  version: 1,
  provider: 'flowboard',
  preset: FLOWBOARD_WAJOM_ACTION_PRESET.id,
  baseUrl: FLOWBOARD_CUSTOM_ACTION_BASE_URL_PLACEHOLDER,
  auth: {
    type: 'bearer',
    header: 'Authorization',
    tokenPlaceholder: FLOWBOARD_CUSTOM_ACTION_TOKEN_PLACEHOLDER
  },
  connection: {
    id: connection.id,
    name: connection.name,
    instanceId: connection.instanceId,
    enabledTools: connection.enabledTools
  },
  actions: getWajomToolDefinitions(connection).map(toCustomAction)
});

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
