<script lang="ts">
  import { api, ApiError, type ApiWajomConnection, type ApiWajomJob, type ApiWorkflow } from '$lib/api/client';
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

  const toolOptions: ToolOption[] = [
    {
      name: 'get_onboarding_status',
      label: 'Baca status onboarding',
      description: 'Stage, checklist, assignee, dan follow-up aktif.'
    },
    {
      name: 'register_customer',
      label: 'Daftarkan customer',
      description: 'Buat customer dan card pada workflow default.'
    },
    {
      name: 'complete_onboarding_step',
      label: 'Selesaikan checklist',
      description: 'Tandai step onboarding selesai atau belum selesai.'
    },
    {
      name: 'move_customer_stage',
      label: 'Pindahkan stage customer',
      description: 'Pindahkan card dengan aturan checklist Flowboard.'
    },
    {
      name: 'handover_to_staff',
      label: 'Handover ke staff',
      description: 'Hentikan follow-up dan buat notifikasi untuk staff.'
    }
  ];

  let { data }: { data: LayoutData } = $props();
  let connections = $state<ApiWajomConnection[]>([]);
  let workflows = $state<ApiWorkflow[]>([]);
  let jobs = $state<ApiWajomJob[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let actionId = $state<string | null>(null);
  let testSendId = $state<string | null>(null);
  let testTo = $state('');
  let testMessage = $state('Ini adalah test message dari Flowboard.');
  let sendingTest = $state(false);
  let editingId = $state<string | null>(null);
  let formOpen = $state(false);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);
  let issuedToken = $state<string | null>(null);
  let tokenCopied = $state(false);

  let form = $state({
    name: '',
    instanceId: '',
    countryCode: '60',
    defaultWorkflowId: '',
    sendEndpoint: '',
    healthEndpoint: '',
    sendApiKey: '',
    clearSendApiKey: false,
    enabledTools: toolOptions.map((tool) => tool.name) as ToolName[]
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
      ) ?? toolOptions.map((tool) => tool.name)) as ToolName[]
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
      errorMessage = error instanceof ApiError ? error.message : 'Gagal memuat konfigurasi integrasi.';
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
      errorMessage = 'Pilih workflow default terlebih dahulu.';
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
        successMessage = 'Koneksi Wajom diperbarui.';
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
        successMessage = 'Koneksi dibuat. Simpan connector token ini sekarang.';
      }
      await loadData();
      if (editingId) formOpen = false;
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : 'Gagal menyimpan koneksi Wajom.';
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
        successMessage = response.result.message ?? 'Health check Wajom berhasil.';
      } else {
        errorMessage = response.result.error ?? 'Wajom belum dapat dihubungi.';
      }
      await loadData();
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : 'Health check Wajom gagal.';
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
      successMessage = `Test message diterima Wajom (${response.result.status}).`;
      testSendId = null;
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : 'Test send Wajom gagal.';
    } finally {
      sendingTest = false;
    }
  }

  async function revokeConnection(connection: ApiWajomConnection) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId || !confirm(`Cabut koneksi ${connection.name}?`)) return;

    actionId = connection.id;
    errorMessage = null;
    try {
      await api.revokeWajomConnection(workspaceId, connection.id);
      successMessage = 'Koneksi Wajom dicabut.';
      await loadData();
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : 'Gagal mencabut koneksi Wajom.';
    } finally {
      actionId = null;
    }
  }

  async function rotateToken(connection: ApiWajomConnection) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId || !confirm(`Rotate connector token untuk ${connection.name}?`)) return;

    actionId = connection.id;
    issuedToken = null;
    errorMessage = null;
    try {
      const response = await api.rotateWajomConnectorToken(workspaceId, connection.id);
      issuedToken = response.connectorToken;
      successMessage = 'Connector token baru dibuat. Token lama tidak berlaku.';
      await loadData();
    } catch (error) {
      errorMessage = error instanceof ApiError ? error.message : 'Gagal rotate connector token.';
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
    if (!value) return 'Belum pernah';
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value)
    );
  }
</script>

<svelte:head>
  <title>Integrasi Wajom — Flowboard</title>
</svelte:head>

<div class="space-y-8">
  <header class="space-y-3">
    <Breadcrumb
      items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Pengaturan Akun', href: '/dashboard/settings' }, { label: 'Integrasi Wajom' }]}
      showHomeIcon
    />
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="ds-page-title text-ink">Integrasi Wajom</h1>
        <p class="ds-caption mt-1 max-w-2xl text-mute">
          Hubungkan Wajom sebagai conversational layer untuk onboarding customer. Flowboard tetap menjadi source of truth workflow, stage, checklist, dan follow-up.
        </p>
      </div>
      {#if canManage}
        <Button variant="primary" onclick={() => resetForm()}>
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
          Tambah koneksi
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
            <h2 class="ds-section-title text-ink">Connector token tampil sekali</h2>
            <p class="ds-caption mt-1 text-mute">Simpan token ini di konfigurasi Wajom. Flowboard hanya menyimpan hash token.</p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <Input value={issuedToken} readonly aria-label="Wajom connector token" class="font-mono text-xs" />
            <Button variant="secondary" onclick={copyToken}>
              <HugeiconsIcon icon={Copy01Icon} size={15} strokeWidth={1.8} />
              {tokenCopied ? 'Tersalin' : 'Salin token'}
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
          <p class="ds-label text-primary">{editingId ? 'EDIT CONNECTION' : 'NEW CONNECTION'}</p>
          <h2 class="ds-section-title mt-1 text-ink">{editingId ? 'Edit koneksi Wajom' : 'Tambah koneksi Wajom'}</h2>
          <p class="ds-caption mt-1 text-mute">Endpoint dan workflow ini dipakai oleh connector serta scheduler Flowboard.</p>
        </div>
        <Button variant="ghost" size="sm" onclick={closeForm} disabled={saving}>Tutup</Button>
      </div>

      <form
        class="space-y-6"
        onsubmit={(event) => {
          event.preventDefault();
          submitForm();
        }}
      >
        <div class="grid gap-4 md:grid-cols-2">
          <FormField label="Nama koneksi" required>
            {#snippet control(args)}
              <Input {...args} bind:value={form.name} placeholder="Wajom production" />
            {/snippet}
          </FormField>
          <FormField label="Instance ID" required helper="ID instance Wajom yang menerima request.">
            {#snippet control(args)}
              <Input {...args} bind:value={form.instanceId} placeholder="wajom-prod-01" />
            {/snippet}
          </FormField>
          <FormField label="Kode negara WhatsApp" required helper="Dipakai untuk normalisasi nomor tanpa kode negara.">
            {#snippet control(args)}
              <Input {...args} bind:value={form.countryCode} inputmode="numeric" placeholder="60" />
            {/snippet}
          </FormField>
          <FormField label="Workflow default" required helper="Tool register_customer membuat card di workflow ini.">
            {#snippet control(args)}
              <SelectMenu {...args} bind:value={form.defaultWorkflowId} options={workflowOptions} placeholder="Pilih workflow" />
            {/snippet}
          </FormField>
          <FormField label="Send endpoint" required helper="Endpoint Wajom untuk mengirim pesan outbound.">
            {#snippet control(args)}
              <Input {...args} bind:value={form.sendEndpoint} type="url" placeholder="https://wajom.example/api/send" />
            {/snippet}
          </FormField>
          <FormField label="Health endpoint" helper="Opsional; dipakai tombol health check.">
            {#snippet control(args)}
              <Input {...args} bind:value={form.healthEndpoint} type="url" placeholder="https://wajom.example/health" />
            {/snippet}
          </FormField>
        </div>

        <FormField
          label="Send API key"
          helper={editingId ? 'Kosongkan jika credential tidak berubah. Credential terenkripsi saat disimpan.' : 'Opsional jika endpoint Wajom tidak membutuhkan API key.'}
        >
          {#snippet control(args)}
            <Input {...args} bind:value={form.sendApiKey} type="password" placeholder={editingId ? 'Tidak diubah' : 'Masukkan API key'} />
          {/snippet}
        </FormField>

        {#if editingId}
          <label class="flex items-center gap-2 text-sm text-ink">
            <Checkbox bind:checked={form.clearSendApiKey} />
            Hapus send API key yang tersimpan
          </label>
        {/if}

        <div class="space-y-3">
          <div>
            <p class="ds-label text-ink">TOOL YANG DIIZINKAN</p>
            <p class="ds-caption mt-1 text-mute">Batasi action yang dapat dipanggil Wajom untuk koneksi ini.</p>
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
          <Button variant="secondary" type="button" onclick={closeForm} disabled={saving}>Batal</Button>
          <Button variant="primary" type="submit" loading={saving} disabled={!canManage}>
            {editingId ? 'Simpan perubahan' : 'Buat koneksi'}
          </Button>
        </div>
      </form>
    </section>
  {/if}

  <section class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="ds-label text-ink">KONEKSI TERDAFTAR</p>
        <p class="ds-caption mt-1 text-mute">Token connector dapat di-rotate kapan saja untuk mencabut token lama.</p>
      </div>
      {#if !loading}<span class="ds-caption text-mute">{connections.length} koneksi</span>{/if}
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
        <h2 class="ds-section-title mt-3 text-ink">Belum ada koneksi Wajom</h2>
        <p class="ds-caption mx-auto mt-1 max-w-md text-mute">Buat koneksi pertama untuk mengaktifkan AI tools dan pengiriman follow-up WhatsApp.</p>
        {#if canManage}
          <Button variant="primary" class="mt-5" onclick={() => resetForm()}>
            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
            Tambah koneksi
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
                    {connection.enabled && !connection.revokedAt ? 'Aktif' : 'Dicabut'}
                  </Badge>
                </div>
                <p class="ds-caption mt-1 font-mono text-mute">{connection.instanceId}</p>
              </div>
              <HugeiconsIcon icon={Link01Icon} size={21} strokeWidth={1.8} class="shrink-0 text-primary" />
            </div>

            <dl class="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt class="ds-caption text-mute">Workflow</dt>
                <dd class="mt-0.5 truncate text-ink">{workflows.find((workflow) => workflow.id === connection.defaultWorkflowId)?.name ?? 'Belum dipilih'}</dd>
              </div>
              <div>
                <dt class="ds-caption text-mute">Credential outbound</dt>
                <dd class="mt-0.5 text-ink">{connection.hasSendApiKey ? 'Tersimpan terenkripsi' : 'Tidak digunakan'}</dd>
              </div>
              <div>
                <dt class="ds-caption text-mute">Last connector call</dt>
                <dd class="mt-0.5 text-ink">{formatDate(connection.lastUsedAt)}</dd>
              </div>
              <div>
                <dt class="ds-caption text-mute">Last health check</dt>
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
                  <p class="ds-label text-ink">OUTBOUND TERBARU</p>
                  <span class="ds-caption text-mute">{recentJobs.length} terakhir</span>
                </div>
                <div class="mt-2 space-y-2">
                  {#each recentJobs as job (job.id)}
                    <div class="flex items-center justify-between gap-3 text-xs">
                      <div class="min-w-0">
                        <p class="truncate font-mono text-mute">{job.toWa}</p>
                        <p class="text-faint">{formatDate(job.updatedAt)} · attempt {job.attempts}</p>
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
                  Edit
                </Button>
                <Button variant="secondary" size="sm" loading={actionId === connection.id} onclick={() => testConnection(connection)}>
                  <HugeiconsIcon icon={TestTube01Icon} size={14} strokeWidth={1.8} />
                  Test health
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onclick={() => {
                    testSendId = testSendId === connection.id ? null : connection.id;
                    errorMessage = null;
                  }}
                >
                  Test send
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
                      <Input bind:value={testTo} placeholder="60123456789" aria-label="Nomor test" />
                      <Input bind:value={testMessage} placeholder="Pesan test" aria-label="Pesan test" />
                      <Button variant="primary" type="submit" loading={sendingTest}>Kirim</Button>
                    </div>
                    <p class="ds-caption text-mute">Tidak membuat card atau mengubah progress checklist.</p>
                  </form>
                {/if}
                <Button variant="secondary" size="sm" loading={actionId === connection.id} onclick={() => rotateToken(connection)}>
                  <HugeiconsIcon icon={Refresh01Icon} size={14} strokeWidth={1.8} />
                  Rotate token
                </Button>
                {#if connection.enabled}
                  <Button variant="destructive" size="sm" loading={actionId === connection.id} onclick={() => revokeConnection(connection)}>
                    <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
                    Cabut
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
