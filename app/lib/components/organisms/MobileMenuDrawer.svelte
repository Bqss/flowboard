<script lang="ts">
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils.js';
	import { Logo, Avatar, Badge, Button } from '$lib/components/atoms/index.js';
	import { locale, locales, setLocale, type Locale } from '$lib/i18n/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Cancel01Icon,
		UserGroupIcon,
		Plug02Icon,
		Settings01Icon,
		Building06Icon,
		Add01Icon,
		Tick02Icon,
		ArrowRight01Icon,
		Logout03Icon,
		ShieldUserIcon,
		DashboardSquare02Icon,
		CreditCardIcon,
		GiftIcon,
		UserSwitchIcon,
		Globe02Icon
	} from '@hugeicons/core-free-icons';

	type WorkspaceItem = {
		id: string;
		name: string;
		slug?: string;
		role?: string;
	};

	type AccountItem = {
		id: string;
		name: string;
		email: string;
		avatarUrl?: string | null;
	};

	type Props = {
		open?: boolean;
		currentPath?: string;
		workspaceName?: string;
		workspaceRole?: string;
		currentWorkspaceId?: string;
		workspaces?: WorkspaceItem[];
		onSwitchWorkspace?: (id: string) => void;
		onCreateWorkspace?: () => void;
		userName?: string;
		userEmail?: string;
		userRole?: string;
		userSrc?: string;
		accounts?: AccountItem[];
		currentUserId?: string;
		onSwitchAccount?: (id: string) => void;
		isPlatformAdmin?: boolean;
		adminMode?: boolean;
		onToggleAdminMode?: () => void;
		onLogout?: () => void;
		labels?: {
			menuTitle?: string;
			workspaceGroup?: string;
			members?: string;
			membersDesc?: string;
			integrations?: string;
			integrationsDesc?: string;
			settings?: string;
			settingsDesc?: string;
			adminGroup?: string;
			adminMode?: string;
			exitAdmin?: string;
			adminOverview?: string;
			adminUsers?: string;
			adminSubscriptions?: string;
			adminVouchers?: string;
			accountGroup?: string;
			switchWorkspace?: string;
			addWorkspace?: string;
			switchAccount?: string;
			addAccount?: string;
			language?: string;
			signOut?: string;
		};
	};

	let {
		open = $bindable(false),
		currentPath = '',
		workspaceName = 'actjom',
		workspaceRole,
		currentWorkspaceId,
		workspaces = [],
		onSwitchWorkspace,
		onCreateWorkspace,
		userName = 'User',
		userEmail,
		userRole,
		userSrc,
		accounts = [],
		currentUserId,
		onSwitchAccount,
		isPlatformAdmin = false,
		adminMode = false,
		onToggleAdminMode,
		onLogout,
		labels = {}
	}: Props = $props();

	function closeDrawer() {
		open = false;
	}

	function handleNavigate(href: string) {
		closeDrawer();
		void goto(href);
	}

	function handleWorkspaceSelect(id: string) {
		if (id === currentWorkspaceId) return;
		closeDrawer();
		onSwitchWorkspace?.(id);
	}

	function handleAccountSelect(id: string) {
		if (id === currentUserId) return;
		closeDrawer();
		onSwitchAccount?.(id);
	}

	const isMembersActive = $derived(currentPath.startsWith('/dashboard/members'));
	const isIntegrationsActive = $derived(currentPath.startsWith('/dashboard/settings/integrations'));
	const isSettingsActive = $derived(
		(currentPath === '/dashboard/settings' || currentPath === '/dashboard/settings/') && !isIntegrationsActive
	);
	const isAdminOverviewActive = $derived(currentPath === '/dashboard/admin');
	const isAdminUsersActive = $derived(currentPath.startsWith('/dashboard/admin/users'));
	const isAdminSubscriptionsActive = $derived(currentPath.startsWith('/dashboard/admin/subscriptions'));
	const isAdminVouchersActive = $derived(currentPath.startsWith('/dashboard/admin/vouchers'));
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex flex-col bg-card text-ink md:hidden animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
		aria-label={labels.menuTitle ?? 'Menu'}
	>
		<!-- Header -->
		<header class="flex h-16 shrink-0 items-center justify-between border-b border-hairline px-4 pt-[env(safe-area-inset-top)]">
			<div class="flex items-center gap-3 min-w-0">
				<div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary font-bold shadow-xs">
					<Logo size={22} />
				</div>
				<div class="min-w-0">
					<h2 class="truncate text-[15px] font-bold text-ink leading-tight">{workspaceName}</h2>
					<p class="truncate text-[12px] text-mute leading-tight">
						{workspaceRole ? (workspaceRole === 'owner' ? 'Pemilik Ruang Kerja' : 'Ahli Ruang Kerja') : 'Ruang Kerja'}
					</p>
				</div>
			</div>

			<button
				type="button"
				onclick={closeDrawer}
				class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-canvas-sunken text-mute transition-colors hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
				aria-label="Tutup menu"
			>
				<HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={2} />
			</button>
		</header>

		<!-- Scrollable Body -->
		<div class="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6">
			<!-- Section 1: Menu Tambahan (Vertical Menu Cards) -->
			<div>
				<p class="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-faint">
					{labels.menuTitle ?? 'Menu Utama'}
				</p>
				<div class="space-y-2">
					<!-- 1. Ahli (Members) -->
					<button
						type="button"
						onclick={() => handleNavigate('/dashboard/members')}
						class={cn(
							'flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all duration-150',
							isMembersActive
								? 'border-primary/40 bg-primary-soft/50 ring-1 ring-primary/20 shadow-xs'
								: 'border-hairline bg-card hover:border-hairline-strong hover:bg-canvas-sunken/60'
						)}
					>
						<div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary shadow-xs">
							<HugeiconsIcon icon={UserGroupIcon} size={22} strokeWidth={1.8} />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between">
								<span class="text-[14.5px] font-bold {isMembersActive ? 'text-primary' : 'text-ink'}">
									{labels.members ?? 'Ahli'}
								</span>
								<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} class="text-mute" />
							</div>
							<p class="mt-0.5 text-xs text-mute truncate">
								{labels.membersDesc ?? 'Urus ahli pasukan dan jemputan'}
							</p>
						</div>
					</button>

					<!-- 2. Integrasi (Integrations) -->
					<button
						type="button"
						onclick={() => handleNavigate('/dashboard/settings/integrations')}
						class={cn(
							'flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all duration-150',
							isIntegrationsActive
								? 'border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/40 ring-1 ring-emerald-500/20 shadow-xs'
								: 'border-hairline bg-card hover:border-hairline-strong hover:bg-canvas-sunken/60'
						)}
					>
						<div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shadow-xs">
							<HugeiconsIcon icon={Plug02Icon} size={22} strokeWidth={1.8} />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between">
								<span class="text-[14.5px] font-bold {isIntegrationsActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-ink'}">
									{labels.integrations ?? 'Integrasi'}
								</span>
								<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} class="text-mute" />
							</div>
							<p class="mt-0.5 text-xs text-mute truncate">
								{labels.integrationsDesc ?? 'WhatsApp, webhook dan sambungan luaran'}
							</p>
						</div>
					</button>

					<!-- 3. Tetapan (Settings) -->
					<button
						type="button"
						onclick={() => handleNavigate('/dashboard/settings')}
						class={cn(
							'flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all duration-150',
							isSettingsActive
								? 'border-sky-500/40 bg-sky-50/70 dark:bg-sky-950/40 ring-1 ring-sky-500/20 shadow-xs'
								: 'border-hairline bg-card hover:border-hairline-strong hover:bg-canvas-sunken/60'
						)}
					>
						<div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 shadow-xs">
							<HugeiconsIcon icon={Settings01Icon} size={22} strokeWidth={1.8} />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between">
								<span class="text-[14.5px] font-bold {isSettingsActive ? 'text-sky-700 dark:text-sky-300' : 'text-ink'}">
									{labels.settings ?? 'Tetapan'}
								</span>
								<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} class="text-mute" />
							</div>
							<p class="mt-0.5 text-xs text-mute truncate">
								{labels.settingsDesc ?? 'Profil peribadi, notifikasi dan keselamatan'}
							</p>
						</div>
					</button>
				</div>
			</div>
		</div>
		<!-- Footer Safe Area -->
		<div class="shrink-0 pb-[env(safe-area-inset-bottom)]"></div>
	</div>
{/if}
