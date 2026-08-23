<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import type { TreeNode } from './shared.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		nodes: TreeNode[];
		title?: string;
		onselect?: (node: TreeNode) => void;
		ontoggle?: (node: TreeNode) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		nodes,
		title,
		onselect,
		ontoggle,
		class: className,
		...rest
	}: Props = $props();
</script>

{#snippet branch(items: TreeNode[], depth = 0)}
	<ul class={depth === 0 ? 'space-y-0.5' : 'mt-0.5 space-y-0.5 border-l border-hairline pl-3'} role="group">
		{#each items as node (node.id)}
			<li role="treeitem" aria-selected={node.selected ?? false} aria-expanded={node.children?.length ? node.expanded : undefined}>
				<div
					class={cn(
						'flex w-full items-center gap-1 rounded-sm px-1 py-0.5 transition-colors hover:bg-primary-soft/50',
						node.selected && 'bg-primary-soft'
					)}
				>
					{#if node.children?.length}
						<button
							type="button"
							onclick={() => ontoggle?.(node)}
							aria-label={node.expanded ? 'Ciutkan' : 'Buka'}
							class="grid size-5 shrink-0 place-items-center rounded-sm text-mute hover:bg-primary-soft"
						>
							<ChevronRightIcon class={cn('size-3.5 transition-transform', node.expanded && 'rotate-90')} />
						</button>
					{:else}
						<span class="size-5 shrink-0"></span>
					{/if}
					<button
						type="button"
						onclick={() => onselect?.(node)}
						class={cn('ds-body min-w-0 flex-1 truncate py-1 text-left text-ink', node.selected && 'font-semibold text-primary')}
					>
						{node.label}
					</button>
				</div>
				{#if node.children?.length && node.expanded}
					{@render branch(node.children, depth + 1)}
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<article bind:this={ref} class={cn(cardShellClass, 'p-4', className)} role="tree" {...rest}>
	{#if title}
		<h3 class="ds-section-title mb-3 px-2 text-ink">{title}</h3>
	{/if}
	{@render branch(nodes)}
</article>
