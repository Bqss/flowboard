<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends WithElementRef<HTMLAttributes<HTMLElement>> {
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { ref = $bindable(null), class: className, children, ...rest }: Props = $props();
</script>

<span bind:this={ref} class={cn('ds-caption text-mute', className)} {...rest}>
	{@render children?.()}
</span>