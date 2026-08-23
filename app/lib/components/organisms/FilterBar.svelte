<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { SearchInput, FilterPill } from '$lib/components/molecules/index.js';

	type Filter = { id: string; label: string; count?: number };

	type Props = WithElementRef<Omit<HTMLAttributes<HTMLElement>, 'onsearch'>> & {
		search?: string;
		filters?: Filter[];
		activeFilter?: string;
		searchPlaceholder?: string;
		/** `card` = white panel; `plain` = no card shell (toolbar on canvas). */
		variant?: 'card' | 'plain';
		/** `end` = actions on the right; `inline` = actions beside search/filters. */
		actionsAlign?: 'end' | 'inline';
		onsearch?: (value: string) => void;
		onfilter?: (id: string) => void;
		searchTestId?: string;
		filterTestId?: string;
		class?: string;
		actions?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		search = $bindable(''),
		filters = [],
		activeFilter = $bindable(''),
		searchPlaceholder = 'Cari…',
		variant = 'card',
		actionsAlign = 'end',
		onsearch,
		onfilter,
		searchTestId,
		filterTestId,
		class: className,
		actions,
		...rest
	}: Props = $props();

	const inlineToolbar = $derived(actionsAlign === 'inline');
</script>

<div
	bind:this={ref}
	class={cn(
		inlineToolbar
			? 'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3'
			: 'flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
		variant === 'card' && 'rounded-xl bg-card p-4 shadow-[var(--shadow-card)]',
		className
	)}
	{...rest}
>
	{#if inlineToolbar}
		<SearchInput
			bind:value={search}
			placeholder={searchPlaceholder}
			class="w-full min-w-0 sm:max-w-md sm:flex-1"
			{onsearch}
			data-testid={searchTestId}
		/>

		{#if filters.length}
			<div class="flex flex-wrap gap-2" data-testid={filterTestId}>
				{#each filters as filter (filter.id)}
					<FilterPill
						label={filter.label}
						count={filter.count}
						active={activeFilter === filter.id}
						onselect={() => {
							activeFilter = filter.id;
							onfilter?.(filter.id);
						}}
					/>
				{/each}
			</div>
		{/if}

		<div class="flex flex-wrap items-center gap-2">
			{@render actions?.()}
		</div>
	{:else}
		<div class="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
			<SearchInput
				bind:value={search}
				placeholder={searchPlaceholder}
				class="w-full sm:max-w-xs"
				{onsearch}
				data-testid={searchTestId}
			/>
			{#if filters.length}
				<div class="flex flex-wrap gap-2" data-testid={filterTestId}>
					{#each filters as filter (filter.id)}
						<FilterPill
							label={filter.label}
							count={filter.count}
							active={activeFilter === filter.id}
							onselect={() => {
								activeFilter = filter.id;
								onfilter?.(filter.id);
							}}
						/>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex shrink-0 flex-wrap items-center gap-2">
			{@render actions?.()}
		</div>
	{/if}
</div>
