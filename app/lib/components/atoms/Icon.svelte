<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLSpanElement>> & {
		size?: number;
		stroke?: number;
		class?: string;
		children?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		size = 20,
		stroke = 1.5,
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<span
	bind:this={ref}
	class={cn('inline-flex items-center justify-center text-current', className)}
	style={`width:${size}px;height:${size}px;`}
	{...rest}
>
	{@render children?.()}
</span>