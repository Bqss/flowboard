<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		columns?: 1 | 2 | 3 | 4;
		gap?: 'sm' | 'md';
		class?: string;
		children?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		columns = 4,
		gap = 'md',
		class: className,
		children,
		...rest
	}: Props = $props();

	const colMap = {
		1: 'grid-cols-1',
		2: 'grid-cols-1 sm:grid-cols-2',
		3: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
		4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
	} as const;
</script>

<div
	bind:this={ref}
	class={cn('grid', colMap[columns], gap === 'sm' ? 'gap-3' : 'gap-4', className)}
	{...rest}
>
	{@render children?.()}
</div>
