<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	interface Props extends WithElementRef<HTMLAnchorAttributes> {
		external?: boolean;
		subtle?: boolean;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		external = false,
		subtle = false,
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<a
	bind:this={ref}
	class={cn(
		'underline-offset-4 transition-colors duration-150 ease-out',
		subtle
			? 'text-mute hover:text-ink hover:underline'
			: 'text-primary hover:text-primary hover:underline',
		className
	)}
	target={external ? '_blank' : undefined}
	rel={external ? 'noopener noreferrer' : undefined}
	{...rest}
>
	{@render children?.()}
</a>
