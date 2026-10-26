<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError, type ApiTaskBoard, type ApiWorkspaceMemberGroup } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Badge, Button, IconButton, Input, Skeleton, Textarea, Tooltip } from '$lib/components/atoms/index.js';
  import {
    FormField,
    EmptyStateBlock,
    Breadcrumb,
    SearchInput,
    SelectMenu,
    toast
  } from '$lib/components/molecules/index.js';
  import { Dialog, ConfirmDialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    ArrowRight01Icon,
    Delete02Icon,
    Edit02Icon,
    GridViewIcon,
    KanbanIcon,
    ListViewIcon,
    Search01Icon,
    UserGroupIcon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let loadingData = $state(true);
  let loadError = $state<string | null>(null);
  let boards = $state<ApiTaskBoard[]>([]);
  let boardSearch = $state('');
  let viewMode = $state<'grid' | 'list'>('list');

  $effect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flowboard:boards:view-mode');
      if (saved === 'grid' || saved === 'list') {
        viewMode = saved;
      }
    }
  });

  function setViewMode(mode: 'grid' | 'list') {
    viewMode = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('flowboard:boards:view-mode', mode);
    }
  }

  let createOpen = $state(false);
  let createLoading = $state(false);
  let createError = $state<string | null>(null);
  let boardName = $state('');
  let boardDescription = $state('');
  let boardGroupId = $state<string>('');
  let groups = $state<ApiWorkspaceMemberGroup[]>([]);

  let boardToDelete = $state<ApiTaskBoard | null>(null);
  let deletingBoard = $state(false);

  let editOpen = $state(false);
  let editLoading = $state(false);
  let editError = $state<string | null>(null);
  let editingBoard = $state<ApiTaskBoard | null>(null);
  let editBoardName = $state('');
  let editBoardDescription = $state('');
  let editBoardGroupId = $state('');

  function openEditBoard(board: ApiTaskBoard) {
    editingBoard = board;
    editBoardName = board.name;
    editBoardDescription = board.description ?? '';
    editBoardGroupId = board.workspaceMemberGroupId ?? '';
    editError = null;
    editOpen = true;
  }

  async function saveEditBoard() {
    if (!editingBoard || !editBoardName.trim() || !data.workspace?.id) return;
    editLoading = true;
    editError = null;
    try {
      const res = await api.updateTaskBoard(data.workspace.id, editingBoard.id, {
        name: editBoardName.trim(),
        description: editBoardDescription.trim() ? editBoardDescription.trim() : null,
        workspaceMemberGroupId: editBoardGroupId ? editBoardGroupId : null
      });
      boards = boards.map((b) => (b.id === editingBoard?.id ? { ...b, ...res.board } : b));
      editOpen = false;
      editingBoard = null;
      toast.success(tr('taskboard.saved') ?? 'Pengaturan papan disimpan');
    } catch (err) {
      editError = err instanceof ApiError ? err.message : tr('taskboard.loadError');
    } finally {
      editLoading = false;
    }
  }
  const groupOptions = $derived([
    { value: '', label: tr('taskboard.viewerAll') },
    ...groups.map((g) => ({ value: g.id, label: g.name }))
  ]);

  const filteredBoards = $derived(
    boardSearch.trim()
      ? boards.filter((board) => {
          const query = boardSearch.trim().toLowerCase();
          return (
            board.name.toLowerCase().includes(query) ||
            (board.description ?? '').toLowerCase().includes(query) ||
            (board.ownerName ?? '').toLowerCase().includes(query)
          );
        })
      : boards
  );

  const canManageBoard = (board: ApiTaskBoard) =>
    data.workspace?.role === 'owner' || board.ownerId === data.user?.id;

  async function loadBoards() {
    if (!data.workspace?.id) return;
    loadingData = true;
    loadError = null;
    try {
      const [res, groupsRes] = await Promise.all([
        api.listTaskBoards(data.workspace.id),
        api.listWorkspaceMemberGroups(data.workspace.id).catch(() => ({ groups: [] }))
      ]);
      boards = res.boards ?? [];
      groups = groupsRes.groups ?? [];
    } catch (err) {
      loadError = err instanceof ApiError ? err.message : tr('taskboard.loadError');
    } finally {
      loadingData = false;
    }
  }

  $effect(() => {
    if (data.workspace?.id) {
      loadBoards();
    }
  });

  function openCreate() {
    boardName = '';
    boardDescription = '';
    boardGroupId = '';
    createError = null;
    createOpen = true;
  }

  async function createBoard() {
    if (!boardName.trim() || !data.workspace?.id) return;
    createLoading = true;
    createError = null;
    try {
      const res = await api.createTaskBoard(data.workspace.id, {
        name: boardName.trim(),
        description: boardDescription.trim() ? boardDescription.trim() : null,
        workspaceMemberGroupId: boardGroupId ? boardGroupId : null
      });
      createOpen = false;
      await goto(`/dashboard/boards/${res.board.id}`);
    } catch (err) {
      createError = err instanceof ApiError ? err.message : tr('taskboard.createError');
    } finally {
      createLoading = false;
    }
  }

  function openDeleteBoard(board: ApiTaskBoard) {
    if (!canManageBoard(board)) return;
    boardToDelete = board;
  }

  async function deleteBoardConfirmed() {
    if (!boardToDelete || !data.workspace?.id) return;
    const boardId = boardToDelete.id;
    const name = boardToDelete.name;
    deletingBoard = true;
    try {
      await api.deleteTaskBoard(data.workspace.id, boardId);
      boards = boards.filter((board) => board.id !== boardId);
      boardToDelete = null;
      toast.success(tr('taskboard.deleted', { name }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('taskboard.deleteError'));
    } finally {
      deletingBoard = false;
    }
  }
</script>

<svelte:head><title>{tr('taskboard.title')} — actjom</title></svelte:head>

<div class="space-y-5 sm:space-y-6">
  <header class="space-y-3">
    <Breadcrumb
      items={[
        { label: tr('common.dashboard'), href: '/dashboard' },
        { label: tr('nav.boards') }
      ]}
      showHomeIcon
    />
    <div class="flex flex-wrap items-center justify-between gap-4 pt-1">
      <div>
        <h1 class="ds-page-title text-ink">{tr('taskboard.title')}</h1>
        <p class="mt-1 text-sm font-normal leading-relaxed text-mute">{tr('taskboard.description')}</p>
      </div>
      <Button variant="primary" onclick={openCreate} class="shadow-xs">
        <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />
        <span>{tr('taskboard.create')}</span>
      </Button>
    </div>
  </header>

  {#if !loadingData && !loadError && boards.length > 0}
    <div class="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <SearchInput
        bind:value={boardSearch}
        placeholder={tr('taskboard.search')}
        class="max-w-sm"
      />
      <div class="flex items-center justify-between sm:justify-end gap-3">
        <span class="text-[13px] font-medium text-mute">
          {filteredBoards.length} {tr('taskboard.cardCount')}
        </span>
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

  {#if loadingData}
    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {#each [1, 2, 3] as i (i)}
        <div class="flex flex-col justify-between space-y-5 rounded-2xl border border-hairline bg-card p-5 shadow-card">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <Skeleton shape="rect" class="size-10 rounded-xl" />
              <Skeleton shape="rect" class="size-6 rounded-lg" />
            </div>
            <Skeleton shape="rect" class="h-5 w-40 rounded-md" />
            <Skeleton shape="rect" class="h-4 w-28 rounded-md" />
          </div>
          <div class="flex items-center justify-between border-t border-hairline pt-3">
            <Skeleton shape="rect" class="h-8 w-20 rounded-lg" />
            <Skeleton shape="rect" class="h-8 w-28 rounded-lg" />
          </div>
        </div>
      {/each}
    </div>
  {:else if loadError}
    <div class="space-y-3 rounded-2xl border border-hairline bg-card p-10 text-center shadow-card">
      <p class="ds-section-title text-ink">{loadError}</p>
      <Button variant="secondary" size="sm" onclick={loadBoards}>
        {tr('taskboard.retry')}
      </Button>
    </div>
  {:else if boards.length === 0}
    <EmptyStateBlock
      title={tr('taskboard.empty')}
      description={tr('taskboard.emptyDescription')}
      actionLabel={tr('taskboard.create')}
      onaction={openCreate}
    />
  {:else if filteredBoards.length === 0}
    <div class="space-y-3 rounded-2xl border border-hairline bg-card p-10 text-center shadow-card">
      <HugeiconsIcon icon={Search01Icon} size={32} strokeWidth={1.5} class="mx-auto text-faint" />
      <p class="ds-section-title text-ink">{tr('common.noResults')}</p>
      <p class="text-sm font-normal leading-relaxed text-mute">
        {tr('taskboard.emptySearch', { query: boardSearch.trim() })}
      </p>
      <Button variant="secondary" size="sm" onclick={() => (boardSearch = '')}>
        {tr('common.clear')}
      </Button>
    </div>
  {:else if viewMode === 'grid'}
    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {#each filteredBoards as board (board.id)}
        {@const canManage = canManageBoard(board)}
        <article class="group relative flex flex-col justify-between rounded-2xl border border-hairline bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card-hover">
          <div class="space-y-3.5">
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft font-bold text-primary shadow-xs transition-colors group-hover:bg-primary group-hover:text-white">
                  <HugeiconsIcon icon={KanbanIcon} size={20} strokeWidth={1.8} />
                </div>
                <div class="min-w-0 flex-1">
                  <a
                    href="/dashboard/boards/{board.id}"
                    class="block truncate text-base font-bold text-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline"
                    title={board.name}
                  >
                    {board.name}
                  </a>
                  {#if board.ownerName}
                    <span class="block truncate text-[11px] text-faint">
                      {tr('taskboard.owner', { name: board.ownerName })}
                    </span>
                  {/if}
                </div>
              </div>

              {#if canManage}
                <div class="flex items-center gap-0.5">
                  <Tooltip text={tr('common.edit')} side="top">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      label={tr('common.edit')}
                      onclick={() => openEditBoard(board)}
                    >
                      <HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={1.8} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip text={tr('common.delete')} side="top">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      label={tr('common.delete')}
                      onclick={() => openDeleteBoard(board)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
                    </IconButton>
                  </Tooltip>
                </div>
              {/if}
            </div>

            {#if board.description}
              <p class="line-clamp-2 text-sm font-normal leading-relaxed text-mute">
                {board.description}
              </p>
            {/if}

            <div class="flex flex-wrap items-center gap-1.5">
              <Badge tone="queued" variant="soft" class="px-2 py-0.5 text-[10px] font-semibold">
                {board.taskCount ?? 0} {tr('taskboard.cardCount')}
              </Badge>
              {#if board.workspaceMemberGroupId}
                {@const matchedGroup = groups.find((g) => g.id === board.workspaceMemberGroupId)}
                <Badge tone="queued" variant="soft" class="gap-1 px-2 py-0.5 text-[10px] font-semibold">
                  <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
                  <span>{matchedGroup?.name ?? tr('taskboard.viewerGroup')}</span>
                </Badge>
              {:else}
                <Badge tone="idle" variant="soft" class="px-2 py-0.5 text-[10px] font-semibold">Publik</Badge>
              {/if}
            </div>
          </div>

          <div class="mt-5 flex items-center justify-end border-t border-hairline pt-3.5">
            <Button href="/dashboard/boards/{board.id}" variant="primary" size="sm" class="gap-1.5 shadow-xs">
              <HugeiconsIcon icon={KanbanIcon} size={14} strokeWidth={1.8} />
              <span>{tr('taskboard.openBoard')}</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2.2} class="transition-transform group-hover:translate-x-0.5" />
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
              <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('taskboard.title')}</th>
              <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('taskboard.viewer')}</th>
              <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('common.pic')}</th>
              <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('taskboard.cardCount')}</th>
              <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5 text-right">{tr('common.actions')}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-hairline">
            {#each filteredBoards as board (board.id)}
              {@const canManage = canManageBoard(board)}
              {@const matchedGroup = board.workspaceMemberGroupId ? groups.find((g) => g.id === board.workspaceMemberGroupId) : null}
              <tr class="group hover:bg-lane/40 transition-colors">
                <td class="px-4 py-3.5 sm:px-6">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary font-bold shadow-xs transition-colors group-hover:bg-primary group-hover:text-white">
                      <HugeiconsIcon icon={KanbanIcon} size={18} strokeWidth={1.8} />
                    </div>
                    <div class="min-w-0">
                      <a
                        href="/dashboard/boards/{board.id}"
                        class="font-bold text-ink hover:text-primary transition-colors truncate block focus-visible:outline-none focus-visible:underline"
                        title={board.name}
                      >
                        {board.name}
                      </a>
                      {#if board.description}
                        <p class="text-xs text-mute truncate max-w-xs sm:max-w-md">{board.description}</p>
                      {/if}
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3.5 sm:px-6 whitespace-nowrap">
                  {#if board.workspaceMemberGroupId}
                    <Badge tone="queued" variant="soft" class="gap-1 px-2 py-0.5 text-[11px] font-semibold">
                      <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
                      <span>{matchedGroup?.name ?? tr('taskboard.viewerGroup')}</span>
                    </Badge>
                  {:else}
                    <Badge tone="idle" variant="soft" class="px-2 py-0.5 text-[11px] font-semibold">Publik</Badge>
                  {/if}
                </td>
                <td class="px-4 py-3.5 sm:px-6 whitespace-nowrap text-xs text-mute font-medium">
                  {board.ownerName ?? '—'}
                </td>
                <td class="px-4 py-3.5 sm:px-6 whitespace-nowrap">
                  <Badge tone="queued" variant="soft" class="px-2 py-0.5 text-[11px] font-semibold">
                    {board.taskCount ?? 0} {tr('taskboard.cardCount')}
                  </Badge>
                </td>
                <td class="px-4 py-3.5 sm:px-6 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    {#if canManage}
                      <Tooltip text={tr('common.edit')} side="top">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          class="size-8 rounded-lg"
                          label={tr('common.edit')}
                          onclick={() => openEditBoard(board)}
                        >
                          <HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={1.8} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip text={tr('common.delete')} side="top">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          class="size-8 rounded-lg text-mute hover:text-status-urgent hover:bg-status-urgent/10"
                          label={tr('common.delete')}
                          onclick={() => openDeleteBoard(board)}
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
                        </IconButton>
                      </Tooltip>
                    {/if}
                    <Tooltip text={tr('taskboard.openBoard')} side="top">
                      <IconButton
                        href="/dashboard/boards/{board.id}"
                        variant="primary"
                        size="sm"
                        class="size-8 rounded-lg shadow-xs"
                        label={tr('taskboard.openBoard')}
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

<Dialog bind:open={createOpen} title={tr('taskboard.createTitle')} description={tr('taskboard.createDescription')} size="md">
  <div class="space-y-4">
    <FormField label={tr('taskboard.name')} required>
      {#snippet control(args)}
        <Input {...args} bind:value={boardName} placeholder={tr('taskboard.namePlaceholder')} />
      {/snippet}
    </FormField>

    <FormField label={tr('taskboard.viewerGroup')}>
      {#snippet control(args)}
        <SelectMenu {...args} bind:value={boardGroupId} options={groupOptions} />
      {/snippet}
    </FormField>

    <FormField label={tr('taskboard.boardDescription')}>
      {#snippet control(args)}
        <Textarea
          {...args}
          bind:value={boardDescription}
          placeholder={tr('taskboard.boardDescriptionPlaceholder')}
          rows={3}
        />
      {/snippet}
    </FormField>

    {#if createError}
      <p class="text-sm font-normal leading-relaxed text-status-urgent">{createError}</p>
    {/if}
  </div>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (createOpen = false)}>{tr('common.cancel')}</Button>
      <Button variant="primary" loading={createLoading} disabled={!boardName.trim()} onclick={createBoard}>
        {tr('taskboard.create')}
      </Button>
    </div>
  {/snippet}
</Dialog>
<Dialog bind:open={editOpen} title="Pengaturan Papan" description={tr('members.groupsDescription')} size="md">
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

    {#if editError}
      <p class="text-sm font-normal leading-relaxed text-status-urgent">{editError}</p>
    {/if}
  </div>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (editOpen = false)}>{tr('common.cancel')}</Button>
      <Button variant="primary" loading={editLoading} disabled={!editBoardName.trim()} onclick={saveEditBoard}>
        {tr('common.save')}
      </Button>
    </div>
  {/snippet}
</Dialog>

<ConfirmDialog
  open={boardToDelete !== null}
  title={tr('taskboard.deleteTitle', { name: boardToDelete?.name ?? '' })}
  description={tr('taskboard.deleteDescription')}
  confirmLabel={tr('taskboard.deleteConfirm')}
  cancelLabel={tr('common.cancel')}
  destructive
  loading={deletingBoard}
  onconfirm={deleteBoardConfirmed}
  oncancel={() => (boardToDelete = null)}
/>
