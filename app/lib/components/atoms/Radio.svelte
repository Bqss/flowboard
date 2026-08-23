<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<Omit<HTMLInputAttributes, 'type' | 'size'>> & {
		value: string | number;
		group?: any;
		size?: 'sm' | 'md';
	};

	let {
		ref = $bindable(null),
		value,
		group = $bindable(),
		size = 'md',
		class: className,
		name,
		...rest
	}: Props = $props();

	const dim = $derived(size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]');
</script>

<span class="relative inline-flex items-center justify-center">
	<input
		bind:this={ref}
		type="radio"
		{name}
		bind:group
		{value}
		class={cn(
			'peer appearance-none rounded-full border border-hairline bg-card transition-colors duration-150 hover:border-primary-border checked:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane',
			dim,
			className
		)}
		{...rest}
	/>
	<span
		class="pointer-events-none absolute inset-0 m-auto h-2 w-2 scale-0 rounded-full bg-primary transition-transform duration-150 peer-checked:scale-100"
		aria-hidden="true"
	></span>
</span>