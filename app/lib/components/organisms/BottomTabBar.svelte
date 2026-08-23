<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { NavItem } from '$lib/components/molecules/index.js';
	import type { NavLink } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		items: NavLink[];
		class?: string;
	};

	let {
		ref = $bindable(null),
		items,
		class: className,
		...rest
	}: Props = $props();
</script>

<nav
	bind:this={ref}
	class={cn(
		'fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-hairline bg-rail px-2 py-2 md:hidden',
		className
	)}
	aria-label="Navigasi mobile"
	{...rest}
>
	{#each items.slice(0, 5) as item (item.label)}
		<NavItem
			label={item.label}
			href={item.href}
			active={item.active}
			badge={item.badge}
			disabled={item.disabled}
			onselect={item.onselect}
			variant="rail"
			icon={item.icon}
		/>
	{/each}
</nav>
