<script lang="ts">
  import { page } from '$app/state';
  import {
    api,
    ApiError,
    type ApiCardDetail,
    type ApiWorkflow,
    type ApiDashboardStats,
    type ApiWorkspaceMember,
    type ApiBoardColumn
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
    toast
  } from '$lib/components/molecules/index.js';
  import { ConfirmDialog, Dialog, KanbanBoard, Sheet, DataTable } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    Upload04Icon,
    Settings01Icon,
    KanbanIcon,
    CheckmarkCircle02Icon,
    CheckListIcon,
    ArrowRight01Icon,
    WhatsappIcon,
    Layers01Icon,
    Delete02Icon,
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

  // View mode: kanban board vs table list
  let viewMode = $state<'board' | 'table'>('board');
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
      const [boardRes, workflowsRes, membersRes] = await Promise.all([
        api.getWorkflowBoard(data.workspace.id, workflowId),
        api.listWorkflows(data.workspace.id),
        api.listWorkspaceMembers(data.workspace.id).catch(() => ({ members: [] }))
      ]);
      board = boardRes.board?.columns ?? [];
      workflow = workflowsRes.workflows?.find((w) => w.id === workflowId) ?? null;
      members = membersRes.members ?? [];
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
    } catch (err) {
      createError = err instanceof ApiError ? err.message : tr('board.createError');
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
        <Button
          href="/dashboard/workflows/{workflowId}/setup"
          variant="secondary"
          size="sm"
        >
          <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.8} />
          <span>{tr('board.setupStages')}</span>
        </Button>

        <Button variant="secondary" size="sm" onclick={() => (importOpen = true)}>
          <HugeiconsIcon icon={Upload04Icon} size={16} strokeWidth={1.8} />
          <span>{tr('board.importCsv')}</span>
        </Button>

        <Button variant="primary" size="sm" onclick={openCreateModal}>
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
          <span>{tr('board.addCustomer')}</span>
        </Button>
      </div>
    </div>
  </header>

  <!-- Clean View Controls & Filter Toolbar -->
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-hairline pb-3">
    <!-- View Switcher Tabs -->
    <Tabs
      variant="underline"
      bind:value={viewMode}
      items={[
        {
          value: 'board',
          label: tr('board.kanban'),
          icon: kanbanIconSnippet
        },
        {
          value: 'table',
          label: tr('board.table'),
          icon: tableIconSnippet,
          badge: totalCards > 0 ? String(totalCards) : undefined
        }
      ]}
      class="border-b-0"
    />

    <!-- Search & Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="w-full sm:w-60">
        <SearchInput
          bind:value={searchQuery}
          placeholder={tr('board.search')}
          size="sm"
          submit={false}
        />
      </div>

      <select
        bind:value={selectedMemberFilter}
        class="h-8.5 rounded-full border border-hairline bg-card px-3 text-xs font-medium text-ink shadow-control outline-none transition-colors hover:border-hairline-strong focus:border-primary focus:ring-2 focus:ring-primary/15"
        aria-label={tr('board.filterAssignee')}
      >
        <option value="all">{tr('board.allAssignees')}</option>
        <option value="unassigned">{tr('board.unassigned')}</option>
        {#each members as member (member.id)}
          <option value={member.id}>{member.name}</option>
        {/each}
      </select>

      {#if availableTags.length > 0}
        <select
          bind:value={selectedTagFilter}
          class="h-8.5 rounded-full border border-hairline bg-card px-3 text-xs font-medium text-ink shadow-control outline-none transition-colors hover:border-hairline-strong focus:border-primary focus:ring-2 focus:ring-primary/15"
          aria-label={tr('board.filterTag')}
        >
          <option value="all">{tr('board.allTags')}</option>
          {#each availableTags as t (t)}
            <option value={t}>{t}</option>
          {/each}
        </select>
      {/if}

      {#if isFilterActive}
        <Button variant="ghost" size="sm" onclick={resetFilters} class="h-8.5 text-xs text-mute hover:text-ink">
          {tr('board.resetFilter')}
        </Button>
      {/if}
    </div>
  </div>

  <!-- Filter Active Summary notice -->
  {#if isFilterActive}
    <div class="flex items-center justify-between px-1 text-xs text-mute">
      <span>
        {tr('board.showing', { shown: totalFilteredCount, total: totalCards })}
      </span>
      <button
        type="button"
        onclick={resetFilters}
        class="font-semibold text-primary hover:underline"
      >
        {tr('board.clearFilter')}
      </button>
    </div>
  {/if}

  <!-- Main View Area: Board vs Table -->
  {#if loadingData}
    <div class="flex gap-4 overflow-x-auto pb-4">
      {#each [1, 2, 3] as _i}
        <div class="flex w-lane shrink-0 flex-col rounded-lane bg-lane p-4 space-y-3">
          <div class="flex items-center justify-between">
            <Skeleton shape="rect" class="h-6 w-28 rounded-md" />
            <Skeleton shape="rect" class="h-6 w-12 rounded-full" />
          </div>
          <Skeleton shape="rect" class="h-11 w-full rounded-full bg-card" />
          <Skeleton shape="rect" class="h-28 w-full rounded-xl bg-card shadow-card" />
          <Skeleton shape="rect" class="h-28 w-full rounded-xl bg-card shadow-card" />
        </div>
      {/each}
    </div>
  {:else if board.length === 0}
    <EmptyStateBlock
      title={tr('board.noStages')}
      description={tr('board.noStagesDescription')}
      actionLabel={tr('board.setupStageChecklist')}
      onaction={() => (window.location.href = `/dashboard/workflows/${workflowId}/setup`)}
    />
  {:else if viewMode === 'board'}
    <!-- Kanban Board View -->
    {#if isFilterActive && totalFilteredCount === 0}
      <div class="rounded-2xl border border-hairline bg-card p-12 text-center shadow-card">
        <EmptyStateBlock
          title={tr('board.noMatchingCustomers')}
          description={tr('board.noMatchingDescription')}
          actionLabel={tr('board.resetAllFilters')}
          onaction={resetFilters}
          class="!border-0 !shadow-none"
        />
      </div>
    {:else}
      <div class="w-full">
        <KanbanBoard
          columns={filteredColumns}
          addLabel={tr('board.addCustomer')}
          emptyTitle={tr('board.noMatchingCustomers')}
          emptyDropHint={tr('board.dropCard')}
          columnLabel={tr('board.column')}
          waErrorLabel={tr('home.waError')}
          dragEnabled={!boardMoveLoading}
          oncardclick={openCard}
          oncardmove={handleCardMove}
          onadd={() => openCreateModal()}
        />
      </div>
    {/if}
  {:else}
    <!-- Data Table View -->
    <div class="rounded-2xl border border-hairline bg-card shadow-card overflow-hidden">
      {#if tableRows.length === 0}
        <div class="p-8">
          <EmptyStateBlock
            title={tr('board.noData')}
            description={tr('board.noDataDescription')}
            actionLabel={tr('board.resetFilter')}
            onaction={resetFilters}
            class="!border-0 !shadow-none"
          />
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-sm">
            <thead>
              <tr class="border-b border-hairline bg-canvas-sunken text-xs font-semibold uppercase tracking-wider text-mute">
                <th class="px-5 py-3.5">{tr('board.customers')}</th>
                <th class="px-5 py-3.5">{tr('common.whatsapp')}</th>
                <th class="px-5 py-3.5">{tr('board.productSource')}</th>
                <th class="px-5 py-3.5">{tr('board.tagLabel')}</th>
                <th class="px-5 py-3.5">{tr('board.currentStage')}</th>
                <th class="px-5 py-3.5">{tr('common.pic')}</th>
                <th class="px-5 py-3.5">{tr('common.checklist')}</th>
                <th class="px-5 py-3.5 text-right">{tr('common.actions')}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-hairline">
              {#each tableRows as row (row.id)}
                {@const isDone = row.checklistTotal > 0 && row.checklistDone === row.checklistTotal}
                <tr class="transition-colors hover:bg-canvas-sunken/60">
                  <td class="px-5 py-3.5 font-bold text-ink">
                    <button
                      type="button"
                      onclick={() => openCard(row.stageId, row.id)}
                      class="flex items-center gap-2.5 text-left font-bold text-ink hover:text-primary hover:underline"
                    >
                      <Avatar name={row.customerName} size={24} />
                      <span>{row.customerName}</span>
                    </button>
                  </td>
                  <td class="px-5 py-3.5 font-mono text-xs font-semibold text-ink-soft">
                    <div class="flex items-center gap-1.5">
                      <span>{row.customerWa}</span>
                      <a
                        href="https://wa.me/{cleanPhone(row.customerWa)}"
                        target="_blank"
                        rel="noreferrer"
                        class="rounded p-1 text-mute hover:bg-status-done-soft hover:text-status-done-ink"
                        title={tr('board.openWhatsApp')}
                        aria-label={tr('board.openWhatsApp')}
                      >
                        <HugeiconsIcon icon={WhatsappIcon} size={14} strokeWidth={1.8} />
                      </a>
                    </div>
                  </td>
                  <td class="px-5 py-3.5 text-ink-soft">
                    {row.product ?? '—'}
                  </td>
                  <td class="px-5 py-3.5">
                    {#if row.tag}
                      <Badge tone={resolveTone(row.tag)} variant="soft">{row.tag}</Badge>
                    {:else}
                      <span class="text-mute">—</span>
                    {/if}
                  </td>
                  <td class="px-5 py-3.5">
                    <Badge tone={row.stageColor === 'emerald' ? 'done' : row.stageColor === 'amber' ? 'progress' : row.stageColor === 'rose' ? 'urgent' : 'queued'}>
                      {row.stageName}
                    </Badge>
                  </td>
                  <td class="px-5 py-3.5 text-ink-soft">
                    {#if row.assigneeName}
                      <div class="flex items-center gap-1.5">
                        <Avatar name={row.assigneeName} size={18} />
                        <span class="text-xs font-medium">{row.assigneeName}</span>
                      </div>
                    {:else}
                      <span class="text-xs text-mute">{tr('board.unassigned')}</span>
                    {/if}
                  </td>
                  <td class="px-5 py-3.5">
                    {#if row.checklistTotal > 0}
                      <span class="ds-caption font-semibold {isDone ? 'text-status-done-ink' : 'text-ink'}">
                        {row.checklistDone} / {row.checklistTotal} {isDone ? '✓' : ''}
                      </span>
                    {:else}
                      <span class="text-mute">—</span>
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
    <div class="space-y-6 pb-6">
      {#if cardDetail.waErrorFlag || cardDetail.waFollowupsStopped}
        <div class="rounded-xl border border-status-urgent/30 bg-status-urgent-soft p-3.5 text-xs">
          <p class="font-bold text-status-urgent-ink">
            {#if cardDetail.waErrorFlag}
              {tr('board.whatsappFailed')}
            {:else}
              {tr('board.followupStopped')}
            {/if}
          </p>
          <p class="mt-1 text-status-urgent-ink/80">
            {tr('board.manualHint')}
          </p>
        </div>
      {/if}

      {#if detailError}
        <div class="rounded-xl border border-status-urgent/25 bg-status-urgent-soft p-3 text-xs font-semibold text-status-urgent-ink">
          {detailError}
        </div>
      {/if}

      <!-- Customer Header & Quick Contact -->
      <section class="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-card p-4 shadow-card">
        <div class="flex items-center gap-3">
          <Avatar name={cardDetail.customer?.name} size={42} />
          <div>
            <h2 class="text-lg font-bold text-ink">{cardDetail.customer?.name}</h2>
          </div>
        </div>

        {#if cardDetail.customer?.wa}
          <a
            href="https://wa.me/{cleanPhone(cardDetail.customer.wa)}"
            target="_blank"
            rel="noreferrer"
            class="flex items-center gap-1.5 rounded-full bg-status-done px-4 py-2 text-xs font-bold text-ink shadow-control transition hover:brightness-95 active:scale-95"
          >
            <HugeiconsIcon icon={WhatsappIcon} size={16} strokeWidth={1.8} />
            <span>{tr('board.chatWhatsApp')}</span>
          </a>
        {/if}
      </section>

      <!-- Customer Information Card -->
      <section class="space-y-3 rounded-2xl border border-hairline bg-canvas-sunken p-4 text-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="shrink-0 text-mute">{tr('board.customerNumber')}</span>
          {#if cardDetail.customer?.wa}
            <CopyToClipboard value={cardDetail.customer.wa} />
          {:else}
            <span class="text-mute">—</span>
          {/if}
        </div>

        {#if cardDetail.card.product}
          <div class="flex items-center justify-between">
            <span class="text-mute">{tr('board.productService')}</span>
            <span class="font-medium text-ink">{cardDetail.card.product}</span>
          </div>
        {/if}

        {#if cardDetail.card.tag}
          <div class="flex items-center justify-between">
            <span class="text-mute">{tr('board.tagLabel')}</span>
            <Badge tone={resolveTone(cardDetail.card.tag)} variant="soft">
              {cardDetail.card.tag}
            </Badge>
          </div>
        {/if}

        <div class="flex items-center justify-between">
          <span class="text-mute">{tr('board.currentStage')}</span>
          <Badge tone={cardDetail.stage?.color === 'emerald' ? 'done' : cardDetail.stage?.color === 'amber' ? 'progress' : cardDetail.stage?.color === 'rose' ? 'urgent' : 'queued'}>
            {cardDetail.stage?.name ?? tr('common.stage')}
          </Badge>
        </div>
      </section>

      <!-- Assignee PIC Selection -->
      <section class="space-y-2">
        <label for="assignee-select" class="ds-label text-ink">
          {tr('board.assigneeCustomer')}
        </label>
        <select
          id="assignee-select"
          disabled={assigneeLoading}
          value={cardDetail.card.assigneeId ?? ''}
          onchange={(e) => {
            const val = (e.target as HTMLSelectElement).value;
            updateAssignee(val || null);
          }}
          class="h-10 w-full rounded-xl border border-hairline bg-card px-3.5 text-sm font-medium text-ink shadow-control outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="">{tr('board.unassigned')}</option>
          {#each members as member (member.id)}
            <option value={member.id}>{member.name} ({member.email})</option>
          {/each}
        </select>
      </section>

      <!-- Interactive Stage Checklist Section -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="ds-section-title text-ink">
              {tr('board.checklistStage', { stage: cardDetail.stage?.name ?? '' })}
            </h3>
            <p class="ds-caption mt-0.5 text-mute">
              {tr('board.checklistHint')}
            </p>
          </div>
          <span class="ds-caption rounded-full border border-hairline bg-card px-2.5 py-0.5 font-bold text-ink shadow-control">
            {sheetChecklistDone} / {sheetChecklistTotal} {tr('board.completed')}
          </span>
        </div>

        {#if sheetChecklistTotal > 0}
          <div class="py-1">
            <ProgressBar
              value={sheetChecklistDone}
              max={sheetChecklistTotal}
              tone={sheetChecklistPct === 100 ? 'positive' : 'warning'}
            />
          </div>
        {/if}

        {#if cardDetail.checklist.length === 0}
          <div class="rounded-xl border border-dashed border-hairline bg-card/60 p-4 text-center">
            <p class="ds-caption text-mute">{tr('board.noChecklist')}</p>
          </div>
        {:else}
          <ul class="space-y-2">
            {#each cardDetail.checklist as item (item.id)}
              <li class="flex items-start gap-3 rounded-xl border border-hairline bg-card p-3.5 shadow-card transition-all hover:border-hairline-strong">
                <Checkbox
                  checked={item.done}
                  onchange={(e) => toggleItem(item.id, e.currentTarget.checked)}
                  class="mt-0.5"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-ink transition-colors {item.done ? 'line-through text-mute' : ''}">
                    {item.label}
                  </p>
                  {#if item.required}
                    <span class="ds-caption font-semibold text-status-urgent-ink">
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
      <section class="space-y-3 border-t border-hairline pt-5">
        <span class="ds-label text-ink">{tr('board.moveToStage')}</span>
        <div class="flex flex-wrap gap-2 pt-1">
          {#each board as col (col.id)}
            {#if col.id !== cardDetail.stage?.id}
              <Button
                variant="secondary"
                size="sm"
                disabled={moveLoading}
                onclick={() => moveStage(col.id)}
                class="rounded-full shadow-control"
              >
                <span>{tr('board.continueTo', { name: col.name })}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.8} />
              </Button>
            {/if}
          {/each}
        </div>
      </section>

      {#if cardDetail.nextWorkflow}
        <section class="space-y-3 border-t border-hairline pt-5">
          <span class="ds-label text-ink">{tr('board.handoffNext')}</span>
          <p class="ds-caption text-mute">
            {tr('board.handoffDescription')}
          </p>
          <Button
            variant="primary"
            size="sm"
            loading={relayLoading}
            onclick={relayToNextWorkflow}
            class="rounded-full"
          >
            <HugeiconsIcon icon={Layers01Icon} size={16} strokeWidth={1.8} />
            <span>{tr('board.continueTo', { name: cardDetail.nextWorkflow.name })}</span>
          </Button>
        </section>
      {/if}

      {#if canManage}
        <section class="border-t border-hairline pt-5">
          <Button
            variant="destructive"
            size="sm"
            loading={deleteLoading}
            onclick={requestDeleteCard}
            class="w-full justify-center"
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.8} />
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
>
  <div class="space-y-4">
    <FormField label={tr('board.customerName')} required>
      {#snippet control(args)}
        <Input {...args} bind:value={customerName} placeholder={tr('board.customerNamePlaceholder')} />
      {/snippet}
    </FormField>

    <FormField label={tr('board.phone')} required helper={tr('board.phoneHelper')}>
      {#snippet control(args)}
        <Input {...args} bind:value={customerWa} placeholder="60123456789" />
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
  </div>

  {#snippet footer()}
    <div class="flex justify-end gap-2.5">
      <Button variant="secondary" onclick={() => (createOpen = false)}>
        {tr('common.cancel')}
      </Button>
      <Button variant="primary" loading={createLoading} onclick={createCard}>
        {tr('board.saveCustomer')}
      </Button>
    </div>
  {/snippet}
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

