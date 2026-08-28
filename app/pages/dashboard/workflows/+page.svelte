<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError, type ApiWorkflow, type ApiWorkflowDraft, type ApiWorkspaceMember } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Avatar, Badge, Button, Input, Skeleton, Tooltip } from '$lib/components/atoms/index.js';
  import {
    FormField,
    EmptyStateBlock,
    Breadcrumb,
    MultiSelectCombobox,
    toast,
    type MultiSelectOption
  } from '$lib/components/molecules/index.js';
  import { Dialog, ConfirmDialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    KanbanIcon,
    AiMagicIcon,
    Edit02Icon,
    Delete02Icon,
    Copy01Icon,
    Settings01Icon,
    ArrowRight01Icon,
    UserGroupIcon,
    Search01Icon,
    Cancel01Icon,
    WorkflowSquare01Icon
  } from '@hugeicons/core-free-icons';
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
  let workflowSearch = $state('');

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

  const filteredWorkflows = $derived(
    workflowSearch.trim()
      ? workflows.filter((wf) => {
          const query = workflowSearch.trim().toLowerCase();
          const nameMatch = wf.name.toLowerCase().includes(query);
          const ownerMatch = (wf.ownerName ?? '').toLowerCase().includes(query);
          const assigneeMatch = (wf.defaultAssigneeIds ?? []).some((id) => {
            const m = members.find((mem) => mem.id === id);
            return m && m.name.toLowerCase().includes(query);
          });
          return nameMatch || ownerMatch || assigneeMatch;
        })
      : workflows
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


<div class="space-y-5 sm:space-y-6">
  <!-- PAGE HEADER -->
  <header class="space-y-3">
    <Breadcrumb
      items={[
        { label: tr('common.dashboard'), href: '/dashboard' },
        { label: tr('common.workflows') }
      ]}
      showHomeIcon
    />
    <div class="flex flex-wrap items-center justify-between gap-4 pt-1">
      <div>
        <h1 class="ds-page-title text-ink">{tr('common.workflows')}</h1>
        <p class="text-sm font-normal leading-relaxed text-mute mt-1">{tr('workflows.description')}</p>
      </div>
      <Button variant="primary" onclick={openChooser} class="shadow-xs">
        <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />
        <span>{tr('workflows.create')}</span>
      </Button>
    </div>
  </header>

  <!-- TOOLBAR: SEARCH & COUNT -->
  {#if !loadingData && workflows.length > 0}
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
      <div class="relative w-full max-w-sm">
        <HugeiconsIcon
          icon={Search01Icon}
          size={17}
          strokeWidth={1.8}
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          class="h-10 w-full rounded-xl bg-card pl-9 pr-8 text-base text-ink placeholder:text-mute/70 ring-1 ring-hairline/30 transition-all focus:ring-2 focus:ring-[var(--focus)] focus:outline-none"
          bind:value={workflowSearch}
          placeholder={tr('common.search') + '…'}
        />
        {#if workflowSearch}
          <button
            type="button"
            onclick={() => (workflowSearch = '')}
            class="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-4 items-center justify-center rounded-full text-mute transition-colors hover:bg-lane hover:text-ink"
            aria-label="Clear search"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
          </button>
        {/if}
      </div>

      <div class="text-[13px] text-mute font-medium">
        <span>{filteredWorkflows.length} {filteredWorkflows.length === 1 ? 'workflow' : 'workflows'}</span>
      </div>
    </div>
  {/if}

  <!-- CONTENT GRID -->
  {#if loadingData}
    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {#each [1, 2, 3] as _i}
        <div class="flex flex-col justify-between rounded-2xl border border-hairline bg-card p-5 space-y-5 shadow-card">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <Skeleton shape="rect" class="size-10 rounded-xl" />
              <Skeleton shape="rect" class="size-6 rounded-lg" />
            </div>
            <Skeleton shape="rect" class="h-5 w-40 rounded-md" />
            <Skeleton shape="rect" class="h-4 w-28 rounded-md" />
          </div>
          <div class="border-t border-hairline pt-3 flex justify-between items-center">
            <Skeleton shape="rect" class="h-8 w-20 rounded-lg" />
            <Skeleton shape="rect" class="h-8 w-28 rounded-lg" />
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
  {:else if filteredWorkflows.length === 0}
    <div class="rounded-2xl border border-hairline bg-card p-10 text-center space-y-3 shadow-card">
      <HugeiconsIcon icon={Search01Icon} size={32} strokeWidth={1.5} class="mx-auto text-faint" />
      <p class="ds-section-title text-ink">{tr('common.noResults')}</p>
      <p class="text-sm font-normal leading-relaxed text-mute">Tidak ada workflow yang cocok dengan kata kunci "{workflowSearch}".</p>
      <Button variant="secondary" size="sm" onclick={() => (workflowSearch = '')}>
        {tr('common.clearSearch')}
      </Button>
    </div>
  {:else}
    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {#each filteredWorkflows as workflow (workflow.id)}
        {@const assigned = (workflow.defaultAssigneeIds ?? [])
          .map((id) => members.find((m) => m.id === id))
          .filter((m): m is ApiWorkspaceMember => Boolean(m))}
        {@const canManage = canManageWorkflow(workflow)}

        <article class="group relative flex flex-col justify-between rounded-2xl border border-hairline bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card-hover">
          <!-- TOP SECTION -->
          <div class="space-y-3.5">
            <div class="flex items-start justify-between gap-3">
              <!-- ICON BADGE & TITLE -->
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary font-bold shadow-xs transition-colors group-hover:bg-primary group-hover:text-white">
                  <HugeiconsIcon icon={WorkflowSquare01Icon} size={20} strokeWidth={1.8} />
                </div>
                <div class="min-w-0 flex-1">
                  <a
                    href="/dashboard/workflows/{workflow.id}"
                    class="block truncate text-base font-bold text-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline"
                    title={workflow.name}
                  >
                    {workflow.name}
                  </a>
                  {#if workflow.createdAt}
                    <span class="block text-[11px] text-faint">
                      {new Date(workflow.createdAt).toLocaleDateString($locale === 'ms' ? 'ms-MY' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  {/if}
                </div>
              </div>

              <!-- DIRECT MANAGEMENT ICON ACTIONS (EDIT & DELETE) -->
              {#if canManage}
                <div class="flex items-center gap-1 shrink-0">
                  <Tooltip text={tr('common.edit')} side="top">
                    <button
                      type="button"
                      onclick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openEditWorkflow(workflow);
                      }}
                      class="flex size-8 items-center justify-center rounded-lg text-mute transition-colors hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                      aria-label={tr('common.edit')}
                    >
                      <HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={1.8} />
                    </button>
                  </Tooltip>

                  <Tooltip text={tr('common.delete')} side="top">
                    <button
                      type="button"
                      onclick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDeleteWorkflow(workflow);
                      }}
                      class="flex size-8 items-center justify-center rounded-lg text-mute transition-colors hover:bg-status-urgent/10 hover:text-status-urgent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                      aria-label={tr('common.delete')}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
                    </button>
                  </Tooltip>
                </div>
              {/if}
            </div>

            <!-- ASSIGNEES / PIC INFO -->
            <div class="rounded-xl bg-canvas-sunken/60 p-2.5 flex items-center justify-between gap-2 border border-hairline/60">
              <div class="flex items-center gap-2 min-w-0">
                {#if assigned.length > 0}
                  <div class="flex items-center -space-x-2 shrink-0">
                    {#each assigned.slice(0, 3) as member (member.id)}
                      <Tooltip text={member.name} side="top">
                        <div class="ring-2 ring-card rounded-full overflow-hidden">
                          <Avatar name={member.name} src={member.avatarUrl ?? undefined} size={24} />
                        </div>
                      </Tooltip>
                    {/each}
                    {#if assigned.length > 3}
                      <div class="flex size-6 items-center justify-center rounded-full bg-lane ring-2 ring-card text-[10px] font-bold text-ink">
                        +{assigned.length - 3}
                      </div>
                    {/if}
                  </div>
                  <span class="truncate font-medium text-ink text-xs">
                    {assigned.map(m => m.name).slice(0, 2).join(', ')}{assigned.length > 2 ? ` (+${assigned.length - 2})` : ''}
                  </span>
                {:else}
                  <div class="flex items-center gap-1.5 text-mute text-xs">
                    <HugeiconsIcon icon={UserGroupIcon} size={14} strokeWidth={1.8} class="text-faint" />
                    <span>{workflow.ownerName ?? tr('common.unassigned')}</span>
                  </div>
                {/if}
              </div>

              {#if assigned.length > 0}
                <Badge tone="queued" variant="soft" class="text-[10px] font-semibold py-0.5 px-2 shrink-0">
                  {tr('workflows.picCount', { count: assigned.length })}
                </Badge>
              {/if}
            </div>
          </div>

          <!-- FOOTER ACTIONS -->
          <div class="mt-5 flex items-center justify-between border-t border-hairline pt-3.5">
            <Button
              href="/dashboard/workflows/{workflow.id}/setup"
              variant="secondary"
              size="sm"
              class="gap-1.5 text-xs text-mute hover:text-ink"
            >
              <HugeiconsIcon icon={Settings01Icon} size={14} strokeWidth={1.8} />
              <span>{tr('workflows.setup')}</span>
            </Button>

            <Button
              href="/dashboard/workflows/{workflow.id}"
              variant="primary"
              size="sm"
              class="gap-1.5 shadow-xs"
            >
              <HugeiconsIcon icon={KanbanIcon} size={14} strokeWidth={1.8} />
              <span>{tr('workflows.openBoard')}</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2.2} class="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<!-- WORKFLOW CREATION MODALS -->
<Dialog bind:open={chooseOpen} title={tr('workflows.chooseTitle')} description={tr('workflows.chooseDescription')} size="xl">
  <div class="grid gap-3 sm:grid-cols-3 pt-1">
    <button
      type="button"
      onclick={startManual}
      class="group flex flex-col rounded-2xl bg-card p-5 text-left ring-1 ring-hairline/30 transition-all hover:ring-primary/40 hover:shadow-card-hover"
    >
      <div class="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        <HugeiconsIcon icon={Edit02Icon} size={20} strokeWidth={1.8} />
      </div>
      <p class="mt-3.5 text-base font-semibold text-ink">{tr('workflows.manual')}</p>
      <p class="text-[13px] text-mute mt-1 leading-relaxed">{tr('workflows.manualDescription')}</p>
    </button>
    <button
      type="button"
      onclick={startAi}
      class="group flex flex-col rounded-2xl bg-primary-soft/20 p-5 text-left ring-1 ring-primary/30 transition-all hover:ring-primary hover:shadow-card-hover"
    >
      <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
        <HugeiconsIcon icon={AiMagicIcon} size={20} strokeWidth={1.8} />
      </div>
      <p class="mt-3.5 text-base font-semibold text-ink">{tr('workflows.aiSetup')}</p>
      <p class="text-[13px] text-mute mt-1 leading-relaxed">{tr('workflows.aiDescription')}</p>
    </button>
    <button
      type="button"
      onclick={createExampleWorkflow}
      disabled={loading}
      class="group flex flex-col rounded-2xl bg-status-done-soft/20 p-5 text-left ring-1 ring-status-done/30 transition-all hover:ring-status-done hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div class="flex size-10 items-center justify-center rounded-xl bg-status-done-soft text-status-done-strong transition-colors group-hover:bg-status-done group-hover:text-white">
        <HugeiconsIcon icon={Copy01Icon} size={20} strokeWidth={1.8} />
      </div>
      <p class="mt-3.5 text-base font-semibold text-ink">{tr('workflows.example')}</p>
      <p class="text-[13px] text-mute mt-1 leading-relaxed">{tr('workflows.exampleDescription')}</p>
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
      <p class="text-sm font-normal leading-relaxed text-status-urgent">{error}</p>
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
