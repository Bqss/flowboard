<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	type Level = 1 | 2 | 3 | 4 | 5 | 6;

	interface Props extends WithElementRef<HTMLAttributes<HTMLElement>> {
		level?: Level;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		level = 1,
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: Props = $props();

	const tag = $derived(`h${level}` as const);

	const sizeMap: Record<Level, string> = {
		1: 'ds-page-title',
		2: 'text-[26px] font-semibold leading-tight tracking-tight text-ink',
		3: 'ds-stat text-ink',
		4: 'ds-section-title text-ink',
		5: 'text-sm font-semibold leading-tight tracking-tight text-ink',
		6: 'ds-label text-ink'
	};
</script>

<svelte:element
	this={tag}
	bind:this={ref}
	class={cn(sizeMap[level], className)}
	{...rest}
>
	{@render children?.()}
</svelte:element>
