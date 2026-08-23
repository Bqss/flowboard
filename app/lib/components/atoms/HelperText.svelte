<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		class?: string;
		children?: import('svelte').Snippet;
	};

	let { ref = $bindable(null), class: className, children, ...rest }: Props = $props();
</script>

<p
	bind:this={ref}
	class={cn('ds-caption mt-1.5 text-mute', className)}
	{...rest}
>
	{@render children?.()}
</p>
