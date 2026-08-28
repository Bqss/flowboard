<script lang="ts">
  import { page } from '$app/state';
  import { cn } from '$lib/utils.js';
  import {
    api,
    ApiError,
    type ApiCardDetail,
    type ApiWorkflow,
    type ApiDashboardStats,
    type ApiWorkspaceMember,
    type ApiBoardColumn,
    type ApiWorkflowStats
  } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import {
    Badge,
    Button,
    Checkbox,
    Input,
    Skeleton,
    Avatar,
    ProgressBar
  } from '$lib/components/atoms/index.js';
  import {
    FormField,
    EmptyStateBlock,
    Breadcrumb,
    SearchInput,
    Tabs,
    CopyToClipboard,
    StatCard,
    toast
  } from '$lib/components/molecules/index.js';
  import { ConfirmDialog, Dialog, KanbanBoard, Sheet, DataTable } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    Upload04Icon,
    Settings01Icon,
    KanbanIcon,
    DashboardSquare02Icon,
    CheckmarkCircle02Icon,
    CheckListIcon,
    ArrowRight01Icon,
    WhatsappIcon,
    Layers01Icon,
    Delete02Icon,
    AlertCircleIcon,
    ClockAlertIcon,
    UserGroupIcon,
    Calendar03Icon,
    Tick02Icon,
    Alert02Icon,
    Clock01Icon,
    BarChartIcon,
    SparklesIcon
  } from '@hugeicons/core-free-icons';
  import type { KanbanColumn } from '$lib/components/organisms/shared.js';
  import type { LayoutData } from '../../$types';
  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  const workflowId = $derived(page.params.workflowId);

  let loadingData = $state(true);
  let workflow = $state<ApiWorkflow | null>(null);
  let board = $state<ApiBoardColumn[]>([]);
  const canManage = $derived(data.workspace?.role === 'owner' || workflow?.ownerId === data.user?.id);

  let members = $state<ApiWorkspaceMember[]>([]);

  // Workflow statistics
  let stats = $state<ApiWorkflowStats | null>(null);
  let statsLoading = $state(false);
  // Primary 4 tabs: stats (default) | kanban | table (setup links to /setup)
  let activeTab = $state<'stats' | 'kanban' | 'table'>('stats');

  $effect(() => {
    const urlTab = page.url.searchParams.get('tab');
    if (urlTab === 'kanban') {
      activeTab = 'kanban';
    } else if (urlTab === 'table') {
      activeTab = 'table';
    } else if (urlTab === 'stats') {
      activeTab = 'stats';
    }
  });
  let searchQuery = $state('');
  let selectedMemberFilter = $state<string>('all');
  let selectedTagFilter = $state<string>('all');
  // Sheet / Card detail state
  let selectedCardId = $state<string | null>(null);
  let isSheetOpen = $derived(selectedCardId !== null);
  let cardDetail = $state<ApiCardDetail | null>(null);
  let detailLoading = $state(false);
  let detailError = $state<string | null>(null);
  let moveLoading = $state(false);
  let relayLoading = $state(false);
  let assigneeLoading = $state(false);
  let boardMoveLoading = $state(false);
  let deleteLoading = $state(false);
  let cardToDelete = $state<{ id: string; name: string } | null>(null);


  // Modal: Tambah Pelanggan state
  let createOpen = $state(false);
  let createLoading = $state(false);
  let createError = $state<string | null>(null);
  let customerName = $state('');
  let customerWa = $state('');
  let product = $state('');
  let tag = $state('');
  let createAssigneeId = $state<string>('');

  // Modal: Import CSV state
  let importOpen = $state(false);
  let importLoading = $state(false);
  let importError = $state<string | null>(null);
  let importCsv = $state('');
  let importMode = $state<'skip' | 'update'>('skip');
  let importResult = $state<{
    created: number;
    skipped: number;
    updated: number;
    errors: Array<{ row: number; reason: string }>;
  } | null>(null);

  // Table pagination & sort state
  let tablePage = $state(1);

  async function loadWorkflowBoardData() {
    if (!data.workspace?.id || !workflowId) return;
    loadingData = true;
    try {
      const [boardRes, workflowsRes, membersRes, statsRes] = await Promise.all([
        api.getWorkflowBoard(data.workspace.id, workflowId),
        api.listWorkflows(data.workspace.id),
        api.listWorkspaceMembers(data.workspace.id).catch(() => ({ members: [] })),
        api.getWorkflowStats(data.workspace.id, workflowId).catch(() => ({ stats: null }))
      ]);
      board = boardRes.board?.columns ?? [];
      workflow = workflowsRes.workflows?.find((w) => w.id === workflowId) ?? null;
      members = membersRes.members ?? [];
      stats = statsRes.stats ?? null;
    } catch (err) {
      console.error('Failed to load workflow board data:', err);
    } finally {
      loadingData = false;
    }
  }

  $effect(() => {
    if (data.workspace?.id && workflowId) {
      loadWorkflowBoardData();
    }
  });


  function cleanPhone(phone?: string | null) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  }

  function resolveTone(tag?: string | null): 'urgent' | 'progress' | 'done' | 'queued' | 'neutral' {
    if (!tag) return 'neutral';
    const lower = tag.toLowerCase();
    if (lower.includes('urgent') || lower.includes('darurat') || lower.includes('vip')) return 'urgent';
    if (lower.includes('progress') || lower.includes('proses') || lower.includes('follow')) return 'progress';
    if (lower.includes('done') || lower.includes('selesai') || lower.includes('closing')) return 'done';
    if (lower.includes('queued') || lower.includes('pending') || lower.includes('baru')) return 'queued';
    return 'neutral';
  }

  // All cards flat array
  const allCards = $derived(
    board.flatMap((column) =>
      column.cards.map((c) => ({
        ...c,
        stageId: column.id,
        stageName: column.name,
        stageColor: column.color
      }))
    )
  );

  const totalCards = $derived(allCards.length);

  // Unique tags for filter pill list
  const availableTags = $derived(
    Array.from(
      new Set(
        allCards
          .map((c) => c.tag?.trim())
          .filter((t): t is string => Boolean(t && t.length > 0))
      )
    )
  );

  // Filtered Kanban Columns
  const filteredColumns = $derived<KanbanColumn[]>(
    board.map((column) => {
      const filtered = column.cards.filter((card) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = card.customerName.toLowerCase().includes(q);
          const matchesWa = card.customerWa.toLowerCase().includes(q);
          const matchesProduct = (card.product ?? '').toLowerCase().includes(q);
          const matchesTag = (card.tag ?? '').toLowerCase().includes(q);
          const matchesPic = (card.assigneeName ?? '').toLowerCase().includes(q);
          if (!matchesName && !matchesWa && !matchesProduct && !matchesTag && !matchesPic) {
            return false;
          }
        }
        // Member filter
        if (selectedMemberFilter !== 'all') {
          if (selectedMemberFilter === 'unassigned') {
            if (card.assigneeId) return false;
          } else {
            if (card.assigneeId !== selectedMemberFilter) return false;
          }
        }
        // Tag filter
        if (selectedTagFilter !== 'all') {
          if (card.tag !== selectedTagFilter) return false;
        }
        return true;
      });

      return {
        id: column.id,
        title: column.name,
        items: filtered.map((card) => {
          const isDone = card.checklistTotal > 0 && card.checklistDone === card.checklistTotal;
          return {
            id: card.id,
            title: card.customerName,
            subtitle: card.product ? `${card.product} · ${card.customerWa}` : card.customerWa,
            badge: card.tag ?? undefined,
            badgeTone: resolveTone(card.tag),
            assignee: card.assigneeName ?? undefined,
            progress:
              card.checklistTotal > 0 ? `${card.checklistDone}/${card.checklistTotal} ${tr('board.progressDone')}` : undefined,
            progressDone: isDone,
            selected: selectedCardId === card.id,
            waError: card.waErrorFlag === true
          };
        })
      };
    })
  );

  const totalFilteredCount = $derived(
    filteredColumns.reduce((acc, col) => acc + col.items.length, 0)
  );

  const isFilterActive = $derived(
    searchQuery.trim() !== '' || selectedMemberFilter !== 'all' || selectedTagFilter !== 'all'
  );

  function resetFilters() {
    searchQuery = '';
    selectedMemberFilter = 'all';
    selectedTagFilter = 'all';
  }

  // Flat cards for Table View
  const tableRows = $derived(
    allCards.filter((card) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = card.customerName.toLowerCase().includes(q);
        const matchesWa = card.customerWa.toLowerCase().includes(q);
        const matchesProduct = (card.product ?? '').toLowerCase().includes(q);
        const matchesTag = (card.tag ?? '').toLowerCase().includes(q);
        const matchesPic = (card.assigneeName ?? '').toLowerCase().includes(q);
        if (!matchesName && !matchesWa && !matchesProduct && !matchesTag && !matchesPic) {
          return false;
        }
      }
      if (selectedMemberFilter !== 'all') {
        if (selectedMemberFilter === 'unassigned') {
          if (card.assigneeId) return false;
        } else {
          if (card.assigneeId !== selectedMemberFilter) return false;
        }
      }
      if (selectedTagFilter !== 'all') {
        if (card.tag !== selectedTagFilter) return false;
      }
      return true;
    })
  );

  const tableColumns = $derived([
    { key: 'customerName', label: tr('board.customers'), sortable: true },
    { key: 'customerWa', label: tr('common.whatsapp'), sortable: true },
    { key: 'product', label: tr('board.productSource') },
    { key: 'tag', label: tr('board.tagLabel') },
    { key: 'stageName', label: tr('board.currentStage'), sortable: true },
    { key: 'assigneeName', label: tr('common.pic') },
    {
      key: 'checklist',
      label: tr('common.checklist'),
      render: (row: (typeof tableRows)[number]) =>
        row.checklistTotal > 0 ? `${row.checklistDone}/${row.checklistTotal}` : '—'
    }
  ]);

  async function openCard(_columnId: string, cardId: string) {
    if (!data.workspace || !workflowId) return;
    selectedCardId = cardId;
    detailLoading = true;
    detailError = null;
    try {
      const { detail } = await api.getCardDetail(data.workspace.id, workflowId, cardId);
      cardDetail = detail;
    } catch (err) {
      detailError = err instanceof ApiError ? err.message : tr('board.detailLoadError');
      cardDetail = null;
    } finally {
      detailLoading = false;
    }
  }

  function closeSheet() {
    selectedCardId = null;
    cardDetail = null;
    detailError = null;
  }

  function requestDeleteCard() {
    if (!canManage || !cardDetail) return;
    cardToDelete = {
      id: cardDetail.card.id,
      name: cardDetail.customer?.name ?? tr('board.cardDetail')
    };
  }

  async function deleteCardConfirmed() {
    if (!cardToDelete || !data.workspace?.id || !workflowId) return;
    const card = cardToDelete;
    deleteLoading = true;
    try {
      await api.deleteCard(data.workspace.id, workflowId, card.id);
      cardToDelete = null;
      closeSheet();
      await loadWorkflowBoardData();
      toast.success(tr('board.customerDeleted', { name: card.name }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('board.deleteCustomerError'));
    } finally {
      deleteLoading = false;
    }
  }


  async function refreshBoard() {
    await loadWorkflowBoardData();
    if (selectedCardId) {
      await openCard('', selectedCardId);
    }
  }

  async function toggleItem(itemId: string, done: boolean) {
    if (!selectedCardId || !data.workspace || !workflowId) return;
    try {
      // Optimistic update in cardDetail
      if (cardDetail) {
        cardDetail.checklist = cardDetail.checklist.map((item) =>
          item.id === itemId ? { ...item, done } : item
        );
      }

      await api.toggleChecklistItem(
        data.workspace.id,
        workflowId,
        selectedCardId,
        itemId,
        { done }
      );
      await loadWorkflowBoardData();
    } catch (err) {
      detailError = err instanceof ApiError ? err.message : tr('board.checklistError');
      await refreshBoard();
    }
  }

  async function moveStage(toStageId: string) {
    if (!selectedCardId || !data.workspace || !workflowId) return;
    moveLoading = true;
    detailError = null;
    try {
      await api.moveCard(data.workspace.id, workflowId, selectedCardId, { stageId: toStageId });
      await refreshBoard();
    } catch (err) {
      detailError = err instanceof ApiError ? err.message : tr('board.moveError');
    } finally {
      moveLoading = false;
    }
  }

  async function relayToNextWorkflow() {
    if (!selectedCardId || !data.workspace || !workflowId || !cardDetail?.nextWorkflow) return;
    relayLoading = true;
    detailError = null;
    try {
      const result = await api.relayCard(data.workspace.id, workflowId, selectedCardId);
      toast.success(tr('board.relaySuccess', { name: result.workflow.name }));
      closeSheet();
      await loadWorkflowBoardData();
    } catch (err) {
      detailError = err instanceof ApiError ? err.message : tr('board.relayError');
    } finally {
      relayLoading = false;
    }
  }

  async function handleCardMove(cardId: string, _fromColumnId: string, toColumnId: string) {
    if (!data.workspace || !workflowId || boardMoveLoading) return;
    boardMoveLoading = true;
    try {
      await api.moveCard(data.workspace.id, workflowId, cardId, { stageId: toColumnId });
      if (selectedCardId === cardId) {
        await openCard('', cardId);
      }
      await loadWorkflowBoardData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('board.moveError'));
    } finally {
      boardMoveLoading = false;
    }
  }

  async function updateAssignee(userId: string | null) {
    if (!selectedCardId || !data.workspace || !workflowId) return;
    assigneeLoading = true;
    detailError = null;
    try {
      await api.updateCardAssignee(
        data.workspace.id,
        workflowId,
        selectedCardId,
        { assigneeId: userId }
      );
      await refreshBoard();
    } catch (err) {
      detailError = err instanceof ApiError ? err.message : tr('board.assigneeError');
    } finally {
      assigneeLoading = false;
    }
  }

  function openCreateModal() {
    customerName = '';
    customerWa = '';
    product = '';
    tag = '';
    createAssigneeId = '';
    createError = null;
    createOpen = true;
  }

  async function createCard() {
    if (!customerName.trim() || !customerWa.trim() || !data.workspace || !workflowId) return;
    createLoading = true;
    createError = null;
    try {
      await api.createCard(data.workspace.id, workflowId, {
        name: customerName.trim(),
        wa: customerWa.trim(),
        product: product.trim() || undefined,
        tag: tag.trim() || undefined,
        assigneeId: createAssigneeId || undefined
      });
      createOpen = false;
      customerName = '';
      customerWa = '';
      product = '';
      tag = '';
      createAssigneeId = '';
      await refreshBoard();
      toast.success(tr('board.customerAdded'));
    } catch (err) {
      createError = err instanceof ApiError ? err.message : tr('board.createError');
      toast.error(err instanceof ApiError ? err.message : tr('board.createError'));
    } finally {
      createLoading = false;
    }
  }

  async function importCustomers() {
    if (!importCsv.trim() || !data.workspace || !workflowId) return;
    importLoading = true;
    importError = null;
    importResult = null;

    try {
      const res = await api.importCardsCsv(data.workspace.id, workflowId, {
        csv: importCsv.trim(),
        mode: importMode
      });
      importResult = res.result;
      if (res.result.created > 0 || res.result.updated > 0) {
        await refreshBoard();
      }
    } catch (err) {
      importError = err instanceof ApiError ? err.message : tr('board.importError');
    } finally {
      importLoading = false;
    }
  }

  // Checklist statistics for active sheet card
  const sheetChecklistDone = $derived(
    cardDetail?.checklist.filter((i) => i.done).length ?? 0
  );
  const sheetChecklistTotal = $derived(cardDetail?.checklist.length ?? 0);
  const sheetChecklistPct = $derived(
    sheetChecklistTotal > 0 ? Math.round((sheetChecklistDone / sheetChecklistTotal) * 100) : 0
  );
</script>

<svelte:head>
  <title>{workflow?.name ?? tr('board.title')} — Flowboard</title>
</svelte:head>

<div class="space-y-6">
  <!-- Top Navigation & Header Bar -->
  <header class="space-y-3">
    <Breadcrumb
      items={[
        { label: tr('common.workflows'), href: '/dashboard/workflows' },
        { label: workflow?.name ?? tr('board.title') }
      ]}
      showHomeIcon
    />

    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="ds-page-title text-ink tracking-tight">
          {workflow?.name ?? tr('board.title')}
        </h1>
        <p class="ds-caption text-mute">
          {tr('board.description')}{#if workflow?.ownerName} · {tr('common.pic')}: <span class="font-medium text-ink-soft">{workflow.ownerName}</span>{/if}
        </p>
      </div>

      <!-- Action Buttons Cluster -->
      <div class="flex flex-wrap items-center gap-2.5">
        <Button variant="secondary" size="sm" onclick={() => (importOpen = true)}>
          <HugeiconsIcon icon={Upload04Icon} size={16} strokeWidth={1.8} />
          <span>{tr('board.importCsv')}</span>
        </Button>

        <Button variant="primary" size="sm" onclick={openCreateModal} class="shadow-xs">
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
          <span>{tr('board.addCustomer')}</span>
        </Button>
      </div>
    </div>
  </header>

  <!-- PRIMARY 4-TAB BAR -->
  <div class="flex items-center justify-between border-b border-hairline">
    <div class="flex items-center gap-1 -mb-px overflow-x-auto">
      <!-- Tab 1: Statistik (Default) -->
      <button
        type="button"
        onclick={() => {
          activeTab = 'stats';
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('tab');
            window.history.replaceState({}, '', url.toString());
          }
        }}
        class={cn(
          'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap',
          activeTab === 'stats'
            ? 'border-primary text-primary'
            : 'border-transparent text-mute hover:text-ink hover:border-hairline-strong'
        )}
      >
        <HugeiconsIcon icon={DashboardSquare02Icon} size={16} strokeWidth={1.8} />
        <span>{tr('board.stats')}</span>
      </button>

      <!-- Tab 2: Kanban Board -->
      <button
        type="button"
        onclick={() => {
          activeTab = 'kanban';
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', 'kanban');
            window.history.replaceState({}, '', url.toString());
          }
        }}
        class={cn(
          'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap',
          activeTab === 'kanban'
            ? 'border-primary text-primary'
            : 'border-transparent text-mute hover:text-ink hover:border-hairline-strong'
        )}
      >
        <HugeiconsIcon icon={KanbanIcon} size={16} strokeWidth={1.8} />
        <span>{tr('board.kanban')}</span>
        {#if totalCards > 0}
          <span class={cn('rounded-full px-2 py-0.5 text-xs font-bold', activeTab === 'kanban' ? 'bg-primary-soft text-primary' : 'bg-lane text-mute')}>
            {totalCards}
          </span>
        {/if}
      </button>

      <!-- Tab 3: Table List -->
      <button
        type="button"
        onclick={() => {
          activeTab = 'table';
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', 'table');
            window.history.replaceState({}, '', url.toString());
          }
        }}
        class={cn(
          'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap',
          activeTab === 'table'
            ? 'border-primary text-primary'
            : 'border-transparent text-mute hover:text-ink hover:border-hairline-strong'
        )}
      >
        <HugeiconsIcon icon={Layers01Icon} size={16} strokeWidth={1.8} />
        <span>{tr('board.table')}</span>
        {#if totalCards > 0}
          <span class={cn('rounded-full px-2 py-0.5 text-xs font-bold', activeTab === 'table' ? 'bg-primary-soft text-primary' : 'bg-lane text-mute')}>
            {totalCards}
          </span>
        {/if}
      </button>

      <!-- Tab 4: Setup Stages -->
      <a
        href="/dashboard/workflows/{workflowId}/setup"
        class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-mute hover:text-ink hover:border-hairline-strong transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap"
      >
        <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.8} />
        <span>{tr('board.setupStages')}</span>
      </a>
    </div>
  </div>

  <!-- TAB CONTENT -->
  {#if activeTab === 'stats'}
    {#if stats && !loadingData}
      {@const totalActive = stats.totals.active ?? 0}
      {@const totalDone = stats.totals.done ?? 0}
      {@const totalAll = totalActive + totalDone}
      {@const maxStageCount = Math.max(...(stats.byStage.map((s) => s.total) ?? [1]), 1)}

      <section class="space-y-6 pt-2">
        <!-- Hero KPI 4-Cards Grid (Flowboard Light Aesthetic) -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Card 1: Pelanggan Aktif -->
          <div class="relative rounded-2xl border border-hairline bg-card p-5 shadow-card hover:shadow-card-hover transition-all duration-150 overflow-hidden space-y-3">
            <div class="absolute top-0 left-0 right-0 h-[3px] bg-primary"></div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-mute uppercase tracking-wider">{tr('board.statsActive')}</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary border border-primary-border/60 shadow-xs">
                <HugeiconsIcon icon={Layers01Icon} size={18} strokeWidth={1.8} />
              </div>
            </div>
            <div>
              <p class="text-3xl font-extrabold text-ink tracking-tight">{stats.totals.active}</p>
              <p class="text-[11px] text-mute mt-1">{tr('board.activeInPipeline') || 'Pelanggan aktif dalam alur kerja'}</p>
            </div>
          </div>

          <!-- Card 2: Menunggu Tindakan -->
          <div class="relative rounded-2xl border border-hairline bg-card p-5 shadow-card hover:shadow-card-hover transition-all duration-150 overflow-hidden space-y-3">
            <div class="absolute top-0 left-0 right-0 h-[3px] bg-status-progress"></div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-mute uppercase tracking-wider">{tr('board.statsWaiting')}</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-status-progress-soft text-status-progress-ink border border-status-progress/40 shadow-xs">
                <HugeiconsIcon icon={Clock01Icon} size={18} strokeWidth={1.8} />
              </div>
            </div>
            <div>
              <p class="text-3xl font-extrabold text-ink tracking-tight">{stats.totals.waiting}</p>
              <p class="text-[11px] text-mute mt-1">{tr('board.waitingActionDesc') || 'Menunggu maklum balas / semakan'}</p>
            </div>
          </div>

          <!-- Card 3: Tertunggak -->
          <div class="relative rounded-2xl border border-hairline bg-card p-5 shadow-card hover:shadow-card-hover transition-all duration-150 overflow-hidden space-y-3">
            <div class="absolute top-0 left-0 right-0 h-[3px] bg-status-urgent"></div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-mute uppercase tracking-wider">{tr('board.statsOverdue')}</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-status-urgent-soft text-status-urgent-ink border border-status-urgent/40 shadow-xs">
                <HugeiconsIcon icon={Alert02Icon} size={18} strokeWidth={1.8} />
              </div>
            </div>
            <div>
              <p class="text-3xl font-extrabold text-ink tracking-tight">{stats.totals.overdue}</p>
              <p class="text-[11px] text-mute mt-1">{tr('board.overdueDesc') || 'Melebihi had masa tindak balas'}</p>
            </div>
          </div>

          <!-- Card 4: Selesai -->
          <div class="relative rounded-2xl border border-hairline bg-card p-5 shadow-card hover:shadow-card-hover transition-all duration-150 overflow-hidden space-y-3">
            <div class="absolute top-0 left-0 right-0 h-[3px] bg-status-done"></div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-mute uppercase tracking-wider">{tr('board.statsDone')}</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-status-done-soft text-status-done-ink border border-status-done/40 shadow-xs">
                <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={1.8} />
              </div>
            </div>
            <div>
              <p class="text-3xl font-extrabold text-ink tracking-tight">{stats.totals.done}</p>
              <p class="text-[11px] text-mute mt-1">
                {#if totalAll > 0}
                  {Math.round((totalDone / totalAll) * 100)}% {tr('board.completionRate') || 'kadar selesai'}
                {:else}
                  {tr('board.completedDesc') || 'Berjaya diselesaikan'}
                {/if}
              </p>
            </div>
          </div>
        </div>

        <!-- Middle Grid: Distribution by Stage & Team Workload -->
        <div class="grid gap-5 lg:grid-cols-2">
          <!-- Card 1: Taburan Mengikut Peringkat -->
          <div class="rounded-2xl border border-hairline bg-card p-5 shadow-card space-y-4">
            <div class="flex items-center justify-between border-b border-hairline/60 pb-3">
              <div class="flex items-center gap-2">
                <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary border border-primary-border/60">
                  <HugeiconsIcon icon={BarChartIcon} size={15} strokeWidth={2} />
                </div>
                <h3 class="text-sm font-bold text-ink">{tr('board.statsByStage')}</h3>
              </div>
              <span class="rounded-full bg-lane border border-hairline px-2.5 py-0.5 text-xs font-semibold text-mute">
                {stats.byStage.length} {stats.byStage.length === 1 ? 'peringkat' : 'peringkat'}
              </span>
            </div>

            <div class="space-y-3.5 pt-1">
              {#if stats.byStage.length === 0}
                <p class="text-xs text-mute py-4 text-center">{tr('board.noStages')}</p>
              {:else}
                {#each stats.byStage as stage (stage.stageId)}
                  {@const pct = totalActive > 0 ? Math.round((stage.total / totalActive) * 100) : 0}
                  {@const barPct = Math.round((stage.total / maxStageCount) * 100)}
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="font-bold text-ink truncate">{stage.stageName}</span>
                        {#if stage.overdue > 0}
                          <span class="inline-flex items-center rounded-full bg-status-urgent-soft text-status-urgent-ink border border-status-urgent/30 px-1.5 py-0.2 text-[10px] font-semibold">
                            {stage.overdue} {tr('board.statsOverdue').toLowerCase()}
                          </span>
                        {/if}
                      </div>
                      <div class="flex items-center gap-2 shrink-0 font-medium">
                        <span class="text-ink font-bold">{stage.total}</span>
                        <span class="text-mute text-[11px]">({pct}%)</span>
                      </div>
                    </div>

                    <!-- Progress Bar Track -->
                    <div class="h-2 w-full rounded-full bg-lane overflow-hidden border border-hairline/50">
                      <div
                        class="h-full rounded-full bg-primary transition-all duration-300"
                        style="width: {barPct}%;"
                      ></div>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>

          <!-- Card 2: Beban Kerja PIC Pasukan -->
          <div class="rounded-2xl border border-hairline bg-card p-5 shadow-card space-y-4">
            <div class="flex items-center justify-between border-b border-hairline/60 pb-3">
              <div class="flex items-center gap-2">
                <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary border border-primary-border/60">
                  <HugeiconsIcon icon={UserGroupIcon} size={15} strokeWidth={2} />
                </div>
                <h3 class="text-sm font-bold text-ink">{tr('board.statsByAssignee')}</h3>
              </div>
              <span class="rounded-full bg-lane border border-hairline px-2.5 py-0.5 text-xs font-semibold text-mute">
                {stats.byAssignee.length} PIC
              </span>
            </div>

            <div class="space-y-3 pt-1">
              {#if stats.byAssignee.length === 0}
                <p class="text-xs text-mute py-4 text-center">{tr('board.unassigned')}</p>
              {:else}
                {#each stats.byAssignee as assignee (assignee.assigneeId ?? 'unassigned')}
                  <div class="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-canvas-sunken/60 p-3 text-xs transition-colors hover:bg-card">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <Avatar name={assignee.assigneeName ?? tr('board.statsUnassigned')} size={28} />
                      <div class="min-w-0">
                        <p class="font-bold text-ink truncate text-xs">
                          {assignee.assigneeName ?? tr('board.statsUnassigned')}
                        </p>
                        <p class="text-[10px] text-mute truncate">{assignee.active} {tr('board.statsActive').toLowerCase()}</p>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5 shrink-0">
                      <Badge tone="queued" variant="soft" class="text-[10px] font-semibold">
                        {assignee.active} {tr('board.statsActive').toLowerCase()}
                      </Badge>
                      {#if assignee.waiting > 0}
                        <Badge tone="progress" variant="soft" class="text-[10px] font-semibold">
                          {assignee.waiting} {tr('board.statsWaiting').toLowerCase()}
                        </Badge>
                      {/if}
                      {#if assignee.overdue > 0}
                        <Badge tone="urgent" variant="soft" class="text-[10px] font-semibold">
                          {assignee.overdue} {tr('board.statsOverdue').toLowerCase()}
                        </Badge>
                      {/if}
                      {#if assignee.done > 0}
                        <Badge tone="done" variant="soft" class="text-[10px] font-semibold">
                          {assignee.done} {tr('board.statsDone').toLowerCase()}
                        </Badge>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </div>

        <!-- Bottom Card: Aktiviti Mengikut Garis Masa -->
        <div class="rounded-2xl border border-hairline bg-card p-5 shadow-card space-y-4">
          <div class="flex items-center justify-between border-b border-hairline/60 pb-3">
            <div class="flex items-center gap-2">
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary border border-primary-border/60">
                <HugeiconsIcon icon={Calendar03Icon} size={15} strokeWidth={2} />
              </div>
              <h3 class="text-sm font-bold text-ink">{tr('board.statsByTime')}</h3>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            {#each stats.byTime as bucket (bucket.bucket)}
              {@const periodLabel = bucket.bucket === '7d' ? tr('board.statsLast7d') : bucket.bucket === '30d' ? tr('board.statsLast30d') : tr('board.statsLast90d')}
              <div class="rounded-xl border border-hairline bg-canvas-sunken/60 hover:bg-card p-4 text-xs space-y-3 transition-all duration-150 shadow-xs">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-ink bg-card border border-hairline px-2.5 py-0.5 rounded-lg text-[11px] shadow-xs">
                    {periodLabel}
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-3 pt-1">
                  <div class="rounded-lg bg-card border border-hairline p-2.5 space-y-0.5">
                    <div class="flex items-center gap-1 text-mute text-[10px]">
                      <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} class="text-primary" />
                      <span>{tr('board.statsCreated')}</span>
                    </div>
                    <p class="text-xl font-extrabold text-ink tracking-tight">{bucket.created}</p>
                  </div>

                  <div class="rounded-lg bg-card border border-hairline p-2.5 space-y-0.5">
                    <div class="flex items-center gap-1 text-mute text-[10px]">
                      <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2} class="text-status-done-ink" />
                      <span>{tr('board.statsCompleted')}</span>
                    </div>
                    <p class="text-xl font-extrabold text-status-done-ink tracking-tight">{bucket.completed}</p>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </section>
    {:else}
      <!-- Full Skeleton Loading Layout -->
      <div class="space-y-6 pt-2">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {#each [1, 2, 3, 4] as _i}
            <div class="rounded-2xl border border-hairline bg-card p-5 space-y-3 shadow-card">
              <div class="flex justify-between items-center">
                <Skeleton shape="rect" class="h-4 w-20 rounded-md" />
                <Skeleton shape="rect" class="h-9 w-9 rounded-xl" />
              </div>
              <Skeleton shape="rect" class="h-8 w-16 rounded-md" />
              <Skeleton shape="rect" class="h-3 w-32 rounded-md" />
            </div>
          {/each}
        </div>
        <div class="grid gap-5 lg:grid-cols-2">
          <div class="rounded-2xl border border-hairline bg-card p-5 space-y-4 shadow-card">
            <Skeleton shape="rect" class="h-6 w-36 rounded-md" />
            <Skeleton shape="rect" class="h-16 w-full rounded-xl" />
            <Skeleton shape="rect" class="h-16 w-full rounded-xl" />
          </div>
          <div class="rounded-2xl border border-hairline bg-card p-5 space-y-4 shadow-card">
            <Skeleton shape="rect" class="h-6 w-36 rounded-md" />
            <Skeleton shape="rect" class="h-16 w-full rounded-xl" />
            <Skeleton shape="rect" class="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <!-- TAB 2 (KANBAN) OR TAB 3 (TABLE): FILTER BAR -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-hairline pb-3">
      <!-- Search & Filters -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="w-full sm:w-60">
          <SearchInput
            bind:value={searchQuery}
            placeholder={tr('board.searchPlaceholder')}
            size="sm"
          />
        </div>

        <!-- Member Filter Pill -->
        {#if members.length > 0}
          <select
            bind:value={selectedMemberFilter}
            class="h-8 rounded-lg border border-hairline bg-card px-2.5 text-xs text-ink shadow-control transition-colors hover:border-hairline-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            aria-label={tr('board.filterMember')}
          >
            <option value="all">{tr('board.allMembers')}</option>
            <option value="unassigned">{tr('common.unassigned')}</option>
            {#each members as member (member.id)}
              <option value={member.id}>{member.name}</option>
            {/each}
          </select>
        {/if}

        <!-- Tag / WhatsApp Error Status Filter Pill -->
        <select
          bind:value={selectedTagFilter}
          class="h-8 rounded-lg border border-hairline bg-card px-2.5 text-xs text-ink shadow-control transition-colors hover:border-hairline-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          aria-label={tr('board.filterStatus')}
        >
          <option value="all">{tr('board.allStatus')}</option>
          <option value="needs_attention">{tr('home.needsAction')}</option>
          <option value="wa_error">{tr('board.waError')}</option>
          <option value="followup_stopped">{tr('board.followupStopped')}</option>
          <option value="healthy">{tr('board.healthy')}</option>
        </select>
      </div>
    </div>

    <!-- Filter Active Summary notice -->
    {#if isFilterActive}
      <div class="flex items-center justify-between px-1 text-xs text-mute">
        <span>
          {tr('board.showingFiltered', { filtered: totalFilteredCount, total: totalCards })}
        </span>
        <button
          type="button"
          onclick={resetFilters}
          class="text-primary hover:underline font-medium"
        >
          {tr('board.resetFilter')}
        </button>
      </div>
    {/if}

    <!-- Main View Area: Board vs Table -->
    {#if loadingData}
      <div class="flex gap-4 overflow-x-auto pb-4">
        {#each [1, 2, 3] as _i}
          <div class="w-80 shrink-0 rounded-2xl border border-hairline bg-canvas-sunken p-4 space-y-3">
            <Skeleton shape="rect" class="h-5 w-24 rounded-md" />
            <Skeleton shape="rect" class="h-28 w-full rounded-xl" />
            <Skeleton shape="rect" class="h-28 w-full rounded-xl" />
          </div>
        {/each}
      </div>
    {:else if board.length === 0}
      <EmptyStateBlock
        title={tr('board.empty')}
        description={tr('board.emptyDescription')}
        actionLabel={tr('board.setupStages')}
        onaction={() => (window.location.href = `/dashboard/workflows/${workflowId}/setup`)}
      />
    {:else if activeTab === 'kanban'}
      <!-- Kanban Board View -->
      {#if isFilterActive && totalFilteredCount === 0}
        <div class="rounded-2xl border border-hairline bg-card p-12 text-center shadow-card">
          <p class="ds-section-title text-ink">{tr('common.noResults')}</p>
          <p class="ds-caption mt-1 text-mute">{tr('board.noFilterResults')}</p>
          <Button variant="secondary" size="sm" class="mt-4" onclick={resetFilters}>
            {tr('board.resetFilter')}
          </Button>
        </div>
      {:else}
        <div class="w-full">
          <KanbanBoard
            columns={filteredColumns}
            oncardmove={handleCardMove}
            oncardclick={openCard}
            onadd={() => openCreateModal()}
            onaddcard={() => openCreateModal()}
            addLabel={tr('board.addCard')}
            emptyTitle={tr('board.noCustomersInStage')}
            emptyDropHint={tr('board.dropCardHere')}
            waErrorLabel={tr('board.waError')}
            class="min-h-[500px]"
          />
        </div>
      {/if}
    {:else if activeTab === 'table'}
      <!-- Data Table View -->
      <div class="rounded-2xl border border-hairline bg-card shadow-card overflow-hidden">
        {#if tableRows.length === 0}
          <div class="p-12 text-center">
            <p class="ds-section-title text-ink">{tr('common.noResults')}</p>
            <p class="ds-caption mt-1 text-mute">{tr('board.noFilterResults')}</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-left text-sm">
              <thead class="border-b border-hairline bg-canvas-sunken text-xs font-semibold text-mute">
                <tr>
                  <th class="px-5 py-3">{tr('common.customer')}</th>
                  <th class="px-5 py-3">{tr('common.whatsapp')}</th>
                  <th class="px-5 py-3">{tr('common.stage')}</th>
                  <th class="px-5 py-3">{tr('common.pic')}</th>
                  <th class="px-5 py-3">{tr('common.checklist')}</th>
                  <th class="px-5 py-3">{tr('common.status')}</th>
                  <th class="px-5 py-3 text-right">{tr('common.actions')}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-hairline">
                {#each tableRows as row (row.id)}
                  {@const isDone = row.checklistTotal > 0 && row.checklistDone === row.checklistTotal}
                  <tr class="transition-colors hover:bg-canvas-sunken/60">
                    <td class="px-5 py-3.5 font-medium text-ink">
                      {row.customerName}
                      {#if row.product}
                        <span class="block text-xs text-mute font-normal">{row.product}</span>
                      {/if}
                    </td>
                    <td class="px-5 py-3.5 text-mute">{row.customerWa}</td>
                    <td class="px-5 py-3.5">
                      <Badge tone={row.stageColor === 'emerald' ? 'done' : row.stageColor === 'amber' ? 'progress' : row.stageColor === 'rose' ? 'urgent' : 'queued'}>
                        {row.stageName}
                      </Badge>
                    </td>
                    <td class="px-5 py-3.5 text-mute">
                      {#if row.assigneeName}
                        <div class="flex items-center gap-1.5">
                          <Avatar name={row.assigneeName} size={18} />
                          <span class="text-xs font-medium">{row.assigneeName}</span>
                        </div>
                      {:else}
                        <span class="text-xs text-mute">{tr('board.unassigned')}</span>
                      {/if}
                    </td>
                    <td class="px-5 py-3.5 text-mute">
                      {#if row.checklistTotal > 0}
                        <span class="ds-caption font-semibold {isDone ? 'text-status-done-ink' : 'text-ink'}">
                          {row.checklistDone} / {row.checklistTotal} {isDone ? '✓' : ''}
                        </span>
                      {:else}
                        <span class="text-mute">—</span>
                      {/if}
                    </td>
                    <td class="px-5 py-3.5">
                      {#if row.waErrorFlag}
                        <Badge tone="urgent">{tr('board.waError')}</Badge>
                      {:else}
                        <Badge tone="done">{tr('board.healthy')}</Badge>
                      {/if}
                    </td>
                    <td class="px-5 py-3.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onclick={() => openCard(row.stageId, row.id)}
                      >
                        {tr('board.detail')}
                      </Button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<!-- Customer Detail Drawer (Sheet) -->
<Sheet
  open={isSheetOpen}
  onclose={closeSheet}
  title={cardDetail?.customer?.name ?? tr('board.cardDetail')}
>
  {#if detailLoading}
    <div class="space-y-4 py-4">
      <Skeleton shape="rect" class="h-6 w-32 rounded-md" />
      <Skeleton shape="rect" class="h-10 w-full rounded-xl" />
      <Skeleton shape="rect" class="h-24 w-full rounded-2xl" />
    </div>
  {:else if cardDetail}
    <div class="space-y-5 pb-6">
      <!-- WhatsApp Alert Banner -->
      {#if cardDetail.waErrorFlag || cardDetail.waFollowupsStopped}
        <div class="rounded-xl border border-status-urgent/30 bg-status-urgent-soft p-3.5 text-xs space-y-1 shadow-xs">
          <div class="flex items-center gap-1.5 font-bold text-status-urgent-ink">
            <HugeiconsIcon icon={Alert02Icon} size={15} strokeWidth={2} />
            <span>
              {#if cardDetail.waErrorFlag}
                {tr('board.whatsappFailed')}
              {:else}
                {tr('board.followupStoppedMsg')}
              {/if}
            </span>
          </div>
          <p class="text-status-urgent-ink/80 text-[11px] leading-relaxed pl-5">
            {tr('board.manualHint')}
          </p>
        </div>
      {/if}

      {#if detailError}
        <div class="rounded-xl border border-status-urgent/25 bg-status-urgent-soft p-3 text-xs font-semibold text-status-urgent-ink">
          {detailError}
        </div>
      {/if}

      <!-- Customer Hero Profile Card -->
      <section class="rounded-2xl border border-hairline bg-card p-4 shadow-card space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <Avatar name={cardDetail.customer?.name} size={46} class="shrink-0 ring-2 ring-hairline shadow-xs" />
            <div class="min-w-0">
              <h2 class="text-base font-bold text-ink truncate leading-tight">
                {cardDetail.customer?.name ?? tr('board.cardDetail')}
              </h2>
              <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {#if cardDetail.stage}
                  <Badge
                    tone={cardDetail.stage.color === 'emerald' ? 'done' : cardDetail.stage.color === 'amber' ? 'progress' : cardDetail.stage.color === 'rose' ? 'urgent' : 'queued'}
                    variant="soft"
                    class="text-[10px] font-semibold px-2 py-0.2"
                  >
                    {cardDetail.stage.name}
                  </Badge>
                {/if}
                {#if cardDetail.card.tag}
                  <Badge tone={resolveTone(cardDetail.card.tag)} variant="soft" class="text-[10px] font-semibold px-2 py-0.2">
                    {cardDetail.card.tag}
                  </Badge>
                {/if}
              </div>
            </div>
          </div>

          {#if cardDetail.customer?.wa}
            <a
              href="https://wa.me/{cleanPhone(cardDetail.customer.wa)}"
              target="_blank"
              rel="noreferrer"
              class="flex items-center gap-1.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white px-3.5 py-1.5 text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0"
            >
              <HugeiconsIcon icon={WhatsappIcon} size={15} strokeWidth={2} />
              <span>{tr('board.chatWhatsApp')}</span>
            </a>
          {/if}
        </div>
      </section>

      <!-- Customer Details Grid Card -->
      <section class="rounded-2xl border border-hairline bg-canvas-sunken/70 p-3.5 space-y-2.5 text-xs shadow-xs">
        <div class="flex items-center justify-between gap-2">
          <span class="text-mute font-medium">{tr('board.customerNumber')}</span>
          {#if cardDetail.customer?.wa}
            <div class="flex items-center gap-1 font-mono font-semibold text-ink">
              <span>{cardDetail.customer.wa}</span>
              <CopyToClipboard value={cardDetail.customer.wa} />
            </div>
          {:else}
            <span class="text-mute">—</span>
          {/if}
        </div>

        {#if cardDetail.card.product}
          <div class="flex items-center justify-between gap-2 border-t border-hairline/60 pt-2">
            <span class="text-mute font-medium">{tr('board.productService')}</span>
            <span class="font-semibold text-ink">{cardDetail.card.product}</span>
          </div>
        {/if}

        <div class="flex items-center justify-between gap-2 border-t border-hairline/60 pt-2">
          <span class="text-mute font-medium">{tr('board.assigneeCustomer')}</span>
          <div class="flex items-center gap-2">
            <select
              id="assignee-select"
              disabled={assigneeLoading}
              value={cardDetail.card.assigneeId ?? ''}
              onchange={(e) => {
                const val = (e.target as HTMLSelectElement).value;
                updateAssignee(val || null);
              }}
              class="h-8 rounded-lg border border-hairline bg-card px-2 text-xs font-semibold text-ink shadow-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 cursor-pointer"
            >
              <option value="">{tr('board.unassigned')}</option>
              {#each members as member (member.id)}
                <option value={member.id}>{member.name}</option>
              {/each}
            </select>
          </div>
        </div>
      </section>

      <!-- Interactive Stage Checklist Section -->
      <section class="space-y-3 rounded-2xl border border-hairline bg-card p-4 shadow-card">
        <div class="flex items-center justify-between gap-2">
          <div class="space-y-0.5">
            <div class="flex items-center gap-1.5">
              <HugeiconsIcon icon={CheckListIcon} size={16} strokeWidth={2} class="text-primary" />
              <h3 class="text-xs font-bold text-ink uppercase tracking-wider">
                {tr('board.checklistStage', { stage: cardDetail.stage?.name ?? '' })}
              </h3>
            </div>
            <p class="text-[11px] text-mute">
              {tr('board.checklistHint')}
            </p>
          </div>
          <span class="rounded-full border border-hairline bg-lane px-2.5 py-0.5 text-xs font-bold text-ink-soft shrink-0">
            {sheetChecklistDone}/{sheetChecklistTotal}
          </span>
        </div>

        {#if sheetChecklistTotal > 0}
          <div class="h-2 w-full rounded-full bg-lane overflow-hidden border border-hairline/50">
            <div
              class="h-full rounded-full transition-all duration-300 {sheetChecklistPct === 100 ? 'bg-status-done' : 'bg-primary'}"
              style="width: {sheetChecklistPct}%;"
            ></div>
          </div>
        {/if}

        {#if cardDetail.checklist.length === 0}
          <div class="rounded-xl border border-dashed border-hairline bg-canvas-sunken/50 p-4 text-center">
            <p class="text-xs text-mute font-medium">{tr('board.noChecklist')}</p>
          </div>
        {:else}
          <ul class="space-y-2 pt-1">
            {#each cardDetail.checklist as item (item.id)}
              <li class="flex items-start gap-3 rounded-xl border border-hairline bg-canvas-sunken/40 hover:bg-card p-3 shadow-xs transition-all">
                <Checkbox
                  checked={item.done}
                  onchange={(e) => toggleItem(item.id, e.currentTarget.checked)}
                  class="mt-0.5"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold text-ink transition-colors {item.done ? 'line-through text-mute' : ''}">
                    {item.label}
                  </p>
                  {#if item.required}
                    <span class="inline-block mt-0.5 text-[10px] font-semibold text-primary-ink bg-primary-soft border border-primary-border/40 px-1.5 py-0.2 rounded-md">
                      {tr('board.requiredItem')}
                    </span>
                  {/if}
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <!-- Stage Progression / Movement Section -->
      <section class="space-y-3 rounded-2xl border border-hairline bg-card p-4 shadow-card">
        <span class="text-xs font-bold text-ink uppercase tracking-wider block">{tr('board.moveToStage')}</span>
        <div class="flex flex-wrap gap-2 pt-0.5">
          {#each board as col (col.id)}
            {@const isCurrent = col.id === cardDetail.stage?.id}
            <Button
              variant={isCurrent ? 'primary' : 'secondary'}
              size="sm"
              disabled={isCurrent || moveLoading}
              onclick={() => moveStage(col.id)}
              class="rounded-xl text-xs font-semibold shadow-xs {isCurrent ? 'opacity-90 cursor-default' : ''}"
            >
              <span>{col.name}</span>
              {#if !isCurrent}
                <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} />
              {/if}
            </Button>
          {/each}
        </div>
      </section>

      <!-- Next Workflow Handoff Section -->
      {#if cardDetail.nextWorkflow}
        <section class="rounded-2xl border border-primary-border/70 bg-primary-soft/40 p-4 shadow-card space-y-2.5">
          <div class="flex items-center gap-1.5 text-primary-ink font-bold text-xs">
            <HugeiconsIcon icon={Layers01Icon} size={15} strokeWidth={2} />
            <span>{tr('board.handoffNext')}</span>
          </div>
          <p class="text-xs text-mute">
            {tr('board.handoffDescription')}
          </p>
          <Button
            variant="primary"
            size="sm"
            loading={relayLoading}
            onclick={relayToNextWorkflow}
            class="w-full justify-center shadow-xs"
          >
            <HugeiconsIcon icon={Layers01Icon} size={15} strokeWidth={1.8} />
            <span>{tr('board.continueTo', { name: cardDetail.nextWorkflow.name })}</span>
          </Button>
        </section>
      {/if}

      <!-- Danger Action Section -->
      {#if canManage}
        <section class="pt-2">
          <Button
            variant="destructive"
            size="sm"
            loading={deleteLoading}
            onclick={requestDeleteCard}
            class="w-full justify-center shadow-xs"
          >
            <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
            <span>{tr('board.deleteCard')}</span>
          </Button>
        </section>
      {/if}
    </div>
  {/if}
</Sheet>

<ConfirmDialog
  open={cardToDelete !== null}
  title={tr('board.deleteCardTitle', { name: cardToDelete?.name ?? '' })}
  description={tr('board.deleteCardDescription')}
  confirmLabel={tr('board.deleteCardConfirm')}
  cancelLabel={tr('common.cancel')}
  destructive
  loading={deleteLoading}
  onconfirm={deleteCardConfirmed}
  oncancel={() => (cardToDelete = null)}
/>

<!-- Modal: Tambah Pelanggan Baru -->
<Dialog
  bind:open={createOpen}
  title={tr('board.addCustomerTitle')}
  description={tr('board.addCustomerDescription')}
  size="md"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      createCard();
    }}
    class="space-y-4 py-2"
  >
    <FormField label={tr('board.customerName')} required>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={customerName}
          placeholder={tr('board.customerNamePlaceholder')}
          autofocus
          required
        />
      {/snippet}
    </FormField>

    <FormField label={tr('board.phone')} required helper={tr('board.phoneHelper')}>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={customerWa}
          placeholder="60123456789"
          required
        />
      {/snippet}
    </FormField>

    <FormField label={tr('board.productSourceLabel')} helper={tr('board.productSourceHelper')}>
      {#snippet control(args)}
        <Input {...args} bind:value={product} placeholder="April webinar" />
      {/snippet}
    </FormField>

    <FormField label={tr('board.tagLabel')} helper={tr('board.tagHelper')}>
      {#snippet control(args)}
        <Input {...args} bind:value={tag} placeholder="Urgent, VIP, Promo" />
      {/snippet}
    </FormField>

    <FormField label={tr('board.assigneeOptional')}>
      {#snippet control(args)}
        <select
          {...args}
          bind:value={createAssigneeId}
          class="h-10 w-full rounded-full border border-hairline bg-card px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="">{tr('board.autoDefaultAssignee')}</option>
          {#each members as member (member.id)}
            <option value={member.id}>{member.name} ({member.email})</option>
          {/each}
        </select>
      {/snippet}
    </FormField>

    {#if createError}
      <div class="rounded-xl border border-status-urgent/25 bg-status-urgent-soft p-3 text-xs font-semibold text-status-urgent-ink">
        {createError}
      </div>
    {/if}

    <div class="flex justify-end gap-2.5 pt-2">
      <Button variant="secondary" onclick={() => (createOpen = false)}>
        {tr('common.cancel')}
      </Button>
      <Button
        variant="primary"
        type="submit"
        loading={createLoading}
        disabled={!customerName.trim() || !customerWa.trim() || createLoading}
      >
        <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
        <span>{tr('board.saveCustomer')}</span>
      </Button>
    </div>
  </form>
</Dialog>

<!-- Modal: Import CSV -->
<Dialog
  bind:open={importOpen}
  title={tr('board.importTitle')}
  description={tr('board.importDescription')}
>
  <div class="space-y-4">
    <!-- Format Sample Box -->
    <div class="rounded-2xl border border-hairline bg-canvas-sunken p-4 space-y-1.5 text-xs text-mute">
      <p class="font-semibold text-ink">{tr('board.rowFormat')}</p>
      <code class="block rounded-lg border border-hairline bg-card p-2 font-mono text-[11px] text-ink">
        Customer, WhatsApp, Product, Tag
      </code>
      <p class="pt-1 text-[11px]">
        {tr('board.example')} <code>Siti Aminah, 60123456789, April webinar, VIP</code>
      </p>
    </div>

    <!-- Mode Selector -->
    <FormField label={tr('board.duplicateOption')}>
      {#snippet control(args)}
        <select
          {...args}
          bind:value={importMode}
          class="h-10 w-full rounded-full border border-hairline bg-card px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="skip">{tr('board.duplicateSkip')}</option>
          <option value="update">{tr('board.duplicateUpdate')}</option>
        </select>
      {/snippet}
    </FormField>

    <!-- CSV Input Area -->
    <FormField label={tr('board.csvData')} required>
      {#snippet control(args)}
        <textarea
          {...args}
          bind:value={importCsv}
          rows={6}
          placeholder={`Siti Aminah, 60123456789, April webinar, VIP\nAhmad Dahlan, 601298765432, Onboarding, Urgent`}
          class="w-full rounded-2xl border border-hairline bg-card p-3 font-mono text-xs text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        ></textarea>
      {/snippet}
    </FormField>

    {#if importError}
      <div class="rounded-xl border border-status-urgent/25 bg-status-urgent-soft p-3 text-xs font-semibold text-status-urgent-ink">
        {importError}
      </div>
    {/if}

    <!-- Result Box -->
    {#if importResult}
      <div class="rounded-2xl border border-hairline bg-canvas-sunken p-4 text-xs space-y-2">
        <p class="font-bold text-ink">{tr('board.importReport')}</p>
        <div class="flex flex-wrap gap-3">
          <span class="rounded-full bg-status-done-soft px-3 py-1 font-semibold text-status-done-ink">
            ✓ {tr('board.created')}: {importResult.created}
          </span>
          <span class="rounded-full bg-status-progress-soft px-3 py-1 font-semibold text-status-progress-ink">
            ↻ {tr('board.updated')}: {importResult.updated}
          </span>
          <span class="rounded-full bg-status-idle-soft px-3 py-1 font-semibold text-status-idle-ink">
            {tr('board.skipped')}: {importResult.skipped}
          </span>
        </div>

        {#if importResult.errors.length > 0}
          <div class="mt-2 rounded-xl border border-status-urgent/25 bg-status-urgent-soft p-3">
            <p class="font-bold text-status-urgent-ink">{tr('board.errors', { count: importResult.errors.length })}</p>
            <ul class="mt-1 list-disc pl-4 space-y-0.5 text-status-urgent-ink">
              {#each importResult.errors as err}
                <li>{tr('board.row', { row: err.row, reason: err.reason })}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <div class="flex justify-end gap-2.5">
      <Button variant="secondary" onclick={() => (importOpen = false)}>
        {tr('common.close')}
      </Button>
      <Button variant="primary" loading={importLoading} onclick={importCustomers}>
        {tr('board.processImport')}
      </Button>
    </div>
  {/snippet}
</Dialog>

<!-- Snippets for View Tabs -->
{#snippet kanbanIconSnippet()}
  <HugeiconsIcon icon={KanbanIcon} size={16} strokeWidth={1.8} />
{/snippet}

{#snippet tableIconSnippet()}
  <HugeiconsIcon icon={Layers01Icon} size={16} strokeWidth={1.8} />
{/snippet}

