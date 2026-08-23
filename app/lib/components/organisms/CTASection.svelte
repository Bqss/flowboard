<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Button } from '$lib/components/atoms/index.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title: string;
		description?: string;
		primaryLabel?: string;
		secondaryLabel?: string;
		onprimary?: () => void;
		onsecondary?: () => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		title,
		description,
		primaryLabel = 'Hubungi kami',
		secondaryLabel,
		onprimary,
		onsecondary,
		class: className,
		...rest
	}: Props = $props();
</script>

<section
	bind:this={ref}
	class={cn(
		'rounded-xl bg-primary px-6 py-10 text-center text-on-primary shadow-[var(--shadow-card)] sm:px-10',
		className
	)}
	{...rest}
>
	<h2 class="ds-page-title text-on-primary">{title}</h2>
	{#if description}
		<p class="ds-body mx-auto mt-3 max-w-2xl text-on-primary/85">{description}</p>
	{/if}
	<div class="mt-6 flex flex-wrap items-center justify-center gap-3">
		<Button variant="secondary" class="!bg-card !text-ink hover:!bg-lane" onclick={onprimary}>
			{primaryLabel}
		</Button>
		{#if secondaryLabel}
			<Button variant="ghost" class="!text-on-primary hover:!bg-white/10" onclick={onsecondary}>
				{secondaryLabel}
			</Button>
		{/if}
	</div>
</section>
