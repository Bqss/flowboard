<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
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
		if (item.disabled) return;
		item.onselect?.();
		open = false;
	}
</script>

<div
	bind:this={ref}
	class={cn('relative inline-flex', className)}
	use:dismissable={() => (open = false)}
	{...rest}
>
	{@render trigger({ open, toggle: () => (open = !open) })}

	{#if open}
		<div
			role="menu"
			aria-label={label}
			class={cn(
				panelClass,
				'absolute',
				side === 'bottom' ? 'top-[calc(100%+6px)]' : 'bottom-[calc(100%+6px)]',
				align === 'end' ? 'right-0' : 'left-0'
			)}
		>
			{#each items as item, i (item.label + i)}
				{#if item.separatorBefore && i > 0}
					<div class="my-1 h-px bg-hairline" role="separator"></div>
				{/if}
				<button
					type="button"
					role="menuitem"
					disabled={item.disabled}
					data-disabled={item.disabled ?? false}
					onclick={() => run(item)}
					class={cn(
						panelItemClass,
						'justify-between whitespace-nowrap',
						item.destructive && 'text-status-urgent hover:bg-status-urgent-soft'
					)}
				>
					<span class="inline-flex items-center gap-2.5">
						{#if item.icon}
							<span class="grid size-4 shrink-0 place-items-center text-current [&_svg]:size-4">
								{@render item.icon()}
							</span>
						{/if}
						{item.label}
					</span>
					{#if item.shortcut}
						<span class="ds-caption ds-mono pl-6 text-faint">{item.shortcut}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
