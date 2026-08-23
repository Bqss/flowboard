<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { ListRow } from '$lib/components/molecules/index.js';
	import type { ListCardItem } from './shared.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title: string;
		items: ListCardItem[];
		emptyText?: string;
		class?: string;
		headerAction?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		title,
		items,
		emptyText = 'Belum ada item.',
		class: className,
		headerAction,
		...rest
	}: Props = $props();
</script>

<article bind:this={ref} class={cn(cardShellClass, 'p-6', className)} {...rest}>
	<div class="mb-4 flex items-center justify-between gap-3">
		<h3 class="ds-section-title text-ink">{title}</h3>
		{@render headerAction?.()}
	</div>

	<div class="space-y-1">
		{#if items.length === 0}
			<p class="ds-body py-6 text-center text-mute">{emptyText}</p>
		{:else}
			{#each items as item (item.id)}
				<ListRow
					title={item.title}
					subtitle={item.subtitle}
					delta={item.delta}
					badge={item.badge}
					badgeTone={item.badgeTone}
					icon={item.icon}
					onselect={item.onselect}
				/>
			{/each}
		{/if}
	</div>
</article>
