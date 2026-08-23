<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import type { Testimonial } from './shared.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		items: Testimonial[];
		class?: string;
	};

	let {
		ref = $bindable(null),
		items,
		class: className,
		...rest
	}: Props = $props();

	let index = $state(0);
	const current = $derived(items[index] ?? items[0]);

	function prev() {
		index = (index - 1 + items.length) % items.length;
	}

	function next() {
		index = (index + 1) % items.length;
	}
</script>

<section bind:this={ref} class={cn('space-y-4', className)} {...rest}>
	<article class={cn(cardShellClass, 'relative px-8 py-10 text-center')}>
		<p class="ds-body mx-auto max-w-2xl text-[17px] leading-relaxed text-ink">“{current?.quote}”</p>
		<p class="ds-section-title mt-6 text-ink">{current?.author}</p>
		{#if current?.role}
			<p class="ds-caption text-mute">{current.role}</p>
		{/if}
	</article>

	{#if items.length > 1}
		<div class="flex items-center justify-center gap-3">
			<button type="button" onclick={prev} aria-label="Sebelumnya" class="grid size-9 place-items-center rounded-full border border-hairline bg-card hover:bg-lane">
				<ChevronLeftIcon class="size-4" />
			</button>
			<div class="flex gap-1.5">
				{#each items as _, i (i)}
					<button
						type="button"
						aria-label={`Slide ${i + 1}`}
						onclick={() => (index = i)}
						class={cn('size-2 rounded-full transition-colors', i === index ? 'bg-primary' : 'bg-hairline')}
					></button>
				{/each}
			</div>
			<button type="button" onclick={next} aria-label="Berikutnya" class="grid size-9 place-items-center rounded-full border border-hairline bg-card hover:bg-lane">
				<ChevronRightIcon class="size-4" />
			</button>
		</div>
	{/if}
</section>
