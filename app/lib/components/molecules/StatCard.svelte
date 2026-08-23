<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import Sparkline from './Sparkline.svelte';
	import MetricDelta from './MetricDelta.svelte';
	import IconChip from './IconChip.svelte';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		label: string;
		value: string;
		delta?: number;
		/** Costs/churn metrics where down is good. */
		invertDelta?: boolean;
		sparkline?: number[];
		class?: string;
		icon?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		label,
		value,
		delta,
		invertDelta = false,
		sparkline,
		class: className,
		icon,
		...rest
	}: Props = $props();
</script>

<article
	bind:this={ref}
	class={cn(
		'flex flex-col rounded-xl border border-hairline bg-card p-5 shadow-[var(--shadow-card)]',
		className
	)}
	{...rest}
>
	{#if sparkline?.length}
		<div class="flex items-start justify-between gap-3">
			<div class="flex min-w-0 items-start gap-3">
				{#if icon}
					<IconChip>{@render icon()}</IconChip>
				{/if}
				<div class="min-w-0">
					<p class="ds-label text-mute">{label}</p>
					<p class="ds-stat mt-1 text-ink">{value}</p>
					{#if delta !== undefined}
						<div class="mt-2">
							<MetricDelta value={delta} invert={invertDelta} />
						</div>
					{/if}
				</div>
			</div>

			<Sparkline data={sparkline} class="mt-1 opacity-90" />
		</div>
	{:else}
		<div class="flex min-w-0 items-start gap-3">
			{#if icon}
				<IconChip>{@render icon()}</IconChip>
			{/if}
			<div class="min-w-0 flex-1">
				<p class="ds-label text-mute">{label}</p>
				<p class="ds-stat mt-1 break-words text-ink">{value}</p>
				{#if delta !== undefined}
					<div class="mt-2">
						<MetricDelta value={delta} invert={invertDelta} />
					</div>
				{/if}
			</div>
		</div>
	{/if}
</article>
