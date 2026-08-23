<script lang="ts">
	import type { Snippet } from 'svelte';
	import DashboardLayout from './DashboardLayout.svelte';
	import { FilterBar } from '../organisms/index.js';
	import type { DashboardShellProps, PageScopeProps } from './shared.js';
	import { contentStackClass } from './shared.js';

	type Filter = { id: string; label: string; count?: number };

	type Props = DashboardShellProps &
		PageScopeProps & {
			pageTitle: string;
			filters?: Filter[];
			activeFilter?: string;
			filterSearch?: string;
			showFilterBar?: boolean;
			onfilter?: (id: string) => void;
			filterActions?: Snippet;
			children: Snippet;
		};

	let {
		title,
		subtitle,
		nav,
		adminNav = [],
		mobileNav = nav,
		userName,
		userSrc,
		search = $bindable(''),
		showSearch = true,
		breadcrumbs = [],
		pageTitle,
		pageDescription,
		filters = [],
		activeFilter = $bindable(''),
		filterSearch = $bindable(''),
		showFilterBar = true,
		onfilter,
		class: className,
		topbarActions,
		toolbar,
		filterActions,
		embedded = false,
		children: pageContent
	}: Props = $props();
</script>

<DashboardLayout
	{title}
	{subtitle}
	{nav}
	{adminNav}
	{mobileNav}
	{userName}
	userSrc={userSrc}
	bind:search
	{showSearch}
	{breadcrumbs}
	{pageTitle}
	{pageDescription}
	{embedded}
	class={className}
	{topbarActions}
	{toolbar}
>
	{#snippet children()}
		<div class={contentStackClass}>
			{#if showFilterBar}
				<FilterBar bind:search={filterSearch} {filters} bind:activeFilter {onfilter}>
					{#snippet actions()}
						{@render filterActions?.()}
					{/snippet}
				</FilterBar>
			{/if}

			{@render pageContent()}
		</div>
	{/snippet}
</DashboardLayout>
