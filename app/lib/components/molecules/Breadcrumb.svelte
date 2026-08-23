<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowRight01Icon, Home09Icon } from '@hugeicons/core-free-icons';
	import type { Crumb } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		items: Crumb[];
		/** Show home icon for the first crumb. */
		showHomeIcon?: boolean;
		/** Collapses the middle into an ellipsis past this many crumbs. */
		maxItems?: number;
		class?: string;
	};

	let {
		ref = $bindable(null),
		items,
		showHomeIcon = false,
		maxItems = 4,
		class: className,
		...rest
	}: Props = $props();

	const shown = $derived.by(() => {
		if (items.length <= maxItems) return items;
		return [items[0], { label: '…' } as Crumb, ...items.slice(items.length - (maxItems - 2))];
	});
</script>

<nav bind:this={ref} aria-label="Breadcrumb" class={cn('min-w-0', className)} {...rest}>
	<ol class="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
		{#each shown as crumb, i (crumb.label + i)}
			{@const last = i === shown.length - 1}
			<li class="flex min-w-0 items-center gap-2">
				{#if i > 0}
					<HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={1.8} class="shrink-0 text-faint" />
				{/if}

				{#if last}
					<span class="ds-label truncate font-bold text-ink" aria-current="page">
						{crumb.label}
					</span>
				{:else if crumb.href}
					<a
						href={crumb.href}
						class="ds-label inline-flex items-center gap-1.5 truncate text-mute transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
					>
						{#if i === 0 && showHomeIcon}
							<HugeiconsIcon icon={Home09Icon} size={15} strokeWidth={1.8} class="text-faint" />
						{/if}
						<span>{crumb.label}</span>
					</a>
				{:else}
					<span class="ds-label truncate text-faint">{crumb.label}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
