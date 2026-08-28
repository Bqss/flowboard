<script lang="ts">
  import '../../ds.css';
  import { page } from '$app/stores';
  import { goto, invalidateAll } from '$app/navigation';
  import { api, ApiError } from '$lib/api/client';
  import type { LayoutData } from '../$types';
  import { SidebarRail, Topbar, Toaster, NotificationCenter } from '$lib/components/organisms/index.js';
  import type { NotificationItem } from '$lib/components/organisms/shared.js';
  import { Avatar } from '$lib/components/atoms/index.js';
  import { DropdownMenu, toast, type MenuItem } from '$lib/components/molecules/index.js';
  import { dashboardIntlLocale, dashboardText } from '$lib/i18n/dashboard.js';
  import { locale, locales, setLocale } from '$lib/i18n/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Home09Icon,
    UserGroupIcon,
    Settings01Icon,
    Layers01Icon,
    WorkflowSquare01Icon,
    Logout03Icon,
    ArrowDown01Icon,
    Building06Icon,
    Tick02Icon,
    ShieldUserIcon,
    DashboardSquare02Icon,
    CreditCardIcon,
    GiftIcon,
    Plug02Icon,
    Menu01Icon
  } from '@hugeicons/core-free-icons';
  let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);
  const themeLabels = $derived({
    light: tr('shell.themeLight'),
    dark: tr('shell.themeDark'),
    system: tr('shell.themeSystem'),
    group: tr('shell.themeGroup')
  });

  let loggingOut = $state(false);
  let switchingWorkspace = $state(false);
  let notificationItems = $state<NotificationItem[]>([]);
  let workspaces = $state<
    Array<{ id: string; name: string; slug: string; role: 'owner' | 'member'; joinedAt: string }>
  >([]);
  let sidebarCollapsed = $state(false);
  let mobileNavOpen = $state(false);

  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      sidebarCollapsed = localStorage.getItem('flowboard-sidebar-collapsed') === 'true';
    }
  });

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('flowboard-sidebar-collapsed', String(sidebarCollapsed));
    }
  }
  $effect(() => {
    if (!data.user) {
      workspaces = [];
      return;
    }

    api
      .listWorkspaces()
      .then((res) => {
        workspaces = res.workspaces ?? [];
      })
      .catch(() => {
        workspaces = [];
      });
  });

  const navItems = $derived([
    {
      href: '/dashboard',
      label: tr('nav.dashboard'),
      active: $page.url.pathname === '/dashboard',
      icon: homeIcon
    },
    {
      href: '/dashboard/workflows',
      label: tr('nav.workflows'),
      active: $page.url.pathname.startsWith('/dashboard/workflows'),
      icon: workflowsIcon
    },
    {
      href: '/dashboard/members',
      label: tr('nav.members'),
      active: $page.url.pathname.startsWith('/dashboard/members'),
      icon: usersIcon
    }
  ]);

  const settingsItems = $derived([
    {
      href: '/dashboard/settings/integrations',
      label: tr('nav.integrations'),
      active: $page.url.pathname.startsWith('/dashboard/settings/integrations'),
      icon: integrationsIcon
    },
    {
      href: '/dashboard/settings',
      label: tr('nav.settings'),
      active:
        $page.url.pathname === '/dashboard/settings' ||
        $page.url.pathname === '/dashboard/settings/',
      icon: settingsIcon
    }
  ]);

  // Admin mode — when ON, sidebar shows admin navigation instead of workspace nav.
  // Persisted in localStorage so it survives page reloads. Only available to platformAdmins.
  let adminMode = $state(false);

  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('flowboard-admin-mode');
      adminMode = stored === 'true' && Boolean(data.user?.platformAdmin);
    }
  });

  function toggleAdminMode() {
    adminMode = !adminMode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('flowboard-admin-mode', String(adminMode));
    }
    if (adminMode) {
      goto('/dashboard/admin');
    } else {
      goto('/dashboard');
    }
  }

  const isAdminPath = $derived($page.url.pathname.startsWith('/dashboard/admin'));

  // Auto-enable admin mode if landing on an admin page while it's off.
  $effect(() => {
    if (isAdminPath && !adminMode && data.user?.platformAdmin) {
      adminMode = true;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('flowboard-admin-mode', 'true');
      }
    }
  });

  const adminNavItems = $derived([
    {
      href: '/dashboard/admin',
      label: tr('admin.nav.overview'),
      active: $page.url.pathname === '/dashboard/admin',
      icon: adminOverviewIcon
    },
    {
      href: '/dashboard/admin/users',
      label: tr('admin.nav.users'),
      active: $page.url.pathname.startsWith('/dashboard/admin/users'),
      icon: usersIcon
    },
    {
      href: '/dashboard/admin/subscriptions',
      label: tr('admin.nav.subscriptions'),
      active: $page.url.pathname.startsWith('/dashboard/admin/subscriptions'),
      icon: subscriptionsIcon
    },
    {
      href: '/dashboard/admin/vouchers',
      label: tr('admin.nav.vouchers'),
      active: $page.url.pathname.startsWith('/dashboard/admin/vouchers'),
      icon: vouchersIcon
    }
  ]);

  // When admin mode is ON, sidebar shows admin nav. Otherwise normal nav.
  const sidebarItems = $derived(adminMode ? adminNavItems : navItems);
  const sidebarSettingsItems = $derived(adminMode ? [] : settingsItems);

  async function logout() {
    loggingOut = true;
    try {
      await api.logout();
      await invalidateAll();
      await goto('/login');
    } finally {
      loggingOut = false;
    }
  }

  async function switchWorkspace(workspaceId: string) {
    if (!data.user || workspaceId === data.workspace?.id || switchingWorkspace) return;

    switchingWorkspace = true;
    try {
      await api.switchWorkspace(workspaceId);
      await invalidateAll();
      await goto('/dashboard');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('shell.switchWorkspace'));
    } finally {
      switchingWorkspace = false;
    }
  }

  const workspaceMenuItems = $derived<MenuItem[]>(
    workspaces.map((workspace) => ({
      label: workspace.name,
      disabled: switchingWorkspace || workspace.id === data.workspace?.id,
      icon: workspace.id === data.workspace?.id ? checkIcon : buildingIcon,
      onselect: () => switchWorkspace(workspace.id)
    }))
  );

  const canSwitchWorkspace = $derived(workspaces.length > 1);

  async function loadNotifications() {
    if (!data.workspace?.id) {
      notificationItems = [];
      return;
    }

    try {
      const res = await api.listNotifications(data.workspace.id);
      notificationItems = res.notifications.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        time: new Date(item.createdAt).toLocaleString(dashboardIntlLocale($locale), {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }),
        unread: !item.read,
        onselect: async () => {
          if (!data.workspace?.id || item.read) return;
          await api.markNotificationRead(data.workspace.id, item.id);
          await loadNotifications();
        }
      }));
    } catch {
      notificationItems = [];
    }
  }

  $effect(() => {
    $locale;
    if (!data.workspace?.id) return;
    void loadNotifications();
    const timer = setInterval(() => {
      void loadNotifications();
    }, 30_000);
    return () => clearInterval(timer);
  });

  async function markAllNotificationsRead() {
    if (!data.workspace?.id) return;
    await api.markAllNotificationsRead(data.workspace.id);
    await loadNotifications();
  }

  const userMenuItems = $derived<MenuItem[]>([
    {
      label: data.user?.name ?? tr('shell.myAccount'),
      disabled: true
    },
    {
      label: tr('shell.profileSettings'),
      icon: settingsIcon,
      onselect: () => goto('/dashboard/settings')
    },
    {
      label: tr('shell.workspaceMembers'),
      icon: usersIcon,
      onselect: () => goto('/dashboard/members')
    },
    {
      label: loggingOut ? tr('shell.signingOut') : tr('shell.signOut'),
      destructive: true,
      separatorBefore: true,
      icon: logoutIcon,
      disabled: loggingOut,
      onselect: logout
    }
  ]);
</script>

{#snippet homeIcon()}
  <HugeiconsIcon icon={Home09Icon} size={20} strokeWidth={1.8} />
{/snippet}
{#snippet usersIcon()}
  <HugeiconsIcon icon={UserGroupIcon} size={20} strokeWidth={1.8} />
{/snippet}
{#snippet workflowsIcon()}
  <HugeiconsIcon icon={WorkflowSquare01Icon} size={20} strokeWidth={1.8} />
{/snippet}
{#snippet settingsIcon()}
  <HugeiconsIcon icon={Settings01Icon} size={20} strokeWidth={1.8} />
{/snippet}
{#snippet integrationsIcon()}
  <HugeiconsIcon icon={Plug02Icon} size={20} strokeWidth={1.8} />
{/snippet}
{#snippet designIcon()}
  <HugeiconsIcon icon={Layers01Icon} size={20} strokeWidth={1.8} />
{/snippet}
{#snippet logoutIcon()}
  <HugeiconsIcon icon={Logout03Icon} size={16} strokeWidth={1.8} />
{/snippet}
{#snippet buildingIcon()}
  <HugeiconsIcon icon={Building06Icon} size={16} strokeWidth={1.8} />
{/snippet}
{#snippet checkIcon()}
  <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={1.8} />
{/snippet}
{#snippet adminOverviewIcon()}
  <HugeiconsIcon icon={DashboardSquare02Icon} size={20} strokeWidth={1.8} />
{/snippet}
{#snippet subscriptionsIcon()}
  <HugeiconsIcon icon={CreditCardIcon} size={20} strokeWidth={1.8} />
{/snippet}
{#snippet vouchersIcon()}
  <HugeiconsIcon icon={GiftIcon} size={20} strokeWidth={1.8} />
{/snippet}

<div data-theme="app" class="flex min-h-screen w-full bg-canvas text-body">
  <SidebarRail
    items={sidebarItems}
    settingsItems={sidebarSettingsItems}
    userName={data.user?.name ?? 'User'}
    userEmail={data.user?.email}
    userRole={data.user?.platformAdmin ? 'Platform Admin' : (data.workspace?.role === 'owner' ? 'Owner' : 'Member')}
    userSrc={data.user?.avatarUrl ?? undefined}
    workspaceName={data.workspace?.name ?? 'Flowboard'}
    workspaceRole={data.workspace?.role ? (data.workspace.role === 'owner' ? 'Owner' : 'Member') : undefined}
    workspaces={workspaces}
    currentWorkspaceId={data.workspace?.id}
    onSwitchWorkspace={switchWorkspace}
    collapsed={sidebarCollapsed}
    onToggleCollapse={toggleSidebar}
    bind:mobileOpen={mobileNavOpen}
    isPlatformAdmin={Boolean(data.user?.platformAdmin)}
    adminMode={adminMode}
    onToggleAdminMode={toggleAdminMode}
    onLogout={logout}
    labels={{
      ariaLabel: tr('nav.dashboard'),
      subtitle: adminMode ? tr('admin.shell') : tr('shell.productSubtitle'),
      settings: tr('nav.settingsGroup'),
      admin: tr('nav.admin'),
      adminMode: tr('nav.adminMode'),
      exitAdmin: tr('nav.exitAdmin'),
      signOut: tr('shell.signOut'),
      search: tr('shell.search'),
      noResults: tr('common.noResults')
    }}
  />

  <div class="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto transition-[padding] duration-200 ease-out {sidebarCollapsed ? 'md:pl-[68px]' : 'md:pl-[248px]'}">
    <Topbar
      title={data.workspace?.name ?? 'Flowboard'}
      showSearch={false}
      searchPlaceholder={tr('shell.search')}
      themeLabels={themeLabels}
    >
      {#snippet heading()}
        <div class="flex items-center gap-2">
          <!-- Mobile Menu Button -->
          <button
            type="button"
            onclick={() => (mobileNavOpen = true)}
            class="flex size-9 shrink-0 items-center justify-center rounded-lg text-mute transition-colors hover:bg-canvas-sunken hover:text-ink md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            aria-label="Open menu"
          >
            <HugeiconsIcon icon={Menu01Icon} size={20} strokeWidth={2} />
          </button>

          {#if canSwitchWorkspace}
            <DropdownMenu items={workspaceMenuItems} align="start" label={tr('shell.chooseWorkspace')}>
              {#snippet trigger({ open, toggle })}
                <button
                  type="button"
                  onclick={toggle}
                  class="flex max-w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-canvas-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  aria-expanded={open}
                  aria-label={tr('shell.switchWorkspace')}
                  disabled={switchingWorkspace}
                >
                  <span class="truncate text-base font-semibold text-ink sm:text-xl sm:font-semibold sm:tracking-[-0.015em]">
                    {switchingWorkspace ? tr('shell.switchingWorkspace') : (data.workspace?.name ?? 'Flowboard')}
                  </span>
                  <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={1.8} class="shrink-0 text-mute" />
                </button>
              {/snippet}
            </DropdownMenu>
          {:else}
            <h2 class="truncate text-base font-semibold text-ink sm:text-xl sm:font-semibold sm:tracking-[-0.015em]">{data.workspace?.name ?? 'Flowboard'}</h2>
          {/if}
        </div>
      {/snippet}
      {#snippet actions()}
        {#if data.user?.platformAdmin}
          <button
            type="button"
            onclick={toggleAdminMode}
            class="group hidden items-center gap-2 rounded-full border border-hairline bg-card px-3 py-1.5 shadow-control transition-colors hover:border-hairline-strong sm:inline-flex"
            aria-pressed={adminMode}
            aria-label={adminMode ? tr('nav.exitAdmin') : tr('nav.adminMode')}
            title={adminMode ? tr('nav.exitAdmin') : tr('nav.adminMode')}
          >
            <span class="text-[11px] font-semibold tracking-wide text-mute transition-colors group-hover:text-ink">
              {tr('nav.adminMode')}
            </span>
            <span class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {adminMode ? 'bg-primary' : 'bg-hairline-strong'}">
              <span class="absolute left-0.5 inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform {adminMode ? 'translate-x-4' : 'translate-x-0'}">
                <HugeiconsIcon icon={ShieldUserIcon} size={10} strokeWidth={2.2} class={adminMode ? 'text-primary' : 'text-mute'} />
              </span>
            </span>
          </button>
        {/if}
        <div class="hidden items-center rounded-full border border-hairline bg-card p-0.5 shadow-control sm:inline-flex" aria-label={tr('language.label')}>
          {#each locales as language}
            <button
              type="button"
              class="rounded-full px-2 py-1 text-[10px] font-bold tracking-wide transition-colors {$locale === language.code ? 'bg-primary text-white' : 'text-mute hover:bg-canvas-sunken hover:text-ink'}"
              aria-label={`${tr('language.label')}: ${tr(`language.${language.code}`)}`}
              aria-pressed={$locale === language.code}
              onclick={() => setLocale(language.code)}
            >
              {language.short}
            </button>
          {/each}
        </div>
        <NotificationCenter
          items={notificationItems}
          title={tr('shell.notifications')}
          emptyText={tr('shell.emptyNotifications')}
          markAllReadText={tr('shell.markRead')}
          allReadText={tr('shell.allRead')}
          onmarkAllRead={markAllNotificationsRead}
        />
        <DropdownMenu items={userMenuItems} align="end">
          {#snippet trigger({ open, toggle })}
            <button
              type="button"
              onclick={toggle}
              class="flex items-center gap-2 rounded-full border border-hairline bg-card py-1 pl-1.5 pr-2 shadow-control transition-all hover:border-hairline-strong hover:bg-canvas-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] sm:pr-3"
              aria-expanded={open}
              aria-label={tr('shell.userMenu')}
            >
              <div class="relative">
                <Avatar name={data.user?.name} src={data.user?.avatarUrl ?? undefined} size={28} />
                <span class="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-card bg-presence-online"></span>
              </div>
              <span class="ds-label hidden max-w-[130px] truncate text-ink md:inline">{data.user?.name ?? 'User'}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={1.8} class="hidden text-mute sm:block" />
            </button>
          {/snippet}
        </DropdownMenu>
      {/snippet}
    </Topbar>

    <main class="flex-1 bg-canvas px-4 pt-6 pb-8 sm:px-6 md:px-8 md:pt-16 md:pb-10">
      <div class="mx-auto w-full max-w-[1280px]">
        {@render children()}
      </div>
    </main>
  </div>

  <Toaster />
</div>
