<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Avatar } from '$lib/components/atoms/index.js';
	import { cardShellClass } from './shared.js';

	type Stat = { label: string; value: string };

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		name: string;
		email?: string;
		src?: string;
		stats?: Stat[];
		class?: string;
	};

	let {
		ref = $bindable(null),
		name,
		email,
		src,
		stats = [],
		class: className,
		...rest
	}: Props = $props();
</script>

<article bind:this={ref} class={cn(cardShellClass, 'p-6 text-center', className)} {...rest}>
	<Avatar {name} {src} size={64} class="mx-auto" />
	<h3 class="ds-section-title mt-4 text-ink">{name}</h3>
	{#if email}
		<p class="ds-body mt-1 text-mute">{email}</p>
	{/if}

	{#if stats.length}
		<div class="mt-6 flex justify-center gap-8">
			{#each stats as stat (stat.label)}
				<div>
					<p class="ds-stat-sm text-ink">{stat.value}</p>
					<p class="ds-caption mt-1 text-mute">{stat.label}</p>
				</div>
			{/each}
		</div>
	{/if}
</article>
