<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLLabelAttributes } from 'svelte/elements';

	interface Props extends WithElementRef<HTMLLabelAttributes> {
		required?: boolean;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		required = false,
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<label
	bind:this={ref}
	class={cn('ds-label inline-block select-none text-mute', className)}
	{...rest}
>
	{@render children?.()}
	{#if required}<span class="ml-0.5 text-status-urgent" aria-hidden="true">*</span>{/if}
</label>