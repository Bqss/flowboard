<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Button } from '$lib/components/atoms/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { KanbanIcon } from '@hugeicons/core-free-icons';

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

<section
	bind:this={ref}
	class={cn(
		'flex flex-col items-center rounded-2xl border border-dashed border-hairline-strong bg-card/80 px-6 py-12 text-center shadow-card backdrop-blur-sm',
		className
	)}
	{...rest}
>
	<div class="mb-4 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary ring-8 ring-primary-soft/40 [&_svg]:size-7">
		{#if icon}
			{@render icon()}
		{:else}
			<HugeiconsIcon icon={KanbanIcon} size={28} strokeWidth={1.8} />
		{/if}
	</div>

	<h3 class="ds-section-title text-ink mt-2">{title}</h3>

	{#if description}
		<p class="ds-body mt-2 max-w-md text-mute">{description}</p>
	{/if}

	{#if actionLabel}
		<div class="mt-6">
			<Button variant="primary" onclick={onaction}>{actionLabel}</Button>
		</div>
	{/if}
</section>
