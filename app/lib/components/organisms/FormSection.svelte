<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Heading, Text } from '$lib/components/atoms/index.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title: string;
		description?: string;
		class?: string;
		children?: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		title,
		description,
		class: className,
		children,
		actions,
		...rest
	}: Props = $props();
</script>

<section bind:this={ref} class={cn('space-y-4', className)} {...rest}>
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<Heading level={4} class="text-ink">{title}</Heading>
			{#if description}
				<Text muted class="mt-1">{description}</Text>
			{/if}
		</div>
		{@render actions?.()}
	</div>
	<div>{@render children?.()}</div>
</section>
