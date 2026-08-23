<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { IconChip } from '$lib/components/molecules/index.js';
	import type { FeatureItem } from './shared.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title?: string;
		description?: string;
		items: FeatureItem[];
		columns?: 2 | 3;
		class?: string;
	};

	let {
		ref = $bindable(null),
		title = 'Fitur utama',
		description,
		items,
		columns = 3,
		class: className,
		...rest
	}: Props = $props();
</script>

<section bind:this={ref} class={cn('space-y-8', className)} {...rest}>
	<div class="max-w-2xl">
		<h2 class="ds-page-title text-ink">{title}</h2>
		{#if description}
			<p class="ds-body mt-2 text-mute">{description}</p>
		{/if}
	</div>

	<div class={cn('grid gap-4', columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3')}>
		{#each items as item (item.title)}
			<article class={cn(cardShellClass, 'p-5')}>
				{#if item.icon}
					<IconChip class="mb-4">{@render item.icon()}</IconChip>
				{/if}
				<h3 class="ds-section-title text-ink">{item.title}</h3>
				<p class="ds-body mt-2 text-mute">{item.description}</p>
			</article>
		{/each}
	</div>
</section>
