<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    api,
    ApiError,
    type ApiTaskActivity,
    type ApiTaskAttachment,
    type ApiTaskBoard,
    type ApiTaskBoardColumn,
    type ApiTaskComment,
    type ApiTaskDetail,
    type ApiTaskLabel,
    type ApiTaskPriority,
    type ApiTaskRecurrence,
    type ApiWorkspaceMember,
    type ApiWorkspaceMemberGroup
  } from '$lib/api/client';
  import { cn } from '$lib/utils.js';
  import { dashboardText, dashboardIntlLocale } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import {
    Avatar,
    Button,
    Checkbox,
    IconButton,
    Input,
    Skeleton,
    Textarea,
    Tooltip
  } from '$lib/components/atoms/index.js';
  import {
    Breadcrumb,
    DatePicker,
    DropdownMenu,
    FormField,
    RichTextEditor,
    RichTextContent,
    SelectMenu,
    TaskPicPicker,
    toast,
    type MenuItem
  } from '$lib/components/molecules/index.js';
  import { ConfirmDialog, Dialog, KanbanBoard, Popover, Sheet } from '$lib/components/organisms/index.js';
  import type { KanbanColumn } from '$lib/components/organisms/shared.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    AlertCircleIcon,
    ArrowDown01Icon,
    ArrowLeft01Icon,
    BubbleChatIcon,
    Clock01Icon,
    Delete02Icon,
    Download04Icon,
    Edit02Icon,
    File02Icon,
    Globe02Icon,
    Link01Icon,
    MoreHorizontalIcon,
    Settings01Icon,
    SquareDashedKanbanIcon,
    Tag01Icon,
    UserGroupIcon,
    ZoomIcon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../../$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);
  const COMMENT_PREVIEW_LIMIT = 3;
  const ACTIVITY_PREVIEW_LIMIT = 3;

  const boardId = $derived(page.params.boardId ?? '');

  let loadingData = $state(true);
  let loadError = $state<string | null>(null);
  let board = $state<ApiTaskBoard | null>(null);
  let columns = $state<ApiTaskBoardColumn[]>([]);
  let groups = $state<ApiWorkspaceMemberGroup[]>([]);
  let members = $state<ApiWorkspaceMember[]>([]);
  let workspaceLabels = $state<ApiTaskLabel[]>([]);
  const canManage = $derived(
    data.workspace?.role === 'owner' || board?.ownerId === data.user?.id
  );
  const totalTasks = $derived(columns.reduce((count, column) => count + column.tasks.length, 0));

  // Task detail sheet state
  let selectedTaskId = $state<string | null>(null);
  let isSheetOpen = $derived(selectedTaskId !== null);
  let detailTab = $state('details');
  let taskDetail = $state<(ApiTaskDetail & { comments: ApiTaskComment[]; attachments: ApiTaskAttachment[] }) | null>(null);
  let detailLoading = $state(false);
  let detailError = $state<string | null>(null);
  let editTitle = $state('');
  let editDescription = $state('');
  let descriptionEditing = $state(false);
  let editPriority = $state<ApiTaskPriority>('medium');
  let editAssigneeId = $state('');
  let taskAssigneeValues = $state<string[]>([]);
  let editDueDate = $state('');
  let editDueTime = $state('12:00');
  let editStartDate = $state('');
  let editStartDateEnabled = $state(false);
  let editDueDateEnabled = $state(false);
  let editRecurrence = $state<ApiTaskRecurrence>('never');
  let editRecurrenceDays = $state<number[]>([]);
  let editLabelInput = $state('');
  let editLabels = $state<string[]>([]);
  let savingTask = $state(false);
  let taskToDelete = $state<{ id: string; title: string } | null>(null);
  let deletingTask = $state(false);
  let commentDraft = $state('');
  let postingComment = $state(false);
  let deletingCommentId = $state<string | null>(null);
  let commentComposerOpen = $state(false);
  let editingCommentId = $state<string | null>(null);
  let commentEditDraft = $state('');
  let commentEditSaving = $state(false);
  let commentDetailsLoading = $state(false);
  let commentsExpanded = $state(false);
  let commentImageError = $state<string | null>(null);
  let uploadingAttachment = $state(false);
  let attachmentError = $state<string | null>(null);
  let deletingAttachmentId = $state<string | null>(null);
  let previewAttachment = $state<ApiTaskAttachment | null>(null);
  let fileInputEl = $state<HTMLInputElement | null>(null);
  let taskTitleEditing = $state(false);
  let taskTitleInputEl = $state<HTMLInputElement | null>(null);
  let labelPickerOpen = $state(false);
  let labelEditorOpen = $state(false);
  let editingLabel = $state<ApiTaskLabel | null>(null);
  let labelSearch = $state('');
  let labelDraftName = $state('');
  let labelDraftColor = $state('indigo');
  let labelSaving = $state(false);
  let deadlineOpen = $state(false);
  let attachmentOpen = $state(false);
  let attachmentSectionOpen = $state(false);
  let attachmentFile = $state<File | null>(null);
  let attachmentUrl = $state('');
  let attachmentDisplayText = $state('');
  let picPickerOpen = $state(false);
  // Create task dialog state
  let createOpen = $state(false);
  let createError = $state<string | null>(null);
  let createColumnId = $state('');
  let createLoading = $state(false);
  let newTitle = $state('');
  let newDescription = $state('');
  let newPriority = $state<ApiTaskPriority>('medium');
  let newAssigneeId = $state('');
  let newDueDate = $state('');
  let newLabels = $state<string[]>([]);
  let newLabelInput = $state('');
  // Column dialog state
  let columnDialogOpen = $state(false);
  let columnSaving = $state(false);
  let columnError = $state<string | null>(null);
  let editingColumn = $state<{ id: string; name: string; color: string } | null>(null);
  let columnName = $state('');
  let columnColor = $state('indigo');
  let columnToDelete = $state<{ id: string; name: string } | null>(null);
  let deletingColumn = $state(false);

  // Activity slide-over state
  let activityOpen = $state(false);
  let activityItems = $state<ApiTaskActivity[]>([]);
  let activityLoading = $state(false);
  let activityError = $state<string | null>(null);

  let editBoardOpen = $state(false);
  let editBoardLoading = $state(false);
  let editBoardError = $state<string | null>(null);
  let editBoardName = $state('');
  let editBoardDescription = $state('');
  let editBoardGroupId = $state('');

  function openEditBoardSettings() {
    if (!board) return;
    editBoardName = board.name;
    editBoardDescription = board.description ?? '';
    editBoardGroupId = board.workspaceMemberGroupId ?? '';
    editBoardError = null;
    editBoardOpen = true;
  }

  async function saveBoardSettings() {
    if (!board || !data.workspace?.id || !editBoardName.trim()) return;
    editBoardLoading = true;
    editBoardError = null;
    try {
      const res = await api.updateTaskBoard(data.workspace.id, board.id, {
        name: editBoardName.trim(),
        description: editBoardDescription.trim() ? editBoardDescription.trim() : null,
        workspaceMemberGroupId: editBoardGroupId ? editBoardGroupId : null
      });
      board = res.board;
      editBoardOpen = false;
      toast.success('Pengaturan papan berhasil disimpan');
    } catch (err) {
      editBoardError = err instanceof ApiError ? err.message : tr('taskboard.loadError');
    } finally {
      editBoardLoading = false;
    }
  }

  let isEditingTitle = $state(false);
  let inlineTitle = $state('');
  let inlineTitleInputEl = $state<HTMLInputElement | null>(null);
  let savingInlineTitle = $state(false);

  function startEditTitle() {
    if (!canManage || !board) return;
    inlineTitle = board.name;
    isEditingTitle = true;
    queueMicrotask(() => {
      inlineTitleInputEl?.focus();
      inlineTitleInputEl?.select();
    });
  }

  async function saveInlineTitle() {
    if (!isEditingTitle || !board || !data.workspace?.id) return;
    const trimmed = inlineTitle.trim();
    if (!trimmed || trimmed === board.name) {
      isEditingTitle = false;
      return;
    }
    savingInlineTitle = true;
    try {
      const res = await api.updateTaskBoard(data.workspace.id, board.id, {
        name: trimmed,
        description: board.description ?? null,
        workspaceMemberGroupId: board.workspaceMemberGroupId ?? null
      });
      board = res.board;
      isEditingTitle = false;
      toast.success('Nama papan berjaya dikemas kini');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengemas kini nama papan');
    } finally {
      savingInlineTitle = false;
    }
  }

  function handleTitleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveInlineTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      isEditingTitle = false;
    }
  }
  const groupOptions = $derived([
    { value: '', label: tr('taskboard.viewerAll') },
    ...groups.map((g) => ({ value: g.id, label: g.name }))
  ]);
  const assigneeOptions = $derived([
    { value: '', label: tr('taskboard.unassigned') },
    ...members.map((member) => ({ value: member.id, label: member.name }))
  ]);
  const picOptions = $derived(
    members.map((member) => ({
      value: member.id,
      label: member.name,
      avatarUrl: member.avatarUrl ?? undefined
    }))
  );
  const selectedMembers = $derived(
    taskAssigneeValues
      .map((id) => members.find((member) => member.id === id))
      .filter((member): member is ApiWorkspaceMember => Boolean(member))
  );


  const priorityOptions = $derived([
    { value: 'low', label: tr('taskboard.priorityLow') },
    { value: 'medium', label: tr('taskboard.priorityMedium') },
    { value: 'high', label: tr('taskboard.priorityHigh') }
  ]);
  const recurrenceOptions: Array<{ value: ApiTaskRecurrence; label: string }> = [
    { value: 'never', label: 'Never' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' }
  ];
  const recurrenceWeekdays = [
    { value: 0, label: 'S' },
    { value: 1, label: 'M' },
    { value: 2, label: 'T' },
    { value: 3, label: 'W' },
    { value: 4, label: 'T' },
    { value: 5, label: 'F' },
    { value: 6, label: 'S' }
  ];

  const canEditTask = (task?: { assigneeId?: string | null } | null) =>
    canManage || (task?.assigneeId != null && task.assigneeId === data.user?.id);
  const canCompleteTask = (task?: { assigneeId?: string | null; createdById?: string | null } | null) =>
    canManage ||
    task?.assigneeId === data.user?.id ||
    task?.createdById === data.user?.id;
  const canEditCurrentTask = $derived(canEditTask(taskDetail));
  const filteredWorkspaceLabels = $derived(
    workspaceLabels.filter((label) =>
      label.name.toLowerCase().includes(labelSearch.trim().toLowerCase())
    )
  );
  const taskActivityItems = $derived(
    activityItems.filter((item) => !taskDetail || item.taskId === taskDetail.id)
  );
  $effect(() => {
    editAssigneeId = taskAssigneeValues[0] ?? '';
  });
  const colorOptions = [
    { value: 'indigo', label: 'Indigo' },
    { value: 'sky', label: 'Sky' },
    { value: 'amber', label: 'Amber' },
    { value: 'emerald', label: 'Emerald' },
    { value: 'rose', label: 'Rose' }
  ];
  const labelColorPalette = [
    { value: 'mint', label: 'Mint', swatch: 'bg-emerald-200 border-emerald-500', tag: 'bg-emerald-100 text-emerald-700' },
    { value: 'yellow', label: 'Yellow', swatch: 'bg-yellow-300 border-yellow-600', tag: 'bg-yellow-100 text-yellow-800' },
    { value: 'orange', label: 'Orange', swatch: 'bg-orange-300 border-orange-600', tag: 'bg-orange-100 text-orange-800' },
    { value: 'red', label: 'Red', swatch: 'bg-red-300 border-red-500', tag: 'bg-red-100 text-red-700' },
    { value: 'purple', label: 'Purple', swatch: 'bg-purple-300 border-purple-500', tag: 'bg-purple-100 text-purple-700' },
    { value: 'green', label: 'Green', swatch: 'bg-emerald-500 border-emerald-600', tag: 'bg-emerald-100 text-emerald-700' },
    { value: 'gold', label: 'Gold', swatch: 'bg-yellow-500 border-yellow-600', tag: 'bg-yellow-100 text-yellow-800' },
    { value: 'tangerine', label: 'Tangerine', swatch: 'bg-orange-500 border-orange-600', tag: 'bg-orange-100 text-orange-800' },
    { value: 'coral', label: 'Coral', swatch: 'bg-red-400 border-red-500', tag: 'bg-red-100 text-red-700' },
    { value: 'violet', label: 'Violet', swatch: 'bg-purple-500 border-purple-600', tag: 'bg-purple-100 text-purple-700' },
    { value: 'blue', label: 'Blue', swatch: 'bg-blue-200 border-blue-500', tag: 'bg-blue-100 text-blue-700' },
    { value: 'cyan', label: 'Cyan', swatch: 'bg-cyan-300 border-cyan-600', tag: 'bg-cyan-100 text-cyan-700' },
    { value: 'lime', label: 'Lime', swatch: 'bg-lime-300 border-lime-600', tag: 'bg-lime-100 text-lime-800' },
    { value: 'pink', label: 'Pink', swatch: 'bg-pink-300 border-pink-500', tag: 'bg-pink-100 text-pink-700' },
    { value: 'slate', label: 'Slate', swatch: 'bg-slate-300 border-slate-500', tag: 'bg-slate-100 text-slate-700' }
  ];
  const labelColorClasses: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-700',
    sky: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-800',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
    ...Object.fromEntries(labelColorPalette.map((color) => [color.value, color.tag]))
  };


  function priorityLabel(priority: ApiTaskPriority) {
    if (priority === 'high') return tr('taskboard.priorityHigh');
    if (priority === 'low') return tr('taskboard.priorityLow');
    return tr('taskboard.priorityMedium');
  }

  function priorityBadgeTone(priority: ApiTaskPriority): 'urgent' | 'progress' | 'neutral' {
    if (priority === 'high') return 'urgent';
    if (priority === 'medium') return 'progress';
    return 'neutral';
  }

  function priorityBarTone(priority: ApiTaskPriority): 'urgent' | 'progress' | 'idle' {
    if (priority === 'high') return 'urgent';
    if (priority === 'medium') return 'progress';
    return 'idle';
  }

  const isOverdue = (dueAt: string | null, completedAt: string | null) => {
    if (!dueAt || completedAt) return false;
    return new Date(dueAt).getTime() < Date.now();
  };

  const isDueToday = (dueAt: string | null, completedAt: string | null) => {
    if (!dueAt || completedAt) return false;
    const due = new Date(dueAt);
    const now = new Date();
    return (
      due.getFullYear() === now.getFullYear() &&
      due.getMonth() === now.getMonth() &&
      due.getDate() === now.getDate()
    );
  };

  function formatDueShort(dueAt: string) {
    return new Date(dueAt).toLocaleDateString(dashboardIntlLocale($locale), {
      day: 'numeric',
      month: 'short'
    });
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString(dashboardIntlLocale($locale), {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  function formatRelativeTime(value: string) {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return formatDateTime(value);

    const elapsedSeconds = (Date.now() - timestamp) / 1000;
    const units = [
      { unit: 'year' as const, seconds: 31_536_000 },
      { unit: 'month' as const, seconds: 2_592_000 },
      { unit: 'week' as const, seconds: 604_800 },
      { unit: 'day' as const, seconds: 86_400 },
      { unit: 'hour' as const, seconds: 3_600 },
      { unit: 'minute' as const, seconds: 60 },
      { unit: 'second' as const, seconds: 1 }
    ];
    const match = units.find(({ seconds }) => Math.abs(elapsedSeconds) >= seconds) ?? units.at(-1)!;
    const amount = -Math.round(elapsedSeconds / match.seconds);
    return new Intl.RelativeTimeFormat(dashboardIntlLocale($locale), { numeric: 'auto' }).format(
      amount,
      match.unit
    );
  }

  function hasEditorContent(value: string) {
    return Boolean(
      value.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim() || value.match(/<img\b/i)
    );
  }

  const canEditComment = (comment: ApiTaskComment) =>
    canManage || comment.authorId === data.user?.id;

  function toDateInput(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function fromDateInput(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(`${trimmed}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  function toTimeInput(iso: string | null): string {
    if (!iso) return '12:00';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '12:00';
    return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  }

  function fromDateTimeInput(dateValue: string, timeValue: string): string | null {
    const date = dateValue.trim();
    if (!date) return null;
    const time = /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : '12:00';
    const parsed = new Date(`${date}T${time}:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  function setStartDateEnabled(enabled: boolean) {
    editStartDateEnabled = enabled;
    if (enabled && !editStartDate) editStartDate = editDueDate || toDateInput(new Date().toISOString());
    if (!enabled) editStartDate = '';
  }

  function setDueDateEnabled(enabled: boolean) {
    editDueDateEnabled = enabled;
    if (enabled && !editDueDate) {
      editDueDate = toDateInput(new Date().toISOString());
      editDueTime = toTimeInput(new Date().toISOString());
    }
    if (!enabled) {
      editDueDate = '';
      editRecurrence = 'never';
      editRecurrenceDays = [];
    }
  }

  async function saveDates() {
    if (await saveTask()) deadlineOpen = false;
  }

  async function removeDates() {
    editStartDateEnabled = false;
    editDueDateEnabled = false;
    editStartDate = '';
    editDueDate = '';
    editDueTime = '12:00';
    editRecurrence = 'never';
    editRecurrenceDays = [];
    if (await saveTask()) deadlineOpen = false;
  }

  function defaultWeeklyDay(dateValue: string) {
    return dateValue ? new Date(`${dateValue}T00:00:00.000Z`).getUTCDay() : new Date().getUTCDay();
  }

  function setRecurrence(value: ApiTaskRecurrence) {
    editRecurrence = value;
    editRecurrenceDays =
      value === 'weekly' && editRecurrenceDays.length === 0
        ? [defaultWeeklyDay(editDueDate)]
        : value === 'weekly'
          ? editRecurrenceDays
          : [];
  }

  function toggleRecurrenceDay(day: number) {
    const nextDays = editRecurrenceDays.includes(day)
      ? editRecurrenceDays.filter((value) => value !== day)
      : [...editRecurrenceDays, day].sort((a, b) => a - b);
    editRecurrenceDays = nextDays.length > 0 ? nextDays : [day];
  }

  const kanbanColumns = $derived<KanbanColumn[]>(
    columns.map((column) => ({
      id: column.id,
      title: column.name,
      color: column.color,
      items: [...column.tasks]
        .sort((a, b) => a.position - b.position)
        .map((task) => {
          const dueBadge = isOverdue(task.dueAt, task.completedAt)
            ? { label: tr('taskboard.overdue'), tone: 'urgent' as const }
            : isDueToday(task.dueAt, task.completedAt)
              ? { label: tr('taskboard.dueToday'), tone: 'progress' as const }
              : undefined;
          const dueDateText =
            task.dueAt && !task.completedAt && !dueBadge
              ? task.recurrence !== 'never'
                ? tr('taskboard.nextOccurrence', { date: formatDueShort(task.dueAt) })
                : tr('taskboard.dueOn', { date: formatDueShort(task.dueAt) })
              : undefined;
          const recurrence = task.recurrence === 'never' ? undefined : task.recurrence;
          const taskLabels = task.labels ?? [];
          const labelColors = Object.fromEntries(
            taskLabels.map((label) => {
              const color = workspaceLabels.find((item) => item.name === label)?.color ?? '';
              return [label, labelColorClasses[color] ?? 'bg-canvas-sunken text-ink'];
            })
          );
          return {
            id: task.id,
            title: task.title,
            labelBarTone: priorityBarTone(task.priority),
            assignee: task.assigneeName ?? undefined,
            dueBadge,
            dueDateText,
            recurrence,
            labels: taskLabels,
            labelColors,
            commentCount: task.commentCount,
            attachmentCount: task.attachmentCount,
            canComplete: canCompleteTask(task),
            completed: Boolean(task.completedAt)
          };
        })
    }))
  );

  function handleEditColumn(column: KanbanColumn) {
    const dbCol = columns.find((c) => c.id === column.id);
    if (dbCol) {
      openRenameColumn(dbCol);
    }
  }

  function handleDeleteColumn(column: KanbanColumn) {
    const dbCol = columns.find((c) => c.id === column.id);
    if (dbCol) {
      columnToDelete = { id: dbCol.id, name: dbCol.name };
    }
  }

  async function refreshView() {
    if (!data.workspace?.id || !boardId) return;
    const res = await api.getTaskBoardView(data.workspace.id, boardId);
    columns = [...(res.board?.columns ?? [])].sort((a, b) => a.position - b.position);
  }

  let allBoards = $state<ApiTaskBoard[]>([]);

  async function loadBoard() {
    if (!data.workspace?.id || !boardId) return;
    loadingData = true;
    loadError = null;
    try {
      const [boardRes, viewRes, membersRes, groupsRes, boardsRes, labelsRes] = await Promise.all([
        api.getTaskBoard(data.workspace.id, boardId),
        api.getTaskBoardView(data.workspace.id, boardId),
        api.listWorkspaceMembers(data.workspace.id).catch(() => ({ members: [] })),
        api.listWorkspaceMemberGroups(data.workspace.id).catch(() => ({ groups: [] })),
        api.listTaskBoards(data.workspace.id).catch(() => ({ boards: [] })),
        api.listTaskLabels(data.workspace.id, boardId).catch(() => ({ labels: [] }))
      ]);
      board = boardRes.board;
      columns = [...(viewRes.board?.columns ?? [])].sort((a, b) => a.position - b.position);
      members = membersRes.members ?? [];
      groups = groupsRes.groups ?? [];
      allBoards = boardsRes.boards ?? [];
      workspaceLabels = labelsRes.labels ?? [];
    } catch (err) {
      loadError = err instanceof ApiError ? err.message : tr('taskboard.boardLoadError');
    } finally {
      loadingData = false;
    }
  }

  $effect(() => {
    if (data.workspace?.id && boardId) {
      loadBoard();
    }
  });

  async function handleCardMove(cardId: string, _fromColumnId: string, toColumnId: string) {
    if (!data.workspace?.id || !boardId) return;
    const task = columns.flatMap((c) => c.tasks).find((t) => t.id === cardId);
    if (!canEditTask(task)) {
      toast.error('Hanya PIC atau Admin/Owner yang dapat memindahkan tugas ini.');
      await refreshView();
      return;
    }
    try {
      await api.moveTask(data.workspace.id, boardId, cardId, { columnId: toColumnId });
      await refreshView();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.moveError'));
    }
  }
  async function handleColumnReorder(newColumnIds: string[]) {
    if (!data.workspace?.id || !boardId) return;
    if (!canManage) {
      toast.error('Hanya Admin atau Owner yang dapat mengubah urutan lajur.');
      return;
    }

    const originalColumns = [...columns];
    const colMap = new Map(columns.map((c) => [c.id, c]));
    columns = newColumnIds.map((id) => colMap.get(id)).filter(Boolean) as typeof columns;

    try {
      await api.reorderTaskColumns(data.workspace.id, boardId, { columnIds: newColumnIds });
      toast.success(tr('taskboard.columnsReordered'));
    } catch (err) {
      columns = originalColumns;
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.columnsReorderError'));
    }
  }
  async function handleTaskCompletion(cardId: string, completed: boolean) {
    if (!data.workspace?.id || !boardId) return;
    const task = columns.flatMap((column) => column.tasks).find((item) => item.id === cardId);
    if (!canCompleteTask(task)) {
      toast.error('Hanya PIC, pembuat tugas, atau Admin/Owner yang dapat menyelesaikan tugas ini.');
      return;
    }
    try {
      const res = await api.completeTask(data.workspace.id, boardId, cardId, { completed });
      if (taskDetail?.id === cardId) {
        taskDetail = { ...res.task, comments: taskDetail.comments, attachments: taskDetail.attachments };
        editStartDate = toDateInput(res.task.startAt);
        editStartDateEnabled = Boolean(res.task.startAt);
        editDueDate = toDateInput(res.task.dueAt);
        editDueDateEnabled = Boolean(res.task.dueAt);
        editDueTime = toTimeInput(res.task.dueAt);
      }
      await refreshView();
      if (taskDetail?.id === cardId) {
        await loadActivity(commentsExpanded ? 100 : ACTIVITY_PREVIEW_LIMIT, cardId);
      }
      if (completed && res.task.recurrence !== 'never') {
        const nextOccurrence = res.task.dueAt ?? res.task.startAt;
        if (nextOccurrence) {
          toast.success(tr('taskboard.recurringCompleted', { date: formatDueShort(nextOccurrence) }));
        }
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.taskError'));
    }
  }

  async function openTask(_columnId: string, taskId: string) {
    if (!data.workspace?.id || !boardId) return;
    selectedTaskId = taskId;
    detailTab = 'details';
    taskDetail = null;
    detailLoading = true;
    detailError = null;
    commentDraft = '';
    commentImageError = null;
    commentComposerOpen = false;
    editingCommentId = null;
    commentEditDraft = '';
    commentsExpanded = false;
    commentDetailsLoading = false;
    attachmentError = null;
    previewAttachment = null;
    taskTitleEditing = false;
    descriptionEditing = false;
    labelPickerOpen = false;
    deadlineOpen = false;
    await loadActivity(ACTIVITY_PREVIEW_LIMIT, taskId);
    try {
      const res = await api.getTaskDetail(
        data.workspace.id,
        boardId,
        taskId,
        undefined,
        { commentsLimit: COMMENT_PREVIEW_LIMIT }
      );
      taskDetail = res.task;
      editTitle = res.task.title;
      editDescription = res.task.description ?? '';
      editPriority = res.task.priority;
      editAssigneeId = res.task.assigneeId ?? '';
      taskAssigneeValues = editAssigneeId ? [editAssigneeId] : [];
      editLabels = [...(res.task.labels ?? [])];
      editStartDate = toDateInput(res.task.startAt);
      editStartDateEnabled = Boolean(res.task.startAt);
      editDueDate = toDateInput(res.task.dueAt);
      editDueDateEnabled = Boolean(res.task.dueAt);
      editDueTime = toTimeInput(res.task.dueAt);
      editRecurrence = res.task.recurrence ?? 'never';
      editRecurrenceDays =
        res.task.recurrence === 'weekly' && res.task.recurrenceDays.length > 0
          ? [...res.task.recurrenceDays]
          : res.task.recurrence === 'weekly'
            ? [defaultWeeklyDay(toDateInput(res.task.dueAt))]
            : [];
      editLabelInput = '';
    } catch (err) {
      detailError = err instanceof ApiError ? err.message : tr('taskboard.taskError');
    } finally {
      detailLoading = false;
    }
  }

  function closeSheet() {
    selectedTaskId = null;
    taskDetail = null;
    detailError = null;
    commentDraft = '';
    commentImageError = null;
    commentComposerOpen = false;
    editingCommentId = null;
    commentEditDraft = '';
    commentsExpanded = false;
    commentDetailsLoading = false;
    attachmentError = null;
    attachmentOpen = false;
    attachmentSectionOpen = false;
    descriptionEditing = false;
    previewAttachment = null;
  }

  async function saveTask(): Promise<boolean> {
    if (!taskDetail || !data.workspace?.id || !boardId || !editTitle.trim()) return false;
    if (!canEditCurrentTask) {
      toast.error('Hanya PIC atau Admin/Owner yang dapat mengubah tugas ini.');
      return false;
    }
    savingTask = true;
    try {
      const res = await api.updateTask(data.workspace.id, boardId, taskDetail.id, {
        title: editTitle.trim(),
        description: editDescription.trim() ? editDescription.trim() : null,
        priority: editPriority,
        labels: editLabels,
        assigneeId: editAssigneeId ? editAssigneeId : null,
        startAt: editStartDateEnabled ? fromDateInput(editStartDate) : null,
        dueAt: editDueDateEnabled ? fromDateTimeInput(editDueDate, editDueTime) : null,
        recurrence: editRecurrence,
        recurrenceDays: editRecurrence === 'weekly' ? editRecurrenceDays : []
      });
      taskDetail = { ...res.task, comments: taskDetail.comments, attachments: taskDetail.attachments };
      await refreshView();
      toast.success(tr('taskboard.saved'));
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.taskError'));
      return false;
    } finally {
      savingTask = false;
    }
  }
 
  function beginDescriptionEdit() {
    if (!canEditCurrentTask || !taskDetail) return;
    editDescription = taskDetail.description ?? '';
    attachmentError = null;
    descriptionEditing = true;
  }

  function cancelDescriptionEdit() {
    editDescription = taskDetail?.description ?? '';
    attachmentError = null;
    descriptionEditing = false;
  }

  async function saveDescription() {
    const saved = await saveTask();
    if (saved) descriptionEditing = false;
  }

  function handleDescriptionViewClick(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('a')) return;
    beginDescriptionEdit();
  }

  function handleDescriptionViewKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      beginDescriptionEdit();
    }
  }

  function beginTaskTitleEdit() {
    if (!canEditCurrentTask) return;
    taskTitleEditing = true;
    setTimeout(() => taskTitleInputEl?.focus(), 0);
  }

  async function finishTaskTitleEdit() {
    if (!taskTitleEditing) return;
    taskTitleEditing = false;
    if (editTitle.trim()) await saveTask();
  }

  function handleTaskTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void finishTaskTitleEdit();
    }
    if (event.key === 'Escape') {
      editTitle = taskDetail?.title ?? editTitle;
      taskTitleEditing = false;
    }
  }

  function openLabelEditor(label?: ApiTaskLabel) {
    editingLabel = label ?? null;
    labelDraftName = label?.name ?? '';
    labelDraftColor = label?.color ?? 'indigo';
    labelEditorOpen = true;
  }

  async function saveLabel() {
    if (!data.workspace?.id || !boardId || !labelDraftName.trim()) return;
    labelSaving = true;
    try {
      const currentLabel = editingLabel;
      if (currentLabel) {
        await api.updateTaskLabel(data.workspace.id, boardId, currentLabel.id, {
          name: labelDraftName.trim(),
          color: labelDraftColor
        });
        editLabels = editLabels.map((name) => (name === currentLabel.name ? labelDraftName.trim() : name));
      } else {
        const res = await api.createTaskLabel(data.workspace.id, boardId, {
          name: labelDraftName.trim(),
          color: labelDraftColor
        });
        editLabels = [...new Set([...editLabels, res.label.name])];
      }
      const res = await api.listTaskLabels(data.workspace.id, boardId);
      workspaceLabels = res.labels;
      labelEditorOpen = false;
      labelPickerOpen = true;
      await saveTask();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Label gagal disimpan');
    } finally {
      labelSaving = false;
    }
  }

  async function removeLabel(label: ApiTaskLabel) {
    if (!data.workspace?.id || !boardId || !canManage) return;
    try {
      await api.deleteTaskLabel(data.workspace.id, boardId, label.id);
      workspaceLabels = workspaceLabels.filter((item) => item.id !== label.id);
      editLabels = editLabels.filter((name) => name !== label.name);
      await saveTask();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Label gagal dihapus');
    }
  }


  function labelClass(name: string) {
    const color = workspaceLabels.find((label) => label.name === name)?.color ?? '';
    return labelColorClasses[color] ?? 'bg-lane text-ink';
  }
  function toggleTaskLabel(labelName: string) {
    editLabels = editLabels.includes(labelName)
      ? editLabels.filter((name) => name !== labelName)
      : [...editLabels, labelName];
    void saveTask();
  }

  function removeTaskLabel(labelName: string) {
    editLabels = editLabels.filter((name) => name !== labelName);
    void saveTask();
  }

  async function deleteTaskConfirmed() {
    if (!taskToDelete || !data.workspace?.id || !boardId) return;
    deletingTask = true;
    try {
      await api.deleteTask(data.workspace.id, boardId, taskToDelete.id);
      taskToDelete = null;
      closeSheet();
      await refreshView();
      toast.success(tr('taskboard.taskDeleted'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.deleteTaskError'));
    } finally {
      deletingTask = false;
    }
  }

  const canDeleteTask = $derived(
    canManage || (taskDetail?.createdById != null && taskDetail.createdById === data.user?.id)
  );

  function cancelCommentComposer() {
    commentDraft = '';
    commentComposerOpen = false;
    commentImageError = null;
  }

  async function loadCommentDetails() {
    const taskId = taskDetail?.id;
    if (!taskId || !data.workspace?.id || !boardId) return;
    commentDetailsLoading = true;
    try {
      const [commentsRes] = await Promise.all([
        api.listTaskComments(data.workspace.id, boardId, taskId),
        loadActivity(100, taskId)
      ]);
      if (taskDetail?.id !== taskId) return;
      taskDetail = { ...taskDetail, comments: commentsRes.comments };
      commentsExpanded = true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.commentError'));
    } finally {
      commentDetailsLoading = false;
    }
  }
  function collapseCommentDetails() {
    commentsExpanded = false;
    if (!taskDetail) return;
    taskDetail = {
      ...taskDetail,
      comments: taskDetail.comments.slice(-COMMENT_PREVIEW_LIMIT)
    };
    activityItems = activityItems.slice(0, ACTIVITY_PREVIEW_LIMIT);
  }

  function beginCommentEdit(comment: ApiTaskComment) {
    if (!canEditComment(comment)) return;
    editingCommentId = comment.id;
    commentEditDraft = comment.content;
    commentImageError = null;
  }

  function cancelCommentEdit() {
    editingCommentId = null;
    commentEditDraft = '';
    commentImageError = null;
  }

  async function saveCommentEdit() {
    const taskId = taskDetail?.id;
    if (
      !taskId ||
      !data.workspace?.id ||
      !boardId ||
      !editingCommentId ||
      !hasEditorContent(commentEditDraft)
    ) {
      return;
    }
    commentEditSaving = true;
    try {
      const res = await api.updateTaskComment(
        data.workspace.id,
        boardId,
        taskId,
        editingCommentId,
        { content: commentEditDraft.trim() }
      );
      if (taskDetail?.id === taskId) {
        taskDetail = {
          ...taskDetail,
          comments: taskDetail.comments.map((comment) =>
            comment.id === res.comment.id ? res.comment : comment
          )
        };
      }
      cancelCommentEdit();
      await refreshView();
      await loadActivity(commentsExpanded ? 100 : ACTIVITY_PREVIEW_LIMIT, taskId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.commentError'));
    } finally {
      commentEditSaving = false;
    }
  }

  async function postComment() {
    const taskId = taskDetail?.id;
    if (!taskId || !data.workspace?.id || !boardId || !hasEditorContent(commentDraft)) return;
    postingComment = true;
    try {
      const res = await api.createTaskComment(data.workspace.id, boardId, taskId, {
        content: commentDraft.trim()
      });
      if (taskDetail?.id === taskId) {
        const nextComments = [...taskDetail.comments, res.comment];
        taskDetail = {
          ...taskDetail,
          comments: commentsExpanded ? nextComments : nextComments.slice(-COMMENT_PREVIEW_LIMIT)
        };
      }
      cancelCommentComposer();
      await refreshView();
      await loadActivity(commentsExpanded ? 100 : ACTIVITY_PREVIEW_LIMIT, taskId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.commentError'));
    } finally {
      postingComment = false;
    }
  }

  async function deleteComment(commentId: string) {
    const taskId = taskDetail?.id;
    if (!taskId || !data.workspace?.id || !boardId) return;
    deletingCommentId = commentId;
    try {
      await api.deleteTaskComment(data.workspace.id, boardId, taskId, commentId);
      if (taskDetail?.id === taskId) {
        taskDetail = {
          ...taskDetail,
          comments: taskDetail.comments.filter((comment) => comment.id !== commentId)
        };
      }
      await refreshView();
      await loadActivity(commentsExpanded ? 100 : ACTIVITY_PREVIEW_LIMIT, taskId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.commentDeleteError'));
    } finally {
      deletingCommentId = null;
    }
  }

  async function refreshTaskDetail() {
    if (!taskDetail || !data.workspace?.id || !boardId) return;
    try {
      const res = await api.getTaskDetail(
        data.workspace.id,
        boardId,
        taskDetail.id,
        undefined,
        { commentsLimit: commentsExpanded ? undefined : COMMENT_PREVIEW_LIMIT }
      );
      taskDetail = res.task;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.taskError'));
    }
  }

  const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

  function isImageType(fileType: string): boolean {
    return fileType.startsWith('image/');
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function descriptionImagePaths(value: string | null | undefined) {
    return new Set(
      Array.from(value?.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi) ?? [], (match) => match[1]).filter(
        (path): path is string => Boolean(path)
      )
    );
  }

  const descriptionImagePathSet = $derived(descriptionImagePaths(taskDetail?.description));
  const visibleTaskAttachments = $derived(
    taskDetail?.attachments.filter((attachment) => !descriptionImagePathSet.has(attachment.filePath)) ?? []
  );

  const canDeleteAttachment = (attachment: ApiTaskAttachment) =>
    canManage || attachment.uploaderId === data.user?.id;

  function handleAttachmentSelect(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    attachmentFile = input.files?.[0] ?? null;
    input.value = '';
    attachmentError = null;
  }

  async function uploadSelectedAttachment() {
    if (!taskDetail || !data.workspace?.id || !boardId || (!attachmentFile && !attachmentUrl.trim())) return;
    uploadingAttachment = true;
    attachmentError = null;
    try {
      if (attachmentFile) {
        await uploadAttachment(attachmentFile);
      } else {
        await api.createTaskLinkAttachment(data.workspace.id, boardId, taskDetail.id, {
          url: attachmentUrl.trim(),
          displayText: attachmentDisplayText.trim() || undefined
        });
        await refreshTaskDetail();
        await refreshView();
      }
      if (!attachmentError) {
        attachmentFile = null;
        attachmentUrl = '';
        attachmentDisplayText = '';
        attachmentOpen = false;
        attachmentSectionOpen = false;
      }
    } catch (err) {
      attachmentError = err instanceof ApiError ? err.message : tr('taskboard.attachFailed');
    } finally {
      uploadingAttachment = false;
    }
  }

  async function uploadAttachment(file: File): Promise<ApiTaskAttachment | null> {
    if (!taskDetail || !data.workspace?.id || !boardId) return null;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      attachmentError = tr('taskboard.attachTooLarge');
      return null;
    }
    uploadingAttachment = true;
    attachmentError = null;
    try {
      const res = await api.uploadTaskAttachment(data.workspace.id, boardId, taskDetail.id, file);
      await refreshTaskDetail();
      await refreshView();
      return res.attachment;
    } catch (err) {
      if (err instanceof ApiError && err.status === 413) {
        attachmentError = tr('taskboard.attachTooLarge');
      } else {
        attachmentError = err instanceof ApiError ? err.message : tr('taskboard.attachFailed');
      }
      return null;
    } finally {
      uploadingAttachment = false;
    }
  }

  async function uploadTaskImage(
    file: File,
    setError: (message: string | null) => void
  ): Promise<string | null> {
    if (!taskDetail || !data.workspace?.id || !boardId) return null;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar untuk disisipkan.');
      return null;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(tr('taskboard.attachTooLarge'));
      return null;
    }

    uploadingAttachment = true;
    try {
      const res = await api.uploadTaskDescriptionImage(data.workspace.id, boardId, taskDetail.id, file);
      return res.filePath;
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 413
          ? tr('taskboard.attachTooLarge')
          : err instanceof ApiError
            ? err.message
            : tr('taskboard.attachFailed')
      );
      return null;
    } finally {
      uploadingAttachment = false;
    }
  }

  async function uploadDescriptionImage(file: File): Promise<string | null> {
    return uploadTaskImage(file, (message) => {
      attachmentError = message;
    });
  }

  async function uploadCommentImage(file: File): Promise<string | null> {
    return uploadTaskImage(file, (message) => {
      commentImageError = message;
    });
  }

  async function deleteAttachment(attachmentId: string) {
    if (!taskDetail || !data.workspace?.id || !boardId) return;
    deletingAttachmentId = attachmentId;
    try {
      await api.deleteTaskAttachment(data.workspace.id, boardId, taskDetail.id, attachmentId);
      if (previewAttachment?.id === attachmentId) previewAttachment = null;
      await refreshTaskDetail();
      await refreshView();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.attachDeleteError'));
    } finally {
      deletingAttachmentId = null;
    }
  }

  function openCreateTask(columnId: string) {
    createColumnId = columnId || columns[0]?.id || '';
    newTitle = '';
    newDescription = '';
    newPriority = 'medium';
    newAssigneeId = '';
    newDueDate = '';
    newLabels = [];
    newLabelInput = '';
    createError = null;
    createOpen = true;
  }
  const createColumnName = $derived(
    columns.find((column) => column.id === createColumnId)?.name ?? ''
  );

  async function createTaskSubmit() {
    if (!newTitle.trim() || !data.workspace?.id || !boardId) return;
    createLoading = true;
    createError = null;
    try {
      await api.createTask(data.workspace.id, boardId, {
        columnId: createColumnId || undefined,
        title: newTitle.trim(),
        description: newDescription.trim() ? newDescription.trim() : null,
        priority: newPriority,
        labels: newLabels,
        assigneeId: newAssigneeId ? newAssigneeId : null,
        dueAt: fromDateInput(newDueDate)
      });
      createOpen = false;
      await refreshView();
      toast.success(tr('taskboard.taskCreated'));
    } catch (err) {
      createError = err instanceof ApiError ? err.message : tr('taskboard.createTaskError');
    } finally {
      createLoading = false;
    }
  }

  function openBoardChat() {
    if (typeof window !== 'undefined' && boardId) {
      window.dispatchEvent(
        new CustomEvent('flowboard:open-chat', {
          detail: { contextType: 'taskboard', contextId: boardId }
        })
      );
    }
  }

  function openAddColumn() {
    editingColumn = null;
    columnName = '';
    columnColor = 'indigo';
    columnError = null;
    columnDialogOpen = true;
  }

  function openRenameColumn(column: ApiTaskBoardColumn) {
    editingColumn = { id: column.id, name: column.name, color: column.color };
    columnName = column.name;
    columnColor = column.color;
    columnError = null;
    columnDialogOpen = true;
  }

  async function saveColumn() {
    if (!columnName.trim() || !data.workspace?.id || !boardId) return;
    columnSaving = true;
    columnError = null;
    try {
      if (editingColumn) {
        await api.updateTaskColumn(data.workspace.id, boardId, editingColumn.id, {
          name: columnName.trim(),
          color: columnColor
        });
      } else {
        await api.createTaskColumn(data.workspace.id, boardId, {
          name: columnName.trim(),
          color: columnColor
        });
      }
      columnDialogOpen = false;
      editingColumn = null;
      await refreshView();
    } catch (err) {
      columnError = err instanceof ApiError ? err.message : tr('taskboard.columnError');
    } finally {
      columnSaving = false;
    }
  }

  async function deleteColumnConfirmed() {
    if (!columnToDelete || !data.workspace?.id || !boardId) return;
    deletingColumn = true;
    try {
      await api.deleteTaskColumn(data.workspace.id, boardId, columnToDelete.id);
      columnToDelete = null;
      await refreshView();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.columnDeleteError'));
    } finally {
      deletingColumn = false;
    }
  }

  async function loadActivity(limit = 50, taskId?: string) {
    if (!data.workspace?.id || !boardId) return;
    activityLoading = true;
    activityError = null;
    try {
      const res = await api.listTaskBoardActivity(
        data.workspace.id,
        boardId,
        limit,
        undefined,
        taskId
      );
      activityItems = res.activity ?? [];
    } catch (err) {
      activityError = err instanceof ApiError ? err.message : tr('taskboard.activityError');
    } finally {
      activityLoading = false;
    }
  }

  let deleteBoardConfirmOpen = $state(false);
  let deletingBoard = $state(false);

  const boardGroup = $derived(
    board?.workspaceMemberGroupId
      ? groups.find((g) => g.id === board?.workspaceMemberGroupId)
      : null
  );

  const boardSwitcherItems = $derived<MenuItem[]>([
    ...allBoards.map((b) => ({
      label: b.name,
      active: b.id === boardId,
      description: b.id === boardId ? 'Papan aktif' : (b.description ?? undefined),
      onselect: () => {
        if (b.id !== boardId) {
          goto(`/dashboard/boards/${b.id}`);
        }
      }
    })),
    {
      label: 'Semua Papan Tugasan',
      separatorBefore: allBoards.length > 0,
      onselect: () => goto('/dashboard/boards')
    }
  ]);

  function handleShareBoard() {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      toast.success('Pautan papan disalin ke papan klip');
    }
  }

  async function deleteBoardConfirmed() {
    if (!data.workspace?.id || !boardId) return;
    deletingBoard = true;
    try {
      await api.deleteTaskBoard(data.workspace.id, boardId);
      toast.success(tr('taskboard.deleted', { name: board?.name ?? '' }));
      goto('/dashboard/boards');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.deleteError'));
    } finally {
      deletingBoard = false;
      deleteBoardConfirmOpen = false;
    }
  }



  function openActivity() {
    activityOpen = true;
    loadActivity();
  }
</script>

{#snippet linkIconSnippet()}
  <HugeiconsIcon icon={Link01Icon} size={15} strokeWidth={1.8} />
{/snippet}

{#snippet clockIconSnippet()}
  <HugeiconsIcon icon={Clock01Icon} size={15} strokeWidth={1.8} />
{/snippet}

{#snippet settingsIconSnippet()}
  <HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={1.8} />
{/snippet}

{#snippet memberAvatar(member: ApiWorkspaceMember, index: number)}
  {@const avatarPalettes = [
    'bg-indigo-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-emerald-600 text-white',
    'bg-sky-600 text-white',
    'bg-purple-600 text-white'
  ]}
  {@const palette = avatarPalettes[index % avatarPalettes.length]}
  {@const initials = member.name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
  <div
    class={cn(
      'relative flex size-9 shrink-0 items-center justify-center rounded-full font-bold text-xs ring-2 ring-card shadow-sm',
      palette
    )}
    title={member.name}
  >
    {#if member.avatarUrl}
      <img src={member.avatarUrl} alt={member.name} class="size-full rounded-full object-cover" />
    {:else}
      {initials}
    {/if}
  </div>
{/snippet}

{#snippet deleteIconSnippet()}
  <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
{/snippet}

{#snippet attachmentPopoverContent()}
  <div class="w-[20rem] space-y-5">
    <div class="flex items-center justify-between">
      <h3 class="text-base font-bold text-ink">Attachment</h3>
      <IconButton
        variant="ghost"
        size="sm"
        label="Tutup attachment"
        onclick={() => { attachmentOpen = false; attachmentSectionOpen = false; }}
      >
        <span class="text-lg leading-none">×</span>
      </IconButton>
    </div>
    <input bind:this={fileInputEl} type="file" class="hidden" onchange={handleAttachmentSelect} />
    <Button variant="secondary" onclick={() => fileInputEl?.click()}>Pilih file</Button>
    {#if attachmentFile}
      <div class="rounded-lg bg-lane p-3 text-sm font-semibold text-ink">{attachmentFile.name}</div>
    {/if}
    <div class="border-t border-hairline pt-4">
      <div class="text-sm font-semibold text-ink">Search or paste a link</div>
      <Input bind:value={attachmentUrl} placeholder="Tempel link baru" />
      <div class="mt-3 text-sm font-semibold text-ink">Display text (optional)</div>
      <Input bind:value={attachmentDisplayText} placeholder="Judul attachment" />
    </div>
    {#if attachmentError}<p class="text-sm text-status-urgent">{attachmentError}</p>{/if}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => { attachmentOpen = false; attachmentSectionOpen = false; }}>Batal</Button>
      <Button
        variant="primary"
        loading={uploadingAttachment}
        disabled={!attachmentFile && !attachmentUrl.trim()}
        onclick={() => { void uploadSelectedAttachment(); }}
      >
        Insert
      </Button>
    </div>
  </div>
{/snippet}

<svelte:head>
  <title>{board?.name ?? tr('taskboard.boardTitle')} — actjom</title>
</svelte:head>

<div class="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden">
  {#if loadingData}
    <div class="flex w-full shrink-0 items-center justify-between border-b border-hairline bg-card px-5 sm:px-6 py-2.5 shadow-xs">
      <Skeleton shape="rect" class="h-8 w-44 rounded-lg" />
      <div class="flex items-center gap-2">
        <Skeleton shape="rect" class="h-9 w-9 rounded-full" />
        <Skeleton shape="rect" class="h-9 w-9 rounded-full" />
        <Skeleton shape="rect" class="h-9 w-28 rounded-xl" />
      </div>
    </div>
  {:else}
    <header class="flex w-full shrink-0 items-center justify-between border-b border-hairline bg-card px-5 sm:px-6 py-2.5 shadow-xs">
      <!-- Left: Board Title (flush to top) -->
      <div class="flex items-center gap-2">
        {#if isEditingTitle}
          <input
            bind:this={inlineTitleInputEl}
            bind:value={inlineTitle}
            onkeydown={handleTitleKeydown}
            onblur={saveInlineTitle}
            disabled={savingInlineTitle}
            class="h-7 max-w-[260px] rounded-md border border-primary bg-card px-2 text-sm font-bold text-ink outline-none ring-2 ring-primary/20 shadow-xs sm:text-base"
          />
        {:else}
          <h1
            class={cn(
              "text-sm font-bold tracking-tight text-ink sm:text-base select-none truncate max-w-[320px]",
              canManage && "cursor-pointer hover:bg-canvas-sunken/80 rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors"
            )}
            ondblclick={startEditTitle}
            title={canManage ? "Klik 2x untuk ubah nama papan" : undefined}
          >
            {board?.name ?? tr('taskboard.boardTitle')}
          </h1>
        {/if}
      </div>

      <!-- Right: Bold, Highly Visible Avatars & Action Icons in Card -->
      <div class="flex items-center gap-3">
        <!-- Member Avatar(s) (Prominent size-9 with solid contrast) -->
        {#if members.length > 0}
          <div class="flex items-center -space-x-2 overflow-hidden" title="Ahli Workspace">
            {#each members.slice(0, 4) as member, idx (member.id)}
              {@render memberAvatar(member, idx)}
            {/each}
            {#if members.length > 4}
              <div class="grid size-9 place-items-center rounded-full bg-slate-800 text-white ring-2 ring-card text-xs font-bold shadow-sm">
                +{members.length - 4}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Action Icons Wrapped in a Card -->
        <div class="flex items-center gap-0.5 rounded-xl border border-hairline bg-canvas-sunken/70 p-1 shadow-xs">
          <!-- Chat Board (Icon Only) -->
          <Tooltip text="Chat Board" side="bottom">
            <button
              type="button"
              onclick={openBoardChat}
              class="flex size-8 items-center justify-center rounded-lg text-mute hover:text-ink hover:bg-card transition-colors cursor-pointer"
              aria-label="Chat Board"
            >
              <HugeiconsIcon icon={BubbleChatIcon} size={18} strokeWidth={1.8} />
            </button>
          </Tooltip>

          <!-- Aktiviti (Icon Only) -->
          <Tooltip text={tr('taskboard.activity')} side="bottom">
            <button
              type="button"
              onclick={openActivity}
              class="flex size-8 items-center justify-center rounded-lg text-mute hover:text-ink hover:bg-card transition-colors cursor-pointer"
              aria-label={tr('taskboard.activity')}
            >
              <HugeiconsIcon icon={Clock01Icon} size={18} strokeWidth={1.8} />
            </button>
          </Tooltip>

          <!-- Pengaturan (Icon Only) -->
          {#if canManage}
            <Tooltip text="Pengaturan" side="bottom">
              <button
                type="button"
                onclick={openEditBoardSettings}
                class="flex size-8 items-center justify-center rounded-lg text-mute hover:text-ink hover:bg-card transition-colors cursor-pointer"
                aria-label="Pengaturan"
              >
                <HugeiconsIcon icon={Settings01Icon} size={18} strokeWidth={1.8} />
              </button>
            </Tooltip>
          {/if}

          <div class="h-4 w-px bg-hairline mx-0.5"></div>

          <!-- More Menu (...) -->
          <DropdownMenu
            items={[
              {
                label: 'Salin Pautan Papan',
                icon: linkIconSnippet,
                onselect: handleShareBoard
              },
              ...(canManage
                ? [
                    {
                      label: tr('taskboard.deleteBoard'),
                      icon: deleteIconSnippet,
                      destructive: true,
                      separatorBefore: true,
                      onselect: () => (deleteBoardConfirmOpen = true)
                    }
                  ]
                : [])
            ]}
            align="end"
          >
            {#snippet trigger({ open, toggle })}
              <button
                type="button"
                class={cn(
                  "flex size-8 items-center justify-center rounded-lg text-mute hover:text-ink hover:bg-card transition-colors cursor-pointer",
                  open && "text-ink bg-card shadow-xs"
                )}
                onclick={toggle}
                aria-label="Pilihan lanjut"
                title="Pilihan lanjut"
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} size={18} strokeWidth={1.8} />
              </button>
            {/snippet}
          </DropdownMenu>
        </div>
      </div>
    </header>
  {/if}

  <!-- Board Canvas: full width, flush to top, flex-1 -->
  <div class="flex-1 min-h-0 w-full overflow-hidden flex flex-col p-4 sm:p-5">
    {#if loadingData}
      <div class="flex gap-4 overflow-hidden h-full">
        {#each [1, 2, 3] as i (i)}
          <div class="w-lane shrink-0 space-y-3 rounded-2xl border border-hairline bg-canvas-sunken p-3.5 h-full">
            <div class="flex items-center justify-between">
              <Skeleton shape="rect" class="h-5 w-24 rounded-md" />
              <Skeleton shape="rect" class="h-5 w-12 rounded-full" />
            </div>
            <Skeleton shape="rect" class="h-24 w-full rounded-xl" />
            <Skeleton shape="rect" class="h-24 w-full rounded-xl" />
            <Skeleton shape="rect" class="h-9 w-full rounded-xl" />
          </div>
        {/each}
      </div>
    {:else if loadError}
      <div class="m-auto space-y-3 rounded-2xl border border-hairline bg-card p-10 text-center shadow-card max-w-md">
        <p class="ds-section-title text-ink">{loadError}</p>
        <Button variant="secondary" size="sm" onclick={loadBoard}>
          {tr('taskboard.retry')}
        </Button>
      </div>
    {:else}
      <KanbanBoard
        columns={kanbanColumns}
        addLabel={tr('taskboard.addTask')}
        emptyTitle={tr('taskboard.emptyColumn')}
        emptyDropHint={tr('taskboard.dropHere')}
        columnLabel={tr('taskboard.columnLabel')}
        countLabel=""
        addButtonPosition="bottom"
        oncardclick={openTask}
        oncardmove={handleCardMove}
        oncomplete={handleTaskCompletion}
        onadd={openCreateTask}
        oneditcolumn={canManage ? handleEditColumn : undefined}
        ondeletecolumn={canManage ? handleDeleteColumn : undefined}
        renameColumnLabel={tr('taskboard.renameColumn')}
        deleteColumnLabel={tr('taskboard.deleteColumn')}
        onaddcolumn={canManage ? openAddColumn : undefined}
        showAddColumn={canManage}
        addColumnLabel={tr('setup.newStage')}
        addColumnDescription={tr('setup.newStageDescription')}
        oncolumnreorder={canManage ? handleColumnReorder : undefined}
      />
    {/if}
  </div>
</div>

<!-- Task Detail Modal -->
<Dialog open={isSheetOpen} onclose={closeSheet} size="full" class="z-[320]">
  {#snippet customHeader()}
    <div class="flex shrink-0 items-center justify-between gap-4 border-b border-hairline px-5 py-4">
      <div class="min-w-0">
        {#if taskDetail}
          <div class="flex min-w-0 items-center gap-3">
            <span class="size-3 shrink-0 rounded-full border-2 border-mute"></span>
            {#if taskTitleEditing}
              <input bind:this={taskTitleInputEl} bind:value={editTitle} class="min-w-0 flex-1 rounded-lg border border-focus bg-card px-2 py-1 text-xl font-bold text-ink outline-none" onblur={finishTaskTitleEdit} onkeydown={handleTaskTitleKeydown} aria-label="Judul tugas" />
            {:else}
              <button id="dialog-title" type="button" class="truncate text-left text-xl font-bold text-ink hover:text-accent" ondblclick={beginTaskTitleEdit} title="Klik dua kali untuk mengedit judul">{taskDetail.title}</button>
            {/if}
            <span class="hidden rounded-full bg-lane px-2 py-1 text-xs font-semibold text-mute sm:inline-flex">{columns.find((column) => column.id === taskDetail?.columnId)?.name ?? ''}</span>
          </div>
        {:else if detailLoading}
          <div class="flex items-center gap-3">
            <Skeleton shape="circle" class="size-3" />
            <Skeleton shape="rect" class="h-6 w-56" />
            <Skeleton shape="rect" class="h-6 w-20 rounded-full" />
          </div>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        {#if canDeleteTask}
          <IconButton variant="ghost" size="md" class="text-status-urgent hover:bg-status-urgent-soft" label="Hapus tugas" onclick={() => (taskToDelete = { id: taskDetail!.id, title: taskDetail!.title })}><HugeiconsIcon icon={Delete02Icon} size={20} strokeWidth={1.8} /></IconButton>
        {/if}
        <button type="button" class="grid size-11 shrink-0 place-items-center rounded-full text-2xl leading-none text-mute hover:bg-lane hover:text-ink" onclick={closeSheet} aria-label={tr('common.close')}>×</button>
      </div>
    </div>
  {/snippet}

  {#if detailLoading}
    <div class="grid min-h-[min(780px,calc(100dvh-6rem))] lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
      <section class="min-w-0 space-y-7 overflow-y-auto p-5 sm:p-8">
        <div class="flex flex-wrap items-center gap-2">
          {#each [1, 2, 3, 4] as item (item)}
            <Skeleton shape="rect" class={cn('h-9 rounded-xl', item === 3 ? 'w-36' : 'w-24')} />
          {/each}
        </div>
        <div class="flex flex-wrap items-start gap-8">
          <div class="space-y-3">
            <Skeleton shape="text" class="w-10" />
            <div class="flex items-center gap-2">
              <Skeleton shape="circle" class="size-11" />
              <Skeleton shape="circle" class="size-11" />
            </div>
          </div>
          <div class="space-y-3">
            <Skeleton shape="text" class="w-14" />
            <div class="flex items-center gap-2">
              <Skeleton shape="rect" class="h-7 w-20 rounded-md" />
              <Skeleton shape="circle" class="size-8" />
            </div>
          </div>
        </div>
        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <Skeleton shape="rect" class="h-7 w-36" />
            <Skeleton shape="rect" class="h-9 w-16 rounded-xl" />
          </div>
          <Skeleton shape="rect" class="h-40 w-full rounded-xl" />
        </section>
        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <Skeleton shape="rect" class="h-7 w-32" />
            <Skeleton shape="rect" class="h-9 w-20 rounded-xl" />
          </div>
          <Skeleton shape="rect" class="h-16 w-full rounded-xl" />
        </section>
      </section>
      <aside class="min-w-0 border-t border-hairline bg-lane/40 p-5 sm:p-6 lg:border-l lg:border-t-0">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <Skeleton shape="circle" class="size-5" />
            <Skeleton shape="rect" class="h-6 w-44" />
          </div>
          <Skeleton shape="rect" class="h-9 w-28 rounded-xl" />
        </div>
        <Skeleton shape="rect" class="mt-5 h-10 w-full rounded-xl" />
        <div class="mt-6 space-y-5">
          {#each [1, 2, 3] as item (item)}
            <div class="flex gap-3">
              <Skeleton shape="circle" class="size-7 shrink-0" />
              <div class="min-w-0 flex-1 space-y-2">
                <Skeleton shape="text" class="w-36" />
                <Skeleton shape="rect" class="h-12 w-full rounded-xl" />
              </div>
            </div>
          {/each}
        </div>
      </aside>
    </div>
  {:else if detailError}
    <p class="p-6 text-sm text-status-urgent">{detailError}</p>
  {:else if taskDetail}
    <div class="grid min-h-[min(780px,calc(100dvh-6rem))] lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
      <section class="min-w-0 space-y-6 overflow-y-auto p-5 sm:p-8">
        <div class="flex flex-wrap items-end gap-2">
          {#if canEditCurrentTask}
            <Popover bind:open={deadlineOpen} label="Tanggal" class="z-20">
              {#snippet trigger({ open, toggle })}
                <Button variant="secondary" size="sm" onclick={toggle} aria-haspopup="dialog" aria-expanded={open}><HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} /> Tanggal</Button>
              {/snippet}
              {#snippet content()}
                <div class="w-[20rem] max-h-[calc(100dvh-5rem)] space-y-3 overflow-y-auto pr-1 kanban-scrollbar-hidden">
                  <div class="flex items-center justify-between">
                    <h3 class="text-base font-bold text-ink">Dates</h3>
                    <IconButton variant="ghost" size="sm" label="Tutup dates" onclick={() => (deadlineOpen = false)}><span class="text-lg leading-none">×</span></IconButton>
                  </div>
                  <DatePicker
                    inline
                    showQuickActions={false}
                    bind:value={editDueDate}
                    rangeStart={editStartDateEnabled ? editStartDate : undefined}
                    rangeEnd={editDueDateEnabled ? editDueDate : undefined}
                    disabled={!canEditCurrentTask}
                    locale={dashboardIntlLocale($locale)}
                    onchange={(value) => setDueDateEnabled(Boolean(value))}
                  />
                  <div class="space-y-2">
                    <div class="space-y-1">
                      <span class="text-xs font-semibold text-mute">Start date</span>
                      <div class="flex items-center gap-2">
                        <Checkbox
                          size="sm"
                          checked={editStartDateEnabled}
                          disabled={!canEditCurrentTask}
                          aria-label="Aktifkan start date"
                          onchange={(event) => setStartDateEnabled((event.currentTarget as HTMLInputElement).checked)}
                        />
                        <Input type="date" bind:value={editStartDate} disabled={!canEditCurrentTask || !editStartDateEnabled} onchange={() => setStartDateEnabled(Boolean(editStartDate))} />
                      </div>
                    </div>
                    <div class="space-y-1">
                      <span class="text-xs font-semibold text-mute">Due date</span>
                      <div class="flex items-center gap-2">
                        <Checkbox
                          size="sm"
                          checked={editDueDateEnabled}
                          disabled={!canEditCurrentTask}
                          aria-label="Aktifkan due date"
                          onchange={(event) => setDueDateEnabled((event.currentTarget as HTMLInputElement).checked)}
                        />
                        <Input type="date" bind:value={editDueDate} disabled={!canEditCurrentTask || !editDueDateEnabled} onchange={() => setDueDateEnabled(Boolean(editDueDate))} />
                        <Input type="time" bind:value={editDueTime} disabled={!canEditCurrentTask || !editDueDateEnabled} aria-label="Waktu due date" />
                      </div>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <span class="text-xs font-semibold text-mute">Recurring</span>
                    <DropdownMenu
                      items={recurrenceOptions.map((option) => ({
                        label: option.label,
                        active: option.value === editRecurrence,
                        onselect: () => setRecurrence(option.value)
                      }))}
                      align="start"
                    >
                      {#snippet trigger({ open, toggle })}
                        <Button variant="secondary" class="w-full justify-between" onclick={toggle} aria-haspopup="menu" aria-expanded={open} disabled={!canEditCurrentTask || !editDueDateEnabled}>
                          <span>{recurrenceOptions.find((option) => option.value === editRecurrence)?.label}</span>
                          <HugeiconsIcon icon={ArrowDown01Icon} size={15} strokeWidth={1.8} />
                        </Button>
                      {/snippet}
                    </DropdownMenu>
                  </div>
                  {#if editRecurrence === 'weekly'}
                    <div class="space-y-1">
                      <span class="text-xs font-semibold text-mute">Repeat on</span>
                      <div class="flex justify-between gap-1">
                        {#each recurrenceWeekdays as day (day.value)}
                          <button type="button" class={cn('grid size-8 place-items-center rounded-full border text-xs font-semibold transition-colors', editRecurrenceDays.includes(day.value) ? 'border-primary bg-primary text-on-primary' : 'border-hairline bg-card text-mute hover:border-primary hover:text-primary')} aria-pressed={editRecurrenceDays.includes(day.value)} onclick={() => toggleRecurrenceDay(day.value)} disabled={!canEditCurrentTask}>{day.label}</button>
                        {/each}
                      </div>
                    </div>
                  {/if}
                  <div class="flex flex-col gap-2 border-t border-hairline pt-3">
                    <Button variant="primary" loading={savingTask} disabled={!canEditCurrentTask} onclick={() => void saveDates()}>Save</Button>
                    <Button variant="secondary" disabled={!canEditCurrentTask} onclick={() => void removeDates()}>Remove</Button>
                  </div>
                </div>
              {/snippet}
            </Popover>
            <Popover bind:open={attachmentOpen} label="Attachment" class="z-20">
              {#snippet trigger({ open, toggle })}
                <Button
                  variant="secondary"
                  size="sm"
                  onclick={() => { attachmentSectionOpen = false; toggle(); }}
                  aria-haspopup="dialog"
                  aria-expanded={open}
                >
                  <HugeiconsIcon icon={Link01Icon} size={16} strokeWidth={1.8} /> Attachment
                </Button>
              {/snippet}
              {#snippet content()}
                {@render attachmentPopoverContent()}
              {/snippet}
            </Popover>
          {/if}
          <DropdownMenu
            items={priorityOptions.map((option) => ({
              label: option.label,
              active: option.value === editPriority,
              onselect: () => {
                editPriority = option.value as ApiTaskPriority;
                void saveTask();
              }
            }))}
            align="start"
          >
            {#snippet trigger({ open, toggle })}
              <Button
                variant="secondary"
                size="sm"
                disabled={!canEditCurrentTask}
                onclick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
                class="min-w-[9.5rem] justify-between"
              >
                <span class="flex items-center gap-1.5"><HugeiconsIcon icon={AlertCircleIcon} size={15} strokeWidth={1.8} /> {priorityOptions.find((option) => option.value === editPriority)?.label ?? tr('taskboard.priority')}</span>
                <HugeiconsIcon icon={ArrowDown01Icon} size={15} strokeWidth={1.8} />
              </Button>
            {/snippet}
          </DropdownMenu>
        </div>

        <div class="flex flex-wrap items-start gap-8">
          <section class="space-y-2">
            <h3 class="text-sm font-bold text-ink">PIC</h3>
            <div class="flex items-center gap-2">
              {#each selectedMembers as member (member.id)}
                <button type="button" class="rounded-full ring-2 ring-transparent transition hover:ring-primary/30" title={member.name} onclick={() => (picPickerOpen = true)}>
                  <Avatar name={member.name} src={member.avatarUrl ?? undefined} size={42} />
                </button>
              {/each}
              {#if canEditCurrentTask}
                <TaskPicPicker
                  bind:values={taskAssigneeValues}
                  bind:open={picPickerOpen}
                  options={picOptions}
                  disabled={!canEditCurrentTask}
                  onchange={(values) => {
                    editAssigneeId = values[0] ?? '';
                    void saveTask();
                  }}
                >
                  {#snippet trigger({ open, toggle })}
                    <button
                      type="button"
                      class={cn(
                        'grid size-11 place-items-center rounded-full border border-hairline bg-card text-2xl leading-none text-mute transition hover:border-primary hover:text-primary',
                        open && 'border-primary text-primary'
                      )}
                      onclick={toggle}
                      aria-haspopup="listbox"
                      aria-expanded={open}
                      aria-label="Tambah PIC"
                    >
                      +
                    </button>
                  {/snippet}
                </TaskPicPicker>
              {/if}
            </div>
          </section>

          <section class="space-y-2">
            <h3 class="text-sm font-bold text-ink">Labels</h3>
            <div class="flex flex-wrap items-center gap-2">
              {#each editLabels as label (label)}
                <span class={cn('inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold', labelClass(label))}>
                  {label}
                  {#if canEditCurrentTask}
                    <button type="button" class="text-current/70 hover:text-current" onclick={() => removeTaskLabel(label)} aria-label={`Hapus label ${label}`}>×</button>
                  {/if}
                </span>
              {/each}
              {#if canEditCurrentTask}
            <Popover bind:open={labelPickerOpen} label="Labels" class="z-20">
              {#snippet trigger({ open, toggle })}
                <button type="button" class="grid size-8 place-items-center rounded-full border border-hairline bg-card text-xl leading-none text-mute transition hover:border-primary hover:text-primary" onclick={toggle} aria-haspopup="dialog" aria-expanded={open} aria-label="Tambah label">+</button>
              {/snippet}
              {#snippet content()}
                <div class="w-[19rem] space-y-4">
                  {#if labelEditorOpen}
                    <div class="flex items-center gap-2">
                      <IconButton variant="ghost" size="sm" label="Kembali ke daftar label" onclick={() => (labelEditorOpen = false)}><HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.8} /></IconButton>
                      <h3 class="text-sm font-bold text-ink">{editingLabel ? 'Edit label' : 'Buat label'}</h3>
                    </div>
                    {@const selectedLabelColor = labelColorPalette.find((color) => color.value === labelDraftColor)}
                    <div class={cn('rounded-lg px-4 py-3 text-sm font-bold', selectedLabelColor?.swatch ?? 'bg-lane border-hairline text-mute')}>{labelDraftName || 'Nama label'}</div>
                    <div class="space-y-1.5 text-sm font-semibold text-ink"><span>Title</span><Input bind:value={labelDraftName} /></div>
                    <div class="space-y-2 text-sm font-semibold text-ink">
                      <span>Select a color</span>
                      <div class="grid grid-cols-5 gap-2">
                        {#each labelColorPalette as color (color.value)}
                          <button type="button" class={cn('grid size-10 place-items-center rounded-lg border-2 transition hover:scale-105', color.swatch, labelDraftColor === color.value && 'ring-2 ring-primary ring-offset-2')} aria-label={`Pilih warna ${color.label}`} aria-pressed={labelDraftColor === color.value} onclick={() => (labelDraftColor = color.value)}>
                            {#if labelDraftColor === color.value}<span class="text-sm font-bold text-white drop-shadow">✓</span>{/if}
                          </button>
                        {/each}
                      </div>
                    </div>
                    <Button variant="secondary" class="w-full" onclick={() => (labelDraftColor = '')}>×&nbsp; Remove color</Button>
                    <div class="flex justify-end gap-2">
                      {#if editingLabel && canManage}<Button variant="destructive" size="sm" onclick={() => { labelEditorOpen = false; void removeLabel(editingLabel!); }}>Hapus</Button>{/if}
                      <Button variant="primary" loading={labelSaving} disabled={!labelDraftName.trim()} onclick={saveLabel}>Simpan</Button>
                    </div>
                  {:else}
                    <div class="flex items-center justify-between">
                      <h3 class="text-base font-bold text-ink">Labels</h3>
                      <IconButton variant="ghost" size="sm" label="Tutup labels" onclick={() => (labelPickerOpen = false)}><span class="text-lg leading-none">×</span></IconButton>
                    </div>
                    <Input bind:value={labelSearch} placeholder="Cari label…" />
                    <div class="space-y-2">
                      {#each filteredWorkspaceLabels as label (label.id)}
                        {@const selected = editLabels.includes(label.name)}
                        <div class="flex items-center gap-2">
                          <button type="button" class={cn('flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors', selected ? labelClass(label.name) : 'border-hairline bg-card text-ink hover:bg-lane')} onclick={() => toggleTaskLabel(label.name)}><span class={cn('grid size-4 place-items-center rounded border', selected ? 'border-current bg-card/60' : 'border-hairline bg-card')}>{selected ? '✓' : ''}</span>{label.name}</button>
                          {#if canManage}<IconButton variant="ghost" size="sm" label={`Edit ${label.name}`} onclick={() => openLabelEditor(label)}><HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={1.8} /></IconButton>{/if}
                        </div>
                      {:else}
                        <div class="rounded-xl border border-dashed border-hairline-strong px-4 py-5 text-center">
                          <div class="mx-auto grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
                            <HugeiconsIcon icon={Tag01Icon} size={18} strokeWidth={1.8} />
                          </div>
                          <h4 class="mt-3 text-sm font-bold text-ink">Belum ada label</h4>
                          <p class="mt-1 text-xs leading-relaxed text-mute">Buat label untuk mengelompokkan tugas di workspace ini.</p>
                        </div>
                      {/each}
                    </div>
                    {#if canManage}<Button variant="secondary" class="w-full" onclick={() => openLabelEditor()}>Buat label baru</Button>{/if}
                  {/if}
                </div>
              {/snippet}
            </Popover>
              {/if}
            </div>
          </section>
        </div>


        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <HugeiconsIcon icon={File02Icon} size={22} strokeWidth={1.8} />
              <h3 class="text-lg font-bold text-ink">Description</h3>
            </div>
            {#if canEditCurrentTask && !descriptionEditing}
              <Button variant="secondary" size="sm" onclick={beginDescriptionEdit}>
                <HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={1.8} /> Edit
              </Button>
            {/if}
          </div>

          {#if descriptionEditing}
            <RichTextEditor
              bind:value={editDescription}
              disabled={!canEditCurrentTask}
              autofocus
              placeholder="Tambahkan deskripsi yang lebih detail…"
              onimageupload={uploadDescriptionImage}
            />
            {#if attachmentError}
              <p class="text-sm text-status-urgent">{attachmentError}</p>
            {/if}
            <div class="flex justify-end gap-2">
              <Button variant="secondary" size="sm" disabled={savingTask} onclick={cancelDescriptionEdit}>Batal</Button>
              <Button variant="primary" size="sm" loading={savingTask} onclick={() => { void saveDescription(); }}>Simpan</Button>
            </div>
          {:else}
            <div
              class={cn(
                'rounded-xl px-2 py-3 transition-colors',
                canEditCurrentTask && 'cursor-text hover:bg-canvas-sunken/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]'
              )}
              role="button"
              tabindex="0"
              aria-disabled={!canEditCurrentTask}
              onclick={handleDescriptionViewClick}
              onkeydown={handleDescriptionViewKeydown}
              title={canEditCurrentTask ? 'Klik untuk mengedit deskripsi' : undefined}
            >
              <RichTextContent value={taskDetail.description} emptyLabel="Belum ada deskripsi. Klik untuk menambahkan." />
            </div>
          {/if}
        </section>

        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3"><HugeiconsIcon icon={Link01Icon} size={22} strokeWidth={1.8} /><h3 class="text-lg font-bold text-ink">Attachments</h3></div>
            {#if canEditCurrentTask}
              <Popover bind:open={attachmentSectionOpen} label="Attachment" side="top" align="end" class="z-30">
                {#snippet trigger({ open, toggle })}
                  <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => { attachmentOpen = false; toggle(); }}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                  >
                    Tambah
                  </Button>
                {/snippet}
                {#snippet content()}
                  {@render attachmentPopoverContent()}
                {/snippet}
              </Popover>
            {/if}
          </div>

          {#if visibleTaskAttachments.length === 0}
            <p class="text-sm text-mute">Belum ada attachment.</p>
          {:else}
            <div class="space-y-2">
              {#each visibleTaskAttachments as attachment (attachment.id)}
                <div class="flex items-center gap-3 rounded-xl border border-hairline p-3">
                  {#if isImageType(attachment.fileType)}
                    <button type="button" class="size-14 shrink-0 overflow-hidden rounded-lg bg-lane" onclick={() => (previewAttachment = attachment)} aria-label={`Lihat ${attachment.fileName}`}><img src={attachment.filePath} alt={attachment.fileName} class="size-full object-cover" /></button>
                  {:else}
                    <span class="grid size-14 shrink-0 place-items-center rounded-lg bg-lane text-xs font-bold text-mute">FILE</span>
                  {/if}
                  <div class="min-w-0 flex-1"><div class="truncate text-sm font-bold text-ink">{attachment.fileName}</div><div class="text-xs text-mute">Ditambahkan {formatDateTime(attachment.createdAt)}</div></div>
                  <a href={attachment.filePath} target="_blank" rel="noopener noreferrer" class="text-mute hover:text-ink" aria-label="Buka attachment"><HugeiconsIcon icon={Download04Icon} size={18} strokeWidth={1.8} /></a>
                  {#if canDeleteAttachment(attachment)}
                    <IconButton variant="ghost" size="sm" label="Hapus attachment" disabled={deletingAttachmentId === attachment.id} onclick={() => deleteAttachment(attachment.id)}><HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} /></IconButton>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </section>

      </section>

      <aside class="sticky top-0 h-full min-w-0 border-t border-hairline bg-lane/40 p-5 sm:p-6 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:self-stretch lg:border-l lg:border-t-0">
        <div class="flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <HugeiconsIcon icon={BubbleChatIcon} size={18} strokeWidth={1.8} />
            <h3 class="truncate text-base font-bold text-ink">Comments and activity</h3>
          </div>
          {#if commentsExpanded}
            <Button variant="secondary" size="sm" onclick={collapseCommentDetails}>
              Hide details
            </Button>
          {:else}
            <Button
              variant="secondary"
              size="sm"
              loading={commentDetailsLoading}
              onclick={() => void loadCommentDetails()}
            >
              Show details
            </Button>
          {/if}
        </div>

        <div class="mt-4">
          {#if commentComposerOpen}
            <RichTextEditor
              bind:value={commentDraft}
              autofocus
              disabled={postingComment}
              placeholder="Write a comment…"
              onimageupload={uploadCommentImage}
            />
            {#if commentImageError}
              <p class="mt-2 text-sm text-status-urgent">{commentImageError}</p>
            {/if}
            <div class="mt-3 flex justify-end gap-2">
              <Button variant="secondary" size="sm" disabled={postingComment} onclick={cancelCommentComposer}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={postingComment}
                disabled={!hasEditorContent(commentDraft)}
                onclick={() => void postComment()}
              >
                Send
              </Button>
            </div>
          {:else}
            <Button
              variant="secondary"
              size="md"
              class="w-full justify-start text-left"
              onclick={() => (commentComposerOpen = true)}
              aria-expanded={commentComposerOpen}
            >
              Write a comment…
            </Button>
          {/if}
        </div>

        <div class="mt-6 space-y-4">
          {#each taskDetail.comments as comment (comment.id)}
            <article class="space-y-2">
              <div class="flex items-center gap-2">
                <Avatar name={comment.authorName ?? '?'} size={28} />
                <span class="truncate text-[13px] font-bold text-ink">
                  {comment.authorName ?? tr('taskboard.unassigned')}
                </span>
                <span class="text-xs text-primary">{formatRelativeTime(comment.createdAt)}</span>
              </div>

              {#if editingCommentId === comment.id}
                <RichTextEditor
                  bind:value={commentEditDraft}
                  autofocus
                  disabled={commentEditSaving}
                  placeholder="Edit comment…"
                  onimageupload={uploadCommentImage}
                />
                {#if commentImageError}
                  <p class="mt-2 text-sm text-status-urgent">{commentImageError}</p>
                {/if}
                <div class="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" disabled={commentEditSaving} onclick={cancelCommentEdit}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={commentEditSaving}
                    disabled={!hasEditorContent(commentEditDraft)}
                    onclick={() => void saveCommentEdit()}
                  >
                    Save
                  </Button>
                </div>
              {:else}
                <RichTextContent value={comment.content} class="rounded-xl bg-card px-8 py-2 !text-[15px] !leading-6" />
                {#if canEditComment(comment)}
                  <div class="flex items-center gap-1 pl-2 text-[11px] leading-4">
                    <Button
                      variant="link"
                      size="sm"
                      class="h-auto px-0 py-0 !text-[11px] !leading-4"
                      onclick={() => beginCommentEdit(comment)}
                    >
                      Edit
                    </Button>
                    <span class="text-faint">•</span>
                    <Button
                      variant="link"
                      size="sm"
                      class="h-auto px-0 py-0 !text-[11px] !leading-4 text-status-urgent"
                      loading={deletingCommentId === comment.id}
                      onclick={() => void deleteComment(comment.id)}
                    >
                      Delete
                    </Button>
                  </div>
                {/if}
              {/if}
            </article>
          {/each}

          {#if taskActivityItems.length > 0}
            <div class="mt-5 border-t border-hairline pt-4">
              <p class="mb-3 text-xs font-semibold text-mute">History</p>
              <div class="space-y-4">
                {#each taskActivityItems as item (item.id)}
                  <article class="flex items-start gap-2.5">
                    <Avatar name={item.actorName ?? '?'} size={28} class="mt-0.5 shrink-0" />
                    <div class="min-w-0 flex-1">
                      <p class="text-[13px] leading-5 text-ink-soft">
                        <span class="font-bold text-ink">{item.actorName ?? 'System'}</span>
                        {item.description}
                      </p>
                      <p class="mt-0.5 text-xs text-primary">{formatRelativeTime(item.createdAt)}</p>
                    </div>
                  </article>
                {/each}
              </div>
            </div>
          {/if}

          {#if activityError && taskActivityItems.length === 0}
            <p class="text-[13px] text-status-urgent">{activityError}</p>
          {:else if taskDetail.comments.length === 0 && taskActivityItems.length === 0}
            <p class="text-[13px] text-mute">Belum ada aktivitas.</p>
          {/if}
        </div>
      </aside>
    </div>
  {/if}
</Dialog>





<!-- Attachment Lightbox -->
<Dialog
  open={previewAttachment !== null}
  onclose={() => (previewAttachment = null)}
  title={previewAttachment?.fileName ?? tr('taskboard.attachPreview')}
  size="lg"
  class="z-[400]"
>
  {#if previewAttachment}
    <div class="space-y-3">
      <img
        src={previewAttachment.filePath}
        alt={previewAttachment.fileName}
        class="max-h-[60vh] w-full rounded-xl bg-canvas-sunken object-contain"
      />
      <p class="truncate text-sm text-mute">
        {previewAttachment.fileName} · {formatFileSize(previewAttachment.fileSize)}
      </p>
    </div>
  {/if}
  {#snippet footer()}
    <div class="flex w-full items-center justify-between gap-2">
      <div>
        {#if previewAttachment && canDeleteAttachment(previewAttachment)}
          <Button
            variant="destructive"
            size="sm"
            loading={previewAttachment ? deletingAttachmentId === previewAttachment.id : false}
            onclick={() => previewAttachment && deleteAttachment(previewAttachment.id)}
          >
            {tr('taskboard.attachDelete')}
          </Button>
        {/if}
      </div>
      <div class="flex justify-end gap-2">
        {#if previewAttachment}
          <Button
            variant="secondary"
            size="sm"
            href={previewAttachment.filePath}
            download={previewAttachment.fileName}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tr('taskboard.attachDownload')}
          </Button>
        {/if}
        <Button variant="secondary" size="sm" onclick={() => (previewAttachment = null)}>
          {tr('common.close')}
        </Button>
      </div>
    </div>
  {/snippet}
</Dialog>

<!-- Activity Slide-over -->
<Sheet bind:open={activityOpen} title={tr('taskboard.activityTitle')}>
  {#if activityLoading}
    <div class="space-y-3 py-4">
      <Skeleton shape="rect" class="h-12 w-full rounded-xl" />
      <Skeleton shape="rect" class="h-12 w-full rounded-xl" />
      <Skeleton shape="rect" class="h-12 w-full rounded-xl" />
    </div>
  {:else if activityError}
    <div class="space-y-3 py-4">
      <p class="text-sm font-normal leading-relaxed text-status-urgent">{activityError}</p>
      <Button variant="secondary" size="sm" onclick={() => void loadActivity()}>
        {tr('taskboard.retry')}
      </Button>
    </div>
  {:else if activityItems.length === 0}
    <p class="py-4 text-sm font-normal leading-relaxed text-mute">{tr('taskboard.activityEmpty')}</p>
  {:else}
    <div class="space-y-2.5 py-2">
      {#each activityItems as item (item.id)}
        <div class="flex items-start gap-2.5 rounded-xl border border-hairline bg-canvas-sunken/60 p-3">
          <Avatar name={item.actorName ?? '?'} size={26} class="mt-0.5 shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-normal leading-relaxed text-ink-soft">{item.description}</p>
            <p class="mt-1 text-[11px] text-faint">
              {#if item.actorName}{item.actorName} · {/if}
              {formatDateTime(item.createdAt)}
            </p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</Sheet>

<!-- Create Task Dialog -->
<Dialog
  bind:open={createOpen}
  title={tr('taskboard.newTaskTitle')}
  description={tr('taskboard.newTaskDescription', { column: createColumnName })}
  size="md"
>
  <div class="space-y-4">
    <FormField label={tr('taskboard.taskTitle')} required>
      {#snippet control(args)}
        <Input {...args} bind:value={newTitle} placeholder={tr('taskboard.taskTitlePlaceholder')} />
      {/snippet}
    </FormField>

    <FormField label={tr('taskboard.taskDescription')}>
      {#snippet control(args)}
        <Textarea
          {...args}
          bind:value={newDescription}
          placeholder={tr('taskboard.taskDescriptionPlaceholder')}
          rows={3}
        />
      {/snippet}
    </FormField>

    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label={tr('taskboard.priority')}>
        {#snippet control(args)}
          <SelectMenu {...args} bind:value={newPriority} options={priorityOptions} />
        {/snippet}
      </FormField>

      <FormField label={tr('taskboard.assignee')}>
        {#snippet control(args)}
          <SelectMenu {...args} bind:value={newAssigneeId} options={assigneeOptions} />
        {/snippet}
      </FormField>
    </div>


    <FormField label={tr('taskboard.dueDate')}>
      {#snippet control(args)}
        <Input {...args} type="date" bind:value={newDueDate} />
      {/snippet}
    </FormField>

    <FormField label="Label / Tag">
      {#snippet control()}
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Input
              bind:value={newLabelInput}
              placeholder="Ketik label lalu tekan Tambah atau Enter (cth: Bug, Feature)"
              onkeydown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = newLabelInput.trim();
                  if (val && !newLabels.includes(val)) {
                    newLabels = [...newLabels, val];
                    newLabelInput = '';
                  }
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!newLabelInput.trim()}
              onclick={() => {
                const val = newLabelInput.trim();
                if (val && !newLabels.includes(val)) {
                  newLabels = [...newLabels, val];
                  newLabelInput = '';
                }
              }}
            >
              Tambah
            </Button>
          </div>
          {#if newLabels.length > 0}
            <div class="flex flex-wrap gap-1.5 pt-1">
              {#each newLabels as label (label)}
                <span class="inline-flex items-center gap-1 rounded-md bg-canvas-sunken border border-hairline px-2 py-0.5 text-xs font-semibold text-ink">
                  <span>{label}</span>
                  <button
                    type="button"
                    onclick={() => (newLabels = newLabels.filter((l) => l !== label))}
                    class="text-mute hover:text-status-urgent transition-colors"
                  >
                    ×
                  </button>
                </span>
              {/each}
            </div>
          {/if}
        </div>
      {/snippet}
    </FormField>

    {#if createError}
      <p class="text-sm font-normal leading-relaxed text-status-urgent">{createError}</p>
    {/if}
  </div>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (createOpen = false)}>{tr('common.cancel')}</Button>
      <Button
        variant="primary"
        loading={createLoading}
        disabled={!newTitle.trim()}
        onclick={createTaskSubmit}
      >
        {tr('taskboard.createTask')}
      </Button>
    </div>
  {/snippet}
</Dialog>

<!-- Add / Rename Column Dialog -->
<Dialog
  bind:open={columnDialogOpen}
  title={editingColumn ? tr('taskboard.renameColumn') : tr('taskboard.columnTitle')}
  size="sm"
>
  <div class="space-y-4">
    <FormField label={tr('taskboard.columnName')} required>
      {#snippet control(args)}
        <Input {...args} bind:value={columnName} placeholder={tr('taskboard.columnNamePlaceholder')} />
      {/snippet}
    </FormField>

    <FormField label={tr('taskboard.columnColor')}>
      {#snippet control(args)}
        <SelectMenu {...args} bind:value={columnColor} options={colorOptions} />
      {/snippet}
    </FormField>

    {#if columnError}
      <p class="text-sm font-normal leading-relaxed text-status-urgent">{columnError}</p>
    {/if}
  </div>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (columnDialogOpen = false)}>{tr('common.cancel')}</Button>
      <Button variant="primary" loading={columnSaving} disabled={!columnName.trim()} onclick={saveColumn}>
        {tr('common.save')}
      </Button>
    </div>
  {/snippet}
</Dialog>

<ConfirmDialog
  open={columnToDelete !== null}
  title={tr('taskboard.deleteColumnTitle', { name: columnToDelete?.name ?? '' })}
  description={tr('taskboard.deleteColumnDescription')}
  confirmLabel={tr('taskboard.deleteColumnConfirm')}
  cancelLabel={tr('common.cancel')}
  destructive
  loading={deletingColumn}
  onconfirm={deleteColumnConfirmed}
  oncancel={() => (columnToDelete = null)}
/>

<ConfirmDialog
  open={taskToDelete !== null}
  title={tr('taskboard.deleteTaskTitle', { name: taskToDelete?.title ?? '' })}
  description={tr('taskboard.deleteTaskDescription')}
  confirmLabel={tr('taskboard.deleteTaskConfirm')}
  cancelLabel={tr('common.cancel')}
  destructive
  loading={deletingTask}
  onconfirm={deleteTaskConfirmed}
  oncancel={() => (taskToDelete = null)}
/>
<!-- Edit Board Dialog -->
<Dialog bind:open={editBoardOpen} title="Pengaturan Papan" description={tr('members.groupsDescription')} size="md">
  <div class="space-y-4">
    <FormField label={tr('taskboard.name')} required>
      {#snippet control(args)}
        <Input {...args} bind:value={editBoardName} placeholder={tr('taskboard.namePlaceholder')} />
      {/snippet}
    </FormField>

    <FormField label={tr('taskboard.viewerGroup')}>
      {#snippet control(args)}
        <SelectMenu {...args} bind:value={editBoardGroupId} options={groupOptions} />
      {/snippet}
    </FormField>

    <FormField label={tr('taskboard.boardDescription')}>
      {#snippet control(args)}
        <Textarea
          {...args}
          bind:value={editBoardDescription}
          placeholder={tr('taskboard.boardDescriptionPlaceholder')}
          rows={3}
        />
      {/snippet}
    </FormField>

    {#if editBoardError}
      <p class="text-sm font-normal leading-relaxed text-status-urgent">{editBoardError}</p>
    {/if}
  </div>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (editBoardOpen = false)}>{tr('common.cancel')}</Button>
      <Button variant="primary" loading={editBoardLoading} disabled={!editBoardName.trim()} onclick={saveBoardSettings}>
        {tr('common.save')}
      </Button>
    </div>
  {/snippet}
</Dialog>
<ConfirmDialog
  open={deleteBoardConfirmOpen}
  title={tr('taskboard.deleteTitle', { name: board?.name ?? '' })}
  description={tr('taskboard.deleteDescription')}
  confirmLabel={tr('taskboard.deleteConfirm')}
  cancelLabel={tr('common.cancel')}
  destructive
  loading={deletingBoard}
  onconfirm={deleteBoardConfirmed}
  oncancel={() => (deleteBoardConfirmOpen = false)}
/>
