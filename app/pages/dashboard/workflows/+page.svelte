<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError, type ApiWorkflow, type ApiWorkspaceMember } from '$lib/api/client';
  import { Badge, Button, Input, Skeleton } from '$lib/components/atoms/index.js';
  import { FormField, EmptyStateBlock, Breadcrumb } from '$lib/components/molecules/index.js';
  import { Dialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { Add01Icon, KanbanIcon, AiMagicIcon, Edit02Icon } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../$types';

  let { data }: { data: LayoutData } = $props();

  let loadingData = $state(true);
  let workflows = $state<ApiWorkflow[]>([]);
  let members = $state<ApiWorkspaceMember[]>([]);

  async function loadWorkflows() {
    if (!data.workspace?.id) return;
    loadingData = true;
    try {
      const [wfRes, membersRes] = await Promise.all([
        api.listWorkflows(data.workspace.id),
        api.listWorkspaceMembers(data.workspace.id).catch(() => ({ members: [] }))
      ]);
      workflows = wfRes.workflows ?? [];
      members = membersRes.members ?? [];
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      loadingData = false;
    }
  }

  $effect(() => {
    if (data.workspace?.id) {
      loadWorkflows();
    }
  });

  let chooseOpen = $state(false);
  let manualOpen = $state(false);
  let name = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);

  function openChooser() {
    error = null;
    chooseOpen = true;
  }

  function startManual() {
    chooseOpen = false;
    name = '';
    error = null;
    manualOpen = true;
  }

  function startAi() {
    chooseOpen = false;
    goto('/dashboard/workflows/new-ai');
  }

  async function createManualWorkflow() {
    if (!name.trim() || !data.workspace) return;
    loading = true;
    error = null;
    try {
      const { workflow } = await api.createWorkflow(data.workspace.id, { name: name.trim() });
      manualOpen = false;
      name = '';
      await goto(`/dashboard/workflows/${workflow.id}/setup`);
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Gagal membuat workflow.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Workflows — Flowboard</title></svelte:head>

<div class="space-y-8">
  <header class="space-y-3">
    <Breadcrumb
      items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Workflows' }
      ]}
      showHomeIcon
    />
    <div class="flex flex-wrap items-start justify-between gap-4 pt-1">
      <div>
        <h1 class="ds-page-title text-ink">Workflows</h1>
        <p class="ds-caption mt-1 text-mute">Kelola alur kerja onboarding pelanggan.</p>
      </div>
      <Button variant="primary" onclick={openChooser}>
        <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
        <span>Buat Workflow</span>
      </Button>
    </div>
  </header>

  {#if loadingData}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each [1, 2, 3] as _i}
        <div class="rounded-2xl border border-hairline bg-card p-5 space-y-4 shadow-card">
          <Skeleton shape="rect" class="h-1 w-7 rounded-full" />
          <Skeleton shape="rect" class="h-6 w-36 rounded-md" />
          <Skeleton shape="rect" class="h-4 w-24 rounded-md" />
          <div class="flex gap-2 pt-2">
            <Skeleton shape="rect" class="h-8 flex-1 rounded-full" />
            <Skeleton shape="rect" class="h-8 w-16 rounded-full" />
          </div>
        </div>
      {/each}
    </div>
  {:else if workflows.length === 0}
    <EmptyStateBlock
      title="Belum ada workflow"
      description="Mulai manual atau generate draf dari deskripsi proses dengan AI."
      actionLabel="Buat Workflow"
      onaction={openChooser}
    />
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each workflows as workflow (workflow.id)}
        {@const assigned = (workflow.defaultAssigneeIds ?? [])
          .map((id) => members.find((m) => m.id === id))
          .filter((m): m is ApiWorkspaceMember => Boolean(m))}
        <article class="flex flex-col justify-between rounded-2xl border border-hairline bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-card-hover">
          <div>
            <div class="mb-3 h-1 w-7 rounded-full bg-primary"></div>
            <h2 class="ds-section-title text-ink">{workflow.name}</h2>
            <div class="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-mute">
              <span>PIC:</span>
              {#if assigned.length > 0}
                <span class="font-medium text-ink truncate max-w-[180px]">
                  {assigned.map(m => m.name).join(', ')}
                </span>
                {#if assigned.length > 1}
                  <Badge tone="queued" variant="soft" class="text-[10px] py-0 px-1.5">
                    {assigned.length} PIC
                  </Badge>
                {/if}
              {:else}
                <span>{workflow.ownerName ?? '—'}</span>
              {/if}
            </div>
          </div>
          <div class="mt-5 flex flex-wrap items-center gap-2 pt-2">
            <Button href="/dashboard/workflows/{workflow.id}" variant="primary" size="sm">
              <HugeiconsIcon icon={KanbanIcon} size={15} strokeWidth={1.8} />
              <span>Buka Board</span>
            </Button>
            <Button href="/dashboard/workflows/{workflow.id}/setup" variant="secondary" size="sm">
              Setup
            </Button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<Dialog bind:open={chooseOpen} title="Buat workflow baru" description="Pilih cara setup workflow.">
  <div class="grid gap-3 sm:grid-cols-2">
    <button
      type="button"
      onclick={startManual}
      class="rounded-xl border border-hairline bg-card p-4 text-left shadow-card transition-all hover:border-primary-border hover:shadow-card-hover"
    >
      <HugeiconsIcon icon={Edit02Icon} size={22} strokeWidth={1.8} class="text-primary" />
      <p class="mt-3 font-semibold text-ink">Manual</p>
      <p class="ds-caption mt-1 text-mute">Mulai dari 3 stage default, atur sendiri di editor.</p>
    </button>
    <button
      type="button"
      onclick={startAi}
      class="rounded-xl border border-primary/30 bg-primary-soft/30 p-4 text-left shadow-card transition-all hover:border-primary hover:shadow-card-hover"
    >
      <HugeiconsIcon icon={AiMagicIcon} size={22} strokeWidth={1.8} class="text-primary" />
      <p class="mt-3 font-semibold text-ink">Setup dengan AI</p>
      <p class="ds-caption mt-1 text-mute">Ceritakan proses → draf stage + checklist + WA.</p>
    </button>
  </div>
</Dialog>

<Dialog bind:open={manualOpen} title="Workflow manual" description="Workflow baru dengan 3 stage default.">
  <div class="space-y-4">
    <FormField label="Nama workflow" required>
      {#snippet control(args)}
        <Input {...args} bind:value={name} placeholder="Pendaftaran Webinar" />
      {/snippet}
    </FormField>
    {#if error}
      <p class="ds-caption text-status-urgent">{error}</p>
    {/if}
  </div>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (manualOpen = false)}>Batal</Button>
      <Button variant="primary" {loading} onclick={createManualWorkflow}>Simpan</Button>
    </div>
  {/snippet}
</Dialog>
