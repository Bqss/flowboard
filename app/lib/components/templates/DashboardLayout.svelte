<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import DashboardShell from '../organisms/DashboardLayout.svelte';
	import PageHeader from './PageHeader.svelte';
	import type { DashboardShellProps, PageScopeProps } from './shared.js';
	import { embeddedShellClass } from './shared.js';

	type Props = DashboardShellProps &
		PageScopeProps & {
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
		class: className,
		topbarActions,
		toolbar,
		embedded = false,
		children: pageContent
	}: Props = $props();
</script>

<DashboardShell
	{title}
	{subtitle}
	{nav}
	{adminNav}
	{mobileNav}
	{userName}
	userSrc={userSrc}
	bind:search
	{showSearch}
	class={cn(embedded && embeddedShellClass, className)}
>
	{#snippet actions()}
		{@render topbarActions?.()}
	{/snippet}

	{#snippet children()}
		<PageHeader {breadcrumbs} title={pageTitle} description={pageDescription} {toolbar} />
		{@render pageContent()}
	{/snippet}
</DashboardShell>
