<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError, type ApiWorkflow, type ApiWorkflowDraft, type ApiWorkspaceMember } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Badge, Button, Input, Skeleton } from '$lib/components/atoms/index.js';
  import { FormField, EmptyStateBlock, Breadcrumb, MultiSelectCombobox, toast, type MultiSelectOption } from '$lib/components/molecules/index.js';
  import { Dialog, ConfirmDialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { Add01Icon, KanbanIcon, AiMagicIcon, Edit02Icon, Delete02Icon, Copy01Icon } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  const EXAMPLE_WORKFLOW_DRAFT: ApiWorkflowDraft = {
    name: 'Wajom Customer Onboarding Example',
    stages: [
      {
        name: 'New',
        color: 'indigo',
        checklists: [
          { label: 'Verifikasi data dan nomor WhatsApp pelanggan', required: true },
          {
            label: 'Kirim pesan verifikasi ke pelanggan',
            required: true,
            action: {
              kind: 'send',
              messageTemplate: 'Halo, apakah benar dengan {{nama}}? Jika benar, balas "benar" agar kami bisa lanjut membantu.',
              delayMinutes: 0,
              followupIfNoReply: false
            }
          }
        ]
      },
      {
        name: 'In Progress',
        color: 'amber',
        onReplyNotify: true,
        overdueReminderHours: 48,
        checklists: [
          { label: 'Tonton video tutorial dasar Wajom', required: true },
          { label: 'Coba langkah setup pertama Wajom', required: true },
          {
            label: 'Follow-up pelanggan setelah tutorial',
            required: true,
            action: {
              kind: 'followup',
              messageTemplate: 'Halo {{nama}}, sudah sempat melihat tutorial Wajom dan mencoba langkah setup pertama? Kami siap membantu jika ada pertanyaan.',
              delayMinutes: 1440,
              followupIfNoReply: true
            }
          }
        ]
      },
      {
        name: 'Completed',
        color: 'emerald',
        checklists: [
          { label: 'Pastikan pelanggan berhasil menggunakan langkah dasar Wajom', required: true },
          {
            label: 'Kirim konfirmasi onboarding selesai',
            required: true,
            action: {
              kind: 'send',
              messageTemplate: 'Halo {{nama}}, onboarding Wajom kamu sudah selesai. Terima kasih sudah mengikuti langkah-langkahnya.',
              delayMinutes: 0,
              followupIfNoReply: false
            }
          }
        ]
      }
    ]
  };

  let loadingData = $state(true);
  let workflows = $state<ApiWorkflow[]>([]);
  let members = $state<ApiWorkspaceMember[]>([]);

  let editingWorkflow = $state<ApiWorkflow | null>(null);
  let editWorkflowOpen = $state(false);
  let editWorkflowName = $state('');
  let editAssigneeIds = $state<string[]>([]);
  let editPrimaryAssigneeId = $state<string | null>(null);
  let savingWorkflow = $state(false);

  let workflowToDelete = $state<ApiWorkflow | null>(null);
  let deletingWorkflow = $state(false);

  const memberOptions = $derived<MultiSelectOption[]>(
    members.map((member) => ({
      value: member.id,
      label: member.name,
      description: member.email,
      avatarUrl: member.avatarUrl ?? undefined,
      role: member.role === 'owner' ? tr('common.owner') : tr('common.member')
    }))
  );

  const canManageWorkflow = (workflow: ApiWorkflow) =>
    data.workspace?.role === 'owner' || workflow.ownerId === data.user?.id;

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

  async function createExampleWorkflow() {
    if (!data.workspace) return;
    chooseOpen = false;
    loading = true;
    error = null;
    try {
      const { workflow } = await api.saveWorkflowDraft(data.workspace.id, EXAMPLE_WORKFLOW_DRAFT);
      await goto(`/dashboard/workflows/${workflow.id}/setup`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('workflows.exampleError'));
      chooseOpen = true;
    } finally {
      loading = false;
    }
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
      error = err instanceof ApiError ? err.message : tr('workflows.createError');
    } finally {
      loading = false;
    }
  }

  function openEditWorkflow(workflow: ApiWorkflow) {
    if (!canManageWorkflow(workflow)) return;
    const assigneeIds =
      workflow.defaultAssigneeIds && workflow.defaultAssigneeIds.length > 0
        ? [...workflow.defaultAssigneeIds]
        : workflow.defaultAssigneeId
          ? [workflow.defaultAssigneeId]
          : [];
    editingWorkflow = workflow;
    editWorkflowName = workflow.name;
    editAssigneeIds = assigneeIds;
    editPrimaryAssigneeId = workflow.defaultAssigneeId ?? assigneeIds[0] ?? null;
    editWorkflowOpen = true;
  }

  async function saveWorkflowEdit() {
    if (!editingWorkflow || !data.workspace?.id || !editWorkflowName.trim()) return;
    const workflowId = editingWorkflow.id;
    savingWorkflow = true;
    try {
      const defaultAssigneeId =
        editPrimaryAssigneeId && editAssigneeIds.includes(editPrimaryAssigneeId)
          ? editPrimaryAssigneeId
          : editAssigneeIds[0] ?? null;
      const response = await api.updateWorkflow(data.workspace.id, workflowId, {
        name: editWorkflowName.trim(),
        defaultAssigneeIds: editAssigneeIds,
        defaultAssigneeId
      });
      workflows = workflows.map((workflow) =>
        workflow.id === workflowId
          ? {
              ...workflow,
              ...response.workflow,
              defaultAssigneeIds: response.workflow.defaultAssigneeIds ?? editAssigneeIds
            }
          : workflow
      );
      editWorkflowOpen = false;
      editingWorkflow = null;
      toast.success(tr('setup.settingsSaved'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.settingsError'));
    } finally {
      savingWorkflow = false;
    }
  }

  function openDeleteWorkflow(workflow: ApiWorkflow) {
    if (!canManageWorkflow(workflow)) return;
    workflowToDelete = workflow;
  }

  async function deleteWorkflowConfirmed() {
    if (!workflowToDelete || !data.workspace?.id) return;
    const workflowId = workflowToDelete.id;
    const workflowName = workflowToDelete.name;
    deletingWorkflow = true;
    try {
      await api.deleteWorkflow(data.workspace.id, workflowId);
      workflows = workflows.filter((workflow) => workflow.id !== workflowId);
      workflowToDelete = null;
      toast.success(tr('workflows.deleted', { name: workflowName }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('workflows.deleteError'));
    } finally {
      deletingWorkflow = false;
    }
  }
</script>

<svelte:head><title>{tr('common.workflows')} — Flowboard</title></svelte:head>

<div class="space-y-8">
  <header class="space-y-3">
    <Breadcrumb
      items={[
        { label: tr('common.dashboard'), href: '/dashboard' },
        { label: tr('common.workflows') }
      ]}
      showHomeIcon
    />
    <div class="flex flex-wrap items-start justify-between gap-4 pt-1">
      <div>
        <h1 class="ds-page-title text-ink">{tr('common.workflows')}</h1>
        <p class="ds-caption mt-1 text-mute">{tr('workflows.description')}</p>
      </div>
      <Button variant="primary" onclick={openChooser}>
        <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
        <span>{tr('workflows.create')}</span>
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
      title={tr('workflows.empty')}
      description={tr('workflows.emptyDescription')}
      actionLabel={tr('workflows.create')}
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
              <span>{tr('workflows.pic')}</span>
              {#if assigned.length > 0}
                <span class="font-medium text-ink truncate max-w-[180px]">
                  {assigned.map(m => m.name).join(', ')}
                </span>
                {#if assigned.length > 1}
                  <Badge tone="queued" variant="soft" class="text-[10px] py-0 px-1.5">
                    {tr('workflows.picCount', { count: assigned.length })}
                  </Badge>
                {/if}
              {:else}
                <span>{workflow.ownerName ?? '—'}</span>
              {/if}
            </div>
          </div>
          <div class="mt-5 flex flex-wrap items-center gap-2 pt-2">
            {#if canManageWorkflow(workflow)}
              <Button variant="secondary" size="sm" onclick={() => openEditWorkflow(workflow)}>
                <HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={1.8} />
                <span>{tr('common.edit')}</span>
              </Button>
              <Button variant="destructive" size="sm" onclick={() => openDeleteWorkflow(workflow)}>
                <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
                <span>{tr('common.delete')}</span>
              </Button>
            {/if}
            <Button href="/dashboard/workflows/{workflow.id}" variant="primary" size="sm">
              <HugeiconsIcon icon={KanbanIcon} size={15} strokeWidth={1.8} />
              <span>{tr('workflows.openBoard')}</span>
            </Button>
            <Button href="/dashboard/workflows/{workflow.id}/setup" variant="secondary" size="sm">
              {tr('workflows.setup')}
            </Button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<Dialog bind:open={chooseOpen} title={tr('workflows.chooseTitle')} description={tr('workflows.chooseDescription')}>
  <div class="grid gap-3 sm:grid-cols-3">
    <button
      type="button"
      onclick={startManual}
      class="rounded-xl border border-hairline bg-card p-4 text-left shadow-card transition-all hover:border-primary-border hover:shadow-card-hover"
    >
      <HugeiconsIcon icon={Edit02Icon} size={22} strokeWidth={1.8} class="text-primary" />
      <p class="mt-3 font-semibold text-ink">{tr('workflows.manual')}</p>
      <p class="ds-caption mt-1 text-mute">{tr('workflows.manualDescription')}</p>
    </button>
    <button
      type="button"
      onclick={startAi}
      class="rounded-xl border border-primary/30 bg-primary-soft/30 p-4 text-left shadow-card transition-all hover:border-primary hover:shadow-card-hover"
    >
      <HugeiconsIcon icon={AiMagicIcon} size={22} strokeWidth={1.8} class="text-primary" />
      <p class="mt-3 font-semibold text-ink">{tr('workflows.aiSetup')}</p>
      <p class="ds-caption mt-1 text-mute">{tr('workflows.aiDescription')}</p>
    </button>
    <button
      type="button"
      onclick={createExampleWorkflow}
      disabled={loading}
      class="rounded-xl border border-status-done/30 bg-status-done-soft/30 p-4 text-left shadow-card transition-all hover:border-status-done hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-50"
    >
      <HugeiconsIcon icon={Copy01Icon} size={22} strokeWidth={1.8} class="text-status-done-ink" />
      <p class="mt-3 font-semibold text-ink">{tr('workflows.example')}</p>
      <p class="ds-caption mt-1 text-mute">{tr('workflows.exampleDescription')}</p>
    </button>
  </div>
</Dialog>

<Dialog bind:open={manualOpen} title={tr('workflows.manualTitle')} description={tr('workflows.manualDescriptionShort')}>
  <div class="space-y-4">
    <FormField label={tr('workflows.name')} required>
      {#snippet control(args)}
        <Input {...args} bind:value={name} placeholder={tr('workflows.namePlaceholder')} />
      {/snippet}
    </FormField>
    {#if error}
      <p class="ds-caption text-status-urgent">{error}</p>
    {/if}
  </div>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (manualOpen = false)}>{tr('common.cancel')}</Button>
      <Button variant="primary" {loading} onclick={createManualWorkflow}>{tr('common.save')}</Button>
    </div>
  {/snippet}
</Dialog>

<Dialog
  bind:open={editWorkflowOpen}
  title={tr('setup.workflowSettings')}
  description={tr('setup.workflowSettingsDescription')}
  size="md"
>
  <form
    onsubmit={(event) => {
      event.preventDefault();
      saveWorkflowEdit();
    }}
    class="space-y-4 py-2"
  >
    <FormField label={tr('setup.workflowName')} required>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={editWorkflowName}
          disabled={savingWorkflow}
          placeholder={tr('setup.workflowNamePlaceholder')}
          class="h-10 text-sm"
        />
      {/snippet}
    </FormField>

    <FormField
      label={tr('setup.assignees')}
      helper={tr('setup.assigneesHelper')}
    >
      {#snippet control()}
        <MultiSelectCombobox
          options={memberOptions}
          bind:values={editAssigneeIds}
          bind:primary={editPrimaryAssigneeId}
          disabled={savingWorkflow}
          showPrimaryBadge
          placeholder={tr('setup.assigneesPlaceholder')}
          emptyText={tr('setup.noMembers')}
        />
      {/snippet}
    </FormField>

    <div class="flex justify-end gap-2 pt-2">
      <Button variant="secondary" type="button" onclick={() => (editWorkflowOpen = false)}>
        {tr('setup.cancel')}
      </Button>
      <Button
        variant="primary"
        type="submit"
        loading={savingWorkflow}
        disabled={!editWorkflowName.trim()}
      >
        {tr('setup.saveSettings')}
      </Button>
    </div>
  </form>
</Dialog>

<ConfirmDialog
  open={workflowToDelete !== null}
  title={tr('workflows.deleteTitle', { name: workflowToDelete?.name ?? '' })}
  description={tr('workflows.deleteDescription')}
  confirmLabel={tr('workflows.deleteConfirm')}
  cancelLabel={tr('common.cancel')}
  destructive
  loading={deletingWorkflow}
  onconfirm={deleteWorkflowConfirmed}
  oncancel={() => (workflowToDelete = null)}
/>
