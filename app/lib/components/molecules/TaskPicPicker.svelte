<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { tick, type Snippet } from 'svelte';
  import { cn, type WithElementRef } from '$lib/utils.js';
  import { Avatar, Button } from '$lib/components/atoms/index.js';
  import Portal from '$lib/components/atoms/Portal.svelte';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    ArrowDown01Icon,
    Search01Icon,
    Tick02Icon,
    UserAdd01Icon
  } from '@hugeicons/core-free-icons';
  import { computeFloatingRect, panelClass, type FloatingRect } from './shared.js';

  export type TaskPicOption = {
    value: string;
    label: string;
    avatarUrl?: string;
  };

  type Props = WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'onchange'>> & {
    options: TaskPicOption[];
    values?: string[];
    open?: boolean;
    placeholder?: string;
    emptyText?: string;
    disabled?: boolean;
    onchange?: (values: string[]) => void;
    class?: string;
    trigger?: Snippet<[{ open: boolean; toggle: () => void }]>;
  };

  let {
    ref = $bindable(null),
    options,
    values = $bindable([]),
    open = $bindable(false),
    placeholder = 'PIC',
    emptyText = 'PIC tidak ditemukan.',
    disabled = false,
    onchange,
    class: className,
    trigger: customTrigger,
    ...rest
  }: Props = $props();

  let triggerEl = $state<HTMLDivElement | null>(null);
  let searchInputEl = $state<HTMLInputElement | null>(null);
  let search = $state('');
  let panelRect = $state<FloatingRect | null>(null);

  const filteredOptions = $derived.by(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  });

  const panelStyle = $derived(
    panelRect
      ? `top:${panelRect.top}px;left:${panelRect.left}px;width:${Math.max(panelRect.width, 280)}px;max-height:${panelRect.maxHeight}px;`
      : ''
  );

  function updatePanelPosition() {
    if (!triggerEl || !open) return;
    panelRect = computeFloatingRect(triggerEl, 300);
  }

  async function toggleOpen() {
    if (disabled) return;
    open = !open;
    if (!open) return;
    await tick();
    updatePanelPosition();
    searchInputEl?.focus();
  }

  function close() {
    open = false;
  }

  function toggleOption(value: string) {
    values = values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
    onchange?.(values);
  }

  function handleTriggerBlur(event: FocusEvent) {
    const nextTarget = event.relatedTarget as Element | null;
    if (!nextTarget?.closest?.('[data-floating]')) close();
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

<div bind:this={ref} class={cn('relative inline-flex', className)} {...rest}>
  <div bind:this={triggerEl} onfocusout={handleTriggerBlur}>
    {#if customTrigger}
      {@render customTrigger({ open, toggle: toggleOpen })}
    {:else}
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled}
        onclick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <HugeiconsIcon icon={UserAdd01Icon} size={16} strokeWidth={1.8} />
        {placeholder}
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={1.8} class={cn('transition-transform', open && 'rotate-180')} />
      </Button>
    {/if}
  </div>

  {#if open}
    <Portal>
      <div
        data-floating
        class="fixed inset-0 z-[405]"
        onclick={close}
        role="button"
        tabindex="-1"
        aria-label="Tutup pilihan PIC"
        onkeydown={(event) => event.key === 'Escape' && close()}
      ></div>
      <div
        data-floating
        role="listbox"
        aria-label="PIC tersedia"
        aria-multiselectable="true"
        data-theme="app"
        class={cn(panelClass, 'fixed z-[410] flex flex-col gap-2 overflow-hidden p-2.5')}
        style={panelStyle}
      >
        <div class="relative">
          <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.8} class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            bind:this={searchInputEl}
            bind:value={search}
            type="text"
            placeholder="Cari PIC…"
            class="ds-body h-9 w-full rounded-xl border border-hairline bg-lane/70 pl-8 pr-3 text-sm text-ink placeholder:text-mute focus-visible:border-primary focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            onclick={(event) => event.stopPropagation()}
            onkeydown={(event) => event.key === 'Escape' && close()}
          />
        </div>
        <div class="max-h-56 space-y-1 overflow-y-auto">
          {#each filteredOptions as option (option.value)}
            {@const selected = values.includes(option.value)}
            <button
              type="button"
              role="option"
              aria-selected={selected}
              class={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors', selected ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-lane')}
              onclick={(event) => {
                event.stopPropagation();
                toggleOption(option.value);
              }}
            >
              <Avatar name={option.label} src={option.avatarUrl} size={24} />
              <span class="min-w-0 flex-1 truncate font-semibold">{option.label}</span>
              {#if selected}<HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} class="text-primary" />{/if}
            </button>
          {:else}
            <p class="px-2.5 py-4 text-center text-sm text-mute">{emptyText}</p>
          {/each}
        </div>
      </div>
    </Portal>
  {/if}
</div>
