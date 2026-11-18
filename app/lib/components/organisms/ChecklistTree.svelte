<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { api, ApiError, type ApiChecklistGroup } from '$lib/api/client';
  import { Badge, Button, Checkbox, IconButton, Input, ProgressBar, Switch } from '$lib/components/atoms/index.js';
  import { FormField, toast } from '$lib/components/molecules/index.js';
  import { Dialog, ConfirmDialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { Add01Icon, Delete02Icon, Edit02Icon, Tick02Icon } from '@hugeicons/core-free-icons';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  type TreeItem = {
    id: string;
    label: string;
    required: boolean;
    done: boolean;
    groupId?: string | null;
  };

  type Props = {
    workspaceId: string;
    workflowId: string;
    stageId: string;
    cardId: string;
    /** Card-level group rows (from card detail). */
    groups: ApiChecklistGroup[];
    items: TreeItem[];
    /** Structure edits (groups, add/delete items) are manager-only. */
    canManage?: boolean;
    /** Checking items. */
    canToggle?: boolean;
    ontoggle?: (item: TreeItem) => void;
    onchange?: () => void | Promise<void>;
    class?: string;
  };

  let {
    workspaceId,
    workflowId,
    stageId,
    cardId,
    groups,
    items,
    canManage = false,
    canToggle = false,
    ontoggle,
    onchange,
    class: className
  }: Props = $props();

  const MAX_DEPTH = 3;

  const childGroupsOf = (parentId: string | null) =>
    groups
      .filter((group) => (group.parentId ?? null) === parentId)
      .sort((a, b) => a.position - b.position);

  const itemsOf = (groupId: string | null) =>
    items.filter((item) => (item.groupId ?? null) === groupId);

  /** Every item inside a group, including sub-groups. */
  const subtreeItems = (groupId: string): TreeItem[] => {
    const ids = new Set<string>([groupId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const group of groups) {
        if (group.parentId && ids.has(group.parentId) && !ids.has(group.id)) {
          ids.add(group.id);
          grew = true;
        }
      }
    }
    return items.filter((item) => item.groupId && ids.has(item.groupId));
  };

  const depthOf = (groupId: string): number => {
    let depth = 0;
    let current: string | null = groupId;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      const group = groups.find((row) => row.id === current);
      if (!group) break;
      depth += 1;
      current = group.parentId ?? null;
    }
    return depth;
  };

  const groupById = (id: string | null) => (id ? groups.find((group) => group.id === id) : undefined);

  /* ----------------------------------------------------------- dialogs */

  let itemDialogOpen = $state(false);
  let itemDialogGroupId = $state<string | null>(null);
  let itemDialogLabel = $state('');
  let itemDialogRequired = $state(false);
  let savingItem = $state(false);

  let groupDialogOpen = $state(false);
  let groupDialogMode = $state<'create' | 'rename'>('create');
  let groupDialogParentId = $state<string | null>(null);
  let groupDialogTarget = $state<ApiChecklistGroup | null>(null);
  let groupDialogName = $state('');
  let groupDialogGate = $state(false);
  let savingGroup = $state(false);

  let groupToDelete = $state<ApiChecklistGroup | null>(null);
  let deletingGroup = $state(false);

  let itemToDelete = $state<TreeItem | null>(null);
  let deletingItem = $state(false);

  function openAddItem(groupId: string | null) {
    itemDialogGroupId = groupId;
    itemDialogLabel = '';
    itemDialogRequired = false;
    itemDialogOpen = true;
  }

  function openCreateGroup(parentId: string | null) {
    groupDialogMode = 'create';
    groupDialogParentId = parentId;
    groupDialogTarget = null;
    groupDialogName = '';
    groupDialogGate = false;
    groupDialogOpen = true;
  }

  function openRenameGroup(group: ApiChecklistGroup) {
    groupDialogMode = 'rename';
    groupDialogParentId = group.parentId ?? null;
    groupDialogTarget = group;
    groupDialogName = group.name;
    groupDialogGate = group.requiresCompletion;
    groupDialogOpen = true;
  }

  async function saveItem() {
    const label = itemDialogLabel.trim();
    if (!label || !canManage) return;

    savingItem = true;
    try {
      await api.addCardChecklistItem(workspaceId, workflowId, cardId, {
        label,
        required: itemDialogRequired,
        groupId: itemDialogGroupId
      });
      itemDialogOpen = false;
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.itemSaveFailed'));
    } finally {
      savingItem = false;
    }
  }

  async function saveGroup() {
    const name = groupDialogName.trim();
    if (!name || !canManage) return;

    savingGroup = true;
    try {
      if (groupDialogMode === 'create') {
        // Group structure lives on the stage template, so resolve the parent's template id.
        const parent = groupById(groupDialogParentId);
        if (groupDialogParentId && !parent?.templateGroupId) {
          throw new Error('Parent group not linked to the stage template.');
        }
        await api.createChecklistGroup(workspaceId, workflowId, stageId, {
          name,
          parentId: parent?.templateGroupId ?? null,
          requiresCompletion: groupDialogGate
        });
      } else if (groupDialogTarget?.templateGroupId) {
        await api.updateChecklistGroup(workspaceId, workflowId, stageId, groupDialogTarget.templateGroupId, {
          name,
          requiresCompletion: groupDialogGate
        });
      } else {
        throw new Error('Group not linked to the stage template.');
      }
      groupDialogOpen = false;
      toast.success(tr('setup.groupSaved'));
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.groupSaveFailed'));
    } finally {
      savingGroup = false;
    }
  }

  async function deleteGroupConfirmed(mode: 'with_items' | 'move_up') {
    const target = groupToDelete;
    if (!target?.templateGroupId || !canManage) return;

    deletingGroup = true;
    try {
      await api.deleteChecklistGroup(workspaceId, workflowId, stageId, target.templateGroupId, mode);
      groupToDelete = null;
      toast.success(tr('setup.groupDeleted'));
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.groupDeleteFailed'));
    } finally {
      deletingGroup = false;
    }
  }

  async function deleteItemConfirmed() {
    const target = itemToDelete;
    if (!target || !canManage) return;

    deletingItem = true;
    try {
      await api.deleteCardChecklistItem(workspaceId, workflowId, cardId, target.id);
      itemToDelete = null;
      toast.success(tr('setup.itemDeleted'));
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.itemDeleteFailed'));
    } finally {
      deletingItem = false;
    }
  }
</script>

{#snippet itemRow(item: TreeItem)}
  <div
    class={cn(
      'flex items-center justify-between gap-3 rounded-md border p-2.5 transition-colors',
      item.done ? 'border-status-done/25 bg-status-done-soft/40' : 'border-hairline bg-card hover:bg-lane/60'
    )}
  >
    <label class="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-3">
      <Checkbox
        checked={item.done}
        onCheckedChange={() => ontoggle?.(item)}
        disabled={!canToggle}
      />
      <span class={cn('truncate text-sm font-medium transition-colors', item.done ? 'text-mute line-through' : 'text-ink')}>
        {item.label}
      </span>
    </label>
    <div class="flex shrink-0 items-center gap-1">
      {#if item.required}
        <Badge tone="progress" variant="soft" class="px-1.5 py-0.5 text-tiny font-semibold">
          {tr('setup.required')}
        </Badge>
      {/if}
      {#if canManage}
        <IconButton
          label={tr('setup.deleteItem')}
          variant="ghost"
          size="sm"
          onclick={() => (itemToDelete = item)}
          class="h-6 w-6 rounded-md text-mute hover:text-status-urgent-ink hover:bg-status-urgent-soft"
        >
          <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
        </IconButton>
      {/if}
    </div>
  </div>
{/snippet}

{#snippet groupNode(group: ApiChecklistGroup, depth: number)}
  {@const scoped = subtreeItems(group.id)}
  {@const doneCount = scoped.filter((item) => item.done).length}
  {@const pct = scoped.length > 0 ? Math.round((doneCount / scoped.length) * 100) : 0}
  <div class="space-y-2 rounded-lg border border-hairline bg-lane/40 p-2.5">
    <div class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <span class="truncate text-sm font-bold text-ink">{group.name}</span>
        {#if group.requiresCompletion}
          <Badge tone="progress" variant="soft" class="shrink-0 px-1.5 py-0.5 text-tiny font-semibold">
            {tr('setup.gateBadge')}
          </Badge>
        {/if}
        <span class="shrink-0 text-badge font-semibold text-mute">{doneCount}/{scoped.length}</span>
      </div>
      <div class="flex shrink-0 items-center gap-0.5">
        {#if canManage}
          <IconButton
            label={tr('setup.renameGroupTitle')}
            variant="ghost"
            size="sm"
            onclick={() => openRenameGroup(group)}
            class="h-6 w-6 rounded-md text-mute hover:text-ink hover:bg-lane"
          >
            <HugeiconsIcon icon={Edit02Icon} size={13} strokeWidth={1.8} />
          </IconButton>
          <IconButton
            label={tr('setup.deleteGroup')}
            variant="ghost"
            size="sm"
            onclick={() => (groupToDelete = group)}
            class="h-6 w-6 rounded-md text-mute hover:text-status-urgent-ink hover:bg-status-urgent-soft"
          >
            <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
          </IconButton>
        {/if}
      </div>
    </div>

    <ProgressBar value={pct} max={100} class="h-1.5 rounded-full" />

    <div class="space-y-2 border-l-2 border-hairline pl-2">
      {#each childGroupsOf(group.id) as child (child.id)}
        {@render groupNode(child, depth + 1)}
      {/each}
      {#each itemsOf(group.id) as item (item.id)}
        {@render itemRow(item)}
      {/each}
      {#if childGroupsOf(group.id).length === 0 && itemsOf(group.id).length === 0}
        <p class="px-1 text-badge text-faint">{tr('setup.emptyGroup')}</p>
      {/if}
    </div>

    {#if canManage}
      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          onclick={() => openAddItem(group.id)}
          class="inline-flex cursor-pointer items-center gap-1 rounded-md border border-hairline bg-card px-2 py-1 text-badge font-bold text-ink-soft hover:border-primary hover:text-primary"
        >
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2.2} />
          <span>{tr('setup.addChecklistItem')}</span>
        </button>
        {#if depth < MAX_DEPTH}
          <button
            type="button"
            onclick={() => openCreateGroup(group.id)}
            class="inline-flex cursor-pointer items-center gap-1 rounded-md border border-hairline bg-card px-2 py-1 text-badge font-bold text-ink-soft hover:border-primary hover:text-primary"
          >
            <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2.2} />
            <span>{tr('setup.addSubgroup')}</span>
          </button>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

<div class={cn('space-y-2', className)}>
  {#each childGroupsOf(null) as group (group.id)}
    {@render groupNode(group, 1)}
  {/each}
  {#each itemsOf(null) as item (item.id)}
    {@render itemRow(item)}
  {/each}

  {#if groups.length === 0 && items.length === 0}
    <div class="rounded-md border border-dashed border-hairline p-4 text-center text-badge text-mute">
      {tr('setup.noChecklist')}
    </div>
  {/if}

  {#if canManage}
    <div class="flex flex-wrap gap-2 pt-1">
      <button
        type="button"
        onclick={() => openAddItem(null)}
        class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-hairline bg-card px-2.5 py-1.5 text-meta font-bold text-ink-soft hover:border-primary hover:text-primary"
      >
        <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2.2} />
        <span>{tr('setup.addChecklistItem')}</span>
      </button>
      <button
        type="button"
        onclick={() => openCreateGroup(null)}
        class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-hairline bg-card px-2.5 py-1.5 text-meta font-bold text-ink-soft hover:border-primary hover:text-primary"
      >
        <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2.2} />
        <span>{tr('setup.addGroup')}</span>
      </button>
    </div>
  {/if}
</div>

<!-- Add checklist item to a group (or root) on this card; writes to the stage template too -->
<Dialog
  bind:open={itemDialogOpen}
  title={tr('setup.newChecklistTitle')}
  description={tr('setup.newChecklistDescription')}
  size="sm"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      saveItem();
    }}
    class="space-y-4 py-2"
  >
    <FormField label={tr('setup.checklistLabel')} required>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={itemDialogLabel}
          placeholder={tr('setup.checklistLabelExample')}
          class="h-10 text-base"
          autofocus
          required
        />
      {/snippet}
    </FormField>
    <div class="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-canvas-sunken p-3">
      <span class="text-meta font-bold text-ink">{tr('setup.requiredComplete')}</span>
      <Checkbox bind:checked={itemDialogRequired} />
    </div>
  </form>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (itemDialogOpen = false)}>{tr('setup.cancel')}</Button>
      <Button variant="primary" onclick={saveItem} loading={savingItem} disabled={!itemDialogLabel.trim()}>
        <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={1.8} />
        <span>{tr('setup.createChecklistItem')}</span>
      </Button>
    </div>
  {/snippet}
</Dialog>

<!-- Create / rename group -->
<Dialog
  bind:open={groupDialogOpen}
  title={groupDialogMode === 'create' ? tr('setup.newGroupTitle') : tr('setup.renameGroupTitle')}
  description={tr('setup.groupMaxDepth')}
  size="sm"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      saveGroup();
    }}
    class="space-y-4 py-2"
  >
    <FormField label={tr('setup.groupNameLabel')} required>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={groupDialogName}
          placeholder={tr('setup.groupNameLabel')}
          class="h-10 text-base"
          autofocus
          required
        />
      {/snippet}
    </FormField>
    <div class="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-canvas-sunken p-3">
      <span class="text-meta font-bold text-ink">{tr('setup.groupRequiresCompletion')}</span>
      <Switch bind:checked={groupDialogGate} />
    </div>
  </form>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (groupDialogOpen = false)}>{tr('setup.cancel')}</Button>
      <Button variant="primary" onclick={saveGroup} loading={savingGroup} disabled={!groupDialogName.trim()}>
        <span>{groupDialogMode === 'create' ? tr('setup.createGroup') : tr('setup.saveGroup')}</span>
      </Button>
    </div>
  {/snippet}
</Dialog>

<!-- Delete group: choose what happens to its contents -->
<Dialog
  open={groupToDelete !== null}
  onclose={() => (groupToDelete = null)}
  title={tr('setup.deleteGroupTitle', { label: groupToDelete?.name ?? '' })}
  description={tr('setup.deleteGroupDescription')}
  size="sm"
>
  <p class="py-2 text-meta text-mute">{tr('setup.deleteGroupNote')}</p>
  {#snippet footer()}
    <div class="flex flex-wrap justify-end gap-2">
      <Button variant="secondary" onclick={() => (groupToDelete = null)}>{tr('setup.cancel')}</Button>
      <Button variant="secondary" loading={deletingGroup} onclick={() => deleteGroupConfirmed('move_up')}>
        {tr('setup.deleteGroupMoveUp')}
      </Button>
      <Button variant="destructive" loading={deletingGroup} onclick={() => deleteGroupConfirmed('with_items')}>
        {tr('setup.deleteGroupWithItems')}
      </Button>
    </div>
  {/snippet}
</Dialog>

<ConfirmDialog
  open={itemToDelete !== null}
  title={tr('setup.deleteChecklistTitle', { label: itemToDelete?.label ?? '' })}
  description={tr('setup.deleteChecklistDescription')}
  confirmLabel={tr('setup.deleteChecklistConfirm')}
  destructive
  loading={deletingItem}
  onconfirm={deleteItemConfirmed}
  oncancel={() => (itemToDelete = null)}
/>
