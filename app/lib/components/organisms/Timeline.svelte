<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { StatusDot } from '$lib/components/atoms/index.js';
	import type { TimelineItem } from './shared.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title?: string;
		items: TimelineItem[];
		class?: string;
	};

	let {
		ref = $bindable(null),
		title = 'Timeline',
		items,
		class: className,
		...rest
	}: Props = $props();
</script>

<article bind:this={ref} class={cn(cardShellClass, 'p-6', className)} {...rest}>
	<h3 class="ds-section-title mb-5 text-ink">{title}</h3>

	<ol class="space-y-5">
		{#each items as item, i (item.id)}
			<li class="relative flex gap-3 pl-1">
				{#if i < items.length - 1}
					<span class="absolute top-5 left-[7px] h-[calc(100%+8px)] w-px bg-hairline" aria-hidden="true"></span>
				{/if}
				<StatusDot tone={item.tone ?? 'neutral'} class="mt-1 shrink-0" />
				<div class="min-w-0 pb-1">
					<p class="ds-body font-semibold text-ink">{item.title}</p>
					{#if item.description}
						<p class="ds-body mt-0.5 text-mute">{item.description}</p>
					{/if}
					{#if item.time}
						<p class="ds-caption mt-1 text-faint">{item.time}</p>
					{/if}
				</div>
			</li>
		{/each}
	</ol>
</article>
