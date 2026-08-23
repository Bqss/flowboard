<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import DashboardLayout from './DashboardLayout.svelte';
	import type { DashboardShellProps, PageScopeProps } from './shared.js';
	import { cardSurfaceClass, detailGridClass } from './shared.js';

	type Props = DashboardShellProps &
		PageScopeProps & {
			masterWidth?: 'sm' | 'md' | 'lg';
			master: Snippet;
			detail: Snippet;
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
		masterWidth = 'md',
		class: className,
		topbarActions,
		toolbar,
		embedded = false,
		master,
		detail
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
		<div class={detailGridClass(masterWidth)}>
			<aside
				class={cn(
					cardSurfaceClass,
					'p-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-auto'
				)}
			>
				{@render master()}
			</aside>

			<section class={cn(cardSurfaceClass, 'min-w-0 p-6')}>
				{@render detail()}
			</section>
		</div>
	{/snippet}
</DashboardLayout>
