<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		value?: number;
		max?: number;
		size?: 'sm' | 'md';
		tone?: 'queued' | 'positive' | 'negative' | 'warning';
		class?: string;
	};

	let {
		ref = $bindable(null),
		value = 0,
		max = 100,
		size = 'md',
		tone = 'queued',
		class: className,
		...rest
	}: Props = $props();

	const pct = $derived(Math.max(0, Math.min(100, (Number(value) / max) * 100)));
	const tones = {
		queued: 'bg-primary',
		positive: 'bg-status-done',
		negative: 'bg-status-urgent',
		warning: 'bg-status-progress'
	} as const;
</script>

<div
	bind:this={ref}
	class={cn('w-full overflow-hidden rounded-full bg-primary-soft', size === 'sm' ? 'h-1' : 'h-1.5', className)}
	role="progressbar"
	aria-valuenow={value}
	aria-valuemax={max}
	{...rest}
>
	<div
		class={cn('h-full rounded-full transition-[width] duration-300 ease-out', tones[tone])}
		style={`width:${pct}%`}
	></div>
</div>