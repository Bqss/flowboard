<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import SidebarRail from './SidebarRail.svelte';
	import Topbar from './Topbar.svelte';
	import BottomTabBar from './BottomTabBar.svelte';
	import type { NavLink } from './shared.js';

	type Props = {
		title: string;
		subtitle?: string;
		eyebrow?: string;
		nav: NavLink[];
		adminNav?: NavLink[];
		mobileNav?: NavLink[];
		userName?: string;
		userSrc?: string;
		search?: string;
		showSearch?: boolean;
		class?: string;
		actions?: Snippet;
		children: Snippet;
	};

	let {
		title,
		subtitle,
		eyebrow,
		nav,
		adminNav = [],
		mobileNav = nav,
		userName,
		userSrc,
		search = $bindable(''),
		showSearch = true,
		class: className,
		actions,
		children
	}: Props = $props();

	let collapsed = $state(false);
</script>

<div class={cn('min-h-screen bg-canvas text-ink', className)}>
	<SidebarRail
		items={nav}
		adminItems={adminNav}
		{userName}
		{userSrc}
		workspaceName={title}
		bind:collapsed
	/>

	<div class={cn('flex min-h-screen flex-col transition-[margin] duration-200 ease-out', collapsed ? 'md:ml-[68px]' : 'md:ml-[248px]')}>
		<Topbar {title} {subtitle} {eyebrow} bind:search {showSearch} {actions} />

		<main class="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8">
			{@render children()}
		</main>
	</div>

	<BottomTabBar items={mobileNav} />
</div>
