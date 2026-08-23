<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { dismissable, panelClass, panelItemClass, type MenuItem } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		items: MenuItem[];
		label?: string;
		disabled?: boolean;
		children: import('svelte').Snippet;
		class?: string;
	};

	let {
		ref = $bindable(null),
		items,
		label = 'Menu konteks',
		disabled = false,
		children,
		class: className,
		...rest
	}: Props = $props();

	let open = $state(false);
	let x = $state(0);
	let y = $state(0);
	let panel = $state<HTMLElement | null>(null);

	function oncontextmenu(event: MouseEvent) {
		if (disabled) return;
		event.preventDefault();
		x = event.clientX;
		y = event.clientY;
		open = true;
	}

	function run(item: MenuItem) {
		if (item.disabled) return;
		item.onselect?.();
		open = false;
	}

	/** Keeps the panel inside the viewport once its size is known. */
	$effect(() => {
		if (!open || !panel) return;
		const rect = panel.getBoundingClientRect();
		if (x + rect.width > window.innerWidth - 8) x = Math.max(8, window.innerWidth - rect.width - 8);
		if (y + rect.height > window.innerHeight - 8)
			y = Math.max(8, window.innerHeight - rect.height - 8);
	});
</script>

<div
	bind:this={ref}
	{oncontextmenu}
	class={cn('contents', className)}
	role="presentation"
	{...rest}
>
	{@render children()}
</div>

{#if open}
	<div
		bind:this={panel}
		role="menu"
		aria-label={label}
		use:dismissable={() => (open = false)}
		class={cn(panelClass, 'fixed')}
		style={`left:${x}px;top:${y}px;`}
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
						<span class="grid size-4 shrink-0 place-items-center [&_svg]:size-4">
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
