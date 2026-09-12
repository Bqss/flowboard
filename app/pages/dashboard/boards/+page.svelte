<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError, type ApiTaskBoard } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Badge, Button, IconButton, Input, Skeleton, Textarea, Tooltip } from '$lib/components/atoms/index.js';
  import {
    FormField,
    EmptyStateBlock,
    Breadcrumb,
    SearchInput,
    toast
  } from '$lib/components/molecules/index.js';
  import { Dialog, ConfirmDialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    ArrowRight01Icon,
    Delete02Icon,
    KanbanIcon,
    Search01Icon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let loadingData = $state(true);
  let loadError = $state<string | null>(null);
  let boards = $state<ApiTaskBoard[]>([]);
  let boardSearch = $state('');

  let createOpen = $state(false);
  let createLoading = $state(false);
  let createError = $state<string | null>(null);
  let boardName = $state('');
  let boardDescription = $state('');

  let boardToDelete = $state<ApiTaskBoard | null>(null);
  let deletingBoard = $state(false);

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
      const res = await api.listTaskBoards(data.workspace.id);
      boards = res.boards ?? [];
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
        description: boardDescription.trim() ? boardDescription.trim() : null
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
      <div class="text-[13px] font-medium text-mute">
        <span>{filteredBoards.length} {tr('taskboard.cardCount')}</span>
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
  {:else}
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
              {/if}
            </div>

            {#if board.description}
              <p class="line-clamp-2 text-sm font-normal leading-relaxed text-mute">
                {board.description}
              </p>
            {/if}

            <div>
              <Badge tone="queued" variant="soft" class="px-2 py-0.5 text-[10px] font-semibold">
                {board.taskCount ?? 0} {tr('taskboard.cardCount')}
              </Badge>
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
  {/if}
</div>

<Dialog bind:open={createOpen} title={tr('taskboard.createTitle')} description={tr('taskboard.createDescription')} size="md">
  <div class="space-y-4">
    <FormField label={tr('taskboard.name')} required>
      {#snippet control(args)}
        <Input {...args} bind:value={boardName} placeholder={tr('taskboard.namePlaceholder')} />
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
