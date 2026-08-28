<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Logo, Avatar, Badge, Tooltip } from '$lib/components/atoms/index.js';
	import { NavItem, DropdownMenu, type MenuItem } from '$lib/components/molecules/index.js';
	import type { NavLink } from './shared.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		PanelLeftCloseIcon,
		PanelLeftOpenIcon,
		Search01Icon,
		ArrowDown01Icon,
		Building06Icon,
		Tick02Icon,
		ShieldUserIcon,
		Logout03Icon,
		Settings01Icon,
		UserGroupIcon,
		Cancel01Icon,
		SparklesIcon,
		MoreVerticalIcon
	} from '@hugeicons/core-free-icons';

	type WorkspaceItem = {
		id: string;
		name: string;
		slug?: string;
		role?: string;
	};

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		items: NavLink[];
		settingsItems?: NavLink[];
		adminItems?: NavLink[];
		userName?: string;
		userEmail?: string;
		userRole?: string;
		userSrc?: string;
		workspaceName?: string;
		workspaceRole?: string;
		workspaces?: WorkspaceItem[];
		currentWorkspaceId?: string;
		onSwitchWorkspace?: (id: string) => void;
		collapsed?: boolean;
		onToggleCollapse?: () => void;
		mobileOpen?: boolean;
		onCloseMobile?: () => void;
		planName?: string;
		isPlatformAdmin?: boolean;
		adminMode?: boolean;
		onToggleAdminMode?: () => void;
		onLogout?: () => void;
		labels?: {
			ariaLabel?: string;
			subtitle?: string;
			settings?: string;
			admin?: string;
			workspace?: string;
			search?: string;
			noResults?: string;
			collapse?: string;
			expand?: string;
			adminMode?: string;
			exitAdmin?: string;
			workspaces?: string;
			signOut?: string;
			myAccount?: string;
		};
		class?: string;
		header?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
		userMenu?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		items,
		settingsItems = [],
		adminItems = [],
		userName = 'User',
		userEmail,
		userRole,
		userSrc,
		workspaceName = 'Flowboard',
		workspaceRole,
		workspaces = [],
		currentWorkspaceId,
		onSwitchWorkspace,
		collapsed = $bindable(false),
		onToggleCollapse,
		mobileOpen = $bindable(false),
		onCloseMobile,
		planName,
		isPlatformAdmin = false,
		adminMode = false,
		onToggleAdminMode,
		onLogout,
		labels = {},
		class: className,
		header,
		footer,
		userMenu,
		...rest
	}: Props = $props();

	let searchQuery = $state('');

	const ariaLabel = $derived(labels.ariaLabel ?? 'Main navigation');
	const subtitle = $derived(labels.subtitle ?? 'Onboarding desk');
	const workspaceLabel = $derived(labels.workspace ?? 'Workspace');
	const settingsLabel = $derived(labels.settings ?? 'Configuration');
	const adminLabel = $derived(labels.admin ?? 'Platform Admin');
	const searchPlaceholder = $derived(labels.search ?? 'Search menu…');
	const noResultsText = $derived(labels.noResults ?? 'No matching menu items');
	const collapseLabel = $derived(labels.collapse ?? 'Collapse sidebar');
	const expandLabel = $derived(labels.expand ?? 'Expand sidebar');

	const filteredItems = $derived(
		searchQuery.trim()
			? items.filter((it) => it.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
			: items
	);

	const filteredSettingsItems = $derived(
		searchQuery.trim()
			? settingsItems.filter((it) => it.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
			: settingsItems
	);

	const filteredAdminItems = $derived(
		searchQuery.trim()
			? adminItems.filter((it) => it.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
			: adminItems
	);

	const hasResults = $derived(
		filteredItems.length > 0 || filteredSettingsItems.length > 0 || filteredAdminItems.length > 0
	);

	function handleToggle() {
		if (onToggleCollapse) {
			onToggleCollapse();
		} else {
			collapsed = !collapsed;
		}
	}

	const workspaceMenuItems = $derived<MenuItem[]>(
		workspaces.map((ws) => ({
			label: ws.name,
			disabled: ws.id === currentWorkspaceId,
			icon: ws.id === currentWorkspaceId ? checkIconSnippet : buildingIconSnippet,
			onselect: () => {
				onSwitchWorkspace?.(ws.id);
			}
		}))
	);

	const defaultUserMenuItems = $derived<MenuItem[]>([
		{
			label: userName,
			disabled: true
		},
		{
			label: labels.settings ?? 'Settings',
			icon: settingsIconSnippet,
			onselect: () => {
				if (typeof window !== 'undefined') window.location.href = '/dashboard/settings';
			}
		},
		{
			label: 'Members',
			icon: usersIconSnippet,
			onselect: () => {
				if (typeof window !== 'undefined') window.location.href = '/dashboard/members';
			}
		},
		...(onLogout
			? [
					{
						label: labels.signOut ?? 'Sign out',
						destructive: true,
						separatorBefore: true,
						icon: logoutIconSnippet,
						onselect: onLogout
					}
				]
			: [])
	]);
</script>

<svelte:window
	onkeydown={(e) => {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
			e.preventDefault();
			handleToggle();
		}
	}}
/>

{#snippet checkIconSnippet()}
	<HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={1.8} class="text-primary" />
{/snippet}

{#snippet buildingIconSnippet()}
	<HugeiconsIcon icon={Building06Icon} size={15} strokeWidth={1.8} class="text-mute" />
{/snippet}

{#snippet settingsIconSnippet()}
	<HugeiconsIcon icon={Settings01Icon} size={15} strokeWidth={1.8} class="text-mute" />
{/snippet}

{#snippet usersIconSnippet()}
	<HugeiconsIcon icon={UserGroupIcon} size={15} strokeWidth={1.8} class="text-mute" />
{/snippet}

{#snippet logoutIconSnippet()}
	<HugeiconsIcon icon={Logout03Icon} size={15} strokeWidth={1.8} class="text-status-urgent" />
{/snippet}

{#snippet searchInput(isMobile: boolean = false)}
	<div class={cn('pt-2.5 pb-1', isMobile ? 'px-4' : 'px-3')}>
		<div class="relative flex items-center">
			<HugeiconsIcon
				icon={Search01Icon}
				size={15}
				strokeWidth={1.8}
				class="pointer-events-none absolute left-2.5 text-faint"
			/>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder={searchPlaceholder}
				class="h-8.5 w-full rounded-lg border border-hairline bg-canvas-sunken/80 pl-8 pr-7 text-[13.5px] text-ink placeholder:text-mute/70 transition-all focus:border-primary/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
			/>
			{#if searchQuery}
				<button
					type="button"
					onclick={() => (searchQuery = '')}
					class="absolute right-2 flex size-4 items-center justify-center rounded-full text-mute transition-colors hover:bg-lane hover:text-ink"
					aria-label="Clear search"
				>
					<HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
				</button>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet navList(isRail: boolean)}
	<nav class={cn('flex flex-1 flex-col overflow-y-auto px-2.5 space-y-4', isRail ? 'items-center px-1.5 py-3' : 'items-stretch py-2')}>
		{#if isRail}
			<!-- Rail quick search icon button to expand & focus -->
			<Tooltip text={searchPlaceholder} side="right">
				<button
					type="button"
					onclick={() => {
						collapsed = false;
					}}
					class="flex size-10 items-center justify-center rounded-xl text-mute transition-all hover:bg-lane/80 hover:text-ink"
					aria-label={searchPlaceholder}
				>
					<HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} />
				</button>
			</Tooltip>
			<div class="my-0.5 h-px w-6 bg-hairline" aria-hidden="true"></div>
		{/if}

		{#if !hasResults && searchQuery.trim()}
			<div class="px-3 py-6 text-center">
				<p class="text-[13px] text-mute">{noResultsText}</p>
				<button
					type="button"
					onclick={() => (searchQuery = '')}
					class="mt-2 text-[12px] font-semibold text-primary hover:underline"
				>
					Clear filter
				</button>
			</div>
		{:else}
			<!-- Main Workspace Navigation -->
			{#if filteredItems.length > 0}
				<div>
					{#if !isRail}
						<p class="px-2 pb-1.5 text-[11.5px] font-bold uppercase tracking-wider text-faint select-none">
							{workspaceLabel}
						</p>
					{/if}
					<div class="flex flex-col gap-0.5">
						{#each filteredItems as item (item.label)}
							{#if isRail}
								<Tooltip text={item.label} side="right">
									<NavItem
										label={item.label}
										href={item.href}
										active={item.active}
										badge={item.badge}
										disabled={item.disabled}
										onselect={() => {
											item.onselect?.();
											if (mobileOpen) mobileOpen = false;
										}}
										variant="rail"
										icon={item.icon}
										data-testid={item.testId}
									/>
								</Tooltip>
							{:else}
								<NavItem
									label={item.label}
									href={item.href}
									active={item.active}
									badge={item.badge}
									disabled={item.disabled}
									onselect={() => {
										item.onselect?.();
										if (mobileOpen) mobileOpen = false;
									}}
									variant="expanded"
									icon={item.icon}
									data-testid={item.testId}
								/>
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			<!-- Settings / Config Section -->
			{#if filteredSettingsItems.length > 0}
				<div>
					{#if !isRail}
						<p class="px-2 pb-1.5 text-[11.5px] font-bold uppercase tracking-wider text-faint select-none">
							{settingsLabel}
						</p>
					{:else if filteredItems.length > 0}
						<div class="my-1.5 h-px w-6 bg-hairline" aria-hidden="true"></div>
					{/if}
					<div class="flex flex-col gap-0.5">
						{#each filteredSettingsItems as item (item.label)}
							{#if isRail}
								<Tooltip text={item.label} side="right">
									<NavItem
										label={item.label}
										href={item.href}
										active={item.active}
										badge={item.badge}
										disabled={item.disabled}
										onselect={() => {
											item.onselect?.();
											if (mobileOpen) mobileOpen = false;
										}}
										variant="rail"
										icon={item.icon}
										data-testid={item.testId}
									/>
								</Tooltip>
							{:else}
								<NavItem
									label={item.label}
									href={item.href}
									active={item.active}
									badge={item.badge}
									disabled={item.disabled}
									onselect={() => {
										item.onselect?.();
										if (mobileOpen) mobileOpen = false;
									}}
									variant="expanded"
									icon={item.icon}
									data-testid={item.testId}
								/>
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			<!-- Admin Section -->
			{#if filteredAdminItems.length > 0}
				<div>
					{#if !isRail}
						<div class="flex items-center justify-between px-2 pb-1.5">
							<p class="text-[11.5px] font-bold uppercase tracking-wider text-primary select-none">
								{adminLabel}
							</p>
							<span class="rounded bg-primary/10 px-1 py-0.2 text-[10px] font-semibold tracking-wide text-primary">ADMIN</span>
						</div>
					{:else if filteredItems.length > 0 || filteredSettingsItems.length > 0}
						<div class="my-1.5 h-px w-6 bg-primary/20" aria-hidden="true"></div>
					{/if}
					<div class="flex flex-col gap-0.5">
						{#each filteredAdminItems as item (item.label)}
							{#if isRail}
								<Tooltip text={item.label} side="right">
									<NavItem
										label={item.label}
										href={item.href}
										active={item.active}
										badge={item.badge}
										disabled={item.disabled}
										onselect={() => {
											item.onselect?.();
											if (mobileOpen) mobileOpen = false;
										}}
										variant="rail"
										icon={item.icon}
										data-testid={item.testId}
									/>
								</Tooltip>
							{:else}
								<NavItem
									label={item.label}
									href={item.href}
									active={item.active}
									badge={item.badge}
									disabled={item.disabled}
									onselect={() => {
										item.onselect?.();
										if (mobileOpen) mobileOpen = false;
									}}
									variant="expanded"
									icon={item.icon}
									data-testid={item.testId}
								/>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</nav>
{/snippet}

<!-- DESKTOP ASIDE -->
<aside
	bind:this={ref}
	class={cn(
		'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-hairline bg-card transition-[width] duration-200 ease-out md:flex',
		collapsed ? 'w-[68px]' : 'w-[248px]',
		className
	)}
	aria-label={ariaLabel}
	{...rest}
>
	<!-- HEADER -->
	{#if header}
		{@render header()}
	{:else if collapsed}
		<!-- Collapsed Rail Header -->
		<div class="flex h-16 shrink-0 flex-col items-center justify-center border-b border-hairline px-2">
			<a href="/dashboard" class="flex size-9 items-center justify-center rounded-xl transition-transform hover:scale-105" aria-label="Flowboard">
				<Logo size={28} />
			</a>
		</div>
	{:else}
		<!-- Expanded Header -->
		<div class="flex h-16 shrink-0 items-center justify-between border-b border-hairline px-3.5">
			{#if workspaces.length > 1}
				<DropdownMenu items={workspaceMenuItems} align="start" label="Workspace switcher">
					{#snippet trigger({ open, toggle })}
						<button
							type="button"
							onclick={toggle}
							class="group flex min-w-0 max-w-[168px] items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-lane focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
							aria-expanded={open}
						>
							<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary font-bold shadow-xs">
								<Logo size={22} />
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate text-[14px] font-bold text-ink leading-tight">{workspaceName}</p>
								<p class="truncate text-[12px] text-mute">{workspaceRole ?? subtitle}</p>
							</div>
							<HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} class="shrink-0 text-mute transition-transform group-hover:text-ink" />
						</button>
					{/snippet}
				</DropdownMenu>
			{:else}
				<a href="/dashboard" class="flex min-w-0 items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-lane">
					<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary font-bold shadow-xs">
						<Logo size={22} />
					</div>
					<div class="min-w-0">
						<p class="truncate text-[14px] font-bold text-ink leading-tight">{workspaceName}</p>
						<p class="truncate text-[12px] text-mute">{subtitle}</p>
					</div>
				</a>
			{/if}

			<!-- Collapse Button -->
			<Tooltip text={`${collapseLabel} (⌘B)`} side="bottom">
				<button
					type="button"
					onclick={handleToggle}
					class="flex size-8 items-center justify-center rounded-lg text-mute transition-colors hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
					aria-label={collapseLabel}
				>
					<HugeiconsIcon icon={PanelLeftCloseIcon} size={18} strokeWidth={1.8} />
				</button>
			</Tooltip>
		</div>
	{/if}

	<!-- REAL WORKING SEARCH INPUT (EXPANDED ONLY) -->
	{#if !collapsed}
		{@render searchInput(false)}
	{/if}

	<!-- PLATFORM ADMIN BANNER (IF APPLICABLE) -->
	{#if isPlatformAdmin && onToggleAdminMode && !collapsed}
		<div class="px-3 pt-2">
			<button
				type="button"
				onclick={onToggleAdminMode}
				class={cn(
					'flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold transition-all',
					adminMode
						? 'border-primary/30 bg-primary-soft text-primary shadow-xs'
						: 'border-hairline bg-canvas-sunken text-mute hover:border-hairline-strong hover:text-ink'
				)}
			>
				<span class="inline-flex items-center gap-1.5">
					<HugeiconsIcon icon={ShieldUserIcon} size={15} strokeWidth={2} class={adminMode ? 'text-primary' : 'text-faint'} />
					<span>{adminMode ? (labels.exitAdmin ?? 'Exit Admin') : (labels.adminMode ?? 'Admin Mode')}</span>
				</span>
				<span class={cn('size-2 rounded-full', adminMode ? 'bg-primary animate-pulse' : 'bg-mute/40')}></span>
			</button>
		</div>
	{/if}

	<!-- NAV LIST -->
	{@render navList(collapsed)}

	<!-- FOOTER SLOT -->
	{#if footer}
		<div class={cn('shrink-0 border-t border-hairline py-2', collapsed ? 'px-1.5' : 'px-3')}>
			{@render footer()}
		</div>
	{/if}

	<!-- USER & DOCK TOGGLE -->
	<div class="shrink-0 border-t border-hairline bg-card p-2">
		{#if collapsed}
			<!-- Rail user avatar + expand toggle -->
			<div class="flex flex-col items-center gap-2">
				<Tooltip text={userName} side="right">
					<DropdownMenu items={defaultUserMenuItems} align="start">
						{#snippet trigger({ open, toggle })}
							<button
								type="button"
								onclick={toggle}
								class="relative flex size-10 items-center justify-center rounded-xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
								aria-expanded={open}
								aria-label={userName}
							>
								<Avatar name={userName} src={userSrc} size={32} />
								<span class="absolute bottom-1 right-1 size-2 rounded-full border border-card bg-presence-online"></span>
							</button>
						{/snippet}
					</DropdownMenu>
				</Tooltip>

				<Tooltip text={`${expandLabel} (⌘B)`} side="right">
					<button
						type="button"
						onclick={handleToggle}
						class="flex size-9 items-center justify-center rounded-lg text-mute transition-colors hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
						aria-label={expandLabel}
					>
						<HugeiconsIcon icon={PanelLeftOpenIcon} size={18} strokeWidth={1.8} />
					</button>
				</Tooltip>
			</div>
		{:else}
			<!-- Expanded user card -->
			<div class="flex items-center justify-between gap-1 rounded-xl p-1.5 transition-colors hover:bg-lane/70">
				<DropdownMenu items={defaultUserMenuItems} align="start" class="min-w-0 flex-1">
					{#snippet trigger({ open, toggle })}
						<button
							type="button"
							onclick={toggle}
							class="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
							aria-expanded={open}
						>
							<div class="relative shrink-0">
								<Avatar name={userName} src={userSrc} size={32} />
								<span class="absolute bottom-0 right-0 size-2 rounded-full border border-card bg-presence-online"></span>
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate text-[14px] font-semibold text-ink leading-tight">{userName}</p>
								<p class="truncate text-[12px] text-mute">{userRole ?? userEmail ?? 'Flowboard Member'}</p>
							</div>
						</button>
					{/snippet}
				</DropdownMenu>

				<Tooltip text={`${collapseLabel} (⌘B)`} side="top">
					<button
						type="button"
						onclick={handleToggle}
						class="flex size-7 shrink-0 items-center justify-center rounded-md text-mute transition-colors hover:bg-card hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
						aria-label={collapseLabel}
					>
						<HugeiconsIcon icon={PanelLeftCloseIcon} size={16} strokeWidth={1.8} />
					</button>
				</Tooltip>
			</div>
		{/if}
	</div>
</aside>

<!-- MOBILE DRAWER (SM / XS SCREENS) -->
{#if mobileOpen}
	<!-- Backdrop scrim -->
	<button
		type="button"
		class="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs transition-opacity md:hidden"
		onclick={() => {
			mobileOpen = false;
			onCloseMobile?.();
		}}
		aria-label="Close navigation"
	></button>

	<!-- Slideover panel -->
	<aside
		class="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-hairline bg-card shadow-2xl transition-transform duration-200 ease-out md:hidden"
		aria-label={ariaLabel}
	>
		<!-- Header -->
		<div class="flex h-16 shrink-0 items-center justify-between border-b border-hairline px-4">
			<a href="/dashboard" class="flex items-center gap-2.5" onclick={() => (mobileOpen = false)}>
				<div class="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary font-bold shadow-xs">
					<Logo size={22} />
				</div>
				<div>
					<p class="text-[15px] font-bold text-ink leading-tight">{workspaceName}</p>
					<p class="text-[12px] text-mute">{subtitle}</p>
				</div>
			</a>
			<button
				type="button"
				onclick={() => {
					mobileOpen = false;
					onCloseMobile?.();
				}}
				class="flex size-8 items-center justify-center rounded-lg text-mute hover:bg-lane hover:text-ink"
				aria-label="Close menu"
			>
				<HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
			</button>
		</div>

		<!-- Mobile Search -->
		{@render searchInput(true)}

		<!-- Admin Mode Toggle -->
		{#if isPlatformAdmin && onToggleAdminMode}
			<div class="px-4 pt-2.5 pb-1">
				<button
					type="button"
					onclick={onToggleAdminMode}
					class={cn(
						'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-[13px] font-semibold transition-all',
						adminMode
							? 'border-primary/30 bg-primary-soft text-primary'
							: 'border-hairline bg-canvas-sunken text-mute hover:border-hairline-strong hover:text-ink'
					)}
				>
					<span class="inline-flex items-center gap-1.5">
						<HugeiconsIcon icon={ShieldUserIcon} size={15} strokeWidth={2} class={adminMode ? 'text-primary' : 'text-faint'} />
						<span>{adminMode ? (labels.exitAdmin ?? 'Exit Admin') : (labels.adminMode ?? 'Admin Mode')}</span>
					</span>
					<span class={cn('size-2 rounded-full', adminMode ? 'bg-primary animate-pulse' : 'bg-mute/40')}></span>
				</button>
			</div>
		{/if}

		<!-- Nav -->
		{@render navList(false)}

		<!-- User Footer -->
		<div class="shrink-0 border-t border-hairline bg-card p-3">
			<div class="flex items-center justify-between">
				<div class="flex min-w-0 items-center gap-2.5">
					<Avatar name={userName} src={userSrc} size={34} />
					<div class="min-w-0">
						<p class="truncate text-[14px] font-semibold text-ink">{userName}</p>
						<p class="truncate text-[12px] text-mute">{userEmail ?? userRole ?? 'Member'}</p>
					</div>
				</div>
				{#if onLogout}
					<button
						type="button"
						onclick={onLogout}
						class="flex size-8 items-center justify-center rounded-lg text-mute hover:bg-status-urgent/10 hover:text-status-urgent"
						aria-label={labels.signOut ?? 'Sign out'}
					>
						<HugeiconsIcon icon={Logout03Icon} size={18} strokeWidth={1.8} />
					</button>
				{/if}
			</div>
		</div>
	</aside>
{/if}
