<script lang="ts">
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
    type ApiTaskPriority,
    type ApiWorkspaceMember
  } from '$lib/api/client';
  import { dashboardText, dashboardIntlLocale } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import {
    Avatar,
    Badge,
    Button,
    IconButton,
    Input,
    Skeleton,
    Textarea,
    Tooltip
  } from '$lib/components/atoms/index.js';
  import {
    Breadcrumb,
    EmptyStateBlock,
    FormField,
    SelectMenu,
    Tabs,
    toast
  } from '$lib/components/molecules/index.js';
  import { ConfirmDialog, Dialog, KanbanBoard, Sheet } from '$lib/components/organisms/index.js';
  import type { KanbanColumn } from '$lib/components/organisms/shared.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    Clock01Icon,
    Delete02Icon,
    Download04Icon,
    Edit02Icon,
    File02Icon,
    ZoomIcon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../../$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  const boardId = $derived(page.params.boardId ?? '');

  let loadingData = $state(true);
  let loadError = $state<string | null>(null);
  let board = $state<ApiTaskBoard | null>(null);
  let columns = $state<ApiTaskBoardColumn[]>([]);
  let members = $state<ApiWorkspaceMember[]>([]);

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
  let editPriority = $state<ApiTaskPriority>('medium');
  let editAssigneeId = $state('');
  let editDueDate = $state('');
  let savingTask = $state(false);
  let moveColumnId = $state('');
  let movingTask = $state(false);
  let taskToDelete = $state<{ id: string; title: string } | null>(null);
  let deletingTask = $state(false);
  let commentDraft = $state('');
  let postingComment = $state(false);
  let deletingCommentId = $state<string | null>(null);
  let uploadingAttachment = $state(false);
  let attachmentError = $state<string | null>(null);
  let deletingAttachmentId = $state<string | null>(null);
  let previewAttachment = $state<ApiTaskAttachment | null>(null);
  let fileInputEl = $state<HTMLInputElement | null>(null);

  // Create task dialog state
  let createOpen = $state(false);
  let createLoading = $state(false);
  let createError = $state<string | null>(null);
  let createColumnId = $state('');
  let newTitle = $state('');
  let newDescription = $state('');
  let newPriority = $state<ApiTaskPriority>('medium');
  let newAssigneeId = $state('');
  let newDueDate = $state('');

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

  const assigneeOptions = $derived([
    { value: '', label: tr('taskboard.unassigned') },
    ...members.map((member) => ({ value: member.id, label: member.name }))
  ]);

  const priorityOptions = $derived([
    { value: 'low', label: tr('taskboard.priorityLow') },
    { value: 'medium', label: tr('taskboard.priorityMedium') },
    { value: 'high', label: tr('taskboard.priorityHigh') }
  ]);

  const columnOptions = $derived(columns.map((column) => ({ value: column.id, label: column.name })));

  const colorOptions = [
    { value: 'indigo', label: 'Indigo' },
    { value: 'sky', label: 'Sky' },
    { value: 'amber', label: 'Amber' },
    { value: 'emerald', label: 'Emerald' },
    { value: 'rose', label: 'Rose' }
  ];

  const colorDots: Record<string, string> = {
    indigo: 'bg-indigo-500',
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500'
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

  function toDateInput(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function fromDateInput(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const kanbanColumns = $derived<KanbanColumn[]>(
    columns.map((column) => ({
      id: column.id,
      title: column.name,
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
              ? tr('taskboard.dueOn', { date: formatDueShort(task.dueAt) })
              : undefined;
          return {
            id: task.id,
            title: task.title,
            subtitle: task.assigneeName ?? undefined,
            badge: priorityLabel(task.priority),
            badgeTone: priorityBadgeTone(task.priority),
            labelBarTone: priorityBarTone(task.priority),
            assignee: task.assigneeName ?? undefined,
            dueBadge,
            dueDateText,
            completed: Boolean(task.completedAt)
          };
        })
    }))
  );

  async function refreshView() {
    if (!data.workspace?.id || !boardId) return;
    const res = await api.getTaskBoardView(data.workspace.id, boardId);
    columns = [...(res.board?.columns ?? [])].sort((a, b) => a.position - b.position);
  }

  async function loadBoard() {
    if (!data.workspace?.id || !boardId) return;
    loadingData = true;
    loadError = null;
    try {
      const [boardRes, viewRes, membersRes] = await Promise.all([
        api.getTaskBoard(data.workspace.id, boardId),
        api.getTaskBoardView(data.workspace.id, boardId),
        api.listWorkspaceMembers(data.workspace.id).catch(() => ({ members: [] }))
      ]);
      board = boardRes.board;
      columns = [...(viewRes.board?.columns ?? [])].sort((a, b) => a.position - b.position);
      members = membersRes.members ?? [];
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
    try {
      await api.moveTask(data.workspace.id, boardId, cardId, { columnId: toColumnId });
      await refreshView();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.moveError'));
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
    attachmentError = null;
    previewAttachment = null;
    try {
      const res = await api.getTaskDetail(data.workspace.id, boardId, taskId);
      taskDetail = res.task;
      editTitle = res.task.title;
      editDescription = res.task.description ?? '';
      editPriority = res.task.priority;
      editAssigneeId = res.task.assigneeId ?? '';
      editDueDate = toDateInput(res.task.dueAt);
      moveColumnId = res.task.columnId;
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
    attachmentError = null;
    previewAttachment = null;
  }

  async function saveTask() {
    if (!taskDetail || !data.workspace?.id || !boardId || !editTitle.trim()) return;
    savingTask = true;
    try {
      const res = await api.updateTask(data.workspace.id, boardId, taskDetail.id, {
        title: editTitle.trim(),
        description: editDescription.trim() ? editDescription.trim() : null,
        priority: editPriority,
        assigneeId: editAssigneeId ? editAssigneeId : null,
        dueAt: fromDateInput(editDueDate)
      });
      taskDetail = { ...res.task, comments: taskDetail.comments, attachments: taskDetail.attachments };
      await refreshView();
      toast.success(tr('taskboard.saved'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.taskError'));
    } finally {
      savingTask = false;
    }
  }

  async function moveTaskToColumn(columnId: string) {
    if (!taskDetail || !data.workspace?.id || !boardId || columnId === taskDetail.columnId) {
      moveColumnId = taskDetail?.columnId ?? '';
      return;
    }
    movingTask = true;
    try {
      const res = await api.moveTask(data.workspace.id, boardId, taskDetail.id, { columnId });
      taskDetail = { ...res.task, comments: taskDetail.comments, attachments: taskDetail.attachments };
      moveColumnId = res.task.columnId;
      await refreshView();
    } catch (err) {
      moveColumnId = taskDetail.columnId;
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.moveError'));
    } finally {
      movingTask = false;
    }
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

  async function postComment() {
    if (!taskDetail || !data.workspace?.id || !boardId || !commentDraft.trim()) return;
    postingComment = true;
    try {
      const res = await api.createTaskComment(data.workspace.id, boardId, taskDetail.id, {
        content: commentDraft.trim()
      });
      taskDetail = { ...taskDetail, comments: [...taskDetail.comments, res.comment] };
      commentDraft = '';
      await refreshView();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.commentError'));
    } finally {
      postingComment = false;
    }
  }

  async function deleteComment(commentId: string) {
    if (!taskDetail || !data.workspace?.id || !boardId) return;
    deletingCommentId = commentId;
    try {
      await api.deleteTaskComment(data.workspace.id, boardId, taskDetail.id, commentId);
      taskDetail = {
        ...taskDetail,
        comments: taskDetail.comments.filter((comment) => comment.id !== commentId)
      };
      await refreshView();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.commentDeleteError'));
    } finally {
      deletingCommentId = null;
    }
  }

  async function refreshTaskDetail() {
    if (!taskDetail || !data.workspace?.id || !boardId) return;
    try {
      const res = await api.getTaskDetail(data.workspace.id, boardId, taskDetail.id);
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

  const imageAttachments = $derived(taskDetail?.attachments.filter((a) => isImageType(a.fileType)) ?? []);
  const fileAttachments = $derived(taskDetail?.attachments.filter((a) => !isImageType(a.fileType)) ?? []);

  const canDeleteAttachment = (attachment: ApiTaskAttachment) =>
    canManage || attachment.uploaderId === data.user?.id;

  function handleAttachmentSelect(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) uploadAttachment(file);
  }

  async function uploadAttachment(file: File) {
    if (!taskDetail || !data.workspace?.id || !boardId) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      attachmentError = tr('taskboard.attachTooLarge');
      return;
    }
    uploadingAttachment = true;
    attachmentError = null;
    try {
      await api.uploadTaskAttachment(data.workspace.id, boardId, taskDetail.id, file);
      await refreshTaskDetail();
      await refreshView();
    } catch (err) {
      if (err instanceof ApiError && err.status === 413) {
        attachmentError = tr('taskboard.attachTooLarge');
      } else {
        attachmentError = err instanceof ApiError ? err.message : tr('taskboard.attachFailed');
      }
    } finally {
      uploadingAttachment = false;
    }
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

  const canDeleteComment = (comment: ApiTaskComment) =>
    canManage || (comment.authorId != null && comment.authorId === data.user?.id);

  function openCreateTask(columnId: string) {
    createColumnId = columnId || columns[0]?.id || '';
    newTitle = '';
    newDescription = '';
    newPriority = 'medium';
    newAssigneeId = '';
    newDueDate = '';
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
        assigneeId: newAssigneeId ? newAssigneeId : null,
        dueAt: fromDateInput(newDueDate)
      });
      createOpen = false;
      await refreshView();
      toast.success(tr('taskboard.taskCreated'));
    } catch (err) {
      createError = err instanceof ApiError ? err.message : tr('taskboard.taskError');
    } finally {
      createLoading = false;
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

  async function loadActivity() {
    if (!data.workspace?.id || !boardId) return;
    activityLoading = true;
    activityError = null;
    try {
      const res = await api.listTaskBoardActivity(data.workspace.id, boardId, 50);
      activityItems = res.activity ?? [];
    } catch (err) {
      activityError = err instanceof ApiError ? err.message : tr('taskboard.activityError');
    } finally {
      activityLoading = false;
    }
  }

  function openActivity() {
    activityOpen = true;
    loadActivity();
  }
</script>

<svelte:head>
  <title>{board?.name ?? tr('taskboard.boardTitle')} — actjom</title>
</svelte:head>

<div class="space-y-5 sm:space-y-6">
  <header class="space-y-3">
    <Breadcrumb
      items={[
        { label: tr('nav.boards'), href: '/dashboard/boards' },
        { label: board?.name ?? tr('taskboard.boardTitle') }
      ]}
      showHomeIcon
    />

    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        {#if loadingData}
          <Skeleton shape="rect" class="h-8 w-56 rounded-lg" />
          <Skeleton shape="rect" class="h-4 w-72 rounded-md" />
        {:else}
          <h1 class="ds-page-title tracking-tight text-ink">
            {board?.name ?? tr('taskboard.boardTitle')}
          </h1>
          <p class="ds-caption text-mute">
            {#if board?.description}{board.description} · {/if}
            <span class="font-medium text-ink-soft">{totalTasks} {tr('taskboard.cardCount')}</span>
          </p>
        {/if}
      </div>

      {#if !loadingData && !loadError}
        <div class="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" size="sm" onclick={openActivity}>
            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
            <span>{tr('taskboard.activity')}</span>
          </Button>
        </div>
      {/if}
    </div>
  </header>

  {#if loadingData}
    <div class="flex gap-4 overflow-hidden">
      {#each [1, 2, 3] as i (i)}
        <div class="w-lane shrink-0 space-y-3 rounded-2xl border border-hairline bg-canvas-sunken p-3.5">
          <div class="flex items-center justify-between">
            <Skeleton shape="rect" class="h-5 w-24 rounded-md" />
            <Skeleton shape="rect" class="h-5 w-12 rounded-full" />
          </div>
          <Skeleton shape="rect" class="h-10 w-full rounded-xl" />
          <Skeleton shape="rect" class="h-24 w-full rounded-xl" />
          <Skeleton shape="rect" class="h-24 w-full rounded-xl" />
        </div>
      {/each}
    </div>
  {:else if loadError}
    <div class="space-y-3 rounded-2xl border border-hairline bg-card p-10 text-center shadow-card">
      <p class="ds-section-title text-ink">{loadError}</p>
      <Button variant="secondary" size="sm" onclick={loadBoard}>
        {tr('taskboard.retry')}
      </Button>
    </div>
  {:else if columns.length === 0}
    <EmptyStateBlock
      title={tr('taskboard.emptyColumn')}
      actionLabel={tr('taskboard.addColumn')}
      onaction={openAddColumn}
    />
  {:else}
    <section class="rounded-2xl border border-hairline bg-card p-4 shadow-card">
      <h2 class="text-sm font-bold text-ink">{tr('taskboard.manageColumns')}</h2>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        {#each columns as column (column.id)}
          <div class="flex items-center gap-1 rounded-full border border-hairline bg-canvas-sunken py-1 pl-3 pr-1.5">
            <span class={`size-2 shrink-0 rounded-full ${colorDots[column.color] ?? 'bg-primary'}`} aria-hidden="true"></span>
            <span class="max-w-40 truncate text-xs font-semibold text-ink">{column.name}</span>
            <span class="text-[11px] text-mute">({column.tasks.length})</span>
            <Tooltip text={tr('taskboard.renameColumn')} side="top">
              <IconButton variant="ghost" size="sm" label={tr('taskboard.renameColumn')} onclick={() => openRenameColumn(column)}>
                <HugeiconsIcon icon={Edit02Icon} size={13} strokeWidth={1.8} />
              </IconButton>
            </Tooltip>
            <Tooltip text={tr('taskboard.deleteColumn')} side="top">
              <IconButton
                variant="ghost"
                size="sm"
                label={tr('taskboard.deleteColumn')}
                onclick={() => (columnToDelete = { id: column.id, name: column.name })}
              >
                <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
              </IconButton>
            </Tooltip>
          </div>
        {/each}
        <Button variant="secondary" size="sm" onclick={openAddColumn} class="gap-1.5">
          <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
          <span>{tr('taskboard.addColumn')}</span>
        </Button>
      </div>
    </section>

    <KanbanBoard
      columns={kanbanColumns}
      addLabel={tr('taskboard.addTask')}
      emptyTitle={tr('taskboard.emptyColumn')}
      emptyDropHint={tr('taskboard.dropHere')}
      columnLabel={tr('taskboard.columnLabel')}
      countLabel={tr('taskboard.cardCount')}
      oncardclick={openTask}
      oncardmove={handleCardMove}
      onadd={openCreateTask}
    />
  {/if}
</div>

<!-- Task Detail Modal (Dialog) -->
<Dialog
  open={isSheetOpen}
  onclose={closeSheet}
  title={taskDetail?.title ?? tr('taskboard.taskDetail')}
  size="lg"
>
  {#if detailLoading}
    <div class="space-y-4 py-4">
      <Skeleton shape="rect" class="h-6 w-32 rounded-md" />
      <Skeleton shape="rect" class="h-10 w-full rounded-xl" />
      <Skeleton shape="rect" class="h-24 w-full rounded-2xl" />
    </div>
  {:else if detailError}
    <p class="py-4 text-sm font-normal leading-relaxed text-status-urgent">{detailError}</p>
  {:else if taskDetail}
    <div class="space-y-5 pb-6">
      <div class="sticky top-0 z-10 space-y-3 bg-card pb-2 pt-1">
      <div class="flex flex-wrap items-center gap-1.5">
        <Badge tone={priorityBadgeTone(taskDetail.priority)} variant="soft" class="px-2 py-0.5 text-[12px] font-semibold">
          {priorityLabel(taskDetail.priority)}
        </Badge>
        {#if taskDetail.completedAt}
          <Badge tone="done" variant="soft" class="px-2 py-0.5 text-[12px] font-semibold">
            {tr('taskboard.completed')}
          </Badge>
        {:else if taskDetail.dueAt}
          {#if isOverdue(taskDetail.dueAt, taskDetail.completedAt)}
            <Badge tone="urgent" variant="soft" class="px-2 py-0.5 text-[12px] font-semibold">
              {tr('taskboard.overdue')}
            </Badge>
          {:else if isDueToday(taskDetail.dueAt, taskDetail.completedAt)}
            <Badge tone="progress" variant="soft" class="px-2 py-0.5 text-[12px] font-semibold">
              {tr('taskboard.dueToday')}
            </Badge>
          {:else}
            <Badge tone="idle" variant="soft" class="px-2 py-0.5 text-[12px] font-semibold">
              {tr('taskboard.dueOn', { date: formatDueShort(taskDetail.dueAt) })}
            </Badge>
          {/if}
        {/if}
      </div>
      <Tabs
        items={[
          { value: 'details', label: tr('taskboard.tabDetails') },
          { value: 'comments', label: tr('taskboard.tabComments'), badge: taskDetail.comments.length },
          { value: 'attachments', label: tr('taskboard.tabAttachments'), badge: taskDetail.attachments.length }
        ]}
        bind:value={detailTab}
        variant="pills"
        full
      />
      </div>

      {#if detailTab === 'details'}
      <div class="space-y-4">
        <FormField label={tr('taskboard.taskTitle')} required>
          {#snippet control(args)}
            <Input {...args} bind:value={editTitle} placeholder={tr('taskboard.taskTitlePlaceholder')} />
          {/snippet}
        </FormField>

        <FormField label={tr('taskboard.taskDescription')}>
          {#snippet control(args)}
            <Textarea
              {...args}
              bind:value={editDescription}
              placeholder={tr('taskboard.taskDescriptionPlaceholder')}
              rows={3}
            />
          {/snippet}
        </FormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <FormField label={tr('taskboard.priority')}>
            {#snippet control(args)}
              <SelectMenu {...args} bind:value={editPriority} options={priorityOptions} />
            {/snippet}
          </FormField>

          <FormField label={tr('taskboard.assignee')}>
            {#snippet control(args)}
              <SelectMenu {...args} bind:value={editAssigneeId} options={assigneeOptions} />
            {/snippet}
          </FormField>
        </div>

        <FormField label={tr('taskboard.dueDate')}>
          {#snippet control(args)}
            <Input {...args} type="date" bind:value={editDueDate} />
          {/snippet}
        </FormField>

        <div class="flex justify-end">
          <Button variant="primary" size="sm" loading={savingTask} disabled={!editTitle.trim()} onclick={saveTask}>
            {tr('common.save')}
          </Button>
        </div>
      </div>

      <div class="space-y-4">
        <FormField label={tr('taskboard.moveToColumn')}>
          {#snippet control(args)}
            <SelectMenu
              {...args}
              bind:value={moveColumnId}
              options={columnOptions}
              disabled={movingTask || columnOptions.length === 0}
              onchange={(value) => moveTaskToColumn(value)}
            />
          {/snippet}
        </FormField>
      </div>

      {#if canDeleteTask}
        <div class="border-t border-hairline pt-5">
          <Button
            variant="destructive"
            size="sm"
            onclick={() => taskDetail && (taskToDelete = { id: taskDetail.id, title: taskDetail.title })}
          >
            <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
            <span>{tr('taskboard.deleteTask')}</span>
          </Button>
        </div>
      {/if}
      {:else if detailTab === 'comments'}
      <div class="space-y-3">
        <div class="space-y-2">
          <Textarea
            bind:value={commentDraft}
            placeholder={tr('taskboard.commentPlaceholder')}
            rows={2}
          />
          <div class="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              loading={postingComment}
              disabled={!commentDraft.trim()}
              onclick={postComment}
            >
              {tr('taskboard.commentPost')}
            </Button>
          </div>
        </div>

        {#if taskDetail.comments.length === 0}
          <p class="text-sm font-normal leading-relaxed text-mute">{tr('taskboard.commentsEmpty')}</p>
        {:else}
          <div class="space-y-2.5">
            {#each taskDetail.comments as comment (comment.id)}
              <div class="rounded-xl border border-hairline bg-canvas-sunken/60 p-3">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex min-w-0 items-center gap-2">
                    <Avatar name={comment.authorName ?? '?'} size={22} />
                    <span class="truncate text-xs font-bold text-ink">
                      {comment.authorName ?? tr('taskboard.unassigned')}
                    </span>
                    <span class="shrink-0 text-[11px] text-faint">{formatDateTime(comment.createdAt)}</span>
                  </div>
                  {#if canDeleteComment(comment)}
                    <IconButton
                      variant="ghost"
                      size="sm"
                      label={tr('common.delete')}
                      disabled={deletingCommentId === comment.id}
                      onclick={() => deleteComment(comment.id)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
                    </IconButton>
                  {/if}
                </div>
                <p class="mt-1.5 text-sm font-normal leading-relaxed break-words text-ink-soft">
                  {comment.content}
                </p>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      {:else}
      <div class="space-y-3">
        <div class="flex items-center justify-end gap-2">
          <input
            bind:this={fileInputEl}
            type="file"
            class="hidden"
            disabled={uploadingAttachment}
            onchange={handleAttachmentSelect}
          />
          <Button
            variant="secondary"
            size="sm"
            loading={uploadingAttachment}
            onclick={() => fileInputEl?.click()}
          >
            <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.8} />
            <span>{tr('taskboard.attachAdd')}</span>
          </Button>
        </div>

        {#if uploadingAttachment}
          <p class="text-xs font-normal text-mute">{tr('taskboard.attachUploading')}</p>
        {/if}
        {#if attachmentError}
          <p class="text-xs font-normal leading-relaxed text-status-urgent">{attachmentError}</p>
        {/if}

        {#if taskDetail.attachments.length === 0}
          <p class="text-sm font-normal leading-relaxed text-mute">{tr('taskboard.attachEmpty')}</p>
        {:else}
          {#if imageAttachments.length > 0}
            <div class="grid grid-cols-4 gap-2">
              {#each imageAttachments as attachment (attachment.id)}
                <button
                  type="button"
                  onclick={() => (previewAttachment = attachment)}
                  class="group/img relative block cursor-zoom-in overflow-hidden rounded-lg border border-hairline"
                  aria-label={tr('taskboard.attachPreview')}
                  title={attachment.fileName}
                >
                  <img
                    src={attachment.filePath}
                    alt={attachment.fileName}
                    class="h-20 w-full object-cover transition-opacity group-hover/img:opacity-80"
                    loading="lazy"
                  />
                  <span
                    class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/img:opacity-100"
                  >
                    <span class="flex size-8 items-center justify-center rounded-full bg-black/50 text-white">
                      <HugeiconsIcon icon={ZoomIcon} size={16} strokeWidth={2} />
                    </span>
                  </span>
                </button>
              {/each}
            </div>
          {/if}

          {#if fileAttachments.length > 0}
            <div class="space-y-2">
              {#each fileAttachments as attachment (attachment.id)}
                <div
                  class="flex items-center gap-2.5 rounded-xl border border-hairline bg-canvas-sunken/60 p-2.5"
                >
                  <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <HugeiconsIcon icon={File02Icon} size={18} strokeWidth={1.8} />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-ink">{attachment.fileName}</p>
                    <p class="text-[11px] text-faint">
                      {formatFileSize(attachment.fileSize)} · {attachment.uploaderName ??
                        tr('taskboard.unassigned')}
                    </p>
                  </div>
                  <a
                    href={attachment.filePath}
                    download={attachment.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex size-7 shrink-0 items-center justify-center rounded-sm text-faint transition-colors hover:bg-lane hover:text-body"
                    aria-label={tr('taskboard.attachDownload')}
                    title={tr('taskboard.attachDownload')}
                  >
                    <HugeiconsIcon icon={Download04Icon} size={14} strokeWidth={1.8} />
                  </a>
                  {#if canDeleteAttachment(attachment)}
                    <IconButton
                      variant="ghost"
                      size="sm"
                      label={tr('taskboard.attachDelete')}
                      disabled={deletingAttachmentId === attachment.id}
                      onclick={() => deleteAttachment(attachment.id)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
                    </IconButton>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>

      {/if}
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
      <Button variant="secondary" size="sm" onclick={loadActivity}>
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

    {#if createError}
      <p class="text-sm font-normal leading-relaxed text-status-urgent">{createError}</p>
    {/if}
  </div>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (createOpen = false)}>{tr('common.cancel')}</Button>
      <Button variant="primary" loading={createLoading} disabled={!newTitle.trim()} onclick={createTaskSubmit}>
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
