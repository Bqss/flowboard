<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { cn } from '$lib/utils.js';
  import {
    api,
    ApiError,
    type ApiCardDetail,
    type ApiWorkflow,
    type ApiWorkspaceMember,
    type ApiBoardColumn,
    type ApiWorkflowSetupStage
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
    ProgressBar,
    Tooltip
  } from '$lib/components/atoms/index.js';
  import {
    FormField,
    EmptyStateBlock,
    Breadcrumb,
    SearchInput,
    CopyToClipboard,
    TaskPicPicker,
    type TaskPicOption,
    DropdownMenu,
    toast
  } from '$lib/components/molecules/index.js';
  import {
    ConfirmDialog,
    Dialog,
    KanbanBoard,
    Sheet,
    WorkflowStageEditor
  } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    ArrowDown01Icon,
    BubbleChatIcon,
    Upload04Icon,
    Settings02Icon,
    Edit02Icon,
    DashboardSquare02Icon,
    CheckmarkCircle02Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    WhatsappIcon,
    Delete02Icon,
    Alert02Icon,
    Clock01Icon,
    Tick02Icon,
    File02Icon,
    SmartPhone01Icon,
    PackageIcon,
    MoreHorizontalIcon,
    Cancel01Icon
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
  let stages = $state<ApiWorkflowSetupStage[]>([]);
  let allWorkflows = $state<ApiWorkflow[]>([]);
  let members = $state<ApiWorkspaceMember[]>([]);
  let availableTags = $state<string[]>([]);
  let loadingMoreStages = $state<Record<string, boolean>>({});
  const boardPageSize = 12;
  let boardRequestRevision = 0;
  let lastBoardFilterKey: string | null = null;

  const canManage = $derived(data.workspace?.role === 'owner' || workflow?.ownerId === data.user?.id);
  const canManageCard = (card?: { assigneeId?: string | null } | null) =>
    canManage || (card?.assigneeId != null && card.assigneeId === data.user?.id);

  // Edit Mode state (persediaan peringkat / pipeline editor)
  let isEditMode = $state(false);
  let openCreateStage = $state<() => void>();

  function enterEditMode() {
    isEditMode = true;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'edit');
      window.history.replaceState({}, '', url.toString());
    }
  }

  function exitEditMode() {
    isEditMode = false;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      window.history.replaceState({}, '', url.toString());
    }
    loadWorkflowBoardData();
  }

  $effect(() => {
    const mode = page.url.searchParams.get('mode');
    if (mode === 'edit') {
      isEditMode = true;
    }
    // Notify onboarding that content is ready
    if (!loadingData) {
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('onboarding-page-ready'));
      });
    }
  });
  const mobileMenuItems = $derived([
    ...(canManage && !isEditMode
      ? [
          {
            label: 'Mode Edit Peringkat',
            icon: editIconSnippet,
            onselect: enterEditMode
          }
        ]
      : []),
    {
      label: tr('board.stats'),
      icon: statsIconSnippet,
      onselect: () => goto(`/dashboard/workflows/${workflowId}/stats`)
    },
    {
      label: tr('setup.workflowSettings'),
      icon: settingsIconSnippet,
      onselect: () => goto(`/dashboard/workflows/${workflowId}/settings`)
    },
    {
      label: tr('board.importCsv'),
      icon: importIconSnippet,
      separatorBefore: true,
      onselect: () => (importOpen = true)
    }
  ]);


  // Filter state for Kanban Board
  let searchQuery = $state('');
  let selectedMemberFilter = $state<string>('all');
  let selectedTagFilter = $state<string>('all');

  const boardFilterKey = () =>
    JSON.stringify([searchQuery.trim(), selectedMemberFilter, selectedTagFilter]);
  const boardRequestOptions = (stageId?: string, offset?: number) => ({
    limit: boardPageSize,
    ...(stageId ? { stageId, offset } : {}),
    search: searchQuery.trim() || undefined,
    assigneeId: selectedMemberFilter,
    tag: selectedTagFilter
  });

  // Sheet / Card detail state
  let selectedCardId = $state<string | null>(null);
  let isSheetOpen = $derived(selectedCardId !== null);
  let cardDetail = $state<ApiCardDetail | null>(null);
  const canManageCurrentCard = $derived(canManageCard(cardDetail?.card));
  let detailLoading = $state(false);
  let detailError = $state<string | null>(null);
  let relayLoading = $state(false);
  let assigneeLoading = $state(false);
  let deleteLoading = $state(false);
  let cardToDelete = $state<{ id: string; name: string } | null>(null);
  let picPickerOpen = $state(false);
  const assignedMember = $derived(
    members.find((m) => m.id === cardDetail?.card.assigneeId)
  );
  const picOptions = $derived<TaskPicOption[]>(
    members.map((m) => ({
      value: m.id,
      label: m.name,
      avatarUrl: m.avatarUrl ?? undefined
    }))
  );

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
    total: number;
    inserted: number;
    skipped: number;
    updated: number;
    errors: Array<{ row: number; reason: string }>;
  } | null>(null);

  async function loadWorkflowBoardData() {
    if (!data.workspace?.id || !workflowId) return;
    loadingData = true;
    const requestRevision = ++boardRequestRevision;
    loadingMoreStages = {};
    const options = boardRequestOptions();
    lastBoardFilterKey = boardFilterKey();
    try {
      const [boardRes, workflowsRes, membersRes, setupRes] = await Promise.all([
        api.getWorkflowBoard(data.workspace.id, workflowId, options),
        api.listWorkflows(data.workspace.id),
        api.listWorkspaceMembers(data.workspace.id).catch(() => ({ members: [] })),
        api.getWorkflowSetup(data.workspace.id, workflowId).catch(() => ({ stages: [] }))
      ]);
      if (requestRevision !== boardRequestRevision) return;
      board = boardRes.board?.columns ?? [];
      availableTags = boardRes.board?.tags ?? [];
      allWorkflows = workflowsRes.workflows ?? [];
      workflow = workflowsRes.workflows?.find((w) => w.id === workflowId) ?? null;
      members = membersRes.members ?? [];
      stages = setupRes.stages ?? [];
    } catch (err) {
      console.error('Failed to load workflow board data:', err);
    } finally {
      if (requestRevision === boardRequestRevision) {
        loadingData = false;
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('onboarding-page-ready'));
        });
      }
    }
  }

  async function reloadBoardForFilters() {
    if (!data.workspace?.id || !workflowId) return;
    const requestRevision = ++boardRequestRevision;
    loadingMoreStages = {};
    const options = boardRequestOptions();
    lastBoardFilterKey = boardFilterKey();
    try {
      const boardRes = await api.getWorkflowBoard(data.workspace.id, workflowId, options);
      if (requestRevision !== boardRequestRevision) return;
      board = boardRes.board?.columns ?? [];
      availableTags = boardRes.board?.tags ?? [];
    } catch (err) {
      console.error('Failed to filter workflow board:', err);
    }
  }

  async function loadMoreCards(stageId: string) {
    const column = board.find((item) => item.id === stageId);
    if (!data.workspace?.id || !workflowId || !column?.hasMore || loadingMoreStages[stageId]) return;
    const requestRevision = boardRequestRevision;
    loadingMoreStages = { ...loadingMoreStages, [stageId]: true };
    try {
      const boardRes = await api.getWorkflowBoard(
        data.workspace.id,
        workflowId,
        boardRequestOptions(stageId, column.cards.length)
      );
      if (requestRevision !== boardRequestRevision) return;
      const nextPage = boardRes.board?.columns.find((item) => item.id === stageId);
      if (!nextPage) return;
      board = board.map((item) =>
        item.id === stageId
          ? {
              ...item,
              cards: [
                ...item.cards,
                ...nextPage.cards.filter((card) => !item.cards.some((loaded) => loaded.id === card.id))
              ],
              hasMore: nextPage.hasMore
            }
          : item
      );
    } catch (err) {
      console.error('Failed to load more workflow cards:', err);
    } finally {
      if (requestRevision === boardRequestRevision) {
        const nextLoading = { ...loadingMoreStages };
        delete nextLoading[stageId];
        loadingMoreStages = nextLoading;
      }
    }
  }

  $effect(() => {
    const filterKey = boardFilterKey();
    if (!data.workspace?.id || !workflowId || loadingData) return;
    if (lastBoardFilterKey === null) {
      lastBoardFilterKey = filterKey;
      return;
    }
    if (filterKey === lastBoardFilterKey) return;
    lastBoardFilterKey = filterKey;
    const timer = window.setTimeout(() => void reloadBoardForFilters(), 250);
    return () => window.clearTimeout(timer);
  });

  $effect(() => {
    if (data.workspace?.id && workflowId) {
      loadWorkflowBoardData();
    }
  });

  async function refreshBoard() {
    if (!data.workspace?.id || !workflowId) return;
    const requestRevision = ++boardRequestRevision;
    loadingMoreStages = {};
    try {
      const boardRes = await api.getWorkflowBoard(
        data.workspace.id,
        workflowId,
        boardRequestOptions()
      );
      if (requestRevision !== boardRequestRevision) return;
      board = boardRes.board?.columns ?? [];
      availableTags = boardRes.board?.tags ?? [];
      if (selectedCardId) {
        const { detail } = await api.getCardDetail(data.workspace.id, workflowId, selectedCardId);
        cardDetail = detail;
      }
    } catch (err) {
      console.error('Failed to refresh board:', err);
    }
  }

  // Due date & card visual helpers
  const isCardOverdue = (card: {
    dueAt?: string | null;
    completedAt?: string | null;
    createdAt?: string | null;
    stageEnteredAt?: string | null;
    stageId?: string;
  }) => {
    if (card.completedAt) return false;
    // 1. Explicit dueAt in the past
    if (card.dueAt && new Date(card.dueAt).getTime() < Date.now()) {
      return true;
    }
    // 2. Stage overdue reminder hours
    const stage = stages.find((s) => s.id === card.stageId);
    if (stage?.overdueReminderHours && stage.overdueReminderHours > 0) {
      const entered = card.stageEnteredAt || card.createdAt;
      if (entered && new Date(entered).getTime() + stage.overdueReminderHours * 3600 * 1000 < Date.now()) {
        return true;
      }
    }
    // 3. Workflow deadline
    if (workflow?.deadlineValue && workflow.deadlineValue > 0 && card.createdAt) {
      const ms = workflow.deadlineUnit === 'hours'
        ? workflow.deadlineValue * 3600 * 1000
        : workflow.deadlineValue * 86400 * 1000;
      if (new Date(card.createdAt).getTime() + ms < Date.now()) return true;
    }
    // 4. Cards waiting in non-done stages for > 24 hours
    const stageName = stage?.name?.toLowerCase() ?? '';
    const isDoneStage = stageName.includes('done') || stageName.includes('selesai');
    if (!isDoneStage && card.createdAt) {
      const ageHours = (Date.now() - new Date(card.createdAt).getTime()) / (3600 * 1000);
      if (ageHours >= 24) return true;
    }
    return false;
  };

  const isOverdue = (dueAt: string | null | undefined, completedAt: string | null | undefined) =>
    !dueAt || completedAt ? false : new Date(dueAt).getTime() < Date.now();

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
      month: 'short'
    });
  };

  // Card & Kanban helpers
  const allCards = $derived(board.flatMap((col) => col.cards));
  const totalCards = $derived(allCards.length);

  const filteredColumns = $derived<KanbanColumn[]>(
    board.map((col) => {
      const filtered = col.cards.filter((card) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = card.customerName.toLowerCase().includes(q);
          const matchesWa = card.customerWa.toLowerCase().includes(q);
          const matchesProduct = (card.product ?? '').toLowerCase().includes(q);
          const matchesTag = (card.tag ?? '').toLowerCase().includes(q);
          const matchesPic = (card.assigneeName ?? '').toLowerCase().includes(q);
          if (!matchesName && !matchesWa && !matchesProduct && !matchesTag && !matchesPic) return false;
        }
        if (selectedMemberFilter === 'unassigned' && card.assigneeId) return false;
        if (selectedMemberFilter !== 'all' && selectedMemberFilter !== 'unassigned' && card.assigneeId !== selectedMemberFilter) return false;
        if (selectedTagFilter !== 'all' && card.tag !== selectedTagFilter) return false;
        return true;
      });

      return {
        id: col.id,
        title: col.name,
        color: col.color,
        count: col.totalCount,
        hasMore: col.hasMore,
        loadingMore: Boolean(loadingMoreStages[col.id]),
        order: col.position,
        items: filtered.map((card) => {
          const isDone = card.checklistTotal > 0 && card.checklistDone === card.checklistTotal;
          const isLate = isCardOverdue(card);
          const dueBadge = isLate
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
            subtitle: card.product ?? undefined,
            whatsapp: card.customerWa,
            badge: card.tag ?? undefined,
            badgeTone: resolveTone(card.tag),
            assignee: card.assigneeName ?? undefined,
            progress:
              card.checklistTotal > 0 ? `${card.checklistDone}/${card.checklistTotal} Selesai` : undefined,
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

  async function openCard(_columnId: string, cardId: string) {
    if (!data.workspace || !workflowId) return;
    selectedCardId = cardId;
    detailLoading = true;
    detailError = null;
    try {
      const { detail } = await api.getCardDetail(data.workspace.id, workflowId, cardId);
      cardDetail = detail;
    } catch (err) {
      detailError = err instanceof ApiError ? err.message : tr('board.loadCardError');
    } finally {
      detailLoading = false;
    }
  }

  function closeSheet() {
    selectedCardId = null;
    cardDetail = null;
    detailError = null;
    picPickerOpen = false;
  }



  async function toggleChecklistItem(itemId: string, currentDone: boolean) {
    if (!selectedCardId || !data.workspace || !workflowId) return;
    if (!canManageCurrentCard) {
      toast.error('Hanya PIC atau Admin/Owner yang dapat menandai checklist.');
      return;
    }
    try {
      const res = await api.toggleChecklistItem(
        data.workspace.id,
        workflowId,
        selectedCardId,
        itemId,
        { done: !currentDone }
      );
      if (cardDetail) {
        const item = cardDetail.checklist.find((i) => i.id === itemId);
        if (item) {
          item.done = res.item.done;
        }
      }
      await refreshBoard();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('board.checklistError'));
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

  async function updateAssignee(newAssigneeId: string | null) {
    if (!selectedCardId || !data.workspace || !workflowId) return;
    if (!canManage) {
      toast.error('Hanya Admin atau Owner yang dapat mengalihkan PIC kartu ini.');
      return;
    }
    assigneeLoading = true;
    try {
      const res = await api.updateCardAssignee(data.workspace.id, workflowId, selectedCardId, {
        assigneeId: newAssigneeId
      });
      if (cardDetail) {
        cardDetail.card.assigneeId = res.card.assigneeId;
        const m = members.find((x) => x.id === res.card.assigneeId);
        cardDetail.assigneeName = m?.name ?? null;
      }
      toast.success(tr('board.assigneeUpdated'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('board.assigneeError'));
    } finally {
      assigneeLoading = false;
    }
  }

  async function handleCardMove(cardId: string, _fromCol: string, toCol: string) {
    if (!data.workspace || !workflowId) return;
    const card = allCards.find((c) => c.id === cardId);
    if (!canManageCard(card)) {
      toast.error('Hanya PIC yang ditugaskan atau Admin yang dapat memindahkan kartu ini.');
      await loadWorkflowBoardData();
      return;
    }
    try {
      await api.moveCard(data.workspace.id, workflowId, cardId, { stageId: toCol });
      await refreshBoard();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('board.cardMoveError'));
      await loadWorkflowBoardData();
    }
  }
  async function handleStageReorder(newStageIds: string[]) {
    if (!data.workspace?.id || !workflowId) return;
    if (!canManage) {
      toast.error('Hanya Admin atau Owner yang dapat mengubah urutan peringkat.');
      return;
    }

    const originalBoard = [...board];
    const stageMap = new Map(board.map((col) => [col.id, col]));
    board = newStageIds.map((id) => stageMap.get(id)).filter(Boolean) as typeof board;

    if (stages.length > 0) {
      const setupMap = new Map(stages.map((s) => [s.id, s]));
      stages = newStageIds.map((id) => setupMap.get(id)).filter(Boolean) as typeof stages;
    }

    try {
      await api.reorderStages(data.workspace.id, workflowId, { stageIds: newStageIds });
      toast.success(tr('setup.stagesReordered'));
    } catch (err) {
      board = originalBoard;
      toast.error(err instanceof ApiError ? err.message : tr('setup.reorderFailed'));
    }
  }


  function promptDeleteCard(card: { id: string; name: string }) {
    cardToDelete = card;
  }

  async function deleteCardConfirmed() {
    if (!cardToDelete || !data.workspace || !workflowId) return;
    deleteLoading = true;
    try {
      await api.deleteCard(data.workspace.id, workflowId, cardToDelete.id);
      toast.success(tr('board.cardDeleted'));
      if (selectedCardId === cardToDelete.id) {
        closeSheet();
      }
      cardToDelete = null;
      await loadWorkflowBoardData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('board.deleteCardError'));
    } finally {
      deleteLoading = false;
    }
  }

  // Create Card Modal
  function openCreateModal() {
    createOpen = true;
    createError = null;
    customerName = '';
    customerWa = '';
    product = '';
    tag = '';
    createAssigneeId = '';
  }

  async function createCard() {
    if (!data.workspace || !workflowId || !customerName.trim() || !customerWa.trim()) return;
    createLoading = true;
    createError = null;
    try {
      await api.createCard(data.workspace.id, workflowId, {
        name: customerName.trim(),
        wa: customerWa.trim(),
        product: product.trim() || undefined,
        tag: tag.trim() || undefined,
        assigneeId: createAssigneeId ? createAssigneeId : undefined
      });
      createOpen = false;
      toast.success(tr('board.customerAdded'));
      await loadWorkflowBoardData();
    } catch (err) {
      createError = err instanceof ApiError ? err.message : tr('board.addCustomerError');
    } finally {
      createLoading = false;
    }
  }

  // Import CSV Modal
  function detectColumnsFromCsv(csvText: string) {
    const header = parseCsvHeader(csvText);
    if (header && header.length > 0) {
      importColumns = header;
      const detected = autoDetectColumns(header);
      if (detected) {
        importMapping = {
          name: detected.name,
          wa: detected.wa,
          product: detected.product ?? 2,
          tag: detected.tag ?? 3
        };
      }
    } else {
      importColumns = [];
    }
  }

  function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    importFileName = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || '';
      importCsv = text;
      detectColumnsFromCsv(text);
    };
    reader.readAsText(file);
  }

  function clearImportFile() {
    importFileName = null;
    importCsv = '';
    importColumns = [];
  }

  async function importCustomers() {
    if (!data.workspace || !workflowId || !importCsv.trim()) return;
    importLoading = true;
    importError = null;
    importResult = null;
    try {
      const res = await api.importCardsCsv(data.workspace.id, workflowId, {
        csv: importCsv,
        mode: importMode,
        columnMapping: importColumns.length > 0 ? importMapping : undefined
      });
      importResult = {
        total: (res.result.created ?? 0) + (res.result.skipped ?? 0) + (res.result.updated ?? 0),
        inserted: res.result.created ?? 0,
        skipped: res.result.skipped ?? 0,
        updated: res.result.updated ?? 0,
        errors: res.result.errors ?? []
      };
      toast.success(tr('board.importSuccess', { count: res.result.created }));
    } catch (err) {
      importError = err instanceof ApiError ? err.message : tr('board.importError');
    } finally {
      importLoading = false;
    }
  }

  function openWorkflowChat() {
    if (typeof window !== 'undefined' && workflowId) {
      window.dispatchEvent(
        new CustomEvent('flowboard:open-chat', {
          detail: { contextType: 'workflow', contextId: workflowId }
        })
      );
    }
  }

  const cleanPhone = (phone?: string) => (phone ?? '').replace(/[^0-9]/g, '');

  const resolveTone = (t?: string | null): 'urgent' | 'progress' | 'done' | 'queued' | 'neutral' => {
    if (!t) return 'neutral';
    const l = t.toLowerCase();
    if (l === 'vip' || l === 'urgent') return 'urgent';
    if (l === 'progress' || l === 'pending') return 'progress';
    if (l === 'done' || l === 'closing') return 'done';
    return 'queued';
  };

  const sheetChecklistDone = $derived(
    cardDetail?.checklist.filter((i) => i.done).length ?? 0
  );
  const sheetChecklistTotal = $derived(cardDetail?.checklist.length ?? 0);
  const sheetChecklistPct = $derived(
    sheetChecklistTotal > 0 ? Math.round((sheetChecklistDone / sheetChecklistTotal) * 100) : 0
  );
</script>

{#snippet memberAvatar(member: ApiWorkspaceMember, _index: number)}
  <div title={member.name} class="shrink-0">
    <Avatar name={member.name} src={member.avatarUrl ?? undefined} size={32} class="ring-2 ring-card shadow-xs shrink-0" />
  </div>
{/snippet}

{#snippet statsIconSnippet()}
  <HugeiconsIcon icon={DashboardSquare02Icon} size={15} strokeWidth={1.8} />
{/snippet}

{#snippet settingsIconSnippet()}
  <HugeiconsIcon icon={Settings02Icon} size={15} strokeWidth={1.8} />
{/snippet}

{#snippet editIconSnippet()}
  <HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={1.8} />
{/snippet}

{#snippet importIconSnippet()}
  <HugeiconsIcon icon={Upload04Icon} size={15} strokeWidth={1.8} />
{/snippet}

<svelte:head>
  <title>{workflow?.name ?? tr('board.title')} — actjom</title>
</svelte:head>

<div class="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden">
  {#if loadingData}
    <div class="flex w-full shrink-0 items-center justify-between border-b border-hairline bg-card px-3.5 sm:px-6 py-2 sm:py-2.5 shadow-xs">
      <Skeleton shape="rect" class="h-8 w-36 sm:w-44 rounded-lg" />
      <div class="flex items-center gap-2">
        <Skeleton shape="rect" class="h-8 w-8 rounded-full hidden md:block" />
        <Skeleton shape="rect" class="h-8 w-8 rounded-full hidden md:block" />
        <Skeleton shape="rect" class="h-8 w-20 sm:w-28 rounded-xl" />
      </div>
    </div>
  {:else}
    <header class="flex w-full shrink-0 items-center justify-between border-b border-hairline bg-card px-3.5 sm:px-6 py-2 sm:py-2.5 shadow-xs gap-2">
      <!-- Left: Back Button + Title -->
      <div class="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        <Button
          href="/dashboard/workflows"
          variant="ghost"
          size="sm"
          class="size-8 p-0 text-mute hover:text-ink rounded-lg shrink-0"
          title="Kembali ke Senarai Aliran Kerja"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
        </Button>

        <div class="flex items-center gap-2 min-w-0 flex-1">
          <h1 class="text-sm font-bold tracking-tight text-ink sm:text-base select-none truncate">
            {workflow?.name ?? tr('board.title')}
          </h1>
          {#if workflow?.ownerName}
            <span class="text-xs text-mute hidden md:inline truncate shrink-0">
              · {tr('common.pic')}: <span class="font-medium text-ink-soft">{workflow.ownerName}</span>
            </span>
          {/if}
        </div>
      </div>

      <!-- Right: Member Avatars & Actions -->
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <!-- Member Avatars (hidden on mobile to prioritize title visibility) -->
        {#if members.length > 0}
          <div class="hidden md:flex items-center -space-x-2 overflow-hidden" title="Ahli Workspace">
            {#each members.slice(0, 4) as member, idx (member.id)}
              {@render memberAvatar(member, idx)}
            {/each}
            {#if members.length > 4}
              <div class="grid size-8 place-items-center rounded-full bg-slate-800 text-white ring-2 ring-card text-xs font-bold shadow-sm">
                +{members.length - 4}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Desktop Action Cluster -->
        <div class="hidden sm:flex items-center gap-0.5 rounded-xl border border-hairline bg-canvas-sunken/70 p-1 shadow-xs" data-onboarding="workflow-tabs">
          {#if !isEditMode}
            <Tooltip text="Chat Workflow" side="bottom">
              <button
                type="button"
                onclick={openWorkflowChat}
                class="flex size-8 items-center justify-center rounded-lg text-mute hover:text-ink hover:bg-card transition-colors cursor-pointer"
                aria-label="Chat Workflow"
              >
                <HugeiconsIcon icon={BubbleChatIcon} size={18} strokeWidth={1.8} />
              </button>
            </Tooltip>

            <Tooltip text={tr('board.stats')} side="bottom">
              <a
                href="/dashboard/workflows/{workflowId}/stats"
                class="flex size-8 items-center justify-center rounded-lg text-mute hover:text-ink hover:bg-card transition-colors cursor-pointer"
                aria-label={tr('board.stats')}
              >
                <HugeiconsIcon icon={DashboardSquare02Icon} size={18} strokeWidth={1.8} />
              </a>
            </Tooltip>

            <Tooltip text={tr('setup.workflowSettings')} side="bottom">
              <a
                href="/dashboard/workflows/{workflowId}/settings"
                class="flex size-8 items-center justify-center rounded-lg text-mute hover:text-ink hover:bg-card transition-colors cursor-pointer"
                aria-label={tr('setup.workflowSettings')}
              >
                <HugeiconsIcon icon={Settings02Icon} size={18} strokeWidth={1.8} />
              </a>
            </Tooltip>

            {#if canManage}
              <Tooltip text="Mode Edit Peringkat" side="bottom">
                <button
                  type="button"
                  onclick={enterEditMode}
                  class="flex size-8 items-center justify-center rounded-lg text-mute hover:text-ink hover:bg-card transition-colors cursor-pointer"
                  aria-label="Mode Edit"
                >
                  <HugeiconsIcon icon={Edit02Icon} size={18} strokeWidth={1.8} />
                </button>
              </Tooltip>
            {/if}

            <div class="h-4 w-px bg-hairline mx-0.5"></div>

            <Tooltip text={tr('board.importCsv')} side="bottom">
              <button
                type="button"
                onclick={() => (importOpen = true)}
                class="flex size-8 items-center justify-center rounded-lg text-mute hover:text-ink hover:bg-card transition-colors cursor-pointer"
                aria-label={tr('board.importCsv')}
                data-onboarding="import-csv-btn"
              >
                <HugeiconsIcon icon={Upload04Icon} size={18} strokeWidth={1.8} />
              </button>
            </Tooltip>
          {:else}
            <Button variant="ghost" size="sm" onclick={exitEditMode} class="h-8 gap-1.5 text-xs font-semibold text-primary hover:bg-card">
              <HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={2} />
              <span>Selesai Edit</span>
            </Button>
          {/if}
        </div>

        <!-- Mobile Action Cluster -->
        <div class="flex sm:hidden items-center gap-1">
          {#if !isEditMode}
            <div class="flex items-center gap-0.5 rounded-xl border border-hairline bg-canvas-sunken/70 p-1 shadow-xs">
              <button
                type="button"
                onclick={openWorkflowChat}
                class="flex size-8 items-center justify-center rounded-lg text-mute hover:text-ink hover:bg-card transition-colors cursor-pointer"
                aria-label="Chat Workflow"
              >
                <HugeiconsIcon icon={BubbleChatIcon} size={18} strokeWidth={1.8} />
              </button>

              <DropdownMenu items={mobileMenuItems} align="end">
                {#snippet trigger({ open, toggle })}
                  <button
                    type="button"
                    class={cn(
                      "flex size-8 items-center justify-center rounded-lg text-mute hover:text-ink hover:bg-card transition-colors cursor-pointer",
                      open && "bg-card text-ink shadow-xs"
                    )}
                    onclick={toggle}
                    aria-label="Pilihan lanjut"
                  >
                    <HugeiconsIcon icon={MoreHorizontalIcon} size={18} strokeWidth={1.8} />
                  </button>
                {/snippet}
              </DropdownMenu>
            </div>
          {:else}
            <Button variant="primary" size="sm" onclick={exitEditMode} class="h-8 px-2.5 gap-1 text-xs font-semibold shadow-xs">
              <HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={2} />
              <span>Selesai</span>
            </Button>
          {/if}
        </div>
      </div>
    </header>
  {/if}

  <!-- Filter Bar: exact matching Image #1 -->
  {#if !isEditMode}
    <div
      class="flex flex-col gap-2 sm:gap-2.5 sm:flex-row sm:items-center sm:justify-between px-3.5 sm:px-6 py-2 sm:py-2.5 border-b border-hairline bg-card/60 shrink-0"
      data-onboarding="board-filter-bar"
    >
      <!-- Search Input on Left -->
      <div class="w-full sm:w-[360px] lg:w-[420px] sm:flex-none">
        <SearchInput
          bind:value={searchQuery}
          placeholder={tr('board.searchPlaceholder')}
          submit={false}
          size="sm"
        />
      </div>

      <!-- Select Menus (PIC & Status) -->
      <div class="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:items-center sm:gap-2.5">
        <div class="relative w-full sm:w-auto">
          <select
            bind:value={selectedMemberFilter}
            class="h-8.5 sm:h-9 w-full sm:w-auto appearance-none rounded-xl sm:rounded-full border border-hairline bg-card pl-3 pr-8 sm:pl-4 sm:pr-9 text-xs sm:text-[13px] font-medium text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all shadow-xs truncate"
          >
            <option value="all">Semua PIC</option>
            <option value="unassigned">{tr('board.unassigned')}</option>
            {#each members as member (member.id)}
              <option value={member.id}>{member.name}</option>
            {/each}
          </select>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={15}
            strokeWidth={1.8}
            class="pointer-events-none absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-mute"
          />
        </div>

        <div class="relative w-full sm:w-auto">
          <select
            bind:value={selectedTagFilter}
            class="h-8.5 sm:h-9 w-full sm:w-auto appearance-none rounded-xl sm:rounded-full border border-hairline bg-card pl-3 pr-8 sm:pl-4 sm:pr-9 text-xs sm:text-[13px] font-medium text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all shadow-xs truncate"
          >
            <option value="all">All status</option>
            {#each availableTags as tagOpt (tagOpt)}
              <option value={tagOpt}>{tagOpt}</option>
            {/each}
          </select>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={15}
            strokeWidth={1.8}
            class="pointer-events-none absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-mute"
          />
        </div>

        {#if isFilterActive}
          <Button
            variant="ghost"
            size="sm"
            onclick={resetFilters}
            class="col-span-2 sm:col-span-1 h-7 text-xs text-mute hover:text-ink justify-center sm:justify-start"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2} class="mr-1" />
            <span>{tr('board.resetFilter')}</span>
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Main Canvas: fills remaining height, flex-1 min-h-0 overflow-hidden -->
  <div class="flex-1 min-h-0 w-full overflow-hidden flex flex-col p-3 sm:p-5">
    {#if isEditMode}
      <div class="h-full w-full overflow-y-auto space-y-4">
        <div class="flex items-center gap-2.5 rounded-xl bg-primary-soft/60 px-4 py-2.5 border border-primary/20 text-ink shrink-0">
          <Badge tone="progress" variant="solid" class="font-bold">Mode Edit</Badge>
          <span class="text-sm font-medium">Susun peringkat, urutan kolum dan senarai semak aliran kerja ini.</span>
        </div>

        <WorkflowStageEditor
          workspaceId={data.workspace?.id ?? ''}
          {workflowId}
          bind:stages
          {allWorkflows}
          {canManage}
          bind:openCreateStageModal={openCreateStage}
          onchange={loadWorkflowBoardData}
        />
      </div>
    {:else}
      {#if loadingData}
        <div class="flex gap-4 overflow-hidden h-full">
          {#each [1, 2, 3] as _i}
            <div class="w-lane shrink-0 rounded-2xl border border-hairline bg-canvas-sunken p-3.5 space-y-3 h-full">
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
          actionLabel={canManage ? tr('board.setupStages') : undefined}
          onaction={enterEditMode}
        />
      {:else}
        {#if isFilterActive && totalFilteredCount === 0}
          <div class="m-auto rounded-2xl border border-hairline bg-card p-12 text-center shadow-card max-w-md">
            <p class="ds-section-title text-ink">{tr('common.noResults')}</p>
            <p class="ds-caption mt-1 text-mute">{tr('board.noFilterResults')}</p>
            <Button variant="secondary" size="sm" class="mt-4" onclick={resetFilters}>
              {tr('board.resetFilter')}
            </Button>
          </div>
        {:else}
          <KanbanBoard
            columns={filteredColumns}
            class="h-full"
            addButtonPosition="top"
            onadd={() => openCreateModal()}
            onaddcard={() => openCreateModal()}
            addLabel={tr('board.addCustomer')}
            onloadmore={loadMoreCards}
            oncardmove={handleCardMove}
            oncardclick={openCard}
            emptyTitle={tr('board.noCustomersInStage')}
            emptyDropHint={tr('board.dropCardHere')}
            waErrorLabel={tr('board.waError')}
            oncolumnreorder={canManage ? handleStageReorder : undefined}
          />
        {/if}
      {/if}
    {/if}
  </div>
</div>

<!-- Customer Detail Drawer (Sheet) -->
<Sheet
  open={isSheetOpen}
  onclose={closeSheet}
  title={cardDetail?.customer?.name ?? tr('board.cardDetail')}
>
  {#snippet headerActions()}
    {#if canManage && cardDetail}
      <button
        type="button"
        onclick={() => promptDeleteCard({ id: cardDetail!.card.id, name: cardDetail!.customer?.name ?? '' })}
        class="inline-flex items-center gap-1.5 rounded-lg border border-status-urgent/30 bg-status-urgent-soft px-2.5 py-1 text-xs font-semibold text-status-urgent-ink transition hover:bg-status-urgent/20"
        title="Hapus Kad Pelanggan"
      >
        <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
        <span>Hapus Kad</span>
      </button>
    {/if}
  {/snippet}

  {#if detailLoading}
    <div class="space-y-4 py-4">
      <Skeleton shape="rect" class="h-6 w-32 rounded-md" />
      <Skeleton shape="rect" class="h-10 w-full rounded-xl" />
      <Skeleton shape="rect" class="h-24 w-full rounded-2xl" />
    </div>
  {:else if cardDetail}
    <div class="space-y-5 pb-6">
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

      <!-- Customer Information -->
      <section class="space-y-4 rounded-2xl border border-hairline bg-card p-4 shadow-card">
        <div class="flex items-start gap-3.5">
          <Avatar
            name={cardDetail.customer?.name}
            size={48}
            class="shrink-0 ring-2 ring-hairline/80 shadow-xs"
          />
          <div class="min-w-0 flex-1 space-y-1">
            <h2 class="truncate text-base font-bold leading-tight text-ink">
              {cardDetail.customer?.name ?? tr('board.cardDetail')}
            </h2>
            <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
              {#if cardDetail.stage?.name}
                <Badge tone="queued" variant="soft" class="px-2 py-0.5 text-[11px] font-semibold">
                  {cardDetail.stage.name}
                </Badge>
              {/if}
              {#if cardDetail.card.tag}
                <Badge tone={resolveTone(cardDetail.card.tag)} variant="soft" class="px-2 py-0.5 text-[11px] font-semibold">
                  {cardDetail.card.tag}
                </Badge>
              {/if}
              {#if cardDetail.card.completedAt}
                <Badge tone="done" variant="soft" class="px-2 py-0.5 text-[11px] font-semibold">
                  {tr('board.completed')}
                </Badge>
              {:else if isCardOverdue(cardDetail.card)}
                <Badge tone="urgent" variant="soft" class="px-2 py-0.5 text-[11px] font-semibold">
                  {tr('board.overdue')}
                </Badge>
              {:else if isDueSoon(cardDetail.card.dueAt, cardDetail.card.completedAt)}
                <Badge tone="progress" variant="soft" class="px-2 py-0.5 text-[11px] font-semibold">
                  {tr('board.dueSoon')}
                </Badge>
              {/if}
              {#if cardDetail.waErrorFlag}
                <Badge tone="urgent" variant="soft" class="px-2 py-0.5 text-[11px] font-semibold">Ralat WA</Badge>
              {/if}
            </div>
          </div>
        </div>

        <div class="space-y-3.5 rounded-xl border border-hairline/80 bg-lane/40 p-3.5">
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2.5">
              <span class="grid size-7 shrink-0 place-items-center rounded-lg border border-hairline/70 bg-card text-mute shadow-xs">
                <HugeiconsIcon icon={SmartPhone01Icon} size={15} strokeWidth={1.8} />
              </span>
              <div class="min-w-0">
                <p class="text-[11px] font-medium leading-none text-mute">No. Handphone</p>
                <p class="mt-0.5 truncate text-sm font-semibold text-ink">{cardDetail.customer?.wa || '-'}</p>
              </div>
            </div>
            {#if cardDetail.customer?.wa}
              <a
                href="https://wa.me/{cleanPhone(cardDetail.customer.wa)}"
                target="_blank"
                rel="noreferrer"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-status-done px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90"
                title="Buka WhatsApp"
              >
                <HugeiconsIcon icon={WhatsappIcon} size={13} strokeWidth={2} />
                <span>WhatsApp</span>
              </a>
            {/if}
          </div>

          <div class="h-px bg-hairline/70"></div>

          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2.5">
              <span class="grid size-7 shrink-0 place-items-center rounded-lg border border-hairline/70 bg-card text-mute shadow-xs">
                <HugeiconsIcon icon={PackageIcon} size={15} strokeWidth={1.8} />
              </span>
              <div class="min-w-0">
                <p class="text-[11px] font-medium leading-none text-mute">Paket yang Dibeli</p>
                <p class="mt-0.5 truncate text-sm font-semibold text-ink">{cardDetail.card.product || '-'}</p>
              </div>
            </div>
            {#if cardDetail.card.product}
              <Badge tone="queued" variant="soft" class="shrink-0 px-2 py-0.5 text-[11px] font-semibold">Paket</Badge>
            {/if}
          </div>

          {#if cardDetail.card.completedAt || cardDetail.card.dueAt}
            <div class="h-px bg-hairline/70"></div>
            <div class="flex items-center gap-2.5">
              <span class="grid size-7 shrink-0 place-items-center rounded-lg border border-hairline/70 bg-card text-mute shadow-xs">
                {#if cardDetail.card.completedAt}
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} strokeWidth={1.8} class="text-status-done-ink" />
                {:else}
                  <HugeiconsIcon icon={Clock01Icon} size={15} strokeWidth={1.8} />
                {/if}
              </span>
              <div class="min-w-0">
                <p class="text-[11px] font-medium leading-none text-mute">
                  {cardDetail.card.completedAt ? tr('board.completedOn') : tr('board.dueDate')}
                </p>
                <p class="mt-0.5 text-xs font-semibold text-ink">
                  {formatDueDate(cardDetail.card.completedAt ?? cardDetail.card.dueAt ?? cardDetail.card.createdAt)}
                </p>
              </div>
            </div>
          {/if}
        </div>
      </section>

      <!-- PIC Assignment -->
      <section class="space-y-2 border-b border-hairline pb-4">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-mute">{tr('common.pic')}</h3>
        <div class="flex items-center gap-2.5">
          {#if assignedMember}
            <button
              type="button"
              class="group flex items-center gap-2 rounded-full border border-hairline bg-card py-1 pl-1 pr-3 shadow-xs transition hover:border-primary/40 hover:bg-lane/40 disabled:cursor-default disabled:opacity-100"
              title={assignedMember.name}
              onclick={() => {
                if (canManage) picPickerOpen = true;
              }}
              disabled={!canManage}
            >
              <Avatar name={assignedMember.name} src={assignedMember.avatarUrl ?? undefined} size={32} />
              <span class="text-sm font-medium text-ink transition-colors group-hover:text-primary">{assignedMember.name}</span>
            </button>
          {:else}
            <span class="text-xs italic text-mute">{tr('home.noAssignee')}</span>
          {/if}

          {#if canManage}
            <TaskPicPicker
              values={cardDetail.card.assigneeId ? [cardDetail.card.assigneeId] : []}
              bind:open={picPickerOpen}
              options={picOptions}
              disabled={assigneeLoading}
              onchange={(values) => {
                const current = cardDetail?.card.assigneeId;
                const next = values.find((value) => value !== current) ?? (current && values.includes(current) ? current : null);
                picPickerOpen = false;
                void updateAssignee(next ?? null);
              }}
            >
              {#snippet trigger({ open, toggle })}
                <button
                  type="button"
                  class={cn(
                    'grid size-8 place-items-center rounded-full border border-hairline bg-card text-xl leading-none text-mute transition hover:border-primary hover:text-primary',
                    open && 'border-primary text-primary'
                  )}
                  onclick={toggle}
                  aria-haspopup="listbox"
                  aria-expanded={open}
                  aria-label={assignedMember ? 'Tukar PIC' : 'Tugaskan PIC'}
                  title={assignedMember ? 'Tukar PIC' : 'Tugaskan PIC'}
                >
                  +
                </button>
              {/snippet}
            </TaskPicPicker>
          {/if}
        </div>
      </section>

      <!-- Checklist -->
      <section class="space-y-3.5 rounded-2xl border border-hairline bg-card p-4 shadow-card">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <h3 class="ds-section-title text-ink">{tr('common.checklist')}</h3>
              <span class="rounded-full bg-lane px-2 py-0.5 text-xs font-semibold text-mute">
                {sheetChecklistDone} / {sheetChecklistTotal}
              </span>
            </div>
            <span class={cn('text-xs font-bold', sheetChecklistPct === 100 ? 'text-status-done-ink' : 'text-primary')}>
              {sheetChecklistPct}%
            </span>
          </div>
          <ProgressBar value={sheetChecklistPct} max={100} class="h-2 rounded-full" />
        </div>

        <div class="space-y-2 pt-1">
          {#each cardDetail.checklist as item (item.id)}
            <div
              class={cn(
                'flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors',
                item.done ? 'border-status-done/25 bg-status-done-soft/40' : 'border-hairline bg-lane/30 hover:bg-lane/60'
              )}
            >
              <label class="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-3">
                <Checkbox
                  checked={item.done}
                  onchange={() => toggleChecklistItem(item.id, item.done)}
                  disabled={!canManageCurrentCard}
                />
                <span class={cn('truncate text-sm font-medium transition-colors', item.done ? 'text-mute line-through' : 'text-ink')}>
                  {item.label}
                </span>
              </label>
              {#if item.required}
                <Badge tone="progress" variant="soft" class="shrink-0 px-1.5 py-0.2 text-[10px] font-semibold">Wajib</Badge>
              {/if}
            </div>
          {:else}
            <div class="rounded-xl border border-dashed border-hairline p-4 text-center text-xs text-mute">
              Tiada item senarai semak untuk peringkat ini.
            </div>
          {/each}
        </div>
      </section>

      {#if cardDetail.nextWorkflow}
        <section class="space-y-2.5 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-primary">Alur Kerja Seterusnya</span>
            <Button variant="primary" size="sm" onclick={relayToNextWorkflow} loading={relayLoading}>
              Hantar ke {cardDetail.nextWorkflow.name}
            </Button>
          </div>
          <p class="text-xs leading-relaxed text-mute">
            Pindahkan kad pelanggan ini ke aliran kerja seterusnya mengikut tetapan auto-relay.
          </p>
        </section>
      {/if}
    </div>
  {/if}
</Sheet>

<!-- Modal: Confirm Delete Card -->
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
    <div class="rounded-2xl border border-hairline bg-canvas-sunken p-4 space-y-1.5 text-[13px] text-mute">
      <p class="font-semibold text-ink">{tr('board.rowFormat')}</p>
      <code class="block rounded-lg border border-hairline bg-card p-2 font-mono text-[12px] text-ink">
        Customer, WhatsApp, Product, Tag
      </code>
      <p class="pt-1 text-[12px]">
        {tr('board.example')} <code>Siti Aminah, 60123456789, April webinar, VIP</code>
      </p>
    </div>

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

    <FormField label={tr('board.csvData')} required>
      {#snippet control(args)}
        <div class="space-y-2.5">
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
                class="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-mute transition-colors hover:bg-status-urgent/10 hover:text-status-urgent cursor-pointer"
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
              <option value={-1}>{tr('board.ignoreColumn')}</option>
              {#each importColumns as col, idx}
                <option value={idx}>{col || `Column ${idx + 1}`}</option>
              {/each}
            </select>
          </label>

          <label class="space-y-1.5">
            <span class="text-xs font-semibold text-ink">{tr('board.mapTag')}</span>
            <select bind:value={importMapping.tag} class="h-9 w-full rounded-lg border border-hairline bg-card px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
              <option value={-1}>{tr('board.ignoreColumn')}</option>
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

    {#if importResult}
      <div class="rounded-2xl border border-hairline bg-canvas-sunken p-4 text-[13px] space-y-2">
        <p class="font-bold text-ink">{tr('board.importResult')}</p>
        <div class="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div class="rounded-lg bg-card p-2 border border-hairline">
            <span class="text-mute block">{tr('board.totalProcessed')}</span>
            <span class="text-sm font-bold text-ink">{importResult.total}</span>
          </div>
          <div class="rounded-lg bg-card p-2 border border-hairline">
            <span class="text-mute block">{tr('board.inserted')}</span>
            <span class="text-sm font-bold text-status-done-ink">{importResult.inserted}</span>
          </div>
          <div class="rounded-lg bg-card p-2 border border-hairline">
            <span class="text-mute block">{tr('board.updated')}</span>
            <span class="text-sm font-bold text-primary">{importResult.updated}</span>
          </div>
          <div class="rounded-lg bg-card p-2 border border-hairline">
            <span class="text-mute block">{tr('board.skipped')}</span>
            <span class="text-sm font-bold text-mute">{importResult.skipped}</span>
          </div>
        </div>
        {#if importResult.errors.length > 0}
          <div class="mt-2 rounded-xl border border-status-urgent/25 bg-status-urgent-soft p-3">
            <p class="font-semibold text-status-urgent-ink">{tr('board.rowErrors')}</p>
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
