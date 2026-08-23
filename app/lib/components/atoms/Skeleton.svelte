<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		shape?: 'circle' | 'rect' | 'text';
		class?: string;
	};

	let {
		ref = $bindable(null),
		shape = 'rect',
		class: className,
		style,
		...rest
	}: Props = $props();

	const shapeMap = {
		circle: 'rounded-full',
		rect: 'rounded-md',
		text: 'rounded-sm h-3 w-full'
	} as const;
</script>

<div
	bind:this={ref}
	class={cn(
		'bg-lane animate-pulse',
		shapeMap[shape],
		shape !== 'text' && 'h-4 w-24',
		className
	)}
	{style}
	{...rest}
></div>