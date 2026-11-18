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
  import { dashboardIntlLocale, dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import {
    Avatar,
    Badge,
    Button,
    Checkbox,
    IconButton,
    Skeleton,
    StatusDot
  } from '$lib/components/atoms/index.js';
  import { SelectMenu, StatCard } from '$lib/components/molecules/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    Alert02Icon,
    ArrowRight01Icon,
    CheckListIcon,
    CheckmarkCircle02Icon,
    KanbanIcon,
    Layers01Icon,
    Settings01Icon,
    Tick02Icon,
    UserAdd01Icon,
    UserCheck01Icon,
    UserGroupIcon,
    WorkflowSquare01Icon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from './$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  const CLEAR_ASSIGNEE = '__clear__';
  const LIST_LIMIT = 5;

  let loadingData = $state(true);
  let workflows = $state<ApiWorkflow[]>([]);
  let taskBoards = $state<ApiTaskBoard[]>([]);
  let stats = $state<ApiDashboardStats>({ pending: 0, progress: 0, waiting: 0, done: 0, totalCustomers: 0 });
  let members = $state<ApiWorkspaceMember[]>([]);
  let waitingCards = $state<ApiWaitingActionCard[]>([]);
  let selectedWaitingIds = $state<string[]>([]);
  let bulkAssigneeId = $state(CLEAR_ASSIGNEE);
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

  // ── View helpers ─────────────────────────────────────────────────
  type Tone = 'queued' | 'progress' | 'done' | 'urgent';

  const formatNum = (value: number) => value.toLocaleString(dashboardIntlLocale($locale));

  const totalCards = $derived(
    (stats.pending ?? 0) + (stats.progress ?? 0) + (stats.waiting ?? 0) + (stats.done ?? 0)
  );
  const activeCards = $derived((stats.pending ?? 0) + (stats.progress ?? 0));

  const flowSegments = $derived<Array<{ key: string; label: string; value: number; tone: Tone }>>([
    { key: 'pending', label: tr('home.statusPending'), value: stats.pending ?? 0, tone: 'queued' },
    { key: 'progress', label: tr('home.statusProgress'), value: stats.progress ?? 0, tone: 'progress' },
    { key: 'waiting', label: tr('home.statusWaiting'), value: stats.waiting ?? 0, tone: 'urgent' },
    { key: 'done', label: tr('home.statusDone'), value: stats.done ?? 0, tone: 'done' }
  ]);

  const toneBg: Record<Tone, string> = {
    queued: 'bg-status-queued',
    progress: 'bg-status-progress',
    done: 'bg-status-done',
    urgent: 'bg-status-urgent'
  };

  /** Share of the flow; tiny non-zero shares read "<1%" rather than a misleading 0%. */
  const pctLabel = (value: number) => {
    if (totalCards === 0 || value === 0) return '0%';
    const pct = (value / totalCards) * 100;
    if (pct < 1) return '<1%';
    if (pct > 99 && value < totalCards) return '>99%';
    return `${Math.round(pct)}%`;
  };

  const labelsOf = (item: { labels?: string[]; label?: string | null }) =>
    item.labels && item.labels.length > 0 ? item.labels : item.label ? [item.label] : [];

  const workspaceName = $derived(data.workspace?.name ?? tr('common.dashboard'));

  const assigneeOptions = $derived([
    { value: CLEAR_ASSIGNEE, label: tr('home.clearAssignee') },
    ...members.map((m) => ({ value: m.id, label: m.name }))
  ]);

  // ── Data loading ─────────────────────────────────────────────────
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

  // ── Needs attention bulk actions ─────────────────────────────────
  function toggleWaitingSelection(cardId: string, checked: boolean) {
    selectedWaitingIds = checked
      ? [...selectedWaitingIds, cardId]
      : selectedWaitingIds.filter((id) => id !== cardId);
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
        assigneeId: bulkAssigneeId === CLEAR_ASSIGNEE ? null : bulkAssigneeId
      });
      selectedWaitingIds = [];
      bulkAssigneeId = CLEAR_ASSIGNEE;
      await loadDashboardData();
    } catch (err) {
      bulkError = err instanceof ApiError ? err.message : tr('home.bulkReassignError');
    } finally {
      bulkLoading = false;
    }
  }
</script>

<svelte:head>
  <title>{tr('common.dashboard')} · actjom</title>
</svelte:head>

<!-- ── Snippets ─────────────────────────────────────────────────── -->
{#snippet arrowIcon()}
  <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} />
{/snippet}
{#snippet customersIcon()}<HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={1.8} />{/snippet}
{#snippet activeIcon()}<HugeiconsIcon icon={WorkflowSquare01Icon} size={18} strokeWidth={1.8} />{/snippet}
{#snippet attentionIcon()}<HugeiconsIcon icon={Alert02Icon} size={18} strokeWidth={1.8} />{/snippet}
{#snippet doneIcon()}<HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={1.8} />{/snippet}

{#snippet sectionHeader(title: string, href: string, linkLabel: string)}
  <header class="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
    <h2 class="ds-section-title text-ink">{title}</h2>
    <Button {href} variant="ghost" size="sm">
      {linkLabel}
      {@render arrowIcon()}
    </Button>
  </header>
{/snippet}

{#snippet rowSkeletons()}
  {#each [1, 2, 3] as _i}
    <div class="flex items-center gap-3 px-5 py-3.5">
      <Skeleton shape="rect" class="size-9 rounded-md" />
      <div class="flex-1 space-y-2">
        <Skeleton shape="rect" class="h-3.5 w-40 rounded-md" />
        <Skeleton shape="rect" class="h-3 w-24 rounded-md" />
      </div>
    </div>
  {/each}
{/snippet}

<div class="space-y-6">
  <!-- ── Page header ──────────────────────────────────────────────── -->
  <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <h1 class="ds-page-title truncate text-ink">{workspaceName}</h1>
      <p class="ds-caption mt-1 text-mute">{tr('home.description')}</p>
    </div>
  </header>

  <!-- ── Pending invites ──────────────────────────────────────────── -->
  {#if pendingInvites.length > 0}
    <div class="space-y-2">
      {#each pendingInvites as inv (inv.id)}
        <div class="flex flex-col gap-3 rounded-card border border-primary-border bg-primary-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-3 text-primary">
            <HugeiconsIcon icon={UserCheck01Icon} size={18} strokeWidth={1.8} />
            <p class="min-w-0 truncate text-meta text-ink">
              <span class="font-bold">{inv.workspaceName}</span>
              <span class="text-mute"> · {tr('home.invitedAs', { role: inv.role })}</span>
            </p>
          </div>
          <Button variant="primary" size="sm" loading={acceptingInvite} onclick={() => acceptPendingInvite(inv.token)}>
            {tr('home.acceptInvite')}
          </Button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- ── Stat row ─────────────────────────────────────────────────── -->
  <section data-onboarding="stats-overview" class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
    {#if loadingData}
      {#each [1, 2, 3, 4] as _i}
        <div class="flex items-start gap-3 rounded-xl border border-hairline bg-card p-4 shadow-card sm:p-5">
          <Skeleton shape="rect" class="size-9 rounded-md" />
          <div class="space-y-2">
            <Skeleton shape="rect" class="h-3 w-24 rounded-md" />
            <Skeleton shape="rect" class="h-7 w-16 rounded-md" />
          </div>
        </div>
      {/each}
    {:else}
      <StatCard class="min-w-0 p-4 sm:p-5" label={tr('home.totalCustomers')} value={formatNum(Number(stats.totalCustomers ?? 0))} icon={customersIcon} />
      <StatCard class="min-w-0 p-4 sm:p-5" label={tr('home.statusProgress')} value={formatNum(activeCards)} icon={activeIcon} />
      <StatCard class="min-w-0 p-4 sm:p-5" label={tr('home.statusWaiting')} value={formatNum(stats.waiting ?? 0)} icon={attentionIcon} />
      <StatCard class="min-w-0 p-4 sm:p-5" label={tr('home.statusDone')} value={formatNum(stats.done ?? 0)} icon={doneIcon} />
    {/if}
  </section>

  <!-- ── Attention + flow breakdown ───────────────────────────────── -->
  <div class="grid items-stretch gap-4 lg:grid-cols-3">
    <!-- Needs attention -->
    <section id="needs-attention" class="flex flex-col overflow-hidden rounded-xl border border-hairline bg-card shadow-card lg:col-span-2">
      <header class="flex items-center justify-between gap-3 px-5 py-4">
        <div class="flex min-w-0 items-center gap-2">
          <h2 class="ds-section-title truncate text-ink">{tr('home.needsAction')}</h2>
          {#if !loadingData && waitingCards.length > 0}
            <span class="shrink-0 rounded-full bg-status-urgent-soft px-2 py-0.5 text-badge font-semibold tabular-nums text-status-urgent-ink">
              {waitingCards.length}
            </span>
          {/if}
        </div>
        {#if !loadingData && waitingCards.length > 1}
          <label class="flex shrink-0 cursor-pointer items-center gap-2 text-meta font-medium text-mute hover:text-ink">
            <span>{tr('home.selectAll')}</span>
            <Checkbox
              checked={selectedWaitingIds.length === waitingCards.length}
              onCheckedChange={(c) => toggleAllWaiting(c)}
            />
          </label>
        {/if}
      </header>

      {#if loadingData}
        {@render rowSkeletons()}
      {:else if waitingCards.length === 0}
        <div class="flex items-center gap-3 border-t border-hairline px-5 py-6">
          <span class="grid size-8 shrink-0 place-items-center rounded-full bg-status-done-soft text-status-done-ink">
            <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={1.8} />
          </span>
          <p class="ds-body text-mute">{tr('home.attentionEmpty')}</p>
        </div>
      {:else}
        <!-- Action bar: only appears once something is selected -->
        {#if selectedWaitingIds.length > 0}
          <div class="flex flex-col gap-2 border-t border-primary-border/60 bg-primary-soft px-5 py-2.5 sm:flex-row sm:items-center">
            <p class="text-meta font-semibold text-primary-ink sm:flex-1">
              {tr('home.selectedCount', { count: selectedWaitingIds.length })}
            </p>
            <div class="flex gap-2">
              <SelectMenu
                options={assigneeOptions}
                bind:value={bulkAssigneeId}
                size="sm"
                class="min-w-0 flex-1 sm:w-52 sm:flex-none"
                aria-label={tr('home.bulkAssignee')}
              />
              <Button variant="primary" size="sm" loading={bulkLoading} onclick={bulkReassignWaiting}>
                {tr('home.reassign', { count: selectedWaitingIds.length })}
              </Button>
            </div>
          </div>
        {/if}

        {#if bulkError}
          <p class="bg-status-urgent-soft px-5 py-2 text-meta font-semibold text-status-urgent-ink">{bulkError}</p>
        {/if}

        <ul class="max-h-[420px] divide-y divide-hairline overflow-y-auto border-t border-hairline">
          {#each waitingCards as card (card.cardId)}
            {@const selected = selectedWaitingIds.includes(card.cardId)}
            <li class="flex items-center gap-3 px-5 py-3 transition-colors {selected ? 'bg-primary-soft/40' : 'hover:bg-canvas-sunken/60'}">
              <Checkbox
                checked={selected}
                onCheckedChange={(c) => toggleWaitingSelection(card.cardId, c)}
                aria-label={card.customerName}
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-ink">{card.customerName}</p>
                <p class="ds-caption mt-0.5 truncate text-mute">
                  {card.workflowName} · {card.stageName}
                </p>
              </div>
              {#if card.waErrorFlag}
                <Badge tone="urgent" class="shrink-0">{tr('home.waError')}</Badge>
              {:else if card.waFollowupsStopped}
                <Badge tone="progress" class="shrink-0">{tr('home.followupStopped')}</Badge>
              {/if}
              <IconButton href="/dashboard/workflows/{card.workflowId}" variant="ghost" size="sm" label={tr('home.open')}>
                {@render arrowIcon()}
              </IconButton>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- Right column: flow breakdown + team -->
    <div class="grid gap-4">
      <section class="rounded-xl border border-hairline bg-card p-5 shadow-card">
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="ds-section-title text-ink">{tr('home.flowTitle')}</h2>
          {#if !loadingData}
            <span class="text-meta font-semibold tabular-nums text-mute">{formatNum(totalCards)}</span>
          {/if}
        </div>

        <div class="mt-4">
          {#if loadingData}
            <Skeleton shape="rect" class="h-2 w-full rounded-full" />
          {:else if totalCards > 0}
            <div class="flex h-2 w-full gap-1" role="img" aria-label={tr('home.flowTotal', { count: formatNum(totalCards) })}>
              {#each flowSegments.filter((s) => s.value > 0) as seg (seg.key)}
                <div class="h-full rounded-full {toneBg[seg.tone]}" style="flex: {seg.value} 1 0; min-width: 6px"></div>
              {/each}
            </div>
          {:else}
            <div class="h-2 w-full rounded-full bg-lane" aria-hidden="true"></div>
          {/if}
        </div>

        <ul class="mt-4 space-y-3">
          {#each flowSegments as seg (seg.key)}
            <li class="flex items-center justify-between gap-3">
              <StatusDot tone={seg.tone} label={seg.label} />
              {#if loadingData}
                <Skeleton shape="rect" class="h-3 w-12 rounded-md" />
              {:else}
                <span class="flex items-baseline gap-2 tabular-nums">
                  <span class="text-sm font-bold text-ink">{formatNum(seg.value)}</span>
                  <span class="w-10 text-right text-meta text-faint">{pctLabel(seg.value)}</span>
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      </section>

      <section data-onboarding="team-section" class="rounded-xl border border-hairline bg-card p-5 shadow-card">
        <div class="flex items-center justify-between gap-3">
          <h2 class="ds-section-title text-ink">{tr('home.teamTitle')}</h2>
          <div class="flex items-center gap-1" data-onboarding="shortcuts-section">
            <IconButton href="/dashboard/members" variant="ghost" size="sm" label={tr('home.inviteStaff')}>
              <HugeiconsIcon icon={UserAdd01Icon} size={16} strokeWidth={1.8} />
            </IconButton>
            <IconButton href="/dashboard/workflows" variant="ghost" size="sm" label={tr('home.stageSetup')}>
              <HugeiconsIcon icon={Layers01Icon} size={16} strokeWidth={1.8} />
            </IconButton>
            <IconButton href="/dashboard/settings" variant="ghost" size="sm" label={tr('home.settings')}>
              <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.8} />
            </IconButton>
          </div>
        </div>

        {#if loadingData}
          <div class="mt-4 flex -space-x-2">
            {#each [1, 2, 3] as _i}
              <Skeleton shape="circle" class="size-8 ring-2 ring-card" />
            {/each}
          </div>
        {:else if members.length === 0}
          <p class="ds-caption mt-3 text-mute">{tr('home.noOtherMembers')}</p>
        {:else}
          <a href="/dashboard/members" class="group mt-4 flex items-center justify-between gap-3">
            <div class="flex -space-x-2">
              {#each members.slice(0, 5) as member (member.id)}
                <Avatar name={member.name} src={member.avatarUrl ?? undefined} size={32} title={member.name} class="ring-card" />
              {/each}
              {#if members.length > 5}
                <span class="relative grid size-8 place-items-center rounded-full bg-lane text-micro text-mute ring-2 ring-card">
                  +{members.length - 5}
                </span>
              {/if}
            </div>
            <span class="flex items-center gap-1 text-meta font-semibold text-mute group-hover:text-primary">
              {tr('home.memberCount', { count: members.length })}
              {@render arrowIcon()}
            </span>
          </a>
        {/if}
      </section>
    </div>
  </div>

  <!-- ── Recent workflows + boards ────────────────────────────────── -->
  <div class="grid items-start gap-4 lg:grid-cols-2">
    <section data-onboarding="workflows-section" class="overflow-hidden rounded-xl border border-hairline bg-card shadow-card">
      {@render sectionHeader(tr('common.workflows'), '/dashboard/workflows', tr('home.allWorkflows', { count: workflows.length }))}

      {#if loadingData}
        {@render rowSkeletons()}
      {:else if workflows.length === 0}
        <div class="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <p class="ds-body text-mute">{tr('home.noWorkflowDescription')}</p>
          <Button href="/dashboard/workflows" variant="secondary" size="sm" data-onboarding="quick-create-workflow">
            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
            {tr('home.createWorkflow')}
          </Button>
        </div>
      {:else}
        <ul class="divide-y divide-hairline">
          {#each workflows.slice(0, LIST_LIMIT) as workflow (workflow.id)}
            {@const wfLabels = labelsOf(workflow)}
            <li class="group relative flex items-center gap-3 px-5 py-3 transition-colors hover:bg-canvas-sunken/60">
              <span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                <HugeiconsIcon icon={WorkflowSquare01Icon} size={18} strokeWidth={1.8} />
              </span>
              <div class="min-w-0 flex-1">
                <a
                  href="/dashboard/workflows/{workflow.id}"
                  class="block truncate text-sm font-semibold text-ink after:absolute after:inset-0 group-hover:text-primary focus-visible:outline-none"
                >
                  {workflow.name}
                </a>
                <p class="ds-caption mt-0.5 truncate text-mute">{workflow.ownerName ?? tr('home.noAssignee')}</p>
              </div>
              {#if wfLabels.length > 0}
                <Badge tone="queued" class="hidden max-w-[120px] truncate sm:inline-flex">{wfLabels[0]}</Badge>
              {/if}
              <a
                href="/dashboard/workflows/{workflow.id}/setup"
                class="relative z-10 shrink-0 text-meta font-semibold text-primary hover:underline"
              >
                {tr('home.setup')}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section data-onboarding="boards-section" class="overflow-hidden rounded-xl border border-hairline bg-card shadow-card">
      {@render sectionHeader(tr('nav.boards'), '/dashboard/boards', tr('taskboard.allBoards', { count: taskBoards.length }))}

      {#if loadingData}
        {@render rowSkeletons()}
      {:else if taskBoards.length === 0}
        <div class="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <p class="ds-body text-mute">{tr('taskboard.emptyDescription')}</p>
          <Button href="/dashboard/boards" variant="secondary" size="sm">
            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
            {tr('taskboard.create')}
          </Button>
        </div>
      {:else}
        <ul class="divide-y divide-hairline">
          {#each taskBoards.slice(0, LIST_LIMIT) as board (board.id)}
            {@const bLabels = labelsOf(board)}
            <li class="group relative flex items-center gap-3 px-5 py-3 transition-colors hover:bg-canvas-sunken/60">
              <span class="grid size-9 shrink-0 place-items-center rounded-md bg-lane text-mute">
                <HugeiconsIcon icon={KanbanIcon} size={18} strokeWidth={1.8} />
              </span>
              <div class="min-w-0 flex-1">
                <a
                  href="/dashboard/boards/{board.id}"
                  class="block truncate text-sm font-semibold text-ink after:absolute after:inset-0 group-hover:text-primary focus-visible:outline-none"
                >
                  {board.name}
                </a>
                <p class="ds-caption mt-0.5 truncate text-mute">{board.ownerName ?? tr('home.noAssignee')}</p>
              </div>
              {#if bLabels.length > 0}
                <Badge tone="neutral" class="hidden max-w-[120px] truncate sm:inline-flex">{bLabels[0]}</Badge>
              {/if}
              {#if board.taskCount != null}
                <span class="flex shrink-0 items-center gap-1 text-faint" title={tr('taskboard.cardCount')}>
                  <HugeiconsIcon icon={CheckListIcon} size={16} strokeWidth={1.8} />
                  <span class="text-meta font-bold tabular-nums text-ink-soft">{formatNum(board.taskCount)}</span>
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>
</div>
