<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { Popover as PopoverPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
  import { cn, type WithElementRef } from '$lib/utils.js';
  import Avatar from '$lib/components/atoms/Avatar.svelte';
  import { panelClass } from './shared.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Search01Icon,
    Tick02Icon,
    ArrowDown01Icon,
    Cancel01Icon,
    UserGroupIcon
  } from '@hugeicons/core-free-icons';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';

  export type MultiSelectOption = {
    value: string;
    label: string;
    description?: string;
    avatarUrl?: string;
    role?: string;
    disabled?: boolean;
  };

  type Props = WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'onchange'>> & {
    options: MultiSelectOption[];
    values?: string[];
    primary?: string | null;
    placeholder?: string;
    emptyText?: string;
    id?: string;
    disabled?: boolean;
    invalid?: boolean;
    showPrimaryBadge?: boolean;
    onchange?: (values: string[]) => void;
    onprimarychange?: (primary: string | null) => void;
    class?: string;
  };

  let {
    ref = $bindable(null),
    options,
    values = $bindable([]),
    primary = $bindable(null),
    placeholder,
    emptyText,
    id,
    disabled = false,
    invalid = false,
    showPrimaryBadge = false,
    onchange,
    onprimarychange,
    class: className,
    ...rest
  }: Props = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);
  const resolvedPlaceholder = $derived(placeholder ?? tr('setup.assigneesPlaceholder'));
  const resolvedEmptyText = $derived(emptyText ?? tr('setup.noMembers'));
  const primaryLabel = $derived(tr('setup.primary'));
  const makePrimaryLabel = $derived(tr('setup.makePrimary'));
  const setPrimaryLabel = $derived(tr('setup.setPrimary'));
  const removeLabel = $derived(tr('setup.removeSelection'));
  const clearAllLabel = $derived(tr('setup.clearAll'));
  const searchLabel = $derived(tr('setup.searchMembers'));
  const selectAllLabel = $derived(tr('setup.selectAll'));
  const clearSelectedLabel = $derived(tr('setup.clearSelected'));

  let open = $state(false);
  let search = $state('');
  let triggerWidth = $state(0);
  let triggerEl = $state<HTMLElement | null>(null);

  const selectedOptions = $derived(
    values.map((val) => options.find((o) => o.value === val)).filter(Boolean) as MultiSelectOption[]
  );

  const filteredOptions = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.description && o.description.toLowerCase().includes(q)) ||
        (o.role && o.role.toLowerCase().includes(q))
    );
  });

  const allSelected = $derived(options.length > 0 && options.every((o) => values.includes(o.value)));

  function commit(next: string[]) {
    values = next;
    onchange?.(next);
  }

  function toggleOption(val: string) {
    if (disabled) return;
    if (values.includes(val)) {
      const next = values.filter((x) => x !== val);
      if (primary === val) {
        primary = next[0] ?? null;
        onprimarychange?.(primary);
      }
      commit(next);
    } else {
      if (!primary && showPrimaryBadge) {
        primary = val;
        onprimarychange?.(primary);
      }
      commit([...values, val]);
    }
  }

  function removeOption(val: string) {
    if (disabled) return;
    const next = values.filter((x) => x !== val);
    if (primary === val) {
      primary = next[0] ?? null;
      onprimarychange?.(primary);
    }
    commit(next);
  }

  function selectAll() {
    if (disabled) return;
    const all = options.filter((o) => !o.disabled).map((o) => o.value);
    if (!primary && all.length > 0) {
      primary = all[0];
      onprimarychange?.(primary);
    }
    commit(all);
  }

  function clearAll() {
    if (disabled) return;
    primary = null;
    onprimarychange?.(null);
    commit([]);
  }

  function setAsPrimary(val: string) {
    if (disabled) return;
    if (!values.includes(val)) commit([...values, val]);
    primary = val;
    onprimarychange?.(val);
  }

  // Keep the panel the same width as the trigger, like the original floating panel.
  $effect(() => {
    if (open && triggerEl) triggerWidth = triggerEl.getBoundingClientRect().width;
  });
</script>

<div bind:this={ref} class={cn('relative w-full', className)} {...rest}>
  <PopoverPrimitive.Root bind:open onOpenChange={(next) => { if (!next) search = ''; }}>
    <PopoverPrimitive.Trigger>
      {#snippet child({ props })}
        <div
          {...props}
          bind:this={triggerEl}
          {id}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={invalid || undefined}
          aria-disabled={disabled || undefined}
          tabindex={disabled ? -1 : 0}
          class={cn(
            'text-sm flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-ink transition-colors duration-150 hover:border-primary-border',
            disabled
              ? 'cursor-not-allowed bg-lane opacity-60'
              : 'hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
            invalid ? 'border-status-urgent' : 'border-hairline'
          )}
        >
          {#if selectedOptions.length > 0}
            <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {#each selectedOptions as option (option.value)}
                {@const isPrimary = primary === option.value}
                <span
                  class={cn(
                    'inline-flex h-6 items-center gap-1.5 rounded-sm border pr-1.5 pl-1 text-badge font-semibold transition-colors',
                    isPrimary ? 'border-primary/30 bg-primary-soft text-primary' : 'border-hairline bg-lane text-ink'
                  )}
                >
                  <Avatar name={option.label} src={option.avatarUrl} size={18} />
                  <span class="max-w-[120px] truncate">{option.label}</span>

                  {#if showPrimaryBadge}
                    {#if isPrimary}
                      <span class="rounded-full bg-primary px-1.5 py-0.5 text-tiny font-bold text-on-primary">
                        {primaryLabel}
                      </span>
                    {:else}
                      <button
                        type="button"
                        title={makePrimaryLabel}
                        onclick={(e) => { e.stopPropagation(); setAsPrimary(option.value); }}
                        class="cursor-pointer px-0.5 text-tiny text-mute underline hover:text-primary"
                      >
                        {setPrimaryLabel}
                      </button>
                    {/if}
                  {/if}

                  {#if !disabled}
                    <button
                      type="button"
                      title={`${removeLabel} ${option.label}`}
                      aria-label={`${removeLabel} ${option.label}`}
                      onclick={(e) => { e.stopPropagation(); removeOption(option.value); }}
                      class="grid size-4 cursor-pointer place-items-center rounded-full text-mute transition-colors hover:bg-card hover:text-ink"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
                    </button>
                  {/if}
                </span>
              {/each}
            </div>
          {:else}
            <span class="flex-1 px-2 text-sm text-mute select-none">{resolvedPlaceholder}</span>
          {/if}

          <div class="ml-auto flex shrink-0 items-center gap-1 pl-1 text-mute">
            {#if values.length > 0 && !disabled}
              <button
                type="button"
                title={clearAllLabel}
                aria-label={clearAllLabel}
                onclick={(e) => { e.stopPropagation(); clearAll(); }}
                class="grid size-6 cursor-pointer place-items-center rounded-md text-mute transition-colors hover:bg-lane hover:text-ink"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2} />
              </button>
            {/if}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={15}
              strokeWidth={1.8}
              class={cn('transition-transform duration-150', open && 'rotate-180')}
            />
          </div>
        </div>
      {/snippet}
    </PopoverPrimitive.Trigger>

    <Portal>
      <PopoverPrimitive.Content
        side="bottom"
        align="start"
        sideOffset={6}
        avoidCollisions
        class={cn(panelClass, 'z-[410] flex flex-col gap-2 overflow-hidden rounded-lg border border-hairline bg-card p-2.5 shadow-popover')}
        style={`width:${Math.max(triggerWidth, 260)}px`}
      >
        <div class="space-y-1.5 px-0.5 pt-0.5">
          <div class="relative flex items-center">
            <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mute">
              <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.8} />
            </span>
            <input
              type="text"
              placeholder={searchLabel}
              aria-label={searchLabel}
              bind:value={search}
              class="text-sm h-9 w-full rounded-md border border-hairline bg-card pl-8 pr-3 text-ink placeholder:text-faint transition-colors hover:border-primary-border focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            />
          </div>

          <div class="flex items-center justify-between gap-2 border-t border-hairline px-1 pt-2 text-badge">
            <span class="text-mute">{values.length} {tr('setup.of')} {options.length} {tr('setup.selected')}</span>
            <div class="flex items-center gap-1">
              {#if !allSelected}
                <button
                  type="button"
                  onclick={selectAll}
                  class="rounded-sm px-2 py-1 font-semibold text-primary transition-colors hover:bg-primary-soft cursor-pointer"
                >
                  {selectAllLabel}
                </button>
              {/if}
              {#if values.length > 0}
                <button
                  type="button"
                  onclick={clearAll}
                  class="rounded-sm px-2 py-1 font-semibold text-status-urgent-ink transition-colors hover:bg-status-urgent-soft cursor-pointer"
                >
                  {clearSelectedLabel}
                </button>
              {/if}
            </div>
          </div>
        </div>

        <div role="listbox" aria-multiselectable="true" class="max-h-56 space-y-1 overflow-y-auto pr-0.5 pt-0.5">
          {#each filteredOptions as option (option.value)}
            {@const isSelected = values.includes(option.value)}
            {@const isPrimary = primary === option.value}
            <div
              role="option"
              aria-selected={isSelected}
              tabindex="0"
              onclick={() => toggleOption(option.value)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleOption(option.value);
                }
              }}
              class={cn(
                'flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors',
                isSelected ? 'bg-primary-soft font-semibold text-primary' : 'text-ink hover:bg-lane'
              )}
            >
              <div class="flex min-w-0 items-center gap-2.5">
                <div
                  class={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                    isSelected ? 'border-primary bg-primary text-on-primary' : 'border-hairline-strong bg-card'
                  )}
                >
                  {#if isSelected}
                    <HugeiconsIcon icon={Tick02Icon} size={11} strokeWidth={2.5} />
                  {/if}
                </div>

                <Avatar name={option.label} src={option.avatarUrl} size={22} />

                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm leading-snug font-semibold">{option.label}</p>
                  {#if option.description}
                    <p class="truncate text-badge leading-tight font-normal text-mute">{option.description}</p>
                  {/if}
                </div>
              </div>

              {#if showPrimaryBadge && isSelected}
                <button
                  type="button"
                  title={makePrimaryLabel}
                  onclick={(e) => { e.stopPropagation(); setAsPrimary(option.value); }}
                  class={cn(
                    'shrink-0 cursor-pointer rounded-full px-2 py-0.5 text-tiny font-bold transition-colors',
                    isPrimary
                      ? 'bg-primary text-on-primary'
                      : 'border border-hairline bg-card text-mute hover:border-primary/40 hover:bg-primary-soft hover:text-primary'
                  )}
                >
                  {isPrimary ? primaryLabel : setPrimaryLabel}
                </button>
              {/if}
            </div>
          {:else}
            <div class="space-y-1 py-6 text-center text-micro text-mute">
              <HugeiconsIcon icon={UserGroupIcon} size={20} class="mx-auto text-faint" />
              <p>{resolvedEmptyText}</p>
            </div>
          {/each}
        </div>
      </PopoverPrimitive.Content>
    </Portal>
  </PopoverPrimitive.Root>
</div>
