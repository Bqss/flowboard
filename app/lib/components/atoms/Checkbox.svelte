<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<Omit<HTMLInputAttributes, 'type' | 'size'>> & {
		size?: 'sm' | 'md';
	};

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		size = 'md',
		class: className,
		...rest
	}: Props = $props();

	const dim = $derived(size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]');
</script>

<span class="relative inline-flex items-center justify-center">
	<input
		bind:this={ref}
		type="checkbox"
		bind:checked
		bind:indeterminate
		class={cn(
			'peer appearance-none rounded-xs border border-hairline bg-card transition-colors duration-150 hover:border-primary-border checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane',
			dim,
			className
		)}
		{...rest}
	/>
	<svg
		class="pointer-events-none absolute text-on-primary opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-100"
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		stroke-width="2.2"
		stroke-linecap="round"
		stroke-linejoin="round"
		width={size === 'sm' ? 12 : 14}
		height={size === 'sm' ? 12 : 14}
		aria-hidden="true"
	>
		{#if indeterminate}
			<path d="M3.5 8h9" />
		{:else}
			<path d="M3.5 8.5l3 3 6-6.5" />
		{/if}
	</svg>
</span>
