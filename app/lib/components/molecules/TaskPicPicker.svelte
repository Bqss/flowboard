<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import { Popover as PopoverPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
  import { cn, type WithElementRef } from '$lib/utils.js';
  import { Avatar, Button } from '$lib/components/atoms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    ArrowDown01Icon,
    Search01Icon,
    Tick02Icon,
    UserAdd01Icon
  } from '@hugeicons/core-free-icons';
  import { panelClass } from './shared.js';

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

  let search = $state('');

  const filteredOptions = $derived.by(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  });

  function toggleOption(value: string) {
    values = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
    onchange?.(values);
  }

  // Bits toggles from the trigger wrapper; the caller's `toggle` is a no-op so a click doesn't flip it twice.
  const noopToggle = () => {};
</script>

<div bind:this={ref} class={cn('relative inline-flex', className)} {...(rest as Record<string, unknown>)}>
  <PopoverPrimitive.Root
    bind:open
    onOpenChange={(next) => {
      if (!next) search = '';
    }}
  >
    <PopoverPrimitive.Trigger>
      {#snippet child({ props })}
        {#if customTrigger}
          <span {...props} class="relative inline-flex">
            {@render customTrigger({ open, toggle: noopToggle })}
          </span>
        {:else}
          <Button
            {...props}
            variant="secondary"
            size="sm"
            {disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <HugeiconsIcon icon={UserAdd01Icon} size={16} strokeWidth={1.8} />
            {placeholder}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={14}
              strokeWidth={1.8}
              class={cn('transition-transform', open && 'rotate-180')}
            />
          </Button>
        {/if}
      {/snippet}
    </PopoverPrimitive.Trigger>

    <Portal>
      <PopoverPrimitive.Content
        side="bottom"
        align="start"
        sideOffset={6}
        aria-label="PIC tersedia"
        class={cn(panelClass, 'z-[410] flex w-[max(280px,var(--bits-popover-anchor-width,0px))] flex-col gap-2 overflow-hidden p-2.5')}
      >
        <div class="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            strokeWidth={1.8}
            class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-mute"
          />
          <input
            bind:value={search}
            type="text"
            placeholder="Cari PIC…"
            aria-label="Cari PIC"
            class="ds-body h-9 w-full rounded-xl border border-hairline bg-lane/70 pr-3 pl-8 text-sm text-ink placeholder:text-mute focus-visible:border-primary focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        <div role="listbox" aria-multiselectable="true" aria-label="PIC" class="max-h-56 space-y-1 overflow-y-auto">
          {#each filteredOptions as option (option.value)}
            {@const selected = values.includes(option.value)}
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onclick={() => toggleOption(option.value)}
              class={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors',
                selected ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-lane'
              )}
            >
              <Avatar name={option.label} src={option.avatarUrl} size={24} />
              <span class="min-w-0 flex-1 truncate font-semibold">{option.label}</span>
              {#if selected}
                <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} class="text-primary" />
              {/if}
            </button>
          {:else}
            <p class="px-2.5 py-4 text-center text-sm text-mute">{emptyText}</p>
          {/each}
        </div>
      </PopoverPrimitive.Content>
    </Portal>
  </PopoverPrimitive.Root>
</div>
