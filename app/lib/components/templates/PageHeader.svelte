<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { Breadcrumb } from '../molecules/index.js';
	import type { Crumb } from './shared.js';
	import { pageHeaderClass } from './shared.js';

	type Props = {
		breadcrumbs?: Crumb[];
		title?: string;
		description?: string;
		toolbar?: Snippet;
		class?: string;
	};

	let { breadcrumbs = [], title, description, toolbar, class: className }: Props = $props();
</script>

{#if breadcrumbs.length}
	<Breadcrumb items={breadcrumbs} class="mb-4" />
{/if}

{#if title || toolbar}
	<div class={cn(pageHeaderClass, className)}>
		<div class="min-w-0">
			{#if title}
				<h2 class="ds-page-title text-ink">{title}</h2>
			{/if}
			{#if description}
				<p class="ds-body mt-1 text-mute">{description}</p>
			{/if}
		</div>
		{#if toolbar}
			<div class="flex shrink-0 flex-wrap items-center gap-2">
				{@render toolbar()}
			</div>
		{/if}
	</div>
{/if}
