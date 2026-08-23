<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		size?: number;
		class?: string;
	};

	let { ref = $bindable(null), size = 32, class: className, ...rest }: Props = $props();
</script>

<span
	bind:this={ref}
	class={cn(
		'inline-flex items-center justify-center rounded-lg bg-primary text-on-primary font-extrabold',
		className
	)}
	style={`width:${size}px;height:${size}px;font-size:${Math.max(14, size * 0.44)}px;`}
	aria-label="Flowboard"
	{...rest}
>
	F
</span>
