<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import MinusIcon from '@lucide/svelte/icons/minus';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		value: number;
		/** When false, positive deltas render as negative tone (costs, churn). */
		invert?: boolean;
		showIcon?: boolean;
		/** Override auto tone from sign. */
		tone?: 'positive' | 'negative' | 'neutral';
		class?: string;
	};

	let {
		ref = $bindable(null),
		value,
		invert = false,
		showIcon = true,
		tone,
		class: className,
		...rest
	}: Props = $props();

	const resolved = $derived.by(() => {
		if (tone) return tone;
		if (value === 0) return 'neutral' as const;
		const up = value > 0;
		const good = invert ? !up : up;
		return good ? ('positive' as const) : ('negative' as const);
	});

	const label = $derived(
		`${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(2)}%`
	);

	const toneClass = {
		positive: 'bg-status-done-soft text-status-done-ink',
		negative: 'bg-status-urgent-soft text-status-urgent',
		neutral: 'bg-lane text-mute'
	} as const;
</script>

<span
	bind:this={ref}
	class={cn(
		'ds-caption inline-flex w-fit shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5',
		toneClass[resolved],
		className
	)}
	{...rest}
>
	{#if showIcon}
		{#if value > 0}
			<ArrowUpIcon class="size-3" />
		{:else if value < 0}
			<ArrowDownIcon class="size-3" />
		{:else}
			<MinusIcon class="size-3" />
		{/if}
	{/if}
	{label}
</span>
