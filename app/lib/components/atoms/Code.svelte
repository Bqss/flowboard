<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends WithElementRef<HTMLAttributes<HTMLElement>> {
		block?: boolean;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		block = false,
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<code
	bind:this={ref}
	class={cn(
		'ds-mono rounded-md bg-lane px-1.5 py-0.5 text-[13px] text-ink',
		block && 'block w-full overflow-x-auto p-3',
		className
	)}
	{...rest}
>
	{@render children?.()}
</code>
