<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		orientation?: 'horizontal' | 'vertical';
		class?: string;
	};

	let {
		ref = $bindable(null),
		orientation = 'horizontal',
		class: className,
		...rest
	}: Props = $props();
</script>

<div
	bind:this={ref}
	class={cn(
		'bg-hairline',
		orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
		className
	)}
	role="separator"
	aria-orientation={orientation}
	{...rest}
></div>