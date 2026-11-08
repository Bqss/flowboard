<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError, type ApiWorkflow, type ApiWorkflowDraft, type ApiWorkspaceMember, type ApiWorkspaceMemberGroup } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Avatar, Badge, Button, IconButton, Input, Skeleton, Tooltip } from '$lib/components/atoms/index.js';
  import {
    FormField,
    EmptyStateBlock,
    Breadcrumb,
    MultiSelectCombobox,
    SelectMenu,
    toast,
    TagInput,
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
    ArrowRight01Icon,
    GridViewIcon,
    ListViewIcon,
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
  let workflowLabelFilter = $state('');
  let viewMode = $state<'grid' | 'list'>('list');

  $effect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flowboard:workflows:view-mode');
      if (saved === 'grid' || saved === 'list') {
        viewMode = saved;
      }
    }
  });

  function setViewMode(mode: 'grid' | 'list') {
    viewMode = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('flowboard:workflows:view-mode', mode);
    }
  }

  let editingWorkflow = $state<ApiWorkflow | null>(null);
  let editWorkflowOpen = $state(false);
  let editWorkflowName = $state('');
  let editWorkflowLabels = $state<string[]>([]);
  let editAssigneeIds = $state<string[]>([]);
  let editPrimaryAssigneeId = $state<string | null>(null);
  let savingWorkflow = $state(false);
  let groups = $state<ApiWorkspaceMemberGroup[]>([]);
  let manualGroupId = $state<string>('');
  let manualGroupIds = $state<string[]>([]);
  let manualAllowedUserIds = $state<string[]>([]);
  let editWorkflowGroupId = $state<string>('');
  let editWorkflowGroupIds = $state<string[]>([]);
  let editWorkflowAllowedUserIds = $state<string[]>([]);

  let workflowToDelete = $state<ApiWorkflow | null>(null);
  let deletingWorkflow = $state(false);

  const groupOptions = $derived([
    { value: '', label: 'Semua Pegawai (Publik Bisnis)' },
    ...groups.map((g) => ({ value: g.id, label: `Departemen: ${g.name}` }))
  ]);
  const memberOptions = $derived<MultiSelectOption[]>(
    members.map((member) => ({
      value: member.id,
      label: member.name,
      description: member.email,
      avatarUrl: member.avatarUrl ?? undefined,
      role: member.role === 'owner' ? tr('common.owner') : tr('common.member')
    }))
  );
  const groupMultiOptions = $derived<MultiSelectOption[]>(
    groups.map((g) => ({
      value: g.id,
      label: g.name,
      description: `${g.members?.length ?? 0} ahli`
    }))
  );

  const accessibleWorkflows = $derived(
    workflows.filter((wf) => {
      if (data.workspace?.role === 'owner' || wf.ownerId === data.user?.id) {
        return true;
      }
      const groupIds = (wf.workspaceMemberGroupIds && wf.workspaceMemberGroupIds.length > 0)
        ? wf.workspaceMemberGroupIds
        : (wf.workspaceMemberGroupId ? [wf.workspaceMemberGroupId] : []);
      const allowedUsers = wf.allowedUserIds ?? [];

      if (groupIds.length === 0 && allowedUsers.length === 0) return true;
      if (allowedUsers.includes(data.user?.id ?? '')) return true;
      return groups.some((g) => groupIds.includes(g.id));
    })
  );

  function workflowLabelsFor(workflow: ApiWorkflow): string[] {
    if (!workflow.label || workflow.labels?.includes(workflow.label)) {
      return workflow.labels ?? [];
    }
    return [...(workflow.labels ?? []), workflow.label];
  }

  const workflowLabelOptions = $derived([
    { value: '', label: tr('common.allLabels') },
    ...[...new Set(accessibleWorkflows.flatMap(workflowLabelsFor))]
      .sort((a, b) => a.localeCompare(b, $locale))
      .map((label) => ({ value: label, label }))
  ]);

  $effect(() => {
    if (workflowLabelFilter && !workflowLabelOptions.some((option) => option.value === workflowLabelFilter)) {
      workflowLabelFilter = '';
    }
  });

  const normalizedWorkflowSearch = $derived(workflowSearch.trim().toLowerCase());

  const filteredWorkflows = $derived(
    normalizedWorkflowSearch || workflowLabelFilter
      ? accessibleWorkflows.filter((wf) => {
          const query = normalizedWorkflowSearch;
          const nameMatch = wf.name.toLowerCase().includes(query);
          const ownerMatch = (wf.ownerName ?? '').toLowerCase().includes(query);
          const assigneeMatch = (wf.defaultAssigneeIds ?? []).some((id) => {
            const m = members.find((mem) => mem.id === id);
            return m && m.name.toLowerCase().includes(query);
          });
          const labelMatch = workflowLabelsFor(wf).some((label) => label.toLowerCase().includes(query));
          const matchesSearch = !query || nameMatch || ownerMatch || assigneeMatch || labelMatch;
          const matchesLabel =
            !workflowLabelFilter || workflowLabelsFor(wf).includes(workflowLabelFilter);
          return matchesSearch && matchesLabel;
        })
      : accessibleWorkflows
  );
  const canManageWorkflow = (workflow: ApiWorkflow) =>
    data.workspace?.role === 'owner' || workflow.ownerId === data.user?.id;

  async function loadWorkflows() {
    if (!data.workspace?.id) return;
    loadingData = true;
    try {
      const [wfRes, membersRes, groupsRes] = await Promise.all([
        api.listWorkflows(data.workspace.id),
        api.listWorkspaceMembers(data.workspace.id).catch(() => ({ members: [] })),
        api.listWorkspaceMemberGroups(data.workspace.id).catch(() => ({ groups: [] }))
      ]);
      workflows = wfRes.workflows ?? [];
      members = membersRes.members ?? [];
      groups = groupsRes.groups ?? [];
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      loadingData = false;
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('onboarding-page-ready'));
      });
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
  let manualLabels = $state<string[]>([]);
  let manualUrgency = $state<'high' | 'medium' | 'low'>('medium');
  let manualAssigneeIds = $state<string[]>([]);
  let manualDeadlineValue = $state<string | number>('');
  let manualDeadlineUnit = $state<'hours' | 'days'>('days');
  let manualRepeatRule = $state<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  let manualClosureBy = $state<'initiator' | 'assignee'>('initiator');
  let loading = $state(false);
  let error = $state<string | null>(null);

  function openChooser() {
    error = null;
    chooseOpen = true;
  }
  function startManual() {
    chooseOpen = false;
    name = '';
    manualLabels = [];
    manualUrgency = 'medium';
    manualAssigneeIds = [];
    manualGroupId = '';
    manualDeadlineValue = '';
    manualDeadlineUnit = 'days';
    manualRepeatRule = 'none';
    manualClosureBy = 'initiator';
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
      const rawDeadline = String(manualDeadlineValue ?? '').trim();
      const deadlineVal = rawDeadline ? Number(rawDeadline) : null;
      const { workflow } = await api.createWorkflow(data.workspace.id, {
        name: name.trim(),
        workspaceMemberGroupIds: manualGroupIds,
        allowedUserIds: manualAllowedUserIds,
        labels: manualLabels,
        defaultAssigneeIds: manualAssigneeIds,
        urgency: manualUrgency,
        deadlineValue: deadlineVal && deadlineVal > 0 ? deadlineVal : null,
        deadlineUnit: manualDeadlineUnit,
        repeatRule: manualRepeatRule,
        closureBy: manualClosureBy
      });
      window.dispatchEvent(new CustomEvent('onboarding-challenge', { detail: 'create_workflow' }));
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
    editWorkflowLabels = (workflow.labels && workflow.labels.length > 0)
      ? [...workflow.labels]
      : (workflow.label ? [workflow.label] : []);
    editPrimaryAssigneeId = workflow.defaultAssigneeId ?? assigneeIds[0] ?? null;
    const initialGroupIds = (workflow.workspaceMemberGroupIds && workflow.workspaceMemberGroupIds.length > 0)
      ? [...workflow.workspaceMemberGroupIds]
      : (workflow.workspaceMemberGroupId ? [workflow.workspaceMemberGroupId] : []);
    editWorkflowGroupIds = initialGroupIds;
    editWorkflowAllowedUserIds = workflow.allowedUserIds ? [...workflow.allowedUserIds] : [];
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
        workspaceMemberGroupIds: editWorkflowGroupIds,
        allowedUserIds: editWorkflowAllowedUserIds,
        labels: editWorkflowLabels,
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
{#snippet workflowAccessBadge(wf: ApiWorkflow)}
  {@const groupIds = (wf.workspaceMemberGroupIds && wf.workspaceMemberGroupIds.length > 0)
    ? wf.workspaceMemberGroupIds
    : (wf.workspaceMemberGroupId ? [wf.workspaceMemberGroupId] : [])}
  {@const allowedUsers = wf.allowedUserIds ?? []}
  {#if groupIds.length === 0 && allowedUsers.length === 0}
    <Badge tone="idle" variant="soft" class="px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold">Publik</Badge>
  {:else}
    <div class="flex flex-wrap items-center gap-1">
      {#if groupIds.length === 1}
        {@const matchedGroup = groups.find((g) => g.id === groupIds[0])}
        <Badge tone="queued" variant="soft" class="gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold">
          <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
          <span>{matchedGroup?.name ?? '1 Departemen'}</span>
        </Badge>
      {:else if groupIds.length > 1}
        <Badge tone="queued" variant="soft" class="gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold">
          <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
          <span>{groupIds.length} Departemen</span>
        </Badge>
      {/if}
      {#if allowedUsers.length === 1}
        {@const matchedMember = members.find((m) => m.id === allowedUsers[0])}
        <Badge tone="progress" variant="soft" class="gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold">
          <span>{matchedMember?.name ?? '1 Pengguna'}</span>
        </Badge>
      {:else if allowedUsers.length > 1}
        <Badge tone="progress" variant="soft" class="gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold">
          <span>{allowedUsers.length} Pengguna</span>
        </Badge>
      {/if}
    </div>
  {/if}
{/snippet}

<svelte:head><title>{tr('common.workflows')} — actjom</title></svelte:head>


<div class="space-y-5 sm:space-y-6">
  <!-- PAGE HEADER -->
  <header class="space-y-2.5 sm:space-y-3">
    <div class="hidden sm:block">
      <Breadcrumb
        items={[
          { label: tr('common.dashboard'), href: '/dashboard' },
          { label: tr('common.workflows') }
        ]}
        showHomeIcon
      />
    </div>
    <div class="flex items-center justify-between gap-3 pt-0.5 sm:pt-1">
      <div class="min-w-0">
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-ink">{tr('common.workflows')}</h1>
        <p class="text-xs sm:text-sm font-normal leading-relaxed text-mute mt-0.5 sm:mt-1 truncate sm:whitespace-normal">{tr('workflows.description')}</p>
      </div>
      <Button variant="primary" size="sm" onclick={openChooser} class="hidden sm:inline-flex sm:h-10 sm:px-4 sm:text-sm shrink-0 shadow-xs" data-onboarding="create-workflow">
        <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />
        <span>{tr('workflows.create')}</span>
      </Button>
    </div>
  </header>

  <!-- TOOLBAR: SEARCH & COUNT -->
  {#if !loadingData && accessibleWorkflows.length > 0}
    <div class="flex flex-col gap-2.5 pb-2 sm:flex-row sm:items-center sm:justify-between sm:pb-4">
      <div class="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
        <div class="relative w-full sm:max-w-sm" data-onboarding="workflow-search">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            strokeWidth={1.8}
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            class="h-9 sm:h-10 w-full rounded-xl bg-card pl-9 pr-8 text-sm sm:text-base text-ink placeholder:text-mute/70 ring-1 ring-hairline/30 transition-all focus:ring-2 focus:ring-[var(--focus)] focus:outline-none"
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
        <SelectMenu
          bind:value={workflowLabelFilter}
          options={workflowLabelOptions}
          variant="filter"
          disabled={workflowLabelOptions.length <= 1}
          class="w-full sm:w-48"
        />
      </div>

      <div class="flex items-center justify-between sm:justify-end gap-3 text-xs sm:text-[13px] text-mute font-medium px-0.5 sm:px-0">
        <span>{filteredWorkflows.length} {filteredWorkflows.length === 1 ? 'workflow' : 'workflows'}</span>
        <div
          class="inline-flex items-center gap-0.5 rounded-xl border border-hairline/60 bg-lane p-1"
          role="radiogroup"
          aria-label={tr('common.viewMode')}
        >
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === 'grid'}
            aria-label={tr('common.viewGrid')}
            title={tr('common.viewGrid')}
            onclick={() => setViewMode('grid')}
            class="flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] {viewMode === 'grid' ? 'bg-card text-ink shadow-xs' : 'text-mute hover:text-ink'}"
          >
            <HugeiconsIcon icon={GridViewIcon} size={16} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === 'list'}
            aria-label={tr('common.viewList')}
            title={tr('common.viewList')}
            onclick={() => setViewMode('list')}
            class="flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] {viewMode === 'list' ? 'bg-card text-ink shadow-xs' : 'text-mute hover:text-ink'}"
          >
            <HugeiconsIcon icon={ListViewIcon} size={16} strokeWidth={1.8} />
          </button>
        </div>
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
  {:else if accessibleWorkflows.length === 0}
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
      <p class="text-sm font-normal leading-relaxed text-mute">
        {workflowLabelFilter ? tr('common.noFilterResults') : `Tidak ada workflow yang cocok dengan kata kunci "${workflowSearch}".`}
      </p>
      <Button variant="secondary" size="sm" onclick={() => { workflowSearch = ''; workflowLabelFilter = ''; }}>
        {tr('common.clearFilters')}
      </Button>
    </div>
  {:else}
    <div data-onboarding="workflows-grid">
      {#if viewMode === 'grid'}
        <div class="grid gap-3.5 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {#each filteredWorkflows as workflow, i (workflow.id)}
            {@const assigned = (workflow.defaultAssigneeIds ?? [])
              .map((id) => members.find((m) => m.id === id))
              .filter((m): m is ApiWorkspaceMember => Boolean(m))}
            {@const canManage = canManageWorkflow(workflow)}

            <article class="group relative flex flex-col justify-between rounded-2xl border border-hairline bg-card p-4 sm:p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card-hover min-w-0 overflow-hidden" {...i === 0 ? { 'data-onboarding': 'workflow-card' } : {}}>
              <!-- TOP SECTION -->
              <div class="space-y-3 sm:space-y-3.5">
                <div class="flex items-start justify-between gap-3">
                  <!-- ICON BADGE & TITLE -->
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary font-bold shadow-xs transition-colors group-hover:bg-primary group-hover:text-white">
                      <HugeiconsIcon icon={WorkflowSquare01Icon} size={19} strokeWidth={1.8} />
                    </div>
                    <div class="min-w-0 flex-1">
                      <a
                        href="/dashboard/workflows/{workflow.id}"
                        class="block truncate text-sm sm:text-base font-bold text-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline"
                        title={workflow.name}
                      >
                        {workflow.name}
                      </a>
                      {#if (workflow.labels && workflow.labels.length > 0) || workflow.label}
                        {@const wfLabels = workflow.labels && workflow.labels.length > 0 ? workflow.labels : (workflow.label ? [workflow.label] : [])}
                        <div class="flex flex-wrap gap-1 mt-1">
                          {#each wfLabels as tag (tag)}
                            <Badge tone="info" variant="soft" class="px-1.5 py-0.2 text-[10px] font-semibold">
                              {tag}
                            </Badge>
                          {/each}
                        </div>
                      {/if}
                      {#if workflow.createdAt}
                        <span class="block text-[11px] text-faint">
                          {new Date(workflow.createdAt).toLocaleDateString($locale === 'ms' ? 'ms-MY' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      {/if}
                    </div>
                  </div>

                  <!-- DIRECT MANAGEMENT ICON ACTIONS (DELETE) -->
                  {#if canManage}
                    <div class="flex items-center gap-1 shrink-0" {...i === 0 ? { 'data-onboarding': 'workflow-edit' } : {}}>
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
                <div class="rounded-xl bg-canvas-sunken/60 p-2.5 flex items-center justify-between gap-2 border border-hairline/60 min-w-0">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
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

                <div class="flex items-center gap-1.5 pt-0.5">
                  {@render workflowAccessBadge(workflow)}
                </div>
              </div>

              <!-- FOOTER ACTIONS -->
              <div class="mt-4 sm:mt-5 flex items-center justify-between gap-2 border-t border-hairline pt-3 sm:pt-3.5 min-w-0">
                <Button
                  href="/dashboard/workflows/{workflow.id}/settings"
                  variant="secondary"
                  size="sm"
                  class="flex-1 min-w-0 justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 text-xs text-mute hover:text-ink truncate"
                  {...i === 0 ? { 'data-onboarding': 'workflow-setup-btn' } : {}}
                >
                  <HugeiconsIcon icon={Edit02Icon} size={14} strokeWidth={1.8} class="shrink-0" />
                  <span class="truncate">{tr('workflows.setup')}</span>
                </Button>

                <Button
                  href="/dashboard/workflows/{workflow.id}"
                  variant="primary"
                  size="sm"
                  class="flex-1 min-w-0 justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 shadow-xs text-xs sm:text-sm"
                  {...i === 0 ? { 'data-onboarding': 'workflow-open-btn' } : {}}
                >
                  <HugeiconsIcon icon={KanbanIcon} size={14} strokeWidth={1.8} class="shrink-0" />
                  <span class="truncate">{tr('workflows.openBoard')}</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2.2} class="shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </article>
          {/each}
        </div>
      {:else}
        <!-- LIST / TABLE VIEW -->
        <div class="overflow-hidden rounded-2xl border border-hairline bg-card shadow-card">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-hairline bg-canvas-sunken text-xs font-semibold text-mute">
                <tr>
                  <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('common.workflow')}</th>
                  <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('taskboard.viewer')}</th>
                  <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('common.pic')}</th>
                  <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5 text-right">{tr('common.actions')}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-hairline">
                {#each filteredWorkflows as workflow, i (workflow.id)}
                  {@const assigned = (workflow.defaultAssigneeIds ?? [])
                    .map((id) => members.find((m) => m.id === id))
                    .filter((m): m is ApiWorkspaceMember => Boolean(m))}
                  {@const canManage = canManageWorkflow(workflow)}
                  {@const matchedGroup = workflow.workspaceMemberGroupId ? groups.find((g) => g.id === workflow.workspaceMemberGroupId) : null}
                  <tr
                    class="group hover:bg-lane/40 transition-colors"
                    {...i === 0 ? { 'data-onboarding': 'workflow-card' } : {}}
                  >
                    <!-- Workflow Icon + Name + Created Date -->
                    <td class="px-4 py-3.5 sm:px-6">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary font-bold shadow-xs transition-colors group-hover:bg-primary group-hover:text-white">
                          <HugeiconsIcon icon={WorkflowSquare01Icon} size={18} strokeWidth={1.8} />
                        </div>
                        <div class="min-w-0">
                          <a
                            href="/dashboard/workflows/{workflow.id}"
                            class="font-bold text-ink hover:text-primary transition-colors truncate block focus-visible:outline-none focus-visible:underline"
                            title={workflow.name}
                          >
                            {workflow.name}
                          </a>
                          {#if (workflow.labels && workflow.labels.length > 0) || workflow.label}
                            {@const wfLabels = workflow.labels && workflow.labels.length > 0 ? workflow.labels : (workflow.label ? [workflow.label] : [])}
                            <div class="flex flex-wrap gap-1 mt-1">
                              {#each wfLabels as tag (tag)}
                                <Badge tone="info" variant="soft" class="px-1.5 py-0.2 text-[10px] font-semibold">
                                  {tag}
                                </Badge>
                              {/each}
                            </div>
                          {/if}
                          {#if workflow.createdAt}
                            <p class="text-[11px] text-faint">
                              {new Date(workflow.createdAt).toLocaleDateString($locale === 'ms' ? 'ms-MY' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          {/if}
                        </div>
                      </div>
                    </td>

                    <!-- Access / Group -->
                    <td class="px-4 py-3.5 sm:px-6 whitespace-nowrap">
                      {@render workflowAccessBadge(workflow)}
                    </td>

                    <!-- PIC / Assignees -->
                    <td class="px-4 py-3.5 sm:px-6 whitespace-nowrap">
                      {#if assigned.length > 0}
                        <div class="flex items-center gap-2">
                          <div class="flex items-center -space-x-1.5 shrink-0">
                            {#each assigned.slice(0, 3) as member (member.id)}
                              <Tooltip text={member.name} side="top">
                                <div class="ring-2 ring-card rounded-full overflow-hidden">
                                  <Avatar name={member.name} src={member.avatarUrl ?? undefined} size={22} />
                                </div>
                              </Tooltip>
                            {/each}
                            {#if assigned.length > 3}
                              <div class="flex size-5 items-center justify-center rounded-full bg-lane ring-2 ring-card text-[9px] font-bold text-ink">
                                +{assigned.length - 3}
                              </div>
                            {/if}
                          </div>
                          <span class="truncate text-xs font-medium text-ink max-w-[160px]">
                            {assigned.map((m) => m.name).slice(0, 2).join(', ')}{assigned.length > 2 ? ` (+${assigned.length - 2})` : ''}
                          </span>
                        </div>
                      {:else}
                        <span class="text-xs text-mute font-medium">
                          {workflow.ownerName ?? tr('common.unassigned')}
                        </span>
                      {/if}
                    </td>

                    <!-- Actions -->
                    <td class="px-4 py-3.5 sm:px-6 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-1.5">
                        {#if canManage}
                          <Tooltip text={tr('common.delete')} side="top">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              class="size-8 rounded-lg text-mute hover:text-status-urgent hover:bg-status-urgent/10"
                              label={tr('common.delete')}
                              onclick={() => openDeleteWorkflow(workflow)}
                              {...i === 0 ? { 'data-onboarding': 'workflow-edit' } : {}}
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
                            </IconButton>
                          </Tooltip>
                        {/if}
                        <Tooltip text={tr('workflows.setup')} side="top">
                          <IconButton
                            href="/dashboard/workflows/{workflow.id}/settings"
                            variant="card"
                            size="sm"
                            class="size-8 rounded-lg text-mute hover:text-ink"
                            label={tr('workflows.setup')}
                            {...i === 0 ? { 'data-onboarding': 'workflow-setup-btn' } : {}}
                          >
                            <HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={1.8} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip text={tr('workflows.openBoard')} side="top">
                          <IconButton
                            href="/dashboard/workflows/{workflow.id}"
                            variant="primary"
                            size="sm"
                            class="size-8 rounded-lg shadow-xs"
                            label={tr('workflows.openBoard')}
                            {...i === 0 ? { 'data-onboarding': 'workflow-open-btn' } : {}}
                          >
                            <HugeiconsIcon icon={KanbanIcon} size={15} strokeWidth={1.8} />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Floating Add Button in Bottom Right -->
  <div class="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 md:hidden z-30">
    <button
      type="button"
      onclick={openChooser}
      class="flex items-center gap-2 rounded-full bg-primary px-4 py-3 sm:px-5 sm:py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-hover active:scale-95 cursor-pointer"
      aria-label={tr('workflows.create')}
    >
      <HugeiconsIcon icon={Add01Icon} size={20} strokeWidth={2.2} />
      <span class="hidden sm:inline">{tr('workflows.create')}</span>
      <span class="sm:hidden">Tambah</span>
    </button>
  </div>
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

<Dialog bind:open={manualOpen} title={tr('workflows.manualTitle')} description={tr('workflows.manualDescriptionShort')} size="lg">
  <div class="space-y-4">
    <FormField label={tr('workflows.name')} required>
      {#snippet control(args)}
        <Input {...args} bind:value={name} placeholder={tr('workflows.namePlaceholder')} />
      {/snippet}
    </FormField>
    <FormField label={tr('workflows.label') ?? 'Label'} helper={tr('workflows.labelHelper')}>
      {#snippet control(field)}
        <TagInput bind:value={manualLabels} placeholder={tr('workflows.labelPlaceholder') ?? 'cth. Flow, Onboarding, Jualan (tekan Enter)'} {...field} />
      {/snippet}
    </FormField>


    <FormField label={tr('setup.assignees')} helper={tr('setup.assigneesHelper')}>
      {#snippet control()}
        <MultiSelectCombobox
          options={memberOptions}
          bind:values={manualAssigneeIds}
          placeholder={tr('setup.assigneesPlaceholder')}
          emptyText={tr('setup.noMembers')}
        />
      {/snippet}
    </FormField>

    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label={tr('setup.urgency')}>
        {#snippet control(args)}
          <SelectMenu
            {...args}
            bind:value={manualUrgency}
            options={[
              { value: 'high', label: tr('setup.urgencyHigh') },
              { value: 'medium', label: tr('setup.urgencyMedium') },
              { value: 'low', label: tr('setup.urgencyLow') }
            ]}
          />
        {/snippet}
      </FormField>

      <FormField label={tr('setup.repeat')} helper={tr('setup.repeatHelper')}>
        {#snippet control(args)}
          <SelectMenu
            {...args}
            bind:value={manualRepeatRule}
            options={[
              { value: 'none', label: tr('setup.repeatNone') },
              { value: 'daily', label: tr('setup.repeatDaily') },
              { value: 'weekly', label: tr('setup.repeatWeekly') },
              { value: 'monthly', label: tr('setup.repeatMonthly') }
            ]}
          />
        {/snippet}
      </FormField>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label={tr('setup.deadlineValue')} helper={tr('setup.deadlineHelper')}>
        {#snippet control(args)}
          <Input
            {...args}
            type="number"
            bind:value={manualDeadlineValue}
            placeholder="e.g. 5"
            class="h-10"
          />
        {/snippet}
      </FormField>

      <FormField label={tr('setup.deadlineUnitHours').split(' ')[0]}>
        {#snippet control(args)}
          <SelectMenu
            {...args}
            bind:value={manualDeadlineUnit}
            options={[
              { value: 'hours', label: tr('setup.deadlineUnitHours') },
              { value: 'days', label: tr('setup.deadlineUnitDays') }
            ]}
          />
        {/snippet}
      </FormField>
    </div>

    <FormField label={tr('setup.closureBy')} helper={tr('setup.closureByHelper')}>
      {#snippet control(args)}
        <SelectMenu
          {...args}
          bind:value={manualClosureBy}
          options={[
            { value: 'initiator', label: tr('setup.closureInitiator') },
            { value: 'assignee', label: tr('setup.closureAssignee') }
          ]}
        />
      {/snippet}
    </FormField>

    <div class="space-y-3 rounded-xl border border-hairline bg-canvas-sunken/40 p-3 sm:p-4">
      <div>
        <p class="text-xs font-semibold text-ink">Hak Akses Alur Kerja</p>
        <p class="text-[11px] text-mute mt-0.5">Pilih departemen dan/atau pengguna yang dibenarkan. Kosongkan kedua-duanya untuk jadikan publik kepada semua ahli ruang kerja.</p>
      </div>
      <FormField label="Akses Grup / Departemen">
        {#snippet control()}
          <MultiSelectCombobox
            options={groupMultiOptions}
            bind:values={manualGroupIds}
            placeholder="Pilih departemen..."
            emptyText="Tiada departemen"
          />
        {/snippet}
      </FormField>
      <FormField label="Akses Pengguna (Individu)">
        {#snippet control()}
          <MultiSelectCombobox
            options={memberOptions}
            bind:values={manualAllowedUserIds}
            placeholder="Pilih pengguna khusus..."
            emptyText={tr('setup.noMembers')}
          />
        {/snippet}
      </FormField>
    </div>
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
    <FormField label={tr('workflows.label') ?? 'Label'} helper={tr('workflows.labelHelper')}>
      {#snippet control(field)}
        <TagInput
          bind:value={editWorkflowLabels}
          disabled={savingWorkflow}
          placeholder={tr('workflows.labelPlaceholder') ?? 'cth. Flow, Onboarding, Jualan (tekan Enter)'}
          {...field}
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

    <div class="space-y-3 rounded-xl border border-hairline bg-canvas-sunken/40 p-3 sm:p-4">
      <div>
        <p class="text-xs font-semibold text-ink">Hak Akses Alur Kerja</p>
        <p class="text-[11px] text-mute mt-0.5">Pilih departemen dan/atau pengguna yang dibenarkan. Kosongkan kedua-duanya untuk jadikan publik kepada semua ahli ruang kerja.</p>
      </div>
      <FormField label="Akses Grup / Departemen">
        {#snippet control()}
          <MultiSelectCombobox
            options={groupMultiOptions}
            bind:values={editWorkflowGroupIds}
            disabled={savingWorkflow}
            placeholder="Pilih departemen..."
            emptyText="Tiada departemen"
          />
        {/snippet}
      </FormField>
      <FormField label="Akses Pengguna (Individu)">
        {#snippet control()}
          <MultiSelectCombobox
            options={memberOptions}
            bind:values={editWorkflowAllowedUserIds}
            disabled={savingWorkflow}
            placeholder="Pilih pengguna khusus..."
            emptyText={tr('setup.noMembers')}
          />
        {/snippet}
      </FormField>
    </div>
  </form>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" type="button" onclick={() => (editWorkflowOpen = false)}>
        {tr('setup.cancel')}
      </Button>
      <Button
        variant="primary"
        onclick={saveWorkflowEdit}
        loading={savingWorkflow}
        disabled={!editWorkflowName.trim()}
      >
        {tr('setup.saveSettings')}
      </Button>
    </div>
  {/snippet}
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
