<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { ContextMenu as MenuPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { panelClass, panelItemClass, type MenuItem } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		items: MenuItem[];
		label?: string;
		disabled?: boolean;
		children: import('svelte').Snippet;
		class?: string;
	};

	let {
		items,
		label = 'Menu konteks',
		disabled = false,
		children,
		class: className
	}: Props = $props();

	function selectItem(item: MenuItem) {
		if (item.disabled) return;
		item.onselect?.();
	}
</script>

<MenuPrimitive.Root>
	<MenuPrimitive.Trigger disabled={disabled} class={cn('contents', className)}>
		{@render children()}
	</MenuPrimitive.Trigger>

	<Portal>
		<MenuPrimitive.Content aria-label={label} class={cn(panelClass, 'z-[400]')}>
			{#each items as item, i (item.label + i)}
				{#if item.separatorBefore && i > 0}
					<MenuPrimitive.Separator class="my-1 h-px bg-hairline" />
				{/if}
				<MenuPrimitive.Item
					disabled={item.disabled}
					onSelect={() => selectItem(item)}
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
				</MenuPrimitive.Item>
			{/each}
		</MenuPrimitive.Content>
	</Portal>
</MenuPrimitive.Root>
