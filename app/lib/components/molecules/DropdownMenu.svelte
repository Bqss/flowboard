<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Avatar } from '$lib/components/atoms/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowRight01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
	import { dismissable, panelClass, panelItemClass, type MenuItem } from './shared.js';
	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		items: MenuItem[];
		open?: boolean;
		align?: 'start' | 'end';
		side?: 'bottom' | 'top';
		label?: string;
		trigger: import('svelte').Snippet<[{ open: boolean; toggle: () => void }]>;
		class?: string;
	};

	let {
		ref = $bindable(null),
		items,
		open = $bindable(false),
		align = 'end',
		side = 'bottom',
		label = 'Menu',
		trigger,
		class: className,
		...rest
	}: Props = $props();

	function run(item: MenuItem) {
		if (item.submenu) {
			activeSubmenu = activeSubmenu === item.label ? null : item.label;
			return;
		}
		if (item.disabled) return;
		item.onselect?.();
		open = false;
		activeSubmenu = null;
	}

  function handleFocusout(event: FocusEvent) {
    const nextTarget = event.relatedTarget as Node | null;
    const root = event.currentTarget as HTMLElement;
    if (!nextTarget || !root.contains(nextTarget)) open = false;
  }

  let activeSubmenu = $state<string | null>(null);
	$effect(() => {
		if (!open) activeSubmenu = null;
	});
</script>
{#snippet menuItemContent(item: MenuItem)}
	<span class="flex min-w-0 items-center gap-2.5">
		{#if item.avatar}
			<Avatar name={item.avatar.name} src={item.avatar.src ?? undefined} size={24} class="ring-0" />
		{:else if item.icon}
			<span class="grid size-4 shrink-0 place-items-center text-current [&_svg]:size-4">
				{@render item.icon()}
			</span>
		{/if}
		<span class="min-w-0">
			<span class="block truncate">{item.label}</span>
			{#if item.description}
				<span class="mt-0.5 block truncate text-xs font-normal text-mute">{item.description}</span>
			{/if}
		</span>
	</span>
{/snippet}

<div
  bind:this={ref}
  class={cn('relative inline-flex', className)}
  use:dismissable={() => (open = false)}
  onfocusout={handleFocusout}
  {...rest}
>
	{@render trigger({ open, toggle: () => (open = !open) })}

	{#if open}
		<div
			role="menu"
			aria-label={label}
			class={cn(
				panelClass,
				'absolute overflow-visible',
				side === 'bottom' ? 'top-[calc(100%+6px)]' : 'bottom-[calc(100%+6px)]',
				align === 'end' ? 'right-0' : 'left-0'
			)}
		>
			{#each items as item, i (item.label + i)}
				{#if item.separatorBefore && i > 0}
					<div class="my-1 h-px bg-hairline" role="separator"></div>
				{/if}
				{#if item.submenu}
					<div
						role="presentation"
						class="group/submenu relative"
						onmouseenter={() => {
							if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
								activeSubmenu = item.label;
							}
						}}
						onmouseleave={() => {
							if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
								activeSubmenu = null;
							}
						}}
					>
						<button
							type="button"
							role="menuitem"
							aria-haspopup="menu"
							aria-expanded={activeSubmenu === item.label}
							onclick={(e) => {
								e.stopPropagation();
								activeSubmenu = activeSubmenu === item.label ? null : item.label;
							}}
							class={cn(panelItemClass, 'justify-between whitespace-nowrap')}
						>
							{@render menuItemContent(item)}
							<HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.8} class="shrink-0 text-mute transition-transform duration-150 {activeSubmenu === item.label ? 'rotate-90 sm:rotate-0' : ''}" />
						</button>
						{#if activeSubmenu === item.label}
							<div
								aria-label={item.label}
								class={cn(
									panelClass,
									'z-[60] min-w-[15rem]',
									'my-1 rounded-xl border border-hairline/80 bg-canvas-sunken/60 p-1 sm:my-0 sm:bg-card sm:border-hairline sm:shadow-popover sm:absolute sm:top-0',
									align === 'end'
										? 'sm:right-[calc(100%+6px)]'
										: 'sm:left-[calc(100%+6px)]'
								)}
							>
								{#each item.submenu as submenuItem, submenuIndex (submenuItem.label + submenuIndex)}
									{#if submenuItem.separatorBefore && submenuIndex > 0}
										<div class="my-1 h-px bg-hairline" role="separator"></div>
									{/if}
									<button
										type="button"
										role="menuitem"
										disabled={submenuItem.disabled}
										data-disabled={submenuItem.disabled ?? false}
										onclick={() => run(submenuItem)}
										class={cn(
											panelItemClass,
											'justify-between whitespace-nowrap',
											submenuItem.active && 'bg-primary-soft',
											submenuItem.destructive && 'text-status-urgent hover:bg-status-urgent-soft',
											submenuItem.active && submenuItem.disabled && 'text-ink'
										)}
									>
										{@render menuItemContent(submenuItem)}
										{#if submenuItem.shortcut}
											<span class="ds-caption ds-mono pl-6 text-faint">{submenuItem.shortcut}</span>
										{/if}
										{#if submenuItem.active}
											<HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={2} class="shrink-0 text-primary" />
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<button
						type="button"
						role="menuitem"
						disabled={item.disabled}
						data-disabled={item.disabled ?? false}
						onclick={() => run(item)}
						class={cn(
							panelItemClass,
							'justify-between whitespace-nowrap',
							item.active && 'bg-primary-soft',
							item.destructive && 'text-status-urgent hover:bg-status-urgent-soft',
							item.active && item.disabled && 'text-ink'
						)}
					>
						{@render menuItemContent(item)}
						{#if item.shortcut}
							<span class="ds-caption ds-mono pl-6 text-faint">{item.shortcut}</span>
						{/if}
						{#if item.active}
							<HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={2} class="shrink-0 text-primary" />
						{/if}
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</div>
