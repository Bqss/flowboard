<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends WithElementRef<HTMLAttributes<HTMLElement>> {
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { ref = $bindable(null), class: className, children, ...rest }: Props = $props();
</script>

<kbd
	bind:this={ref}
	class={cn(
		'ds-mono inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-hairline bg-card px-1.5 text-[11px] font-medium text-mute shadow-[var(--shadow-card)]',
		className
	)}
	{...rest}
>
	{@render children?.()}
</kbd>
