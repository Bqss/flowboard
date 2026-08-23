<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import IconChip from './IconChip.svelte';
	import MetricDelta from './MetricDelta.svelte';
	import { Badge, type BadgeTone } from '$lib/components/atoms/index.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title: string;
		subtitle?: string;
		href?: string;
		selected?: boolean;
		delta?: number;
		badge?: string;
		badgeTone?: BadgeTone;
		class?: string;
		icon?: import('svelte').Snippet;
		trailing?: import('svelte').Snippet;
		onselect?: () => void;
	};

	let {
		ref = $bindable(null),
		title,
		subtitle,
		href,
		selected = false,
		delta,
		badge,
		badgeTone = 'neutral',
		class: className,
		icon,
		trailing,
		onselect,
		...rest
	}: Props = $props();

	const tag = $derived(href ? 'a' : 'button');
</script>

<svelte:element
	this={tag}
	bind:this={ref}
	{href}
	type={href ? undefined : 'button'}
	onclick={onselect}
	class={cn(
		'group flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
		selected ? 'bg-primary-soft/70' : 'hover:bg-primary-soft/50',
		className
	)}
	{...rest}
>
	{#if icon}
		<IconChip size="sm">{@render icon()}</IconChip>
	{/if}

	<div class="min-w-0 flex-1">
		<p class="truncate text-[14px] font-semibold leading-snug text-ink">{title}</p>
		{#if subtitle}
			<p class="ds-caption mt-0.5 truncate text-mute">{subtitle}</p>
		{/if}
	</div>

	<div class="flex shrink-0 items-center gap-2">
		{#if delta !== undefined}
			<MetricDelta value={delta} />
		{/if}
		{#if badge}
			<Badge tone={badgeTone}>{badge}</Badge>
		{/if}
		{@render trailing?.()}
	</div>
</svelte:element>
