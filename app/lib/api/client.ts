/**
 * Tiny fetch wrapper for talking to the Elysia API.
 *
 * All calls are same-origin (`/api/...`) so the session cookie rides along
 * automatically. On the server (SSR) pass SvelteKit's `fetch` so requests
 * are resolved internally without a network hop.
 */

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  activeWorkspaceId?: string | null;
};

export type ApiWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'member';
};

export type ApiWorkflow = {
  id: string;
  name: string;
  ownerId: string;
  ownerName?: string;
  defaultAssigneeId: string | null;
  defaultAssigneeIds?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type ApiWajomConnection = {
  id: string;
  workspaceId: string;
  defaultWorkflowId: string | null;
  name: string;
  instanceId: string;
  countryCode: string;
  sendEndpoint: string;
  healthEndpoint: string | null;
  enabledTools: string[];
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

export type ApiWajomJob = {
  id: string;
  workspaceId: string;
  connectionId: string | null;
  cardId: string;
  checklistItemId: string | null;
  templateId: string | null;
  toWa: string;
  messageBody: string;
  scheduledAt: string;
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
  providerMessageId: string | null;
  providerStatus: string | null;
  attempts: number;
  lastAttemptAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiWajomCustomAction = {
  name: string;
  description: string;
  action_type: 'api_call';
  method: 'POST';
  endpoint: string;
  headers: Record<string, string>;
  payload_template: Record<string, unknown>;
  query_params: unknown[];
  parameters: Record<string, Record<string, unknown>>;
  required_params: string[];
  is_active: boolean;
  metadata?: {
    readOnly: boolean;
    sideEffect: boolean;
    requiresConfirmation: boolean;
  };
};

export type ApiWajomActionExport = {
  format: 'wajom-custom-actions';
  version: number;
  provider: 'flowboard';
  preset: string;
  baseUrl: string;
  auth: {
    type: 'bearer';
    header: 'Authorization';
    tokenPlaceholder: string;
  };
  connection: {
    id: string;
    name: string;
    instanceId: string;
    enabledTools: string[];
  };
  actions: ApiWajomCustomAction[];
};

export type ApiBoardColumn = {
  id: string;
  name: string;
  color: string;
  position: number;
  cards: Array<{
    id: string;
    customerName: string;
    customerWa: string;
    product: string | null;
    tag: string | null;
    assigneeId: string | null;
    assigneeName: string | null;
    stageId: string;
    checklistDone: number;
    checklistTotal: number;
    waErrorFlag?: boolean;
    createdAt: string;
  }>;
};

export type ApiCardDetail = {
  card: {
    id: string;
    handoverReason: string | null;
    handedOverAt: string | null;
    product: string | null;
    tag: string | null;
    assigneeId: string | null;
    stageId: string;
    customerId: string;
    createdAt: string;
    updatedAt: string;
  };
  customer: {
    id: string;
    name: string;
    wa: string;
  } | null;
  stage: {
    id: string;
    name: string;
    color: string;
    position: number;
  } | null;
  checklist: Array<{
    id: string;
    label: string;
    required: boolean;
    done: boolean;
    position: number;
  }>;
  assigneeName: string | null;
  nextStage: { id: string; name: string; color: string; position: number } | null;
  nextWorkflow?: { id: string; name: string } | null;
  waErrorFlag?: boolean;
  waFollowupsStopped?: boolean;
};

export type ApiWorkflowDraft = {
  name: string;
  stages: Array<{
    name: string;
    color?: string;
    onReplyNotify?: boolean;
    overdueReminderHours?: number | null;
    checklists: Array<{
      label: string;
      required?: boolean;
      action?: ApiChecklistAction;
    }>;
  }>;
};

export type ApiChecklistAction = {
  kind: 'none' | 'send' | 'followup';
  messageTemplate: string | null;
  delayMinutes: number;
  followupIfNoReply: boolean;
};

export type ApiWorkflowSetupStage = {
  id: string;
  name: string;
  color: string;
  position: number;
  onReplyNotify?: boolean;
  overdueReminderHours?: number | null;
  nextWorkflowId?: string | null;
  templates: Array<{
    id: string;
    label: string;
    required: boolean;
    position: number;
    action?: ApiChecklistAction;
  }>;
};

export type ApiNotification = {
  id: string;
  type: 'wa_failed' | 'customer_replied' | 'card_overdue' | 'handover';
  title: string;
  body: string;
  cardId: string | null;
  read: boolean;
  createdAt: string;
};

export type ApiWaitingActionCard = {
  cardId: string;
  workflowId: string;
  workflowName: string;
  customerName: string;
  customerWa: string;
  stageName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  waErrorFlag: boolean;
  waFollowupsStopped: boolean;
  product: string | null;
  tag: string | null;
};

export type ApiDashboardStats = {
  pending: number;
  progress: number;
  waiting: number;
  done: number;
  totalCustomers?: number;
};

export type ApiWorkspaceMember = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'owner' | 'member';
  joinedAt: string;
};

export type MeResponse = {
  user: ApiUser;
  workspace: ApiWorkspace | null;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchLike = typeof fetch;

async function request<T>(
  path: string,
  options: RequestInit & { fetch?: FetchLike } = {}
): Promise<T> {
  const { fetch: fetchFn = fetch, headers, ...rest } = options;

  const res = await fetchFn(`/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : res.statusText) || 'Request failed';
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}

export const api = {
  /** Generic GET for endpoints without a dedicated helper. */
  get: <T>(path: string, fetchFn?: FetchLike) => request<T>(path, { fetch: fetchFn }),

  register: (body: { email: string; name: string; password: string }, fetchFn?: FetchLike) =>
    request<MeResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  login: (body: { email: string; password: string }, fetchFn?: FetchLike) =>
    request<MeResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  logout: (fetchFn?: FetchLike) =>
    request<{ ok: true }>('/auth/logout', { method: 'POST', fetch: fetchFn }),

  me: (fetchFn?: FetchLike) => request<MeResponse>('/auth/me', { fetch: fetchFn }),

  listUsers: (fetchFn?: FetchLike) => request<{ users: ApiUser[] }>('/users', { fetch: fetchFn }),

  createUser: (body: { email: string; name: string; password: string }, fetchFn?: FetchLike) =>
    request<{ user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  updateUser: (id: string, body: { name: string }, fetchFn?: FetchLike) =>
    request<{ user: ApiUser }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  deleteUser: (id: string, fetchFn?: FetchLike) =>
    request<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE', fetch: fetchFn }),

  changePassword: (body: { currentPassword: string; newPassword: string }, fetchFn?: FetchLike) =>
    request<{ ok: true }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch('/api/auth/avatar', {
      method: 'POST',
      body: formData
    });
    const payload = await res.json();
    if (!res.ok) throw new ApiError(res.status, payload.error || 'Upload failed');
    return payload as { ok: true; avatarUrl: string };
  },

  listWorkspaceMembers: (workspaceId: string, fetchFn?: FetchLike) =>
    request<{ members: ApiWorkspaceMember[] }>(`/workspaces/${workspaceId}/members`, {
      fetch: fetchFn
    }),

  listWorkspaces: (fetchFn?: FetchLike) =>
    request<{
      workspaces: Array<{
        id: string;
        name: string;
        slug: string;
        role: 'owner' | 'member';
        joinedAt: string;
      }>;
    }>('/workspaces', { fetch: fetchFn }),

  switchWorkspace: (workspaceId: string, fetchFn?: FetchLike) =>
    request<{ ok: true; workspace: ApiWorkspace }>(`/workspaces/${workspaceId}/switch`, {
      method: 'POST',
      fetch: fetchFn
    }),

  createWorkspaceInvite: (
    workspaceId: string,
    body: { email: string },
    fetchFn?: FetchLike
  ) =>
    request<{ invite: { id: string; email: string; token: string; expiresAt: string } }>(
      `/workspaces/${workspaceId}/invites`,
      { method: 'POST', body: JSON.stringify(body), fetch: fetchFn }
    ),

  listWorkspaceInvites: (workspaceId: string, fetchFn?: FetchLike) =>
    request<{
      invites: Array<{ id: string; email: string; role: string; expiresAt: string; createdAt: string }>;
    }>(`/workspaces/${workspaceId}/invites`, { fetch: fetchFn }),

  removeWorkspaceMember: (workspaceId: string, userId: string, fetchFn?: FetchLike) =>
    request<{ ok: true }>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
      fetch: fetchFn
    }),

  getInvite: (token: string, fetchFn?: FetchLike) =>
    request<{
      invite: { email: string; workspaceName: string; role: string; expiresAt: string };
    }>(`/workspaces/invites/${token}`, { fetch: fetchFn }),

  acceptInvite: (token: string, fetchFn?: FetchLike) =>
    request<{ ok: true; workspaceId: string; alreadyMember: boolean }>(
      '/workspaces/invites/accept',
      { method: 'POST', body: JSON.stringify({ token }), fetch: fetchFn }
    ),

  updateWorkspace: (workspaceId: string, body: { name: string }, fetchFn?: FetchLike) =>
    request<{ workspace: ApiWorkspace }>(`/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  listWorkflows: (workspaceId: string, fetchFn?: FetchLike) =>
    request<{ workflows: ApiWorkflow[] }>(`/workspaces/${workspaceId}/workflows`, { fetch: fetchFn }),

  createWorkflow: (
    workspaceId: string,
    body: {
      name: string;
      ownerId?: string;
      defaultAssigneeId?: string | null;
      defaultAssigneeIds?: string[];
    },
    fetchFn?: FetchLike
  ) =>
    request<{ workflow: ApiWorkflow }>(`/workspaces/${workspaceId}/workflows`, {
      method: 'POST',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  generateWorkflowDraft: (workspaceId: string, body: { prompt: string }, fetchFn?: FetchLike) =>
    request<{ draft: ApiWorkflowDraft; provider: 'openai' | 'heuristic' }>(
      `/workspaces/${workspaceId}/workflows/ai/draft`,
      { method: 'POST', body: JSON.stringify(body), fetch: fetchFn }
    ),

  saveWorkflowDraft: (workspaceId: string, body: ApiWorkflowDraft, fetchFn?: FetchLike) =>
    request<{
      workflow: ApiWorkflow;
      stages: Array<{ id: string; name: string; color: string; position: number }>;
    }>(`/workspaces/${workspaceId}/workflows/ai/save`, {
      method: 'POST',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  getWorkflowBoard: (workspaceId: string, workflowId: string, fetchFn?: FetchLike) =>
    request<{ board: { columns: ApiBoardColumn[] } }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/board`,
      { fetch: fetchFn }
    ),

  getWorkflowSetup: (workspaceId: string, workflowId: string, fetchFn?: FetchLike) =>
    request<{ stages: ApiWorkflowSetupStage[] }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/setup`,
      { fetch: fetchFn }
    ),

  getWorkflowStats: (workspaceId: string, workflowId?: string, fetchFn?: FetchLike) =>
    request<{ stats: ApiDashboardStats }>(
      `/workspaces/${workspaceId}/workflows/stats${workflowId ? `?workflowId=${workflowId}` : ''}`,
      { fetch: fetchFn }
    ),

  listWaitingAction: (workspaceId: string, fetchFn?: FetchLike) =>
    request<{ cards: ApiWaitingActionCard[] }>(
      `/workspaces/${workspaceId}/workflows/waiting-action`,
      { fetch: fetchFn }
    ),

  bulkReassignCards: (
    workspaceId: string,
    body: { cardIds: string[]; assigneeId: string | null },
    fetchFn?: FetchLike
  ) =>
    request<{ updated: number }>(`/workspaces/${workspaceId}/workflows/cards/bulk-assign`, {
      method: 'POST',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  createCard: (
    workspaceId: string,
    workflowId: string,
    body: {
      name: string;
      wa: string;
      product?: string;
      tag?: string;
      assigneeId?: string | null;
      source?: 'manual' | 'csv' | 'mcp' | 'estafet';
    },
    fetchFn?: FetchLike
  ) =>
    request<{ card: { id: string }; customer: { id: string; name: string; wa: string } }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/cards`,
      {
        method: 'POST',
        body: JSON.stringify(body),
        fetch: fetchFn
      }
    ),

  importCardsCsv: (
    workspaceId: string,
    workflowId: string,
    body: { csv: string; mode?: 'skip' | 'update' },
    fetchFn?: FetchLike
  ) =>
    request<{
      result: { created: number; skipped: number; updated: number; errors: Array<{ row: number; reason: string }> };
    }>(`/workspaces/${workspaceId}/workflows/${workflowId}/cards/import`, {
      method: 'POST',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  updateCardAssignee: (
    workspaceId: string,
    workflowId: string,
    cardId: string,
    body: { assigneeId: string | null },
    fetchFn?: FetchLike
  ) =>
    request<{ card: { id: string; assigneeId: string | null } }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/cards/${cardId}/assignee`,
      { method: 'PATCH', body: JSON.stringify(body), fetch: fetchFn }
    ),

  getCardDetail: (workspaceId: string, workflowId: string, cardId: string, fetchFn?: FetchLike) =>
    request<{ detail: ApiCardDetail }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/cards/${cardId}`,
      { fetch: fetchFn }
    ),

  deleteCard: (workspaceId: string, workflowId: string, cardId: string, fetchFn?: FetchLike) =>
    request<{ ok: true; cardId: string }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/cards/${cardId}`,
      { method: 'DELETE', fetch: fetchFn }
    ),

  moveCard: (
    workspaceId: string,
    workflowId: string,
    cardId: string,
    body: { stageId: string },
    fetchFn?: FetchLike
  ) =>
    request<{ card: { id: string; stageId: string } }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/cards/${cardId}/move`,
      { method: 'POST', body: JSON.stringify(body), fetch: fetchFn }
    ),

  relayCard: (workspaceId: string, workflowId: string, cardId: string, fetchFn?: FetchLike) =>
    request<{
      sourceCardId: string;
      card: { id: string };
      workflow: { id: string; name: string };
    }>(`/workspaces/${workspaceId}/workflows/${workflowId}/cards/${cardId}/relay`, {
      method: 'POST',
      fetch: fetchFn
    }),

  toggleChecklistItem: (
    workspaceId: string,
    workflowId: string,
    cardId: string,
    itemId: string,
    body: { done: boolean },
    fetchFn?: FetchLike
  ) =>
    request<{ item: { id: string; done: boolean } }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/cards/${cardId}/checklist/${itemId}`,
      { method: 'PATCH', body: JSON.stringify(body), fetch: fetchFn }
    ),

  updateWorkflow: (
    workspaceId: string,
    workflowId: string,
    body: {
      name?: string;
      ownerId?: string;
      defaultAssigneeId?: string | null;
      defaultAssigneeIds?: string[];
    },
    fetchFn?: FetchLike
  ) =>
    request<{ workflow: ApiWorkflow }>(`/workspaces/${workspaceId}/workflows/${workflowId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  deleteWorkflow: (workspaceId: string, workflowId: string, fetchFn?: FetchLike) =>
    request<{ ok: true }>(`/workspaces/${workspaceId}/workflows/${workflowId}`, {
      method: 'DELETE',
      fetch: fetchFn
    }),

  createStage: (
    workspaceId: string,
    workflowId: string,
    body: { name: string; color?: string },
    fetchFn?: FetchLike
  ) =>
    request<{ stage: { id: string } }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/stages`,
      { method: 'POST', body: JSON.stringify(body), fetch: fetchFn }
    ),

  updateStage: (
    workspaceId: string,
    workflowId: string,
    stageId: string,
    body: {
      name?: string;
      color?: string;
      onReplyNotify?: boolean;
      overdueReminderHours?: number | null;
      nextWorkflowId?: string | null;
    },
    fetchFn?: FetchLike
  ) =>
    request<{ stage: { id: string; name: string; color: string } }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/stages/${stageId}`,
      { method: 'PATCH', body: JSON.stringify(body), fetch: fetchFn }
    ),

  deleteStage: (
    workspaceId: string,
    workflowId: string,
    stageId: string,
    fetchFn?: FetchLike
  ) =>
    request<{ ok: true }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/stages/${stageId}`,
      { method: 'DELETE', fetch: fetchFn }
    ),

  reorderStages: (
    workspaceId: string,
    workflowId: string,
    body: { stageIds: string[] },
    fetchFn?: FetchLike
  ) =>
    request<{ stages: ApiWorkflowSetupStage[] }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/stages/reorder`,
      { method: 'POST', body: JSON.stringify(body), fetch: fetchFn }
    ),

  createChecklistTemplate: (
    workspaceId: string,
    workflowId: string,
    stageId: string,
    body: { label: string; required?: boolean },
    fetchFn?: FetchLike
  ) =>
    request<{ template: { id: string } }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/stages/${stageId}/templates`,
      { method: 'POST', body: JSON.stringify(body), fetch: fetchFn }
    ),

  updateChecklistTemplate: (
    workspaceId: string,
    workflowId: string,
    stageId: string,
    templateId: string,
    body: { label?: string; required?: boolean },
    fetchFn?: FetchLike
  ) =>
    request<{ template: { id: string; label: string; required: boolean } }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/stages/${stageId}/templates/${templateId}`,
      { method: 'PATCH', body: JSON.stringify(body), fetch: fetchFn }
    ),

  updateChecklistAction: (
    workspaceId: string,
    workflowId: string,
    stageId: string,
    templateId: string,
    body: {
      kind: 'none' | 'send' | 'followup';
      messageTemplate?: string | null;
      delayMinutes?: number;
      followupIfNoReply?: boolean;
    },
    fetchFn?: FetchLike
  ) =>
    request<{ action: ApiChecklistAction }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/stages/${stageId}/templates/${templateId}/action`,
      { method: 'PATCH', body: JSON.stringify(body), fetch: fetchFn }
    ),

  deleteChecklistTemplate: (
    workspaceId: string,
    workflowId: string,
    stageId: string,
    templateId: string,
    fetchFn?: FetchLike
  ) =>
    request<{ ok: true }>(
      `/workspaces/${workspaceId}/workflows/${workflowId}/stages/${stageId}/templates/${templateId}`,
      { method: 'DELETE', fetch: fetchFn }
    ),

  listNotifications: (workspaceId: string, fetchFn?: FetchLike) =>
    request<{ notifications: ApiNotification[]; unread: number }>(
      `/workspaces/${workspaceId}/notifications`,
      { fetch: fetchFn }
    ),

  markNotificationRead: (workspaceId: string, notificationId: string, fetchFn?: FetchLike) =>
    request<{ ok: true }>(`/workspaces/${workspaceId}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      fetch: fetchFn
    }),

  markAllNotificationsRead: (workspaceId: string, fetchFn?: FetchLike) =>
    request<{ ok: true }>(`/workspaces/${workspaceId}/notifications/read-all`, {
      method: 'POST',
      fetch: fetchFn
    }),

  exportWajomActions: (workspaceId: string, connectionId: string, fetchFn?: FetchLike) =>
    request<{ export: ApiWajomActionExport }>(
      `/workspaces/${workspaceId}/integrations/wajom/${connectionId}/export`,
      { fetch: fetchFn }
    ),

  listWajomConnections: (workspaceId: string, fetchFn?: FetchLike) =>
    request<{ connections: ApiWajomConnection[] }>(
      `/workspaces/${workspaceId}/integrations/wajom`,
      { fetch: fetchFn }
    ),

  listWajomJobs: (workspaceId: string, connectionId?: string, fetchFn?: FetchLike) =>
    request<{ jobs: ApiWajomJob[] }>(
      `/workspaces/${workspaceId}/integrations/wajom/jobs${connectionId ? `?connectionId=${connectionId}` : ''}`,
      { fetch: fetchFn }
    ),

  createWajomConnection: (
    workspaceId: string,
    body: {
      name: string;
      instanceId: string;
      countryCode?: string;
      defaultWorkflowId: string;
      sendEndpoint: string;
      healthEndpoint?: string | null;
      sendApiKey?: string | null;
      enabledTools?: string[];
    },
    fetchFn?: FetchLike
  ) =>
    request<{ connection: ApiWajomConnection; connectorToken: string }>(
      `/workspaces/${workspaceId}/integrations/wajom`,
      { method: 'POST', body: JSON.stringify(body), fetch: fetchFn }
    ),

  updateWajomConnection: (
    workspaceId: string,
    connectionId: string,
    body: {
      name?: string;
      instanceId?: string;
      countryCode?: string;
      defaultWorkflowId?: string;
      sendEndpoint?: string;
      healthEndpoint?: string | null;
      sendApiKey?: string | null;
      clearSendApiKey?: boolean;
      enabledTools?: string[];
      enabled?: boolean;
    },
    fetchFn?: FetchLike
  ) =>
    request<{ connection: ApiWajomConnection }>(
      `/workspaces/${workspaceId}/integrations/wajom/${connectionId}`,
      { method: 'PATCH', body: JSON.stringify(body), fetch: fetchFn }
    ),

  revokeWajomConnection: (workspaceId: string, connectionId: string, fetchFn?: FetchLike) =>
    request<{ connection: ApiWajomConnection }>(
      `/workspaces/${workspaceId}/integrations/wajom/${connectionId}/revoke`,
      { method: 'POST', fetch: fetchFn }
    ),

  rotateWajomConnectorToken: (workspaceId: string, connectionId: string, fetchFn?: FetchLike) =>
    request<{ connection: ApiWajomConnection; connectorToken: string }>(
      `/workspaces/${workspaceId}/integrations/wajom/${connectionId}/rotate`,
      { method: 'POST', fetch: fetchFn }
    ),

  testWajomConnection: (workspaceId: string, connectionId: string, fetchFn?: FetchLike) =>
    request<{ result: { ok: boolean; checked: boolean; error?: string; message?: string } }>(
      `/workspaces/${workspaceId}/integrations/wajom/${connectionId}/test`,
      { method: 'POST', fetch: fetchFn }
    ),

  testWajomSend: (
    workspaceId: string,
    connectionId: string,
    body: { to: string; message: string },
    fetchFn?: FetchLike
  ) =>
    request<{ ok: true; result: { status: string; providerMessageId: string | null } }>(
      `/workspaces/${workspaceId}/integrations/wajom/${connectionId}/test-send`,
      { method: 'POST', body: JSON.stringify(body), fetch: fetchFn }
    )
};
