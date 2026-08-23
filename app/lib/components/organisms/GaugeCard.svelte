<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title: string;
		value: number;
		max?: number;
		label?: string;
		/** Primary value shown in the gauge center (defaults to rounded %). */
		centerValue?: string;
		size?: 'md' | 'lg';
		class?: string;
	};

	let {
		ref = $bindable(null),
		title,
		value,
		max = 100,
		label,
		centerValue,
		size = 'md',
		class: className,
		...rest
	}: Props = $props();

	const pct = $derived(Math.max(0, Math.min(100, (value / max) * 100)));
	const r = 42;
	const c = 2 * Math.PI * r;
	const dash = $derived((pct / 100) * c);

	const gaugeSizeClass = $derived(size === 'lg' ? 'size-44 sm:size-48' : 'size-32');
	const centerClass = $derived(size === 'lg' ? 'ds-stat text-ink' : 'ds-stat-sm text-ink');
</script>

<article
	bind:this={ref}
	class={cn(
		cardShellClass,
		'flex flex-col',
		size === 'lg' ? 'min-h-[280px] p-8' : 'items-center p-6 text-center',
		className
	)}
	{...rest}
>
	<h3 class="ds-section-title mb-4 w-full text-left text-ink">{title}</h3>

	<div class={cn('flex flex-1 flex-col items-center justify-center', size === 'lg' ? 'py-2' : '')}>
		<div class={cn('relative grid place-items-center', gaugeSizeClass)}>
			<svg viewBox="0 0 100 100" class="size-full -rotate-90" aria-hidden="true">
				<circle cx="50" cy="50" {r} fill="none" stroke="var(--color-primary-soft)" stroke-width="8" />
				<circle
					cx="50"
					cy="50"
					{r}
					fill="none"
					stroke="var(--color-primary)"
					stroke-width="8"
					stroke-linecap="round"
					stroke-dasharray="{dash} {c}"
				/>
			</svg>
			<div class="absolute inset-0 grid place-items-center">
				<span class={cn(centerClass, 'tabular-nums')}>
					{centerValue ?? `${Math.round(pct)}%`}
				</span>
			</div>
		</div>

		{#if label}
			<p class={cn('ds-label text-mute', size === 'lg' ? 'mt-5 text-center' : 'mt-4')}>{label}</p>
		{/if}
	</div>
</article>
