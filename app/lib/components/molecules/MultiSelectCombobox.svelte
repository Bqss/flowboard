<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '$lib/utils.js';
  import Portal from '$lib/components/atoms/Portal.svelte';
  import Avatar from '$lib/components/atoms/Avatar.svelte';
  import {
    computeFloatingRect,
    panelClass,
    panelItemClass,
    type FloatingRect
  } from './shared.js';
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

  type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
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
  const closePanelLabel = $derived(tr('setup.closePanel'));
  const searchLabel = $derived(tr('setup.searchMembers'));
  const selectAllLabel = $derived(tr('setup.selectAll'));
  const clearSelectedLabel = $derived(tr('setup.clearSelected'));

  let triggerEl = $state<HTMLDivElement | null>(null);
  let searchInputEl = $state<HTMLInputElement | null>(null);
  let open = $state(false);
  let search = $state('');
  let panelRect = $state<FloatingRect | null>(null);

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

  const allSelected = $derived(
    options.length > 0 && options.every((o) => values.includes(o.value))
  );

  const panelStyle = $derived(
    panelRect
      ? `top:${panelRect.top}px;left:${panelRect.left}px;width:${panelRect.width}px;max-height:${panelRect.maxHeight}px;`
      : ''
  );

  function updatePanelPosition() {
    if (!triggerEl || !open) return;
    panelRect = computeFloatingRect(triggerEl, 260);
  }

  function toggleOpen() {
    if (disabled) return;
    open = !open;
    if (open) {
      requestAnimationFrame(() => {
        updatePanelPosition();
        searchInputEl?.focus();
      });
    }
  }

  function close() {
    open = false;
    search = '';
  }

  function toggleOption(val: string) {
    if (disabled) return;
    const isSelected = values.includes(val);
    let next: string[];
    if (isSelected) {
      next = values.filter((x) => x !== val);
      if (primary === val) {
        primary = next[0] ?? null;
        onprimarychange?.(primary);
      }
    } else {
      next = [...values, val];
      if (!primary && showPrimaryBadge) {
        primary = val;
        onprimarychange?.(primary);
      }
    }
    values = next;
    onchange?.(next);
  }

  function removeOption(val: string, e?: MouseEvent) {
    e?.stopPropagation();
    if (disabled) return;
    const next = values.filter((x) => x !== val);
    if (primary === val) {
      primary = next[0] ?? null;
      onprimarychange?.(primary);
    }
    values = next;
    onchange?.(next);
  }

  function selectAll() {
    if (disabled) return;
    const all = options.filter((o) => !o.disabled).map((o) => o.value);
    values = all;
    if (!primary && all.length > 0) {
      primary = all[0];
      onprimarychange?.(primary);
    }
    onchange?.(all);
  }

  function clearAll(e?: MouseEvent) {
    e?.stopPropagation();
    if (disabled) return;
    values = [];
    primary = null;
    onprimarychange?.(null);
    onchange?.([]);
  }

  function setAsPrimary(val: string, e?: MouseEvent) {
    e?.stopPropagation();
    if (!values.includes(val)) {
      values = [...values, val];
      onchange?.(values);
    }
    primary = val;
    onprimarychange?.(val);
  }

  $effect(() => {
    if (!open) return;
    updatePanelPosition();
    const onReflow = () => updatePanelPosition();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  });
</script>

<div bind:this={ref} class={cn('relative w-full', className)} {...rest}>
  <!-- Combobox Trigger Area -->
  <div
    bind:this={triggerEl}
    {id}
    role="combobox"
    aria-expanded={open}
    aria-controls={`${id ?? 'multi-select'}-listbox`}
    aria-haspopup="listbox"
    tabindex={disabled ? -1 : 0}
    onclick={toggleOpen}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleOpen();
      } else if (e.key === 'Escape' && open) {
        close();
      }
    }}
    class={cn(
      'ds-body flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-xl border bg-card p-1.5 pr-2 text-ink transition-colors duration-150',
      disabled
        ? 'cursor-not-allowed bg-lane opacity-60'
        : 'hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
      invalid ? 'border-status-urgent' : 'border-hairline'
    )}
  >
    {#if selectedOptions.length > 0}
      <div class="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        {#each selectedOptions as option (option.value)}
          {@const isPrimary = primary === option.value}
          <span
            class={cn(
              'inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-1.5 text-xs font-semibold transition-colors',
              isPrimary
                ? 'border-primary/30 bg-primary-soft text-primary'
                : 'border-hairline bg-lane text-ink'
            )}
          >
            <Avatar name={option.label} src={option.avatarUrl} size={18} />
            <span class="max-w-[120px] truncate">{option.label}</span>

            {#if showPrimaryBadge}
              {#if isPrimary}
                <span class="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-on-primary">
                  {primaryLabel}
                </span>
              {:else}
                <button
                  type="button"
                  title={makePrimaryLabel}
                  onclick={(e) => setAsPrimary(option.value, e)}
                  class="text-[10px] text-mute hover:text-primary underline px-0.5 cursor-pointer"
                >
                  {setPrimaryLabel}
                </button>
              {/if}
            {/if}

            {#if !disabled}
              <button
                type="button"
                title={`${removeLabel} ${option.label}`}
                onclick={(e) => removeOption(option.value, e)}
                class="grid size-4 place-items-center rounded-full text-mute hover:bg-card hover:text-ink transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
              </button>
            {/if}
          </span>
        {/each}
      </div>
    {:else}
      <span class="flex-1 px-2 text-xs text-faint select-none">
        {resolvedPlaceholder}
      </span>
    {/if}

    <!-- Action icons on trigger right -->
    <div class="ml-auto flex items-center gap-1 text-mute shrink-0 pl-1">
      {#if values.length > 0 && !disabled}
        <button
          type="button"
          title={clearAllLabel}
          onclick={clearAll}
          class="grid size-6 place-items-center rounded-md hover:bg-lane hover:text-ink text-mute transition-colors cursor-pointer text-xs"
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

  <!-- Floating Multi-Select Dropdown Panel -->
  {#if open}
    <Portal>
      <!-- Backdrop dismiss layer -->
      <div
        data-floating
        class="fixed inset-0 z-[105]"
        onclick={close}
        role="button"
        tabindex="-1"
        aria-label={closePanelLabel}
        onkeydown={(e) => e.key === 'Escape' && close()}
      ></div>

      <div
        data-floating
        id={`${id ?? 'multi-select'}-listbox`}
        role="listbox"
        aria-multiselectable="true"
        data-theme="app"
        class={cn(
          'fixed z-[110] flex flex-col gap-2 overflow-hidden rounded-2xl border border-hairline bg-card p-2.5 shadow-popover'
        )}
        style={panelStyle}
      >
        <!-- Search and Quick Action Toolbar -->
        <div class="space-y-1.5 px-0.5 pt-0.5">
          <div class="relative flex items-center">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none">
              <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.8} />
            </span>
            <input
              bind:this={searchInputEl}
              type="text"
              placeholder={searchLabel}
              bind:value={search}
              onclick={(e) => e.stopPropagation()}
              onkeydown={(e) => {
                if (e.key === 'Escape') close();
              }}
              class="ds-body h-8.5 w-full rounded-xl border border-hairline bg-lane/80 pl-8.5 pr-3 text-xs text-ink placeholder:text-mute focus-visible:border-primary focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
            />
          </div>

          <!-- Quick actions: Pilih Semua / Batal Semua -->
          <div class="flex items-center justify-between px-1 text-[11px] text-mute font-medium">
            <span>
              {values.length} {tr('setup.of')} {options.length} {tr('setup.selected')}
            </span>
            <div class="flex items-center gap-2">
              {#if !allSelected}
                <button
                  type="button"
                  onclick={(e) => {
                    e.stopPropagation();
                    selectAll();
                  }}
                  class="text-primary hover:underline font-semibold cursor-pointer"
                >
                  {selectAllLabel}
                </button>
              {/if}
              {#if values.length > 0}
                <button
                  type="button"
                  onclick={(e) => {
                    e.stopPropagation();
                    clearAll(e);
                  }}
                  class="text-status-urgent-ink hover:underline font-medium cursor-pointer"
                >
                  {clearSelectedLabel}
                </button>
              {/if}
            </div>
          </div>
        </div>

        <!-- Options Scroll List -->
        <div class="max-h-56 overflow-y-auto space-y-1 pr-0.5 pt-0.5">
          {#each filteredOptions as option (option.value)}
            {@const isSelected = values.includes(option.value)}
            {@const isPrimary = primary === option.value}
            <div
              role="option"
              aria-selected={isSelected}
              tabindex="0"
              onclick={(e) => {
                e.stopPropagation();
                toggleOption(option.value);
              }}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleOption(option.value);
                }
              }}
              class={cn(
                'flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer',
                isSelected
                  ? 'bg-primary-soft text-primary font-semibold'
                  : 'hover:bg-lane text-ink'
              )}
            >
              <!-- Option Left: Checkbox + Avatar + Name/Email -->
              <div class="flex items-center gap-2.5 min-w-0">
                <!-- Custom Checkbox Box -->
                <div
                  class={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-hairline-strong bg-card'
                  )}
                >
                  {#if isSelected}
                    <HugeiconsIcon icon={Tick02Icon} size={11} strokeWidth={2.5} />
                  {/if}
                </div>

                <Avatar name={option.label} src={option.avatarUrl} size={22} />

                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-semibold leading-snug {isSelected ? 'text-primary' : 'text-ink'}">{option.label}</p>
                  {#if option.description}
                    <p class="truncate text-[11px] text-mute font-normal leading-tight">
                      {option.description}
                    </p>
                  {/if}
                </div>
              </div>

              <!-- Option Right: Primary badge or Set Primary action -->
              {#if showPrimaryBadge && isSelected}
                <button
                  type="button"
                  title={makePrimaryLabel}
                  onclick={(e) => setAsPrimary(option.value, e)}
                  class={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors shrink-0 cursor-pointer',
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
            <div class="py-6 text-center text-xs text-mute space-y-1">
              <HugeiconsIcon icon={UserGroupIcon} size={20} class="mx-auto text-faint" />
              <p>{resolvedEmptyText}</p>
            </div>
          {/each}
        </div>
      </div>
    </Portal>
  {/if}
</div>
