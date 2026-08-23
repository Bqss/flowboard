<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import type { FAQItem } from './shared.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title?: string;
		items: FAQItem[];
		class?: string;
	};

	let {
		ref = $bindable(null),
		title = 'Pertanyaan umum',
		items,
		class: className,
		...rest
	}: Props = $props();

	let openIndex = $state<number | null>(0);
</script>

<section bind:this={ref} class={cn('space-y-5', className)} {...rest}>
	<h2 class="ds-page-title text-ink">{title}</h2>

	<div class={cn(cardShellClass, 'divide-y divide-hairline overflow-hidden')}>
		{#each items as item, i (item.question)}
			<div>
				<button
					type="button"
					onclick={() => (openIndex = openIndex === i ? null : i)}
					class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-primary-soft/30"
					aria-expanded={openIndex === i}
				>
					<span class="ds-body font-semibold text-ink">{item.question}</span>
					<ChevronDownIcon class={cn('size-4 shrink-0 text-mute transition-transform', openIndex === i && 'rotate-180')} />
				</button>
				{#if openIndex === i}
					<div class="px-5 pb-4">
						<p class="ds-body text-mute">{item.answer}</p>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>
