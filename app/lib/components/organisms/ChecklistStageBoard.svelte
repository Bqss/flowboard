<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Badge } from '$lib/components/atoms/index.js';
  import { collectDescendantGroupIds } from '$lib/checklist-group.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { CheckmarkCircle02Icon, Clock01Icon } from '@hugeicons/core-free-icons';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  type Stage = {
    stage: { id: string; name: string; color: string; position: number };
    status: 'current' | 'past' | 'upcoming';
    groups: Array<{
      id: string;
      parentId: string | null;
      name: string;
      requiresCompletion: boolean;
      position: number;
    }>;
    items: Array<{
      id: string;
      label: string;
      required: boolean;
      deadlineHours?: number | null;
      done: boolean;
      groupId: string | null;
      preview: boolean;
      editable: boolean;
    }>;
  };
  type Group = Stage['groups'][number];
  type Item = Stage['items'][number];

  type Props = {
    stages: Stage[];
    /** Whether the viewer may check items on this card (PIC or manager). */
    canComplete?: boolean;
    ontoggle?: (itemId: string, done: boolean) => void;
    class?: string;
  };

  let { stages, canComplete = false, ontoggle, class: className }: Props = $props();

  const stageDotClass: Record<string, string> = {
    indigo: 'bg-indigo-500',
    amber: 'bg-status-progress',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    sky: 'bg-kind-board',
    cyan: 'bg-cyan-500',
    violet: 'bg-violet-500',
    fuchsia: 'bg-fuchsia-500',
    teal: 'bg-teal-500'
  };

  // Same left accent colours as the taskboard KanbanBoard cards.
  const barColor = (item: Item) =>
    item.done ? '#22c55e' : item.required ? '#f59e0b' : '#4f46e5';

  const childGroups = (block: Stage, parentId: string | null): Group[] =>
    block.groups
      .filter((group) => (group.parentId ?? null) === parentId)
      .sort((a, b) => a.position - b.position);

  const countDone = (items: Item[]) => items.filter((item) => item.done).length;
</script>

{#snippet itemCard(item: Item)}
  {@const interactive = canComplete && item.editable && Boolean(ontoggle)}
  <div
    class={cn(
      'relative flex flex-col gap-2 rounded-xl border border-hairline bg-card p-3 pl-4 text-left shadow-card transition-all duration-150',
      item.preview && 'opacity-75'
    )}
  >
    <div class="absolute bottom-3 left-0 top-3 w-1 rounded-full" style="background-color: {barColor(item)};"></div>

    <div class="flex flex-wrap items-center gap-1.5">
      {#if item.required}
        <Badge tone="progress" variant="soft" class="inline-flex w-fit items-center gap-1 px-1.5 py-0.5 text-tiny font-semibold">
          <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} />
          <span>{tr('setup.required')}</span>
        </Badge>
      {/if}
      {#if item.deadlineHours}
        <Badge tone="warning" variant="soft" class="inline-flex w-fit items-center gap-1 px-1.5 py-0.5 text-tiny font-semibold">
          <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} />
          <span>{tr('setup.checklistDeadlineBadge', { hours: item.deadlineHours })}</span>
        </Badge>
      {/if}
    </div>

    <div class="flex items-start gap-2">
      <button
        type="button"
        disabled={!interactive}
        aria-pressed={item.done}
        aria-label={item.label}
        onclick={() => ontoggle?.(item.id, !item.done)}
        class={cn(
          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
          item.done ? 'border-status-done bg-status-done text-on-primary' : 'border-mute text-transparent',
          interactive ? 'cursor-pointer hover:border-primary hover:text-primary' : 'cursor-default opacity-60'
        )}
      >
        {#if item.done}<HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2} />{/if}
      </button>
      <div class="min-w-0 flex-1">
        <p class={cn('text-sm font-semibold leading-snug break-words', item.done ? 'text-mute line-through' : 'text-ink')}>
          {item.label}
        </p>
        {#if item.preview}
          <p class="text-badge text-mute">{tr('board.stageUpcoming')}</p>
        {/if}
      </div>
    </div>
  </div>
{/snippet}

{#snippet groupBox(block: Stage, group: Group)}
  {@const ids = collectDescendantGroupIds(block.groups, group.id)}
  {@const scoped = block.items.filter((item) => item.groupId !== null && ids.includes(item.groupId))}
  {@const direct = block.items.filter((item) => item.groupId === group.id)}
  <div class="space-y-2 rounded-xl border border-hairline bg-card p-2.5">
    <div class="flex items-center justify-between gap-2 px-0.5">
      <div class="flex min-w-0 items-center gap-1.5">
        <span class="truncate text-badge font-bold text-ink-soft">{group.name}</span>
      </div>
      <span class="shrink-0 text-tiny font-semibold text-mute">{countDone(scoped)}/{scoped.length}</span>
    </div>

    {#each childGroups(block, group.id) as child (child.id)}
      {@render groupBox(block, child)}
    {/each}
    {#each direct as item (item.id)}
      {@render itemCard(item)}
    {/each}
    {#if scoped.length === 0}
      <p class="px-1 text-tiny text-faint">{tr('setup.emptyGroup')}</p>
    {/if}
  </div>
{/snippet}

<div class={cn('flex h-full min-h-0 gap-3 overflow-x-auto p-4 sm:p-6', className)}>
  {#each stages as block (block.stage.id)}
    {@const rootItems = block.items.filter((item) => item.groupId === null)}
    {@const isCurrent = block.status === 'current'}
    <section
      aria-current={isCurrent ? 'step' : undefined}
      class={cn(
        'flex max-h-full w-72 shrink-0 flex-col rounded-xl p-3 transition-all',
        isCurrent ? 'bg-primary-soft/60 ring-2 ring-primary shadow-card-hover' : 'bg-lane',
        block.status === 'upcoming' && 'opacity-70'
      )}
    >
      <header class="mb-3 flex items-center justify-between gap-2 select-none">
        <div class="flex min-w-0 items-center gap-1.5">
          <span
            class={cn('size-2.5 shrink-0 rounded-full shadow-xs', stageDotClass[block.stage.color] ?? 'bg-slate-400')}
            aria-hidden="true"
          ></span>
          <h3 class={cn('truncate text-sm font-bold', isCurrent ? 'text-primary' : 'text-ink')}>{block.stage.name}</h3>
          {#if isCurrent}
            <Badge tone="queued" variant="soft" class="shrink-0 px-1.5 py-0.5 text-tiny font-bold">
              {tr('board.currentStage')}
            </Badge>
          {/if}
        </div>
        <span class="shrink-0 text-xs font-medium text-mute">{block.items.length} kad</span>
      </header>

      <div class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-3">
        {#each childGroups(block, null) as group (group.id)}
          {@render groupBox(block, group)}
        {/each}
        {#each rootItems as item (item.id)}
          {@render itemCard(item)}
        {/each}

        {#if block.items.length === 0}
          <div class="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-hairline p-6 text-center">
            <p class="text-xs font-medium text-mute">{tr('setup.noChecklist')}</p>
          </div>
        {/if}
      </div>
    </section>
  {/each}
</div>
