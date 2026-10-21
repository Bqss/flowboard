<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    api,
    ApiError,
    type ApiWorkflow,
    type ApiTaskBoard,
    type ApiDashboardStats,
    type ApiWorkspaceMember,
    type ApiWaitingActionCard
  } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import {
    Badge,
    Button,
    Avatar,
    Input,
    Skeleton,
    Checkbox
  } from '$lib/components/atoms/index.js';
  import {
    StatCard,
    EmptyStateBlock,
    FormField
  } from '$lib/components/molecules/index.js';
  import { Dialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    WorkflowSquare01Icon,
    Alert02Icon,
    UserGroupIcon,
    Settings01Icon,
    Layers01Icon,
    ArrowRight01Icon,
    KanbanIcon,
    UserCheck01Icon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from './$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let loadingData = $state(true);
  let workflows = $state<ApiWorkflow[]>([]);
  let taskBoards = $state<ApiTaskBoard[]>([]);
  let stats = $state<ApiDashboardStats>({ pending: 0, progress: 0, waiting: 0, done: 0, totalCustomers: 0 });
  let members = $state<ApiWorkspaceMember[]>([]);
  let waitingCards = $state<ApiWaitingActionCard[]>([]);
  let selectedWaitingIds = $state<string[]>([]);
  let bulkAssigneeId = $state('');
  let bulkLoading = $state(false);
  let bulkError = $state<string | null>(null);

  let pendingInvites = $state<
    Array<{ id: string; token: string; workspaceName: string; role: string; expiresAt: string }>
  >([]);
  let acceptingInvite = $state(false);

  async function acceptPendingInvite(token: string) {
    acceptingInvite = true;
    try {
      await api.acceptInvite(token);
      await goto('/dashboard');
    } catch (err) {
      console.error('Failed to accept invite:', err);
    } finally {
      acceptingInvite = false;
    }
  }

  $effect(() => {
    if (!data.user) return;
    api.myInvites()
      .then((invRes) => {
        pendingInvites = invRes.invites ?? [];
      })
      .catch(() => {
        pendingInvites = [];
      });
  });


  const totalCards = $derived(
    (stats.pending ?? 0) + (stats.progress ?? 0) + (stats.waiting ?? 0) + (stats.done ?? 0)
  );

  const urgentCount = $derived((stats.waiting ?? 0) + (stats.pending ?? 0));

  async function loadDashboardData() {
    if (!data.workspace?.id) return;
    loadingData = true;
    try {
      const [{ workflows: wf }, { stats: st }, membersRes, waitingRes, boardsRes] = await Promise.all([
        api.listWorkflows(data.workspace.id),
        api.getDashboardWorkflowStats(data.workspace.id),
        api.listWorkspaceMembers(data.workspace.id).catch(() => ({ members: [] })),
        api.listWaitingAction(data.workspace.id).catch(() => ({ cards: [] })),
        api.listTaskBoards(data.workspace.id).catch(() => ({ boards: [] }))
      ]);
      workflows = wf;
      stats = st;
      members = membersRes.members ?? [];
      waitingCards = waitingRes.cards ?? [];
      taskBoards = boardsRes.boards ?? [];
      selectedWaitingIds = [];
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      loadingData = false;
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('onboarding-page-ready'));
      });
    }
  }

  $effect(() => {
    if (data.workspace?.id) {
      loadDashboardData();
    }
  });

  let createOpen = $state(false);
  let name = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function createWorkflow() {
    if (!name.trim() || !data.workspace) return;
    loading = true;
    error = null;
    try {
      const { workflow } = await api.createWorkflow(data.workspace.id, { name: name.trim() });
      window.dispatchEvent(new CustomEvent('onboarding-challenge', { detail: 'create_workflow' }));
      createOpen = false;
      name = '';
      await goto(`/dashboard/workflows/${workflow.id}/setup`);
    } catch (err) {
      error = err instanceof ApiError ? err.message : tr('home.createError');
    } finally {
      loading = false;
    }
  }

  function toggleWaitingSelection(cardId: string, checked: boolean) {
    if (checked) {
      selectedWaitingIds = [...selectedWaitingIds, cardId];
    } else {
      selectedWaitingIds = selectedWaitingIds.filter((id) => id !== cardId);
    }
  }

  function toggleAllWaiting(checked: boolean) {
    selectedWaitingIds = checked ? waitingCards.map((c) => c.cardId) : [];
  }

  async function bulkReassignWaiting() {
    if (!data.workspace?.id || selectedWaitingIds.length === 0) return;
    bulkLoading = true;
    bulkError = null;
    try {
      await api.bulkReassignCards(data.workspace.id, {
        cardIds: selectedWaitingIds,
        assigneeId: bulkAssigneeId || null
      });
      selectedWaitingIds = [];
      bulkAssigneeId = '';
      await loadDashboardData();
    } catch (err) {
      bulkError = err instanceof ApiError ? err.message : tr('home.bulkReassignError');
    } finally {
      bulkLoading = false;
    }
  }
</script>

<svelte:head>
  <title>{tr('common.dashboard')} — actjom</title>
</svelte:head>

{#snippet customersIcon()}
  <HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet workflowsIcon()}
  <HugeiconsIcon icon={WorkflowSquare01Icon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet membersIcon()}
  <HugeiconsIcon icon={UserCheck01Icon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet urgentIcon()}
  <HugeiconsIcon icon={Alert02Icon} size={18} strokeWidth={1.8} />
{/snippet}
<div class="space-y-6 sm:space-y-8">
  <!-- Clean Header -->
  <header class="space-y-1">
    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">{data.workspace?.name ?? tr('common.dashboard')}</h1>
    <p class="ds-caption text-mute text-xs sm:text-sm">{tr('home.description')}</p>
  </header>

  <!-- Workspace Stats Grid (Clean & Direct) -->
  <section data-onboarding="stats-overview">
    {#if loadingData}
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {#each [1, 2, 3, 4] as _i}
          <div class="rounded-2xl border border-hairline bg-card p-5 space-y-3 shadow-card">
            <Skeleton shape="circle" class="h-9 w-9 rounded-lg" />
            <Skeleton shape="rect" class="h-4 w-20 rounded-md" />
            <Skeleton shape="rect" class="h-7 w-14 rounded-md" />
          </div>
        {/each}
      </div>
    {:else}
      <div class="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={tr('home.totalCustomers')}
          value={String(stats.totalCustomers ?? totalCards)}
          icon={customersIcon}
          class="p-3.5 sm:p-5 rounded-2xl"
        />
        <StatCard
          label={tr('home.workflowCount')}
          value={String(workflows.length)}
          icon={workflowsIcon}
          class="p-3.5 sm:p-5 rounded-2xl"
        />
        <StatCard
          label={tr('home.teamMembers')}
          value={String(members.length)}
          icon={membersIcon}
          class="p-3.5 sm:p-5 rounded-2xl"
        />
        <StatCard
          label={tr('home.needsAction')}
          value={String(urgentCount)}
          icon={urgentIcon}
          class="p-3.5 sm:p-5 rounded-2xl"
        />
      </div>
    {/if}
  </section>


  <!-- Waiting Action Section -->
  {#if !loadingData && waitingCards.length > 0}
    <section class="space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="ds-section-title text-ink">{tr('home.needsAction')}</h2>
          <p class="ds-caption text-mute">{tr('home.needsActionDescription')}</p>
        </div>
        <Badge tone="urgent">{tr('home.cards', { count: waitingCards.length })}</Badge>
      </div>

      <div class="rounded-2xl border border-hairline bg-card shadow-card overflow-hidden">
        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 border-b border-hairline bg-canvas-sunken px-4 py-3">
          <label class="flex items-center gap-2 text-[13px] font-semibold text-ink cursor-pointer">
            <Checkbox
              checked={selectedWaitingIds.length === waitingCards.length && waitingCards.length > 0}
              onchange={(e) => toggleAllWaiting(e.currentTarget.checked)}
            />
            <span>{tr('home.selectAll')}</span>
          </label>
          <select
            bind:value={bulkAssigneeId}
            class="h-8 rounded-full border border-hairline bg-card px-3 text-[13px] font-medium text-ink outline-none focus:border-primary"
            aria-label={tr('home.bulkAssignee')}
          >
            <option value="">{tr('home.clearAssignee')}</option>
            {#each members as member (member.id)}
              <option value={member.id}>{member.name}</option>
            {/each}
          </select>
          <Button
            variant="primary"
            size="sm"
            loading={bulkLoading}
            disabled={selectedWaitingIds.length === 0}
            onclick={bulkReassignWaiting}
          >
            {tr('home.reassign', { count: selectedWaitingIds.length })}
          </Button>
        </div>

        {#if bulkError}
          <p class="px-4 py-2 text-[13px] font-semibold text-status-urgent-ink bg-status-urgent-soft">
            {bulkError}
          </p>
        {/if}

        <ul class="divide-y divide-hairline">
          {#each waitingCards as card (card.cardId)}
            <li class="flex items-center gap-3 px-4 py-3 hover:bg-canvas-sunken/50">
              <Checkbox
                checked={selectedWaitingIds.includes(card.cardId)}
                onchange={(e) => toggleWaitingSelection(card.cardId, e.currentTarget.checked)}
              />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-base font-bold text-ink">{card.customerName}</p>
                  {#if card.waErrorFlag}
                    <Badge tone="urgent" variant="soft">{tr('home.waError')}</Badge>
                  {:else if card.waFollowupsStopped}
                    <Badge tone="progress" variant="soft">{tr('home.followupStopped')}</Badge>
                  {/if}
                </div>
                <p class="ds-caption text-mute">
                  {card.workflowName} · {card.stageName}
                  {#if card.assigneeName} · {tr('home.picShort', { name: card.assigneeName })}{/if}
                </p>
              </div>
              <Button
                href="/dashboard/workflows/{card.workflowId}"
                variant="ghost"
                size="sm"
              >
                {tr('home.open')}
              </Button>
            </li>
          {/each}
        </ul>
      </div>
    </section>
  {/if}

  {#if pendingInvites.length > 0}
    <section class="space-y-4">
      <div class="flex items-center gap-2">
        <HugeiconsIcon icon={UserCheck01Icon} size={18} strokeWidth={1.8} class="text-primary" />
        <div>
          <h2 class="ds-section-title text-ink">{tr('home.pendingInvites')}</h2>
          <p class="ds-caption text-mute">{tr('home.pendingInvitesDescription')}</p>
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each pendingInvites as inv (inv.id)}
          <article class="flex flex-col justify-between rounded-2xl border border-primary/30 bg-primary-soft p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
            <div>
              <div class="mb-3 h-1 w-7 rounded-full bg-primary"></div>
              <h3 class="text-sm font-bold text-ink">{inv.workspaceName}</h3>
              <p class="ds-caption mt-1 text-mute">{tr('home.invitedAs', { role: inv.role })}</p>
            </div>
            <div class="mt-4 border-t border-primary/20 pt-3.5">
              <Button
                variant="primary"
                size="sm"
                class="w-full"
                loading={acceptingInvite}
                onclick={() => acceptPendingInvite(inv.token)}
              >
                {tr('home.acceptInvite')}
              </Button>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}


  <!-- Workflows Section (Subtle description added) -->
  <section class="space-y-4" data-onboarding="workflows-section">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="ds-section-title text-ink">{tr('common.workflows')}</h2>
        <p class="ds-caption text-mute">{tr('home.workflowDescription')}</p>
      </div>
      <Button href="/dashboard/workflows" variant="ghost" size="sm">
        <span>{tr('home.allWorkflows', { count: workflows.length })}</span>
        <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.8} />
      </Button>
    </div>

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
        title={tr('home.noWorkflow')}
        description={tr('home.noWorkflowDescription')}
        actionLabel={tr('home.createWorkflow')}
        onaction={() => (createOpen = true)}
      />
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each workflows.slice(0, 3) as workflow (workflow.id)}
          <article class="flex flex-col justify-between rounded-2xl border border-hairline bg-card p-4 sm:p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-card-hover">
            <div>
              <!-- 4px Signature Tag Strip -->
              <div class="mb-3 h-1 w-7 rounded-full bg-primary"></div>

              <a
                href="/dashboard/workflows/{workflow.id}"
                class="block text-base sm:text-lg font-bold text-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline"
              >
                {workflow.name}
              </a>
              {#if workflow.description}
                <p class="ds-caption text-mute line-clamp-2 mt-1">{workflow.description}</p>
              {/if}
              <div class="mt-3 flex items-center gap-2">
                <Avatar name={workflow.ownerName ?? tr('common.pic')} size={22} />
                <span class="ds-caption text-mute">{workflow.ownerName ?? tr('home.noAssignee')}</span>
              </div>
            </div>
            <div class="mt-5 flex items-center gap-2 border-t border-hairline pt-3.5">
              <Button href="/dashboard/workflows/{workflow.id}" variant="primary" size="sm" class="flex-1">
                <HugeiconsIcon icon={KanbanIcon} size={15} strokeWidth={1.8} />
                <span>{tr('home.openBoard')}</span>
              </Button>
              <Button href="/dashboard/workflows/{workflow.id}/setup" variant="secondary" size="sm">
                {tr('home.setup')}
              </Button>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </section>
  <!-- Task Boards Section -->
  <section class="space-y-4" data-onboarding="boards-section">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="ds-section-title text-ink">{tr('nav.boards') ?? 'Papan Tugas'}</h2>
        <p class="ds-caption text-mute">{tr('taskboard.description') ?? 'Papan pengurusan tugas dan projek pasukan.'}</p>
      </div>
      <Button href="/dashboard/boards" variant="ghost" size="sm">
        <span>{tr('taskboard.allBoards', { count: taskBoards.length }) ?? `Semua (${taskBoards.length})`}</span>
        <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.8} />
      </Button>
    </div>

    {#if loadingData}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each [1, 2, 3] as _i}
          <div class="rounded-2xl border border-hairline bg-card p-5 space-y-4 shadow-card">
            <Skeleton shape="rect" class="h-1 w-7 rounded-full" />
            <Skeleton shape="rect" class="h-6 w-36 rounded-md" />
            <Skeleton shape="rect" class="h-4 w-24 rounded-md" />
            <div class="flex gap-2 pt-2">
              <Skeleton shape="rect" class="h-8 flex-1 rounded-full" />
            </div>
          </div>
        {/each}
      </div>
    {:else if taskBoards.length === 0}
      <EmptyStateBlock
        title={tr('taskboard.empty') ?? 'Tiada papan tugas'}
        description={tr('taskboard.emptyDesc') ?? 'Cipta papan tugas pertama untuk mengurus kerja pasukan anda.'}
        actionLabel={tr('taskboard.create') ?? 'Cipta papan'}
        onaction={() => goto('/dashboard/boards')}
      />
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each taskBoards.slice(0, 3) as board (board.id)}
          <article class="flex flex-col justify-between rounded-2xl border border-hairline bg-card p-4 sm:p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-card-hover">
            <div>
              <!-- 4px Signature Tag Strip (Sky/Cyan for Board) -->
              <div class="mb-3 h-1 w-7 rounded-full bg-sky-500"></div>

              <a
                href="/dashboard/boards/{board.id}"
                class="block text-base sm:text-lg font-bold text-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline"
              >
                {board.name}
              </a>
              {#if board.description}
                <p class="ds-caption text-mute line-clamp-2 mt-1">{board.description}</p>
              {/if}
              <div class="mt-3 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Avatar name={board.ownerName ?? tr('common.pic')} size={22} />
                  <span class="ds-caption text-mute">{board.ownerName ?? tr('home.noAssignee')}</span>
                </div>
                {#if board.taskCount != null}
                  <Badge tone="queued" variant="soft" class="text-[10px] px-2 py-0.5">
                    {board.taskCount} {tr('taskboard.cardCount') ?? 'tugas'}
                  </Badge>
                {/if}
              </div>
            </div>

            <div class="mt-5 flex items-center gap-2 border-t border-hairline pt-3.5">
              <Button href="/dashboard/boards/{board.id}" variant="primary" size="sm" class="flex-1">
                <HugeiconsIcon icon={KanbanIcon} size={15} strokeWidth={1.8} />
                <span>{tr('home.openBoard')}</span>
              </Button>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </section>

</div>

<!-- Modal Dialog: Buat Workflow Baru -->
<Dialog
  bind:open={createOpen}
  title={tr('home.createDialogTitle')}
  description={tr('home.createDialogDescription')}
>
  <div class="space-y-4">
    <FormField label={tr('home.workflowName')} required>
      {#snippet control(args)}
        <Input {...args} bind:value={name} placeholder={tr('home.workflowNamePlaceholder')} />
      {/snippet}
    </FormField>
    {#if error}
      <p class="ds-caption text-status-urgent">{error}</p>
    {/if}
  </div>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (createOpen = false)}>{tr('common.cancel')}</Button>
      <Button variant="primary" {loading} onclick={createWorkflow}>{tr('common.save')}</Button>
    </div>
  {/snippet}
</Dialog>
