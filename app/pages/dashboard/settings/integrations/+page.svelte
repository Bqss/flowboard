<script lang="ts">
  import { api, ApiError, type ApiWajomConnection, type ApiWajomJob, type ApiWorkflow } from '$lib/api/client';
  import { dashboardIntlLocale, dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Badge, Button, Checkbox, Input, Skeleton } from '$lib/components/atoms/index.js';
  import { Breadcrumb, FormField, SelectMenu } from '$lib/components/molecules/index.js';
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
    Copy01Icon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../../$types';

  type ToolName =
    | 'get_onboarding_status'
    | 'register_customer'
    | 'complete_onboarding_step'
    | 'move_customer_stage'
    | 'handover_to_staff';

  type ToolOption = { name: ToolName; label: string; description: string };

  const toolNames: ToolName[] = [
    'get_onboarding_status',
    'register_customer',
    'complete_onboarding_step',
    'move_customer_stage',
    'handover_to_staff'
  ];

  let { data }: { data: LayoutData } = $props();
  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  const toolOptions = $derived<ToolOption[]>([
    {
      name: 'get_onboarding_status',
      label: tr('integrations.tool.status'),
      description: tr('integrations.tool.statusDescription')
    },
    {
      name: 'register_customer',
      label: tr('integrations.tool.register'),
      description: tr('integrations.tool.registerDescription')
    },
    {
      name: 'complete_onboarding_step',
      label: tr('integrations.tool.complete'),
      description: tr('integrations.tool.completeDescription')
    },
    {
      name: 'move_customer_stage',
      label: tr('integrations.tool.move'),
      description: tr('integrations.tool.moveDescription')
    },
    {
      name: 'handover_to_staff',
      label: tr('integrations.tool.handover'),
      description: tr('integrations.tool.handoverDescription')
    }
  ]);

  let connections = $state<ApiWajomConnection[]>([]);
  let workflows = $state<ApiWorkflow[]>([]);
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
  let tokenCopied = $state(false);

  $effect(() => {
    if (!testMessage) testMessage = tr('integrations.testMessageDefault');
  });


  let form = $state({
    name: '',
    instanceId: '',
    countryCode: '60',
    defaultWorkflowId: '',
    sendEndpoint: '',
    healthEndpoint: '',
    sendApiKey: '',
    clearSendApiKey: false,
    enabledTools: toolNames
  });

  const canManage = $derived(data.workspace?.role === 'owner');
  const workflowOptions = $derived(
    workflows.map((workflow) => ({ value: workflow.id, label: workflow.name }))
  );

  function resetForm(connection?: ApiWajomConnection) {
    editingId = connection?.id ?? null;
    form = {
      name: connection?.name ?? '',
      instanceId: connection?.instanceId ?? '',
      countryCode: connection?.countryCode ?? '60',
      defaultWorkflowId: connection?.defaultWorkflowId ?? '',
      sendEndpoint: connection?.sendEndpoint ?? '',
      healthEndpoint: connection?.healthEndpoint ?? '',
      sendApiKey: '',
      clearSendApiKey: false,
      enabledTools: (connection?.enabledTools.filter((tool): tool is ToolName =>
        toolOptions.some((option) => option.name === tool)
      ) ?? toolNames) as ToolName[]
    };
    issuedToken = null;
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
      return;
    }

    loading = true;
    errorMessage = null;
    try {
      const [connectionResponse, workflowResponse, jobResponse] = await Promise.all([
        api.listWajomConnections(workspaceId),
        api.listWorkflows(workspaceId),
        api.listWajomJobs(workspaceId)
      ]);
      connections = connectionResponse.connections ?? [];
      workflows = workflowResponse.workflows ?? [];
      jobs = jobResponse.jobs ?? [];
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : tr('integrations.loadError');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (data.workspace?.id) loadData();
  });

  function toggleTool(tool: ToolName) {
    form.enabledTools = form.enabledTools.includes(tool)
      ? form.enabledTools.filter((name) => name !== tool)
      : [...form.enabledTools, tool];
  }

  async function submitForm() {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) return;
    if (!form.defaultWorkflowId) {
      errorMessage = tr('integrations.workflowRequired');
      return;
    }
    saving = true;
    errorMessage = null;
    successMessage = null;
    issuedToken = null;

    try {
      if (editingId) {
        const body: Parameters<typeof api.updateWajomConnection>[2] = {
          name: form.name,
          instanceId: form.instanceId,
          countryCode: form.countryCode,
          defaultWorkflowId: form.defaultWorkflowId,
          sendEndpoint: form.sendEndpoint,
          healthEndpoint: form.healthEndpoint || null,
          enabledTools: form.enabledTools,
          ...(form.sendApiKey ? { sendApiKey: form.sendApiKey } : {}),
          ...(form.clearSendApiKey ? { clearSendApiKey: true } : {})
        };
        await api.updateWajomConnection(workspaceId, editingId, body);
        successMessage = tr('integrations.updated');
      } else {
        const response = await api.createWajomConnection(workspaceId, {
          name: form.name,
          instanceId: form.instanceId,
          countryCode: form.countryCode,
          defaultWorkflowId: form.defaultWorkflowId,
          sendEndpoint: form.sendEndpoint,
          healthEndpoint: form.healthEndpoint || null,
          sendApiKey: form.sendApiKey || null,
          enabledTools: form.enabledTools
        });
        issuedToken = response.connectorToken;
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

  async function revokeConnection(connection: ApiWajomConnection) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId || !confirm(tr('integrations.revokeConfirm', { name: connection.name }))) return;

    actionId = connection.id;
    errorMessage = null;
    try {
      await api.revokeWajomConnection(workspaceId, connection.id);
      successMessage = tr('integrations.revoked');
      await loadData();
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : tr('integrations.revokeError');
    } finally {
      actionId = null;
    }
  }

  async function rotateToken(connection: ApiWajomConnection) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId || !confirm(tr('integrations.rotateConfirm', { name: connection.name }))) return;

    actionId = connection.id;
    issuedToken = null;
    errorMessage = null;
    try {
      const response = await api.rotateWajomConnectorToken(workspaceId, connection.id);
      issuedToken = response.connectorToken;
      successMessage = tr('integrations.rotated');
      await loadData();
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : tr('integrations.rotateError');
    } finally {
      actionId = null;
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
  <title>{tr('integrations.title')} — Flowboard</title>
</svelte:head>

<div class="space-y-8">
  <header class="space-y-3">
    <Breadcrumb
      items={[
        { label: tr('common.dashboard'), href: '/dashboard' },
        { label: tr('settings.title'), href: '/dashboard/settings' },
        { label: tr('integrations.title') }
      ]}
      showHomeIcon
    />
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="ds-page-title text-ink">{tr('integrations.title')}</h1>
        <p class="ds-caption mt-1 max-w-2xl text-mute">{tr('integrations.description')}</p>
      </div>
      {#if canManage}
        <Button variant="primary" onclick={() => resetForm()}>
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
          {tr('integrations.add')}
        </Button>
      {/if}
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
    <section class="rounded-2xl border border-primary/25 bg-primary-soft p-5 shadow-card">
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

  {#if formOpen}
    <section class="rounded-2xl border border-hairline bg-card p-6 shadow-card">
      <div class="mb-6 flex items-start justify-between gap-4">
        <div>
          <p class="ds-label text-primary">{editingId ? tr('integrations.editLabel') : tr('integrations.newLabel')}</p>
          <h2 class="ds-section-title mt-1 text-ink">{editingId ? tr('integrations.editTitle') : tr('integrations.newTitle')}</h2>
          <p class="ds-caption mt-1 text-mute">{tr('integrations.formDescription')}</p>
        </div>
        <Button variant="ghost" size="sm" onclick={closeForm} disabled={saving}>{tr('common.close')}</Button>
      </div>

      <form
        class="space-y-6"
        onsubmit={(event) => {
          event.preventDefault();
          submitForm();
        }}
      >
        <div class="grid gap-4 md:grid-cols-2">
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
          <FormField label={tr('integrations.countryCode')} required helper={tr('integrations.countryHelper')}>
            {#snippet control(args)}
              <Input {...args} bind:value={form.countryCode} inputmode="numeric" placeholder="60" />
            {/snippet}
          </FormField>
          <FormField label={tr('integrations.defaultWorkflow')} required helper={tr('integrations.defaultWorkflowHelper')}>
            {#snippet control(args)}
              <SelectMenu {...args} bind:value={form.defaultWorkflowId} options={workflowOptions} placeholder={tr('integrations.chooseWorkflow')} />
            {/snippet}
          </FormField>
          <FormField label={tr('integrations.sendEndpoint')} required helper={tr('integrations.sendEndpointHelper')}>
            {#snippet control(args)}
              <Input {...args} bind:value={form.sendEndpoint} type="url" placeholder="https://wajom.example/api/send" />
            {/snippet}
          </FormField>
          <FormField label={tr('integrations.healthEndpoint')} helper={tr('integrations.healthEndpointHelper')}>
            {#snippet control(args)}
              <Input {...args} bind:value={form.healthEndpoint} type="url" placeholder="https://wajom.example/health" />
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

        <div class="space-y-3">
          <div>
            <p class="ds-label text-ink">{tr('integrations.allowedTools')}</p>
            <p class="ds-caption mt-1 text-mute">{tr('integrations.allowedToolsDescription')}</p>
          </div>
          <div class="grid gap-2 md:grid-cols-2">
            {#each toolOptions as tool (tool.name)}
              <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-lane/45 p-3 transition-colors hover:border-primary-border">
                <Checkbox checked={form.enabledTools.includes(tool.name)} onchange={() => toggleTool(tool.name)} size="sm" />
                <span class="min-w-0">
                  <span class="block text-sm font-medium text-ink">{tool.label}</span>
                  <span class="ds-caption block text-mute">{tool.description}</span>
                </span>
              </label>
            {/each}
          </div>
        </div>

        {#if errorMessage}
          <p class="text-sm text-status-urgent-ink">{errorMessage}</p>
        {/if}

        <div class="flex flex-wrap justify-end gap-2 border-t border-hairline pt-5">
          <Button variant="secondary" type="button" onclick={closeForm} disabled={saving}>{tr('common.cancel')}</Button>
          <Button variant="primary" type="submit" loading={saving} disabled={!canManage}>
            {editingId ? tr('common.save') : tr('integrations.add')}
          </Button>
        </div>
      </form>
    </section>
  {/if}

  <section class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="ds-label text-ink">{tr('integrations.registered')}</p>
        <p class="ds-caption mt-1 text-mute">{tr('integrations.rotateDescription')}</p>
      </div>
      {#if !loading}
        <span class="ds-caption text-mute">{tr('integrations.connectionCount', { count: connections.length })}</span>
      {/if}
    </div>

    {#if loading}
      <div class="grid gap-4 lg:grid-cols-2">
        {#each [1, 2] as item (item)}
          <div class="space-y-4 rounded-2xl border border-hairline bg-card p-6 shadow-card">
            <Skeleton class="h-5 w-40" />
            <Skeleton class="h-4 w-64" />
            <Skeleton class="h-20 w-full" />
          </div>
        {/each}
      </div>
    {:else if connections.length === 0}
      <div class="rounded-2xl border border-dashed border-hairline bg-card p-10 text-center shadow-card">
        <HugeiconsIcon icon={Link01Icon} size={28} strokeWidth={1.8} class="mx-auto text-primary" />
        <h2 class="ds-section-title mt-3 text-ink">{tr('integrations.none')}</h2>
        <p class="ds-caption mx-auto mt-1 max-w-md text-mute">{tr('integrations.noneDescription')}</p>
        {#if canManage}
          <Button variant="primary" class="mt-5" onclick={() => resetForm()}>
            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
            {tr('integrations.add')}
          </Button>
        {/if}
      </div>
    {:else}
      <div class="grid gap-4 lg:grid-cols-2">
        {#each connections as connection (connection.id)}
          {@const recentJobs = jobs.filter((job) => job.connectionId === connection.id).slice(0, 3)}
          <article class="rounded-2xl border border-hairline bg-card p-6 shadow-card">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="ds-section-title truncate text-ink">{connection.name}</h2>
                  <Badge tone={connection.enabled && !connection.revokedAt ? 'done' : 'urgent'}>
                    {connection.enabled && !connection.revokedAt ? tr('integrations.active') : tr('integrations.revokedStatus')}
                  </Badge>
                </div>
                <p class="ds-caption mt-1 font-mono text-mute">{connection.instanceId}</p>
              </div>
              <HugeiconsIcon icon={Link01Icon} size={21} strokeWidth={1.8} class="shrink-0 text-primary" />
            </div>

            <dl class="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt class="ds-caption text-mute">{tr('integrations.defaultWorkflow')}</dt>
                <dd class="mt-0.5 truncate text-ink">{workflows.find((workflow) => workflow.id === connection.defaultWorkflowId)?.name ?? tr('integrations.notSelected')}</dd>
              </div>
              <div>
                <dt class="ds-caption text-mute">{tr('integrations.sendApiKey')}</dt>
                <dd class="mt-0.5 text-ink">{connection.hasSendApiKey ? tr('integrations.encrypted') : tr('integrations.notUsed')}</dd>
              </div>
              <div>
                <dt class="ds-caption text-mute">{tr('integrations.lastConnectorCall')}</dt>
                <dd class="mt-0.5 text-ink">{formatDate(connection.lastUsedAt)}</dd>
              </div>
              <div>
                <dt class="ds-caption text-mute">{tr('integrations.lastHealthCheck')}</dt>
                <dd class="mt-0.5 text-ink">{formatDate(connection.lastCheckedAt)}</dd>
              </div>
            </dl>

            {#if connection.lastError}
              <div class="mt-4 rounded-lg border border-status-urgent/20 bg-status-urgent-soft px-3 py-2 text-xs text-status-urgent-ink">
                {connection.lastError}
              </div>
            {/if}

            {#if recentJobs.length > 0}
              <div class="mt-4 rounded-xl border border-hairline bg-lane/45 p-3">
                <div class="flex items-center justify-between gap-2">
                  <p class="ds-label text-ink">{tr('integrations.outboundLatest')}</p>
                  <span class="ds-caption text-mute">{tr('integrations.latestCount', { count: recentJobs.length })}</span>
                </div>
                <div class="mt-2 space-y-2">
                  {#each recentJobs as job (job.id)}
                    <div class="flex items-center justify-between gap-3 text-xs">
                      <div class="min-w-0">
                        <p class="truncate font-mono text-mute">{job.toWa}</p>
                        <p class="text-faint">{formatDate(job.updatedAt)} · {tr('integrations.attempt', { count: job.attempts })}</p>
                      </div>
                      <Badge tone={job.status === 'failed' ? 'urgent' : job.status === 'delivered' || job.status === 'read' || job.status === 'sent' ? 'done' : 'queued'}>
                        {job.status}
                      </Badge>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <div class="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-4">
              {#if canManage}
                <Button variant="secondary" size="sm" onclick={() => resetForm(connection)}>
                  {tr('common.edit')}
                </Button>
                <Button variant="secondary" size="sm" loading={actionId === connection.id} onclick={() => testConnection(connection)}>
                  <HugeiconsIcon icon={TestTube01Icon} size={14} strokeWidth={1.8} />
                  {tr('integrations.testHealth')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onclick={() => {
                    testSendId = testSendId === connection.id ? null : connection.id;
                    errorMessage = null;
                  }}
                >
                  {tr('integrations.testSend')}
                </Button>
                {#if testSendId === connection.id}
                  <form
                    class="basis-full space-y-2 rounded-xl border border-hairline bg-lane/45 p-3"
                    onsubmit={(event) => {
                      event.preventDefault();
                      sendTestMessage(connection);
                    }}
                  >
                    <div class="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]">
                      <Input bind:value={testTo} placeholder="60123456789" aria-label={tr('integrations.testNumber')} />
                      <Input bind:value={testMessage} placeholder={tr('integrations.testMessage')} aria-label={tr('integrations.testMessage')} />
                      <Button variant="primary" type="submit" loading={sendingTest}>{tr('integrations.send')}</Button>
                    </div>
                    <p class="ds-caption text-mute">{tr('integrations.testHint')}</p>
                  </form>
                {/if}
                <Button variant="secondary" size="sm" loading={actionId === connection.id} onclick={() => rotateToken(connection)}>
                  <HugeiconsIcon icon={Refresh01Icon} size={14} strokeWidth={1.8} />
                  {tr('integrations.rotateToken')}
                </Button>
                {#if connection.enabled}
                  <Button variant="destructive" size="sm" loading={actionId === connection.id} onclick={() => revokeConnection(connection)}>
                    <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
                    {tr('integrations.revoke')}
                  </Button>
                {/if}
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </section>
</div>
