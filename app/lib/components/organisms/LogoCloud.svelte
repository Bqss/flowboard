<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Logo = { name: string; src?: string; href?: string };

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title?: string;
		logos: Logo[];
		class?: string;
	};

	let {
		ref = $bindable(null),
		title = 'Dipercaya tim operasional',
		logos,
		class: className,
		...rest
	}: Props = $props();
</script>

<section bind:this={ref} class={cn('space-y-5 text-center', className)} {...rest}>
	<p class="ds-label text-mute">{title}</p>
	<div class="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
		{#each logos as logo (logo.name)}
			{#if logo.href}
				<a href={logo.href} class="opacity-70 transition-opacity hover:opacity-100">
					{#if logo.src}
						<img src={logo.src} alt={logo.name} class="h-8 w-auto object-contain" />
					{:else}
						<span class="ds-section-title text-mute">{logo.name}</span>
					{/if}
				</a>
			{:else if logo.src}
				<img src={logo.src} alt={logo.name} class="h-8 w-auto object-contain opacity-70" />
			{:else}
				<span class="ds-section-title text-mute">{logo.name}</span>
			{/if}
		{/each}
	</div>
</section>
