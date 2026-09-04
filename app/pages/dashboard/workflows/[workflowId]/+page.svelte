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
  import { parseCsvHeader, autoDetectColumns } from '$lib/csv.js';
  import { dashboardText, dashboardIntlLocale } from '$lib/i18n/dashboard.js';
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
    DateRangePicker,
    StatCard,
    toast
  } from '$lib/components/molecules/index.js';
  import { ConfirmDialog, Dialog, KanbanBoard, Sheet, DataTable } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    Upload04Icon,
    Settings01Icon,
    Settings02Icon,
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
    SparklesIcon,
    File02Icon
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
  let activityFromDate = $state<string>('');
  let activityToDate = $state<string>('');
  let statsLoading = $state(false);
  let activeTab = $state<'stats' | 'kanban' | 'table'>('stats');

  function toISO(date: Date) {
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  }

  function daysBetween(from: string, to: string) {
    const f = new Date(from);
    const t = new Date(to);
    return Math.max(1, Math.ceil((t.getTime() - f.getTime()) / 86400000));
  }

  // Initialize default range: last 30 days
  const _today = new Date();
  const _30ago = new Date();
  _30ago.setDate(_30ago.getDate() - 29);
  activityFromDate = toISO(_30ago);
  activityToDate = toISO(_today);

  function activityRangeDays() { return daysBetween(activityFromDate, activityToDate); }

  $effect(() => {
    const urlTab = page.url.searchParams.get('tab');
    if (urlTab === 'kanban') {
      activeTab = 'kanban';
    } else if (urlTab === 'table') {
      activeTab = 'table';
    } else if (urlTab === 'stats') {
      activeTab = 'stats';
    }
    // Notify onboarding that tab content is ready
    if (!loadingData) {
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('onboarding-page-ready'));
      });
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
  let importFileName = $state<string | null>(null);
  let importColumns = $state<string[]>([]);
  let importMapping = $state<{ name: number; wa: number; product: number; tag: number }>({
    name: 0,
    wa: 1,
    product: 2,
    tag: 3
  });
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
        api.getWorkflowStats(data.workspace.id, workflowId, activityRangeDays()).catch(() => ({ stats: null }))
      ]);
      board = boardRes.board?.columns ?? [];
      workflow = workflowsRes.workflows?.find((w) => w.id === workflowId) ?? null;
      members = membersRes.members ?? [];
      stats = statsRes.stats ?? null;
    } catch (err) {
      console.error('Failed to load workflow board data:', err);
    } finally {
      loadingData = false;
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('onboarding-page-ready'));
      });
    }
  }

  $effect(() => {
    if (data.workspace?.id && workflowId) {
      loadWorkflowBoardData();
    }
  });

  async function refetchStats() {
    if (!data.workspace?.id || !workflowId) return;
    statsLoading = true;
    try {
      const res = await api.getWorkflowStats(data.workspace.id, workflowId, activityRangeDays());
      stats = res.stats ?? null;
    } catch {
      /* keep existing stats */
    } finally {
      statsLoading = false;
    }
  }

  // Refetch stats when date range changes
  let lastFromDate = $state('');
  let lastToDate = $state('');
  $effect(() => {
    if (
      data.workspace?.id &&
      workflowId &&
      (activityFromDate !== lastFromDate || activityToDate !== lastToDate)
    ) {
      lastFromDate = activityFromDate;
      lastToDate = activityToDate;
      refetchStats();
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

  // --- Due date helpers ---
  const isOverdue = (dueAt: string | null | undefined, completedAt: string | null | undefined) => {
    if (!dueAt || completedAt) return false;
    return new Date(dueAt).getTime() < Date.now();
  };

  const isDueSoon = (dueAt: string | null | undefined, completedAt: string | null | undefined) => {
    if (!dueAt || completedAt) return false;
    const due = new Date(dueAt).getTime();
    const now = Date.now();
    return due >= now && due - now <= 24 * 60 * 60 * 1000;
  };

  const formatDueDate = (dueAt: string) => {
    return new Date(dueAt).toLocaleDateString(dashboardIntlLocale($locale), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDueDateShort = (dueAt: string) => {
    return new Date(dueAt).toLocaleDateString(dashboardIntlLocale($locale), {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          const dueBadge = isOverdue(card.dueAt, card.completedAt)
            ? { label: tr('board.overdue'), tone: 'urgent' as const }
            : isDueSoon(card.dueAt, card.completedAt)
              ? { label: tr('board.dueSoon'), tone: 'progress' as const }
              : undefined;
          const dueDateText =
            card.dueAt && !card.completedAt && !dueBadge
              ? formatDueDateShort(card.dueAt)
              : undefined;
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
            waError: card.waErrorFlag === true,
            dueBadge,
            dueDateText,
            completed: Boolean(card.completedAt)
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
      window.dispatchEvent(new CustomEvent('onboarding-challenge', { detail: 'add_customer' }));
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
        mode: importMode,
        columnMapping: {
          name: importMapping.name,
          wa: importMapping.wa,
          ...(importMapping.product >= 0 && { product: importMapping.product }),
          ...(importMapping.tag >= 0 && { tag: importMapping.tag })
        }
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

  function detectColumnsFromCsv(text: string) {
    const header = parseCsvHeader(text);
    if (header.length === 0) return;
    importColumns = header;
    const auto = autoDetectColumns(header);
    if (auto) {
      importMapping = {
        name: auto.name,
        wa: auto.wa,
        product: auto.product ?? -1,
        tag: auto.tag ?? -1
      };
    } else {
      // Fallback: first 4 columns in order
      importMapping = {
        name: 0,
        wa: Math.min(1, header.length - 1),
        product: header.length > 2 ? 2 : -1,
        tag: header.length > 3 ? 3 : -1
      };
    }
  }

  function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '').trim();
      if (text) {
        importCsv = text;
        importFileName = file.name;
        importError = null;
        detectColumnsFromCsv(text);
      }
    };
    reader.onerror = () => {
      importError = tr('board.importError');
    };
    reader.readAsText(file);
  }

  function clearImportFile() {
    importCsv = '';
    importFileName = null;
    importColumns = [];
  }

  // Checklist statistics for active sheet card
  const sheetChecklistDone = $derived(
    cardDetail?.checklist.filter((i) => i.done).length ?? 0
  );
  const sheetChecklistTotal = $derived(cardDetail?.checklist.length ?? 0);
  const sheetChecklistPct = $derived(
    sheetChecklistTotal > 0 ? Math.round((sheetChecklistDone / sheetChecklistTotal) * 100) : 0
  );

  // Line chart path builder for activity-over-time
 const buildLinePath = (data: number[], w: number, h: number, pad = 8) => {
   if (!data.length) return { line: '', area: '' };
   const min = Math.min(...data, 0);
   const max = Math.max(...data, 1);
   const range = max - min || 1;
   const pts = data.map((v, i) => {
     const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
     const y = pad + (1 - (v - min) / range) * (h - pad * 2);
     return `${x},${y}`;
   });
   return {
     line: `M ${pts.join(' L ')}`,
     area: `M ${pts.join(' L ')} L ${w - pad},${h - pad} L ${pad},${h - pad} Z`
   };
 };

 // Donut chart builder — returns SVG circle segments using stroke-dasharray
 const buildDonutSegments = (items: Array<{ label: string; value: number; color: string }>, size: number, stroke: number) => {
   const total = items.reduce((s, i) => s + i.value, 0);
   if (total === 0) return { segments: [] as Array<{ label: string; value: number; color: string; dash: string; offset: number }>, total };
   const radius = (size - stroke) / 2;
   const circumference = 2 * Math.PI * radius;
   let offset = 0;
   const segments = items.map((item) => {
     const fraction = item.value / total;
     const dash = fraction * circumference;
     const seg = { label: item.label, value: item.value, color: item.color, dash: `${dash} ${circumference - dash}`, offset: -offset };
     offset += dash;
     return seg;
   });
   return { segments, total, radius, circumference };
 };
</script>

<svelte:head>
  <title>{workflow?.name ?? tr('board.title')} — actjom</title>
</svelte:head>

<div class="space-y-5 sm:space-y-6">
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
        <Button variant="secondary" size="sm" onclick={() => (importOpen = true)} data-onboarding="import-csv-btn">
          <HugeiconsIcon icon={Upload04Icon} size={16} strokeWidth={1.8} />
          <span>{tr('board.importCsv')}</span>
        </Button>

        <Button variant="primary" size="md" onclick={openCreateModal} class="shadow-primary font-bold ring-2 ring-primary/20" data-onboarding="add-customer-btn">
          <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={2.2} />
          <span>{tr('board.addCustomer')}</span>
        </Button>
      </div>
    </div>
  </header>

  <div class="flex items-center justify-between">
    <div class="flex items-center gap-1 -mb-px overflow-x-auto" data-onboarding="workflow-tabs">
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
          'flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base font-semibold border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap',
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
          'flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base font-semibold border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap',
          activeTab === 'kanban'
            ? 'border-primary text-primary'
            : 'border-transparent text-mute hover:text-ink hover:border-hairline-strong'
        )}
      >
        <HugeiconsIcon icon={KanbanIcon} size={16} strokeWidth={1.8} />
        <span>{tr('board.kanban')}</span>
        {#if totalCards > 0}
          <span class={cn('rounded-full px-2 py-0.5 text-[13px] font-bold', activeTab === 'kanban' ? 'bg-primary-soft text-primary' : 'bg-lane text-mute')}>
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
          'flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base font-semibold border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap',
          activeTab === 'table'
            ? 'border-primary text-primary'
            : 'border-transparent text-mute hover:text-ink hover:border-hairline-strong'
        )}
      >
        <HugeiconsIcon icon={Layers01Icon} size={16} strokeWidth={1.8} />
        <span>{tr('board.table')}</span>
        {#if totalCards > 0}
          <span class={cn('rounded-full px-2 py-0.5 text-[13px] font-bold', activeTab === 'table' ? 'bg-primary-soft text-primary' : 'bg-lane text-mute')}>
            {totalCards}
          </span>
        {/if}
      </button>

      <!-- Tab 4: Setup Stages -->
      <a
        href="/dashboard/workflows/{workflowId}/setup"
        class="flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base font-semibold border-b-2 border-transparent text-mute hover:text-ink hover:border-hairline-strong transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap"
      >
        <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.8} />
        <span>{tr('board.setupStages')}</span>
      </a>

      <!-- Tab 5: Workflow Settings -->
      <a
        href="/dashboard/workflows/{workflowId}/setup?tab=settings"
        class="flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base font-semibold border-b-2 border-transparent text-mute hover:text-ink hover:border-hairline-strong transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap"
      >
        <HugeiconsIcon icon={Settings02Icon} size={16} strokeWidth={1.8} />
        <span>{tr('setup.workflowSettings')}</span>
      </a>
    </div>
  </div>

  <!-- TAB CONTENT -->
  {#if activeTab === 'stats'}
    {#if stats && !loadingData}
      {@const totalActive = stats.totals.active ?? 0}
      {@const totalDone = stats.totals.done ?? 0}
      {@const totalAll = totalActive + totalDone}
      {@const stageColors = ['#6366f1', '#f59e0b', '#22c55e', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e', '#14b8a6']}
      {@const donutData = stats.byStage.map((s, i) => ({ label: s.stageName, value: s.total, color: stageColors[i % stageColors.length] }))}
      {@const donutSize = 160}
      {@const donutStroke = 28}
      {@const createdData = stats.byTime.map((b) => b.created)}
      {@const completedData = stats.byTime.map((b) => b.completed)}
      {@const chartW = 800}
      {@const chartH = 200}
      {@const createdPath = buildLinePath(createdData, chartW, chartH)}
      {@const completedPath = buildLinePath(completedData, chartW, chartH)}
      {@const maxChartVal = Math.max(...createdData, ...completedData, 1)}
      {@const tickCount = 4}
      {@const dateLabels = stats.byTime.map((b) => {
        const d = new Date(b.date);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      })}
      {@const labelStep = Math.max(1, Math.ceil(dateLabels.length / 8))}
      {@const donutResult = buildDonutSegments(donutData, donutSize, donutStroke)}
      <section class="space-y-6 pt-2" data-onboarding="stats-content">
        <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-3">
            <div class="flex items-center justify-between">
              <span class="ds-caption text-mute uppercase tracking-wider">{tr('board.statsActive')}</span>
              <div class="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <HugeiconsIcon icon={Layers01Icon} size={18} strokeWidth={1.8} />
              </div>
            </div>
            <div>
              <p class="ds-stat text-ink">{stats.totals.active}</p>
              <p class="ds-caption text-mute mt-1">{tr('board.activeInPipeline') || 'Pelanggan aktif dalam alur kerja'}</p>
            </div>
          </div>

          <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-3">
            <div class="flex items-center justify-between">
              <span class="ds-caption text-mute uppercase tracking-wider">{tr('board.statsWaiting')}</span>
              <div class="flex size-9 items-center justify-center rounded-xl bg-status-progress-soft text-status-progress-ink">
                <HugeiconsIcon icon={Clock01Icon} size={18} strokeWidth={1.8} />
              </div>
            </div>
            <div>
              <p class="ds-stat text-ink">{stats.totals.waiting}</p>
              <p class="ds-caption text-mute mt-1">{tr('board.waitingActionDesc') || 'Menunggu maklum balas / semakan'}</p>
            </div>
          </div>

          <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-3">
            <div class="flex items-center justify-between">
              <span class="ds-caption text-mute uppercase tracking-wider">{tr('board.statsOverdue')}</span>
              <div class="flex size-9 items-center justify-center rounded-xl bg-status-urgent-soft text-status-urgent-ink">
                <HugeiconsIcon icon={Alert02Icon} size={18} strokeWidth={1.8} />
              </div>
            </div>
            <div>
              <p class="ds-stat text-ink">{stats.totals.overdue}</p>
              <p class="ds-caption text-mute mt-1">{tr('board.overdueDesc') || 'Melebihi had masa tindak balas'}</p>
            </div>
          </div>

          <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-3">
            <div class="flex items-center justify-between">
              <span class="ds-caption text-mute uppercase tracking-wider">{tr('board.statsDone')}</span>
              <div class="flex size-9 items-center justify-center rounded-xl bg-status-done-soft text-status-done-ink">
                <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={1.8} />
              </div>
            </div>
            <div>
              <p class="ds-stat text-ink">{stats.totals.done}</p>
              <p class="ds-caption text-mute mt-1">
                {#if totalAll > 0}
                  {Math.round((totalDone / totalAll) * 100)}% {tr('board.completionRate') || 'kadar selesai'}
                {:else}
                  {tr('board.completedDesc') || 'Berjaya diselesaikan'}
                {/if}
              </p>
            </div>
          </div>
        </div>

        <!-- Middle Grid: Donut by Stage & Team Workload -->
        <div class="grid gap-5 lg:grid-cols-2">
          <!-- Donut Chart: Distribution by Stage -->
          <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="ds-section-title text-ink">{tr('board.statsByStage')}</h3>
              <span class="ds-caption text-mute">{stats.byStage.length} peringkat</span>
            </div>

            {#if stats.byStage.length === 0 || donutResult.total === 0}
              <p class="ds-body text-mute py-8 text-center">{tr('board.noStages')}</p>
            {:else}
              <div class="flex flex-col items-center gap-4 sm:flex-row sm:gap-6 pt-2">
                <!-- Donut SVG -->
                <div class="relative shrink-0" style="width: {donutSize}px; height: {donutSize}px">
                  <svg width={donutSize} height={donutSize} viewBox="0 0 {donutSize} {donutSize}" style="transform: rotate(-90deg)">
                    <circle cx={donutSize / 2} cy={donutSize / 2} r={donutResult.radius} fill="none" stroke="var(--color-lane, #e8edf4)" stroke-width={donutStroke} />
                    {#each donutResult.segments as seg}
                      <circle cx={donutSize / 2} cy={donutSize / 2} r={donutResult.radius} fill="none" stroke={seg.color} stroke-width={donutStroke} stroke-dasharray={seg.dash} stroke-dashoffset={seg.offset} />
                    {/each}
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="ds-stat text-ink text-xl sm:text-2xl">{donutResult.total}</span>
                    <span class="ds-caption text-mute text-[11px]">total</span>
                  </div>
                </div>

                <!-- Legend -->
                <div class="flex-1 space-y-2 min-w-0">
                  {#each donutResult.segments as seg, i}
                    {@const stage = stats.byStage[i]}
                    {@const pct = donutResult.total > 0 ? Math.round((seg.value / donutResult.total) * 100) : 0}
                    <div class="flex items-center gap-2.5">
                      <span class="size-3 rounded-full shrink-0" style="background: {seg.color}"></span>
                      <span class="ds-label text-ink truncate flex-1">{seg.label}</span>
                      {#if stage?.overdue > 0}
                        <span class="inline-flex items-center rounded-full bg-status-urgent-soft text-status-urgent-ink px-1.5 py-0.2 text-[12px] font-semibold shrink-0">
                          {stage.overdue} {tr('board.statsOverdue').toLowerCase()}
                        </span>
                      {/if}
                      <span class="ds-label text-ink font-medium shrink-0">{seg.value}</span>
                      <span class="ds-caption text-mute shrink-0 w-10 text-right">({pct}%)</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

          <!-- Team Workload -->
          <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="ds-section-title text-ink">{tr('board.statsByAssignee')}</h3>
              <span class="ds-caption text-mute">{stats.byAssignee.length} PIC</span>
            </div>

            <div class="space-y-2.5 pt-1">
              {#if stats.byAssignee.length === 0}
                <p class="ds-body text-mute py-8 text-center">{tr('board.unassigned')}</p>
              {:else}
                {#each stats.byAssignee as assignee (assignee.assigneeId ?? 'unassigned')}
                  <div class="flex items-center justify-between gap-3 rounded-xl bg-canvas-sunken/50 p-3 transition-colors hover:bg-canvas-sunken">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <Avatar name={assignee.assigneeName ?? tr('board.statsUnassigned')} size={30} />
                      <div class="min-w-0">
                        <p class="ds-label text-ink truncate">
                          {assignee.assigneeName ?? tr('board.statsUnassigned')}
                        </p>
                        <p class="ds-caption text-mute truncate">{assignee.active} {tr('board.statsActive').toLowerCase()}</p>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5 shrink-0">
                      <Badge tone="queued" variant="soft" class="text-[12px] font-semibold">
                        {assignee.active} {tr('board.statsActive').toLowerCase()}
                      </Badge>
                      {#if assignee.waiting > 0}
                        <Badge tone="progress" variant="soft" class="text-[12px] font-semibold">
                          {assignee.waiting} {tr('board.statsWaiting').toLowerCase()}
                        </Badge>
                      {/if}
                      {#if assignee.overdue > 0}
                        <Badge tone="urgent" variant="soft" class="text-[12px] font-semibold">
                          {assignee.overdue} {tr('board.statsOverdue').toLowerCase()}
                        </Badge>
                      {/if}
                      {#if assignee.done > 0}
                        <Badge tone="done" variant="soft" class="text-[12px] font-semibold">
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

        <!-- Line Chart: Activity Over Time with Date Range Picker -->
        <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-5">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h3 class="ds-section-title text-ink">{tr('board.statsByTime')}</h3>
            <div class="flex flex-wrap items-center gap-3 sm:gap-4">
              <!-- Date Range Picker -->
              <div class="w-full sm:w-[200px]">
                <DateRangePicker
                  bind:start={activityFromDate}
                  bind:end={activityToDate}
                  placeholder="Rentang tanggal"
                />
              </div>
              <div class="flex items-center gap-1.5">
                <span class="size-2.5 rounded-full bg-primary"></span>
                <span class="ds-caption text-mute">{tr('board.statsCreated')}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="size-2.5 rounded-full bg-status-done"></span>
                <span class="ds-caption text-mute">{tr('board.statsCompleted')}</span>
              </div>
            </div>
          </div>

          {#if statsLoading}
            <div class="flex items-center justify-center py-12">
              <Skeleton shape="rect" class="h-48 w-full rounded-xl" />
            </div>
          {:else if stats.byTime.length === 0}
            <p class="ds-body text-mute py-8 text-center">Tiada data aktiviti</p>
          {:else}
            <div class="relative">
              <svg viewBox="0 0 {chartW} {chartH}" class="w-full" style="height: {chartH}px" preserveAspectRatio="none">
                <!-- Grid lines + Y-axis labels -->
                {#each Array(tickCount + 1) as _, i}
                  {@const ratio = i / tickCount}
                  {@const yVal = Math.round(maxChartVal * (1 - ratio))}
                  <line
                    x1="0" y1={chartH * ratio} x2={chartW} y2={chartH * ratio}
                    stroke="var(--color-hairline, #e2e8f0)" stroke-width="1" stroke-dasharray="4 4"
                  />
                {/each}
                <!-- Created line (indigo) -->
                {#if createdPath.line}
                  <path d={createdPath.area} fill="rgba(79, 70, 229, 0.06)" />
                  <path
                    d={createdPath.line} fill="none"
                    stroke="var(--color-primary, #4f46e5)" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round"
                  />
                  {#each createdData as val, i}
                    {@const x = 8 + (i / Math.max(createdData.length - 1, 1)) * (chartW - 16)}
                    {@const min = 0}
                    {@const max = maxChartVal}
                    {@const range = max - min || 1}
                    {@const y = 8 + (1 - (val - min) / range) * (chartH - 16)}
                    <circle cx={x} cy={y} r="3" fill="var(--color-primary, #4f46e5)" />
                  {/each}
                {/if}
                <!-- Completed line (green) -->
                {#if completedPath.line}
                  <path d={completedPath.area} fill="rgba(34, 197, 94, 0.06)" />
                  <path
                    d={completedPath.line} fill="none"
                    stroke="var(--color-status-done, #22c55e)" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round"
                  />
                  {#each completedData as val, i}
                    {@const x = 8 + (i / Math.max(completedData.length - 1, 1)) * (chartW - 16)}
                    {@const min = 0}
                    {@const max = maxChartVal}
                    {@const range = max - min || 1}
                    {@const y = 8 + (1 - (val - min) / range) * (chartH - 16)}
                    <circle cx={x} cy={y} r="3" fill="var(--color-status-done, #22c55e)" />
                  {/each}
                {/if}
              </svg>
            </div>

            <!-- X-axis date labels (sparse) -->
            <div class="flex justify-between px-1">
              {#each dateLabels as label, i}
                {#if i % labelStep === 0 || i === dateLabels.length - 1}
                  <span class="ds-caption text-mute">{label}</span>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      </section>
    {:else}
      <!-- Skeleton Loading -->
      <div class="space-y-6 pt-2">
        <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {#each [1, 2, 3, 4] as _i}
            <div class="rounded-2xl bg-card p-5 space-y-3 shadow-card">
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
          <div class="rounded-2xl bg-card p-5 space-y-4 shadow-card">
            <Skeleton shape="rect" class="h-6 w-36 rounded-md" />
            <Skeleton shape="rect" class="h-16 w-full rounded-xl" />
            <Skeleton shape="rect" class="h-16 w-full rounded-xl" />
          </div>
          <div class="rounded-2xl bg-card p-5 space-y-4 shadow-card">
            <Skeleton shape="rect" class="h-6 w-36 rounded-md" />
            <Skeleton shape="rect" class="h-16 w-full rounded-xl" />
            <Skeleton shape="rect" class="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <!-- TAB 2 (KANBAN) OR TAB 3 (TABLE): FILTER BAR -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3" data-onboarding="board-filter-bar">
      <!-- Search & Filters -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="w-full sm:w-72">
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
            class="h-9 rounded-lg bg-card px-2.5 text-base text-ink border border-hairline transition-colors hover:border-hairline-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
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
          class="h-9 rounded-lg bg-card px-2.5 text-base text-ink border border-hairline transition-colors hover:border-hairline-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
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
      <div class="flex items-center justify-between px-1 text-[13px] text-mute">
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
        <div class="w-full" data-onboarding="kanban-board">
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
      <div class="rounded-2xl bg-card shadow-card border border-hairline overflow-hidden" data-onboarding="table-view">
        {#if tableRows.length === 0}
          <div class="p-12 text-center">
            <p class="ds-section-title text-ink">{tr('common.noResults')}</p>
            <p class="ds-caption mt-1 text-mute">{tr('board.noFilterResults')}</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-left text-base">
              <thead class="border-b border-hairline bg-canvas-sunken text-[13px] font-semibold text-mute">
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
                {#each tableRows as row, ri (row.id)}
                  {@const isDone = row.checklistTotal > 0 && row.checklistDone === row.checklistTotal}
                  <tr class="transition-colors hover:bg-canvas-sunken/60" {...ri === 0 ? { 'data-onboarding': 'table-row' } : {}}>
                    <td class="px-5 py-3.5 font-medium text-ink">
                      {row.customerName}
                      {#if row.product}
                        <span class="block text-[13px] text-mute font-normal">{row.product}</span>
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
                          <span class="text-[13px] font-medium">{row.assigneeName}</span>
                        </div>
                      {:else}
                        <span class="text-[13px] text-mute">{tr('board.unassigned')}</span>
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
                        {...ri === 0 ? { 'data-onboarding': 'table-detail-btn' } : {}}
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
        <div class="rounded-xl border border-status-urgent/30 bg-status-urgent-soft p-3.5 text-[13px] space-y-1 shadow-xs">
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
          <p class="text-status-urgent-ink/80 text-[12px] leading-relaxed pl-5">
            {tr('board.manualHint')}
          </p>
        </div>
      {/if}

      {#if detailError}
        <div class="rounded-xl border border-status-urgent/25 bg-status-urgent-soft p-3 text-[13px] font-semibold text-status-urgent-ink">
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
                    class="text-[12px] font-semibold px-2 py-0.2"
                  >
                    {cardDetail.stage.name}
                  </Badge>
                {/if}
                {#if cardDetail.card.tag}
                  <Badge tone={resolveTone(cardDetail.card.tag)} variant="soft" class="text-[12px] font-semibold px-2 py-0.2">
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
              class="flex items-center gap-1.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white px-3.5 py-1.5 text-[13px] font-bold shadow-xs transition-all active:scale-95 shrink-0"
            >
              <HugeiconsIcon icon={WhatsappIcon} size={15} strokeWidth={2} />
              <span>{tr('board.chatWhatsApp')}</span>
            </a>
          {/if}
        </div>
      </section>

      <!-- Customer Details Grid Card -->
      <section class="rounded-2xl border border-hairline bg-canvas-sunken/70 p-3.5 space-y-2.5 text-sm shadow-xs">
        <div class="flex items-center justify-between gap-2">
          <span class="text-mute font-medium">{tr('board.customerNumber')}</span>
          {#if cardDetail.customer?.wa}
            <CopyToClipboard value={cardDetail.customer.wa} size="sm" />
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
              class="h-9 rounded-lg border border-hairline bg-card px-2.5 text-sm font-semibold text-ink shadow-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 cursor-pointer"
            >
              <option value="">{tr('board.unassigned')}</option>
              {#each members as member (member.id)}
                <option value={member.id}>{member.name}</option>
              {/each}
            </select>
          </div>
        </div>

        {#if cardDetail.card.completedAt}
          <div class="flex items-center justify-between gap-2 border-t border-hairline/60 pt-2">
            <span class="text-mute font-medium inline-flex items-center gap-1.5">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={1.8} class="text-status-done-ink" />
              {tr('board.completedOn')}
            </span>
            <span class="font-semibold text-status-done-ink">{formatDueDate(cardDetail.card.completedAt)}</span>
          </div>
        {:else if cardDetail.card.dueAt}
          <div class="flex items-center justify-between gap-2 border-t border-hairline/60 pt-2">
            <span class="text-mute font-medium inline-flex items-center gap-1.5">
              <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={1.8} class="text-mute" />
              {tr('board.dueDate')}
            </span>
            <div class="flex items-center gap-2">
              {#if isOverdue(cardDetail.card.dueAt, cardDetail.card.completedAt)}
                <Badge tone="urgent" variant="soft" class="text-[12px] font-semibold px-2 py-0.2">{tr('board.overdue')}</Badge>
              {:else if isDueSoon(cardDetail.card.dueAt, cardDetail.card.completedAt)}
                <Badge tone="progress" variant="soft" class="text-[12px] font-semibold px-2 py-0.2">{tr('board.dueSoon')}</Badge>
              {/if}
              <span class="font-semibold {isOverdue(cardDetail.card.dueAt, cardDetail.card.completedAt) ? 'text-status-urgent-ink' : 'text-ink'}">
                {formatDueDate(cardDetail.card.dueAt)}
              </span>
            </div>
          </div>
        {/if}
      </section>

      <!-- Interactive Stage Checklist Section -->
      <section class="space-y-3 rounded-2xl border border-hairline bg-card p-4 shadow-card">
        <div class="flex items-center justify-between gap-2">
          <div class="space-y-0.5">
            <div class="flex items-center gap-1.5">
              <HugeiconsIcon icon={CheckListIcon} size={16} strokeWidth={2} class="text-primary" />
              <h3 class="text-sm font-bold text-ink uppercase tracking-wider">
                {tr('board.checklistStage', { stage: cardDetail.stage?.name ?? '' })}
              </h3>
            <p class="text-[13px] text-mute">
              {tr('board.checklistHint')}
            </p>
          </div>
          <span class="rounded-full border border-hairline bg-lane px-2.5 py-0.5 text-[13px] font-bold text-ink-soft shrink-0">
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
            <p class="text-[13px] text-mute font-medium">{tr('board.noChecklist')}</p>
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
                  <p class="text-sm font-semibold text-ink transition-colors {item.done ? 'line-through text-mute' : ''}">
                    {item.label}
                  </p>
                  {#if item.required}
                    <span class="inline-block mt-0.5 text-[12px] font-semibold text-primary-ink bg-primary-soft border border-primary-border/40 px-1.5 py-0.2 rounded-md">
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
        <span class="text-sm font-bold text-ink uppercase tracking-wider block">{tr('board.moveToStage')}</span>
        <div class="flex flex-wrap gap-2 pt-0.5">
          {#each board as col (col.id)}
            {@const isCurrent = col.id === cardDetail.stage?.id}
            <Button
              variant={isCurrent ? 'primary' : 'secondary'}
              size="md"
              disabled={isCurrent || moveLoading}
              onclick={() => moveStage(col.id)}
              class="rounded-xl text-sm font-semibold shadow-xs {isCurrent ? 'opacity-90 cursor-default' : ''}"
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
          <div class="flex items-center gap-1.5 text-primary-ink font-bold text-[13px]">
            <HugeiconsIcon icon={Layers01Icon} size={15} strokeWidth={2} />
            <span>{tr('board.handoffNext')}</span>
          </div>
          <p class="text-[13px] text-mute">
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
          class="h-10 w-full rounded-full border border-hairline bg-card px-4 text-base text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="">{tr('board.autoDefaultAssignee')}</option>
          {#each members as member (member.id)}
            <option value={member.id}>{member.name} ({member.email})</option>
          {/each}
        </select>
      {/snippet}
    </FormField>

    {#if createError}
      <div class="rounded-xl border border-status-urgent/25 bg-status-urgent-soft p-3 text-[13px] font-semibold text-status-urgent-ink">
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
    <div class="rounded-2xl border border-hairline bg-canvas-sunken p-4 space-y-1.5 text-[13px] text-mute">
      <p class="font-semibold text-ink">{tr('board.rowFormat')}</p>
      <code class="block rounded-lg border border-hairline bg-card p-2 font-mono text-[12px] text-ink">
        Customer, WhatsApp, Product, Tag
      </code>
      <p class="pt-1 text-[12px]">
        {tr('board.example')} <code>Siti Aminah, 60123456789, April webinar, VIP</code>
      </p>
    </div>

    <!-- Mode Selector -->
    <FormField label={tr('board.duplicateOption')}>
      {#snippet control(args)}
        <select
          {...args}
          bind:value={importMode}
          class="h-10 w-full rounded-full border border-hairline bg-card px-4 text-base text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="skip">{tr('board.duplicateSkip')}</option>
          <option value="update">{tr('board.duplicateUpdate')}</option>
        </select>
      {/snippet}
    </FormField>

    <!-- File Upload + CSV Input Area -->
    <FormField label={tr('board.csvData')} required>
      {#snippet control(args)}
        <div class="space-y-2.5">
          <!-- File dropzone -->
          <label
            class="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-hairline-strong bg-canvas-sunken px-4 py-3 transition-all hover:border-primary hover:bg-primary-soft/30"
          >
            <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <HugeiconsIcon icon={File02Icon} size={18} strokeWidth={1.8} />
            </span>
            <div class="min-w-0 flex-1">
              {#if importFileName}
                <p class="truncate text-sm font-semibold text-ink">{importFileName}</p>
                <p class="text-xs text-mute">{tr('board.fileLoaded')}</p>
              {:else}
                <p class="text-sm font-semibold text-ink">{tr('board.uploadFile')}</p>
                <p class="text-xs text-mute">{tr('board.uploadFileHint')}</p>
              {/if}
            </div>
            {#if importFileName}
              <button
                type="button"
                onclick={(e) => { e.preventDefault(); clearImportFile(); }}
                class="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-mute transition-colors hover:bg-status-urgent/10 hover:text-status-urgent"
              >
                {tr('common.clear')}
              </button>
            {/if}
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              class="hidden"
              onchange={handleFileUpload}
            />
          </label>

          <!-- Textarea for paste/edit -->
          <textarea
            {...args}
            bind:value={importCsv}
            rows={6}
            onblur={() => { if (importCsv.trim() && importColumns.length === 0) detectColumnsFromCsv(importCsv); }}
            placeholder={`Siti Aminah, 60123456789, April webinar, VIP\nAhmad Dahlan, 601298765432, Onboarding, Urgent`}
            class="w-full rounded-2xl border border-hairline bg-card p-3 font-mono text-[13px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          ></textarea>
        </div>
      {/snippet}
    </FormField>

    <!-- Column Mapping -->
    {#if importColumns.length > 0}
      <div class="rounded-2xl border border-hairline bg-canvas-sunken p-4 space-y-3">
        <div class="flex items-center gap-2">
          <HugeiconsIcon icon={Settings02Icon} size={16} strokeWidth={1.8} class="text-primary" />
          <p class="text-sm font-semibold text-ink">{tr('board.columnMapping')}</p>
        </div>
        <p class="text-xs text-mute">{tr('board.columnMappingHint')}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="space-y-1.5">
            <span class="text-xs font-semibold text-ink">{tr('board.mapName')} <span class="text-status-urgent">*</span></span>
            <select bind:value={importMapping.name} class="h-9 w-full rounded-lg border border-hairline bg-card px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
              {#each importColumns as col, idx}
                <option value={idx}>{col || `Column ${idx + 1}`}</option>
              {/each}
            </select>
          </label>
          <label class="space-y-1.5">
            <span class="text-xs font-semibold text-ink">{tr('board.mapWa')} <span class="text-status-urgent">*</span></span>
            <select bind:value={importMapping.wa} class="h-9 w-full rounded-lg border border-hairline bg-card px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
              {#each importColumns as col, idx}
                <option value={idx}>{col || `Column ${idx + 1}`}</option>
              {/each}
            </select>
          </label>
          <label class="space-y-1.5">
            <span class="text-xs font-semibold text-ink">{tr('board.mapProduct')}</span>
            <select bind:value={importMapping.product} class="h-9 w-full rounded-lg border border-hairline bg-card px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
              <option value={-1}>— {tr('common.none')} —</option>
              {#each importColumns as col, idx}
                <option value={idx}>{col || `Column ${idx + 1}`}</option>
              {/each}
            </select>
          </label>
          <label class="space-y-1.5">
            <span class="text-xs font-semibold text-ink">{tr('board.mapTag')}</span>
            <select bind:value={importMapping.tag} class="h-9 w-full rounded-lg border border-hairline bg-card px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
              <option value={-1}>— {tr('common.none')} —</option>
              {#each importColumns as col, idx}
                <option value={idx}>{col || `Column ${idx + 1}`}</option>
              {/each}
            </select>
          </label>
        </div>
      </div>
    {/if}

    {#if importError}
      <div class="rounded-xl border border-status-urgent/25 bg-status-urgent-soft p-3 text-[13px] font-semibold text-status-urgent-ink">
        {importError}
      </div>
    {/if}

    <!-- Result Box -->
    {#if importResult}
      <div class="rounded-2xl border border-hairline bg-canvas-sunken p-4 text-[13px] space-y-2">
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

