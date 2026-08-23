<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Badge } from '$lib/components/atoms/index.js';
	import { MetricDelta, SelectMenu, Sparkline } from '$lib/components/molecules/index.js';
	import type { Option } from '$lib/components/molecules/shared.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title: string;
		value: string;
		delta?: number;
		status?: string;
		statusTone?: 'positive' | 'negative' | 'warning' | 'info' | 'queued' | 'neutral';
		data: number[];
		period?: string;
		periodOptions?: Option[];
		onperiodchange?: (value: string) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		title,
		value,
		delta,
		status,
		statusTone = 'positive',
		data,
		period = 'monthly',
		periodOptions = [
			{ value: 'weekly', label: 'Mingguan' },
			{ value: 'monthly', label: 'Bulanan' },
			{ value: 'yearly', label: 'Tahunan' }
		],
		onperiodchange,
		class: className,
		...rest
	}: Props = $props();

	const path = $derived.by(() => {
		if (!data.length) return '';
		const w = 560;
		const h = 140;
		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;
		const pts = data.map((v, i) => {
			const x = (i / Math.max(data.length - 1, 1)) * w;
			const y = h - ((v - min) / range) * (h - 16) - 8;
			return `${x},${y}`;
		});
		return { line: `M ${pts.join(' L ')}`, area: `M ${pts.join(' L ')} L ${w},${h} L 0,${h} Z`, w, h };
	});
</script>

<article bind:this={ref} class={cn(cardShellClass, 'p-6', className)} {...rest}>
	<div class="mb-5 flex flex-wrap items-start justify-between gap-3">
		<div class="flex flex-wrap items-center gap-2">
			<h3 class="ds-section-title text-ink">{title}</h3>
			{#if status}
				<Badge tone={statusTone}>{status}</Badge>
			{/if}
		</div>
		<SelectMenu
			options={periodOptions}
			value={period}
			variant="button"
			size="sm"
			onchange={onperiodchange}
		/>
	</div>

	<div class="mb-4 flex flex-wrap items-end gap-3">
		<p class="ds-stat text-ink">{value}</p>
		{#if delta !== undefined}
			<MetricDelta value={delta} />
		{/if}
	</div>

	{#if path}
		<svg viewBox={`0 0 ${path.w} ${path.h}`} class="h-36 w-full" aria-hidden="true" preserveAspectRatio="none">
			<path d={path.area} fill="rgba(79, 70, 229, 0.08)" />
			<path
				d={path.line}
				fill="none"
				stroke="var(--color-primary, #4f46e5)"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	{:else}
		<Sparkline data={data} width={560} height={140} class="h-36 w-full" />
	{/if}
</article>
