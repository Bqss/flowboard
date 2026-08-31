<script lang="ts">
  import { api, ApiError, type ApiWajomConnection, type ApiWajomJob, type ApiMcpApiKey, type ApiMcpScopeMode, type ApiWorkflow } from '$lib/api/client';
  import { dashboardIntlLocale, dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Badge, Button, Checkbox, Input, Skeleton } from '$lib/components/atoms/index.js';
  import { Breadcrumb, FormField } from '$lib/components/molecules/index.js';
  import { Dialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Alert02Icon,
    CheckmarkCircle02Icon,
    Link01Icon,
    Refresh01Icon,
    ShieldKeyIcon,
    TestTube01Icon,
    Delete02Icon,
    Add01Icon,
    Copy01Icon,
    Key02Icon,
    SentIcon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../../$types';

  let { data }: { data: LayoutData } = $props();
  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let connections = $state<ApiWajomConnection[]>([]);
  let jobs = $state<ApiWajomJob[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let actionId = $state<string | null>(null);
  let testSendId = $state<string | null>(null);
  let testTo = $state('');
  let testMessage = $state('');
  let sendingTest = $state(false);
  let editingId = $state<string | null>(null);
  let formOpen = $state(false);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);
  let issuedToken = $state<string | null>(null);
  let issuedTokenConnectionId = $state<string | null>(null);
  let tokenCopied = $state(false);

  // MCP API keys
  let apiKeys = $state<ApiMcpApiKey[]>([]);
  let apiKeysLoading = $state(true);
  let apiKeyModalOpen = $state(false);
  let editingApiKeyId = $state<string | null>(null);
  let apiKeyCreating = $state(false);
  let newKeyLabel = $state('');
  let newKeyError = $state<string | null>(null);
  let createdKey = $state<{ id: string; key: string; label: string; keyPrefix: string } | null>(null);
  let createdKeyCopied = $state(false);
  let createdKeyConfigCopied = $state(false);
  let revokingKeyId = $state<string | null>(null);
  let rotatingKeyId = $state<string | null>(null);
  let confirmRevokeKeyId = $state<string | null>(null);
  let confirmRevokeLabel = $state('');

  // API key scope + tools state
  let workflowsList = $state<ApiWorkflow[]>([]);
  let newKeyScopeMode = $state<ApiMcpScopeMode>('all');
  let newKeySelectedWorkflowIds = $state<string[]>([]);
  let newKeyEnabledTools = $state<string[]>([]);
  let copyingPromptKeyId = $state<string | null>(null);
  let exportingConfigKeyId = $state<string | null>(null);

  const ALL_TOOLS = [
    'create_card',
    'notify_assignee',
    'move_stage',
    'stop_followups',
    'toggle_checklist_item',
    'list_workflows',
    'get_workflow_stages',
    'get_card',
    'find_card_by_wa',
    'list_cards'
  ] as const;

  const READ_TOOLS = ['list_workflows', 'get_workflow_stages', 'get_card', 'find_card_by_wa', 'list_cards'];
  const WRITE_TOOLS = ['create_card', 'notify_assignee', 'move_stage', 'stop_followups', 'toggle_checklist_item'];

  const TOOL_LABELS: Record<string, string> = {
    create_card: 'Create card',
    notify_assignee: 'Notify assignee',
    move_stage: 'Move stage',
    stop_followups: 'Stop follow-ups',
    toggle_checklist_item: 'Toggle checklist item',
    list_workflows: 'List workflows',
    get_workflow_stages: 'Get workflow stages',
    get_card: 'Get card',
    find_card_by_wa: 'Find card by WA',
    list_cards: 'List cards'
  };

  /** Auto-fill enabled tools based on scope mode + workflow count. */
  function autoFillTools() {
    if (newKeyScopeMode === 'selected' && newKeySelectedWorkflowIds.length === 1) {
      // Single workflow → omit list_workflows
      newKeyEnabledTools = ALL_TOOLS.filter((t) => t !== 'list_workflows');
    } else {
      newKeyEnabledTools = [...ALL_TOOLS];
    }
  }

  /** Reset to recommended tools (called by user via button). */
  function resetRecommendedTools() {
    autoFillTools();
  }

  function toggleTool(tool: string) {
    if (newKeyEnabledTools.includes(tool)) {
      newKeyEnabledTools = newKeyEnabledTools.filter((t) => t !== tool);
    } else {
      newKeyEnabledTools = [...newKeyEnabledTools, tool];
    }
  }

  function toggleWorkflow(id: string) {
    if (newKeySelectedWorkflowIds.includes(id)) {
      newKeySelectedWorkflowIds = newKeySelectedWorkflowIds.filter((w) => w !== id);
    } else {
      newKeySelectedWorkflowIds = [...newKeySelectedWorkflowIds, id];
    }
    autoFillTools();
  }

  function openApiKeyModal() {
    editingApiKeyId = null;
    newKeyLabel = '';
    newKeyScopeMode = 'all';
    newKeySelectedWorkflowIds = [];
    newKeyEnabledTools = [...ALL_TOOLS];
    newKeyError = null;
    apiKeyModalOpen = true;
  }

  function openEditApiKeyModal(key: ApiMcpApiKey) {
    editingApiKeyId = key.id;
    newKeyLabel = key.label;
    newKeyScopeMode = key.scopeMode;
    newKeySelectedWorkflowIds = [...key.allowedWorkflowIds];
    newKeyEnabledTools = [...key.enabledTools];
    newKeyError = null;
    apiKeyModalOpen = true;
  }

  function closeApiKeyModal() {
    if (apiKeyCreating) return;
    apiKeyModalOpen = false;
    editingApiKeyId = null;
    newKeyLabel = '';
    newKeyError = null;
  }

  function closeCreatedKeyDialog() {
    createdKey = null;
    createdKeyCopied = false;
    createdKeyConfigCopied = false;
  }

  $effect(() => {
    if (!testMessage) testMessage = tr('integrations.testMessageDefault');
  });


  let form = $state({
    name: '',
    instanceId: '',
    sendApiKey: '',
    clearSendApiKey: false
  });

  const canManage = $derived(data.workspace?.role === 'owner');

  function resetForm(connection?: ApiWajomConnection) {
    editingId = connection?.id ?? null;
    form = {
      name: connection?.name ?? '',
      instanceId: connection?.instanceId ?? '',
      sendApiKey: '',
      clearSendApiKey: false
    };
    issuedToken = null;
    issuedTokenConnectionId = null;
    tokenCopied = false;
    errorMessage = null;
    successMessage = null;
    formOpen = true;
  }

  function closeForm() {
    if (saving) return;
    formOpen = false;
    editingId = null;
    errorMessage = null;
  }

  async function loadData() {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) {
      loading = false;
      apiKeysLoading = false;
      return;
    }

    loading = true;
    errorMessage = null;
    try {
      const [connectionResponse, jobResponse, keysResponse, workflowsResponse] = await Promise.all([
        api.listWajomConnections(workspaceId),
        api.listWajomJobs(workspaceId),
        api.listApiKeys(workspaceId),
        api.listWorkflows(workspaceId)
      ]);
      connections = connectionResponse.connections ?? [];
      jobs = jobResponse.jobs ?? [];
      apiKeys = keysResponse.keys ?? [];
      workflowsList = workflowsResponse.workflows ?? [];
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : tr('integrations.loadError');
    } finally {
      loading = false;
      apiKeysLoading = false;
    }
  }

  async function handleCreateApiKey() {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) return;
    const label = newKeyLabel.trim();
    if (!label) {
      newKeyError = tr('integrations.apiKeyLabelRequired');
      return;
    }
    if (newKeyScopeMode === 'selected' && newKeySelectedWorkflowIds.length === 0) {
      newKeyError = tr('integrations.apiKeyScopeSelectedRequired');
      return;
    }
    if (newKeyEnabledTools.length === 0) {
      newKeyError = tr('integrations.apiKeyToolsRequired');
      return;
    }

    apiKeyCreating = true;
    newKeyError = null;
    try {
      if (editingApiKeyId) {
        await api.updateApiKey(workspaceId, {
          keyId: editingApiKeyId,
          label,
          scopeMode: newKeyScopeMode,
          enabledTools: newKeyEnabledTools,
          workflowIds: newKeyScopeMode === 'selected' ? newKeySelectedWorkflowIds : undefined
        });
      } else {
        const response = await api.createApiKey(workspaceId, {
          label,
          scopeMode: newKeyScopeMode,
          enabledTools: newKeyEnabledTools,
          workflowIds: newKeyScopeMode === 'selected' ? newKeySelectedWorkflowIds : undefined
        });
        createdKey = { id: response.key.id, key: response.key.key, label: response.key.label, keyPrefix: response.key.keyPrefix };
      }
      newKeyLabel = '';
      apiKeyModalOpen = false;
      editingApiKeyId = null;
      await loadApiKeys();
    } catch (error) {
      newKeyError = error instanceof ApiError ? error.message : tr('integrations.apiKeyCreateError');
    } finally {
      apiKeyCreating = false;
    }
  }

  async function loadApiKeys() {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) return;
    try {
      const response = await api.listApiKeys(workspaceId);
      apiKeys = response.keys ?? [];
    } catch {
      // silent — list refresh is best-effort
    }
  }

  function openRevokeConfirm(keyId: string, label: string) {
    confirmRevokeKeyId = keyId;
    confirmRevokeLabel = label;
  }

  function closeRevokeConfirm() {
    confirmRevokeKeyId = null;
    confirmRevokeLabel = '';
  }

  async function handleRevokeApiKey() {
    const workspaceId = data.workspace?.id;
    const keyId = confirmRevokeKeyId;
    if (!workspaceId || !keyId) return;
    revokingKeyId = keyId;
    errorMessage = null;
    successMessage = null;
    try {
      await api.revokeApiKey(workspaceId, keyId);
      closeRevokeConfirm();
      await loadApiKeys();
      successMessage = tr('integrations.apiKeyRevokedSuccess');
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : tr('integrations.apiKeyRevokedError');
      console.error('Failed to revoke API key:', error);
    } finally {
      revokingKeyId = null;
    }
  }

  async function handleRotateApiKey(keyId: string) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) return;
    rotatingKeyId = keyId;
    try {
      const response = await api.rotateApiKey(workspaceId, keyId);
      createdKey = { id: response.key.id, key: response.key.key, label: response.key.label, keyPrefix: response.key.keyPrefix };
      await loadApiKeys();
    } catch {
      // silent — UI will reflect failure by keeping the row
    } finally {
      rotatingKeyId = null;
    }
  }

  async function handleCopyPrompt(keyId: string) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) return;
    copyingPromptKeyId = keyId;
    try {
      const response = await api.getApiKeyPrompt(workspaceId, keyId);
      await navigator.clipboard.writeText(response.prompt);
      successMessage = tr('integrations.promptCopied');
    } catch {
      errorMessage = tr('integrations.promptCopyError');
    } finally {
      copyingPromptKeyId = null;
    }
  }

  async function handleCopyConfig(keyId: string, apiKey?: string) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) return;
    exportingConfigKeyId = keyId;
    try {
      const response = await api.getApiKeyConfig(workspaceId, keyId, apiKey);
      await navigator.clipboard.writeText(JSON.stringify(response.config, null, 2));
      successMessage = tr('integrations.configCopied');
    } catch {
      errorMessage = tr('integrations.configCopyError');
    } finally {
      exportingConfigKeyId = null;
    }
  }
  function scopeLabel(key: ApiMcpApiKey): string {
    if (key.scopeMode === 'all') return tr('integrations.scopeAll');
    const count = key.allowedWorkflowIds.length;
    if (count === 1) return tr('integrations.scopeOne');
    return tr('integrations.scopeMultiple', { count });
  }

  async function copyCreatedKey() {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.key);
      createdKeyCopied = true;
      setTimeout(() => (createdKeyCopied = false), 2000);
    } catch {
      // clipboard may be blocked — user can still select & copy manually
    }
  }

  async function copyCreatedKeyConfig() {
    if (!createdKey) return;
    const workspaceId = data.workspace?.id;
    if (!workspaceId) return;
    try {
      const response = await api.getApiKeyConfig(workspaceId, createdKey.id, createdKey.key);
      await navigator.clipboard.writeText(JSON.stringify(response.config, null, 2));
      createdKeyConfigCopied = true;
      setTimeout(() => (createdKeyConfigCopied = false), 2000);
    } catch {
      // clipboard may be blocked — user can still select & copy manually
    }
  }

  $effect(() => {
    if (data.workspace?.id) loadData();
  });

  async function submitForm() {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) return;
    saving = true;
    errorMessage = null;
    successMessage = null;
    issuedToken = null;
    issuedTokenConnectionId = null;

    try {
      if (editingId) {
        const body: Parameters<typeof api.updateWajomConnection>[2] = {
          name: form.name,
          instanceId: form.instanceId,
          ...(form.sendApiKey ? { sendApiKey: form.sendApiKey } : {}),
          ...(form.clearSendApiKey ? { clearSendApiKey: true } : {})
        };
        await api.updateWajomConnection(workspaceId, editingId, body);
        successMessage = tr('integrations.updated');
      } else {
        const response = await api.createWajomConnection(workspaceId, {
          name: form.name,
          instanceId: form.instanceId,
          sendApiKey: form.sendApiKey || null
        });
        issuedToken = response.connectorToken;
        issuedTokenConnectionId = response.connection.id;
        successMessage = tr('integrations.created');
      }
      await loadData();
      if (editingId) formOpen = false;
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : tr('integrations.saveError');
    } finally {
      saving = false;
    }
  }

  async function testConnection(connection: ApiWajomConnection) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) return;

    actionId = connection.id;
    errorMessage = null;
    successMessage = null;
    try {
      const response = await api.testWajomConnection(workspaceId, connection.id);
      if (response.result.ok) {
        successMessage = response.result.message ?? tr('integrations.healthSuccess');
      } else {
        errorMessage = response.result.error ?? tr('integrations.healthError');
      }
      await loadData();
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : tr('integrations.healthFailed');
    } finally {
      actionId = null;
    }
  }

  async function sendTestMessage(connection: ApiWajomConnection) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId || !testTo.trim() || !testMessage.trim()) return;

    sendingTest = true;
    errorMessage = null;
    successMessage = null;
    try {
      const response = await api.testWajomSend(workspaceId, connection.id, {
        to: testTo.trim(),
        message: testMessage.trim()
      });
      successMessage = tr('integrations.testAccepted', { status: response.result.status });
      testSendId = null;
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : tr('integrations.testFailed');
    } finally {
      sendingTest = false;
    }
  }

  async function copyToken() {
    if (!issuedToken || !navigator.clipboard) return;
    await navigator.clipboard.writeText(issuedToken);
    tokenCopied = true;
  }

  function formatDate(value: string | null) {
    if (!value) return tr('integrations.never');
    return new Intl.DateTimeFormat(dashboardIntlLocale($locale), { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value)
    );
  }
</script>

<svelte:head>
  <title>{tr('integrations.title')} — actjom</title>
</svelte:head>

<div class="space-y-6 sm:space-y-8">
  <header class="space-y-4">
    <Breadcrumb
      items={[
        { label: tr('common.dashboard'), href: '/dashboard' },
        { label: tr('settings.title'), href: '/dashboard/settings' },
        { label: tr('integrations.title') }
      ]}
      showHomeIcon
    />
    <div class="space-y-2">
      <h1 class="ds-page-title text-ink">{tr('integrations.title')}</h1>
      <p class="text-sm font-normal max-w-2xl leading-relaxed text-mute">{tr('integrations.description')}</p>
    </div>
  </header>

  {#if errorMessage}
    <div class="flex items-start gap-2 rounded-xl border border-status-urgent/25 bg-status-urgent-soft px-4 py-3 text-sm text-status-urgent-ink">
      <HugeiconsIcon icon={Alert02Icon} size={17} strokeWidth={1.8} class="mt-0.5 shrink-0" />
      <span>{errorMessage}</span>
    </div>
  {/if}
  {#if successMessage}
    <div class="flex items-start gap-2 rounded-xl border border-status-done/25 bg-status-done-soft px-4 py-3 text-sm text-status-done-ink">
      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={17} strokeWidth={1.8} class="mt-0.5 shrink-0" />
      <span>{successMessage}</span>
    </div>
  {/if}

  {#if issuedToken}
    <section class="rounded-2xl border border-primary/25 bg-primary-soft p-4 sm:p-5 shadow-card">
      <div class="flex items-start gap-3">
        <HugeiconsIcon icon={ShieldKeyIcon} size={20} strokeWidth={1.8} class="mt-0.5 shrink-0 text-primary" />
        <div class="min-w-0 flex-1 space-y-3">
          <div>
            <h2 class="ds-section-title text-ink">{tr('integrations.tokenTitle')}</h2>
            <p class="ds-caption mt-1 text-mute">{tr('integrations.tokenDescription')}</p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <Input value={issuedToken} readonly aria-label={tr('integrations.tokenLabel')} class="font-mono text-xs" />
            <Button variant="secondary" onclick={copyToken}>
              <HugeiconsIcon icon={Copy01Icon} size={15} strokeWidth={1.8} />
              {tokenCopied ? tr('common.copied') : tr('integrations.copyToken')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <section class="rounded-2xl border border-hairline bg-card p-4 sm:p-6 shadow-card">
    <div class="mb-4 sm:mb-6 flex items-start gap-3">
      <HugeiconsIcon icon={Link01Icon} size={20} strokeWidth={1.8} class="mt-0.5 shrink-0 text-primary" />
      <div class="flex-1">
        <h2 class="ds-section-title text-ink">{tr('integrations.registered')}</h2>
        <p class="text-sm font-normal leading-relaxed text-mute mt-1">{tr('integrations.rotateDescription')}</p>
      </div>
      {#if canManage && !loading}
        <Button variant="primary" size="sm" onclick={() => resetForm()}>
          <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={1.8} />
          {tr('integrations.add')}
        </Button>
      {/if}
    </div>

    {#if loading}
      <div class="space-y-2">
        {#each Array(2) as _}
          <Skeleton class="h-14 w-full rounded-xl" />
        {/each}
      </div>
    {:else if connections.length === 0}
      <div class="rounded-xl border border-dashed border-hairline-strong bg-canvas-sunken px-4 py-8 text-center">
        <HugeiconsIcon icon={Link01Icon} size={24} strokeWidth={1.8} class="mx-auto text-mute" />
        <p class="text-sm text-mute mt-2">{tr('integrations.noneDescription')}</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each connections as connection (connection.id)}
          {@const recentJobs = jobs.filter((job) => job.connectionId === connection.id).slice(0, 3)}
          <div class="rounded-xl border border-hairline bg-canvas px-4 py-3 sm:px-5 sm:py-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex items-center gap-2">
                  <span class="ds-label truncate text-ink">{connection.name}</span>
                  <Badge tone={connection.enabled && !connection.revokedAt ? 'done' : 'idle'}>
                    {connection.enabled && !connection.revokedAt ? tr('integrations.active') : tr('integrations.revokedStatus')}
                  </Badge>
                </div>
                <p class="ds-caption font-mono text-mute">{connection.instanceId}</p>
                <p class="text-sm font-normal leading-relaxed text-mute">
                  {tr('integrations.lastConnectorCall')} {formatDate(connection.lastUsedAt)}
                  · {tr('integrations.lastHealthCheck')} {formatDate(connection.lastCheckedAt)}
                  · {connection.hasSendApiKey ? tr('integrations.encrypted') : tr('integrations.notUsed')}
                </p>
              </div>
              {#if canManage}
                <div class="flex shrink-0 flex-wrap items-center gap-1">
                  <Button variant="ghost" size="sm" onclick={() => resetForm(connection)}>
                    {tr('common.edit')}
                  </Button>
                  <Button variant="ghost" size="sm" loading={actionId === connection.id} onclick={() => testConnection(connection)}>
                    <HugeiconsIcon icon={TestTube01Icon} size={15} strokeWidth={1.8} />
                    {tr('integrations.testHealth')}
                  </Button>
                  <Button variant="ghost" size="sm" onclick={() => { testSendId = testSendId === connection.id ? null : connection.id; errorMessage = null; }}>
                    {tr('integrations.testSend')}
                  </Button>
                </div>
              {/if}
            </div>

            {#if connection.lastError}
              <div class="mt-3 rounded-lg border border-status-urgent/20 bg-status-urgent-soft px-3 py-2 text-xs text-status-urgent-ink">
                {connection.lastError}
              </div>
            {/if}

            {#if recentJobs.length > 0}
              <div class="mt-4 rounded-lg border border-hairline bg-lane/40 p-3 sm:p-4">
                <div class="flex items-center justify-between gap-2">
                  <p class="ds-label text-ink">{tr('integrations.outboundLatest')}</p>
                  <span class="text-xs font-normal text-mute">{tr('integrations.latestCount', { count: recentJobs.length })}</span>
                </div>
                <div class="mt-3 space-y-2.5">
                  {#each recentJobs as job (job.id)}
                    <div class="flex items-center justify-between gap-3 text-sm">
                      <div class="min-w-0">
                        <p class="truncate font-mono text-mute">{job.toWa}</p>
                        <p class="mt-0.5 text-xs text-faint">{formatDate(job.updatedAt)} · {tr('integrations.attempt', { count: job.attempts })}</p>
                      </div>
                      <Badge tone={job.status === 'failed' ? 'urgent' : job.status === 'delivered' || job.status === 'read' || job.status === 'sent' ? 'done' : 'queued'}>
                        {job.status}
                      </Badge>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if testSendId === connection.id}
              <form
                class="mt-4 space-y-2 rounded-lg border border-hairline bg-lane/40 p-4"
                onsubmit={(event) => {
                  event.preventDefault();
                  sendTestMessage(connection);
                }}
              >
                <div class="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]">
                  <Input bind:value={testTo} placeholder="60123456789" aria-label={tr('integrations.testNumber')} />
                  <Input bind:value={testMessage} placeholder={tr('integrations.testMessage')} aria-label={tr('integrations.testMessage')} />
                  <Button variant="primary" type="submit" size="sm" loading={sendingTest}>{tr('integrations.send')}</Button>
                </div>
                <p class="text-xs font-normal text-mute">{tr('integrations.testHint')}</p>
              </form>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- MCP API keys -->
  <section class="rounded-2xl border border-hairline bg-card p-4 sm:p-6 shadow-card">
    <div class="mb-4 sm:mb-6 flex items-start gap-3">
      <HugeiconsIcon icon={Key02Icon} size={20} strokeWidth={1.8} class="mt-0.5 shrink-0 text-primary" />
      <div class="flex-1">
        <h2 class="ds-section-title text-ink">{tr('integrations.apiKeysTitle')}</h2>
        <p class="text-sm font-normal leading-relaxed text-mute mt-1">{tr('integrations.apiKeysDescription')}</p>
      </div>
      {#if canManage && !apiKeysLoading}
        <Button variant="primary" size="sm" onclick={openApiKeyModal}>
          <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={1.8} />
          {tr('integrations.apiKeyCreate')}
        </Button>
      {/if}
    </div>

    {#if apiKeysLoading}
      <div class="space-y-2">
        {#each Array(2) as _}
          <Skeleton class="h-14 w-full rounded-xl" />
        {/each}
      </div>
    {:else if apiKeys.length === 0}
      <div class="rounded-xl border border-dashed border-hairline-strong bg-canvas-sunken px-4 py-8 text-center">
        <p class="text-sm text-mute">{tr('integrations.apiKeysEmpty')}</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each apiKeys as key (key.id)}
          <div class="rounded-xl border border-hairline bg-canvas px-4 py-3 sm:px-5 sm:py-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex items-center gap-2">
                  <span class="ds-label truncate text-ink">{key.label}</span>
                  <Badge tone="done">{tr('integrations.apiKeyActive')}</Badge>
                </div>
                <p class="ds-caption font-mono text-mute">{key.keyPrefix}…</p>
                <p class="text-sm font-normal leading-relaxed text-mute">
                  {scopeLabel(key)}
                  · {tr('integrations.apiKeyToolsCount', { count: key.enabledTools.length })}
                  · {tr('integrations.apiKeyCreated')} {new Date(key.createdAt).toLocaleDateString()}
                  {#if key.lastUsedAt}
                    · {tr('integrations.apiKeyLastUsed')} {new Date(key.lastUsedAt).toLocaleDateString()}
                  {/if}
                </p>
              </div>
              {#if canManage}
                <div class="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onclick={() => openEditApiKeyModal(key)}>
                    {tr('common.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => handleCopyPrompt(key.id)}
                    disabled={copyingPromptKeyId === key.id}
                  >
                    <HugeiconsIcon icon={SentIcon} size={15} strokeWidth={1.8} />
                    {tr('integrations.copyPrompt')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => handleCopyConfig(key.id)}
                    disabled={exportingConfigKeyId === key.id}
                  >
                    <HugeiconsIcon icon={Copy01Icon} size={15} strokeWidth={1.8} />
                    {tr('integrations.copyConfig')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => handleRotateApiKey(key.id)}
                    disabled={rotatingKeyId === key.id}
                  >
                    <HugeiconsIcon icon={Refresh01Icon} size={15} strokeWidth={1.8} />
                    {tr('integrations.apiKeyRotate')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => openRevokeConfirm(key.id, key.label)}
                    disabled={revokingKeyId === key.id}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
                    {tr('integrations.apiKeyRevoke')}
                  </Button>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<!-- Wajom connection Add/Edit modal -->
<Dialog
  bind:open={formOpen}
  title={editingId ? tr('integrations.editTitle') : tr('integrations.newTitle')}
  description={tr('integrations.formDescription')}
  size="md"
  onclose={closeForm}
>
  <form
    class="space-y-5"
    onsubmit={(event) => {
      event.preventDefault();
      submitForm();
    }}
  >
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label={tr('integrations.name')} required>
        {#snippet control(args)}
          <Input {...args} bind:value={form.name} placeholder="Wajom production" />
        {/snippet}
      </FormField>
      <FormField label={tr('integrations.instanceId')} required helper={tr('integrations.instanceHelper')}>
        {#snippet control(args)}
          <Input {...args} bind:value={form.instanceId} placeholder="wajom-prod-01" />
        {/snippet}
      </FormField>
    </div>

    <FormField
      label={tr('integrations.sendApiKey')}
      helper={editingId ? tr('integrations.sendApiKeyEditHelper') : tr('integrations.sendApiKeyCreateHelper')}
    >
      {#snippet control(args)}
        <Input {...args} bind:value={form.sendApiKey} type="password" placeholder={editingId ? tr('integrations.unchanged') : tr('integrations.enterApiKey')} />
      {/snippet}
    </FormField>

    {#if editingId}
      <label class="flex items-center gap-2 text-sm text-ink">
        <Checkbox bind:checked={form.clearSendApiKey} />
        {tr('integrations.clearApiKey')}
      </label>
    {/if}

    {#if errorMessage}
      <p class="text-sm text-status-urgent-ink">{errorMessage}</p>
    {/if}
  </form>
  {#snippet footer()}
    <Button variant="secondary" onclick={closeForm} disabled={saving}>{tr('common.cancel')}</Button>
    <Button variant="primary" onclick={submitForm} loading={saving} disabled={!canManage}>
      {editingId ? tr('common.save') : tr('integrations.add')}
    </Button>
  {/snippet}
</Dialog>

<!-- Generate API Key modal -->
<Dialog bind:open={apiKeyModalOpen} title={editingApiKeyId ? tr('integrations.apiKeyEdit') : tr('integrations.apiKeyCreate')} description={tr('integrations.apiKeysDescription')} size="lg" onclose={closeApiKeyModal}>
  <form
    class="space-y-5"
    onsubmit={(e) => {
      e.preventDefault();
      handleCreateApiKey();
    }}
  >
    <FormField label={tr('integrations.apiKeyLabel')} required>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={newKeyLabel}
          placeholder={tr('integrations.apiKeyLabelPlaceholder')}
        />
      {/snippet}
    </FormField>

    <!-- Scope mode -->
    <FormField label={tr('integrations.apiKeyScope')} helper={tr('integrations.apiKeyScopeHelper')}>
      {#snippet control()}
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-lg border px-3 py-2 text-sm transition {newKeyScopeMode === 'all' ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink hover:border-ink'}"
            onclick={() => { newKeyScopeMode = 'all'; newKeySelectedWorkflowIds = []; }}
          >
            {tr('integrations.scopeAll')}
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg border px-3 py-2 text-sm transition {newKeyScopeMode === 'selected' ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink hover:border-ink'}"
            onclick={() => { newKeyScopeMode = 'selected'; }}
          >
            {tr('integrations.scopeSelected')}
          </button>
        </div>
      {/snippet}
    </FormField>

    <!-- Workflow multi-select (only when scope = selected) -->
    {#if newKeyScopeMode === 'selected'}
      <FormField label={tr('integrations.apiKeyWorkflows')} helper={tr('integrations.apiKeyWorkflowsHelper')}>
        {#snippet control()}
          <div class="max-h-40 overflow-y-auto rounded-lg border border-line bg-surface p-2 space-y-1">
            {#if workflowsList.length === 0}
              <p class="ds-caption px-2 py-1 text-mute">{tr('integrations.noWorkflows')}</p>
            {:else}
              {#each workflowsList as wf (wf.id)}
                <label class="flex items-center gap-2 rounded px-2 py-1 text-sm text-ink hover:bg-lane/40 cursor-pointer">
                  <Checkbox checked={newKeySelectedWorkflowIds.includes(wf.id)} onclick={() => toggleWorkflow(wf.id)} />
                  <span class="truncate">{wf.name}</span>
                </label>
              {/each}
            {/if}
          </div>
          {#if newKeySelectedWorkflowIds.length > 0}
            <p class="ds-caption mt-1 text-mute">{tr('integrations.workflowsSelected', { count: newKeySelectedWorkflowIds.length })}</p>
          {/if}
        {/snippet}
      </FormField>
    {/if}

    <!-- Enabled tools checklist — 2 columns -->
    <FormField label={tr('integrations.apiKeyTools')} helper={tr('integrations.apiKeyToolsHelper')}>
      {#snippet control()}
        <div class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <p class="ds-caption mb-1.5 text-mute">{tr('integrations.toolsRead')}</p>
              <div class="space-y-1 rounded-lg border border-line bg-surface p-2">
                {#each READ_TOOLS as tool}
                  <label class="flex items-center gap-2 rounded px-2 py-1 text-sm text-ink hover:bg-lane/40 cursor-pointer">
                    <Checkbox checked={newKeyEnabledTools.includes(tool)} onclick={() => toggleTool(tool)} />
                    <span>{TOOL_LABELS[tool] ?? tool}</span>
                  </label>
                {/each}
              </div>
            </div>
            <div>
              <p class="ds-caption mb-1.5 text-mute">{tr('integrations.toolsWrite')}</p>
              <div class="space-y-1 rounded-lg border border-line bg-surface p-2">
                {#each WRITE_TOOLS as tool}
                  <label class="flex items-center gap-2 rounded px-2 py-1 text-sm text-ink hover:bg-lane/40 cursor-pointer">
                    <Checkbox checked={newKeyEnabledTools.includes(tool)} onclick={() => toggleTool(tool)} />
                    <span>{TOOL_LABELS[tool] ?? tool}</span>
                  </label>
                {/each}
              </div>
            </div>
          </div>
          <button type="button" class="text-xs text-primary hover:underline" onclick={resetRecommendedTools}>
            {tr('integrations.resetTools')}
          </button>
        </div>
      {/snippet}
    </FormField>

    {#if newKeyError}
      <p class="text-xs text-status-urgent-ink">{newKeyError}</p>
    {/if}
  </form>
  {#snippet footer()}
    <Button variant="secondary" onclick={closeApiKeyModal} disabled={apiKeyCreating}>{tr('common.cancel')}</Button>
    <Button variant="primary" onclick={handleCreateApiKey} loading={apiKeyCreating} disabled={!canManage}>
      {editingApiKeyId ? tr('common.save') : tr('integrations.apiKeyCreate')}
    </Button>
  {/snippet}
</Dialog>

<!-- Created API Key reveal dialog -->
<Dialog open={Boolean(createdKey)} title={tr('integrations.apiKeyCreated')} description={tr('integrations.apiKeyCreatedWarning')} size="md" onclose={closeCreatedKeyDialog}>
  {#if createdKey}
    <div class="space-y-4">
      <div class="flex items-start gap-2 rounded-lg border border-status-done/20 bg-status-done-soft px-3 py-2 text-xs text-status-done-ink">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} strokeWidth={1.8} class="mt-0.5 shrink-0" />
        <span>{tr('integrations.apiKeyCreatedWarning')}</span>
      </div>
      <div class="space-y-1">
        <p class="ds-caption text-mute">{tr('integrations.apiKeyLabel')}</p>
        <p class="ds-label text-ink">{createdKey.label}</p>
      </div>
      <div class="space-y-1">
        <p class="ds-caption text-mute">{tr('integrations.copyApiKey')}</p>
        <div class="flex gap-2">
          <Input value={createdKey.key} readonly aria-label={tr('integrations.apiKeyLabel')} class="font-mono text-xs" />
          <Button variant="secondary" onclick={copyCreatedKey}>
            <HugeiconsIcon icon={Copy01Icon} size={15} strokeWidth={1.8} />
            {createdKeyCopied ? tr('common.copied') : tr('integrations.copyApiKey')}
          </Button>
        </div>
      </div>
      <div class="space-y-1">
        <p class="ds-caption text-mute">{tr('integrations.copyConfig')}</p>
        <Button variant="secondary" onclick={copyCreatedKeyConfig} class="w-full">
          <HugeiconsIcon icon={Copy01Icon} size={15} strokeWidth={1.8} />
          {createdKeyConfigCopied ? tr('integrations.configCopied') : tr('integrations.copyConfig')}
        </Button>
      </div>
    </div>
  {/if}
  {#snippet footer()}
    <Button variant="primary" onclick={closeCreatedKeyDialog}>{tr('common.close')}</Button>
  {/snippet}
</Dialog>

<!-- Revoke API key confirmation -->
<Dialog
  open={Boolean(confirmRevokeKeyId)}
  title={tr('integrations.apiKeyRevoke')}
  description={tr('integrations.apiKeyRevokeConfirm', { label: confirmRevokeLabel })}
  size="sm"
  onclose={closeRevokeConfirm}
>
  {#snippet footer()}
    <Button variant="secondary" onclick={closeRevokeConfirm} disabled={revokingKeyId !== null}>
      {tr('common.cancel')}
    </Button>
    <Button
      variant="destructive"
      onclick={handleRevokeApiKey}
      disabled={revokingKeyId !== null}
    >
      {revokingKeyId !== null ? tr('common.deleting') : tr('integrations.apiKeyRevoke')}
    </Button>
  {/snippet}
</Dialog>
