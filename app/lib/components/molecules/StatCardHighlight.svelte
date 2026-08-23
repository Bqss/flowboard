<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import Sparkline from './Sparkline.svelte';
	import MetricDelta from './MetricDelta.svelte';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		label: string;
		value: string;
		delta?: number;
		sparkline?: number[];
		class?: string;
	};

	let {
		ref = $bindable(null),
		label,
		value,
		delta,
		sparkline,
		class: className,
		...rest
	}: Props = $props();
</script>

<article
	bind:this={ref}
	class={cn(
		'flex flex-col gap-3 rounded-xl bg-primary p-5 text-on-primary shadow-[var(--shadow-card)]',
		className
	)}
	{...rest}
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="ds-label text-on-primary/80">{label}</p>
			<p class="ds-stat mt-1 text-on-primary">{value}</p>
			{#if delta !== undefined}
				<div class="mt-2">
					<MetricDelta
						value={delta}
						class="!bg-white/15 !text-on-primary"
						showIcon={false}
					/>
				</div>
			{/if}
		</div>

		{#if sparkline?.length}
			<Sparkline data={sparkline} inverse class="mt-1 opacity-90" />
		{/if}
	</div>
</article>
