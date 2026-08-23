<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Button } from '$lib/components/atoms/index.js';
	import type { FeatureItem } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		eyebrow?: string;
		title: string;
		description?: string;
		primaryLabel?: string;
		secondaryLabel?: string;
		onprimary?: () => void;
		onsecondary?: () => void;
		class?: string;
		visual?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		eyebrow,
		title,
		description,
		primaryLabel = 'Mulai sekarang',
		secondaryLabel,
		onprimary,
		onsecondary,
		class: className,
		visual,
		...rest
	}: Props = $props();
</script>

<section
	bind:this={ref}
	class={cn('grid items-center gap-10 lg:grid-cols-2 lg:gap-16', className)}
	{...rest}
>
	<div>
		{#if eyebrow}
			<p class="ds-caption mb-3 text-primary">{eyebrow}</p>
		{/if}
		<h1 class="text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
		{#if description}
			<p class="ds-body mt-4 max-w-xl text-mute">{description}</p>
		{/if}
		<div class="mt-8 flex flex-wrap gap-3">
			<Button variant="primary" onclick={onprimary}>{primaryLabel}</Button>
			{#if secondaryLabel}
				<Button variant="secondary" onclick={onsecondary}>{secondaryLabel}</Button>
			{/if}
		</div>
	</div>

	{#if visual}
		<div class="rounded-xl bg-card p-6 shadow-[var(--shadow-card)]">{@render visual()}</div>
	{/if}
</section>
