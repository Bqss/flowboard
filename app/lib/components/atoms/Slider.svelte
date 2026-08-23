<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<Omit<HTMLInputAttributes, 'type' | 'size'>> & {
		size?: 'sm' | 'md';
	};

	let {
		ref = $bindable(null),
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		size = 'md',
		class: className,
		...rest
	}: Props = $props();

	const trackH = $derived(size === 'sm' ? 'h-1.5' : 'h-2');
	const minN = $derived(Number(min));
	const maxN = $derived(Number(max));
	const pct = $derived(maxN > minN ? ((Number(value) - minN) / (maxN - minN)) * 100 : 0);
</script>

<input
	bind:this={ref}
	type="range"
	bind:value
	{min}
	{max}
	{step}
	class={cn(
		'block w-full cursor-pointer appearance-none rounded-full focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
		trackH,
		'[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow-[var(--shadow-card)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110',
		'[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0',
		className
	)}
	style={`background: linear-gradient(to right, var(--color-primary) ${pct}%, var(--color-primary-soft) ${pct}%);`}
	{...rest}
/>