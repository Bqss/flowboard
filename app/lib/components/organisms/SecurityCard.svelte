<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { EmptyStateBlock } from '$lib/components/molecules/index.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title: string;
		description?: string;
		actionLabel?: string;
		onaction?: () => void;
		class?: string;
		icon?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		title,
		description,
		actionLabel,
		onaction,
		class: className,
		icon,
		...rest
	}: Props = $props();
</script>

<div bind:this={ref} class={cn(cardShellClass, className)} {...rest}>
	<EmptyStateBlock {title} {description} {actionLabel} {onaction} {icon} class="!shadow-none" />
</div>
