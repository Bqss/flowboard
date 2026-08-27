<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Logo, Avatar } from '$lib/components/atoms/index.js';
	import { NavItem, UserChip } from '$lib/components/molecules/index.js';
	import type { NavLink } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		items: NavLink[];
		settingsItems?: NavLink[];
		adminItems?: NavLink[];
		userName?: string;
		userSrc?: string;
		labels?: {
			ariaLabel?: string;
			subtitle?: string;
			settings?: string;
			admin?: string;
		};
		class?: string;
		footer?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		items,
		settingsItems = [],
		adminItems = [],
		userName = 'User',
		userSrc,
		labels = {},
		class: className,
		footer,
		...rest
	}: Props = $props();

	const ariaLabel = $derived(labels.ariaLabel ?? 'Navigasi utama');
	const subtitle = $derived(labels.subtitle ?? 'Onboarding desk');
	const settingsLabel = $derived(labels.settings ?? 'Settings');
	const adminLabel = $derived(labels.admin ?? 'Administrasi');

	let expanded = $state(false);
</script>

<aside
	bind:this={ref}
	onmouseenter={() => (expanded = true)}
	onmouseleave={() => (expanded = false)}
	class={cn(
		'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-hairline bg-card py-4 transition-[width,box-shadow] duration-200 ease-out md:flex',
		expanded ? 'w-[240px] shadow-[var(--shadow-raised)]' : 'w-[76px]',
		className
	)}
	aria-label={ariaLabel}
	{...rest}
>
	<div
		class={cn(
			'mb-4 flex shrink-0 items-center gap-3',
			expanded ? 'px-4' : 'justify-center px-2'
		)}
	>
		<a href="/dashboard" class="shrink-0" aria-label="Flowboard">
			<Logo size={32} />
		</a>
		{#if expanded}
			<div class="min-w-0">
				<p class="ds-section-title truncate text-ink">Flowboard</p>
				<p class="ds-caption text-mute">{subtitle}</p>
			</div>
		{/if}
	</div>

	<nav
		class={cn(
			'flex flex-1 flex-col gap-1 overflow-y-auto px-2 pt-2',
			expanded ? 'items-stretch' : 'items-center'
		)}
	>
		{#each items as item (item.label)}
			<NavItem
				label={item.label}
				href={item.href}
				active={item.active}
				badge={item.badge}
				disabled={item.disabled}
				onselect={item.onselect}
				variant={expanded ? 'expanded' : 'rail'}
				icon={item.icon}
				data-testid={item.testId}
				class={expanded ? 'w-full' : undefined}
			/>
		{/each}

		{#if settingsItems.length}
			{#if expanded}
				<p class="ds-caption mt-5 mb-1.5 px-3 text-faint">{settingsLabel}</p>
			{:else}
				<div class="mt-5 h-px w-8 bg-hairline" aria-hidden="true"></div>
			{/if}
			<div class="flex flex-col gap-1">
				{#each settingsItems as item (item.label)}
					<NavItem
						label={item.label}
						href={item.href}
						active={item.active}
						badge={item.badge}
						disabled={item.disabled}
						onselect={item.onselect}
						variant={expanded ? 'expanded' : 'rail'}
						icon={item.icon}
						data-testid={item.testId}
						class={expanded ? 'w-full' : undefined}
					/>
				{/each}
			</div>
		{/if}

		{#if adminItems.length}
			{#if expanded}
				<p class="ds-caption mt-5 mb-1.5 px-3 text-faint">{adminLabel}</p>
			{:else}
				<div class="mt-5 h-px w-8 bg-hairline" aria-hidden="true"></div>
			{/if}
			<div class="flex flex-col gap-1">
				{#each adminItems as item (item.label)}
					<NavItem
						label={item.label}
						href={item.href}
						active={item.active}
						disabled={item.disabled}
						onselect={item.onselect}
						variant={expanded ? 'expanded' : 'rail'}
						icon={item.icon}
						data-testid={item.testId}
						class={expanded ? 'w-full' : undefined}
					/>
				{/each}
			</div>
		{/if}
	</nav>

	{#if footer}
		<div class={cn('shrink-0', expanded ? 'px-3' : 'flex justify-center px-2')}>
			{@render footer()}
		</div>
	{/if}

	<div class={cn('mt-4 shrink-0', expanded ? 'px-3' : 'flex justify-center')}>
		{#if expanded}
			<UserChip name={userName} src={userSrc} size="sm" class="w-full min-w-0" />
		{:else}
			<Avatar name={userName} src={userSrc} size={40} />
		{/if}
	</div>
</aside>
