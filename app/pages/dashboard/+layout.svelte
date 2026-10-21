<script lang="ts">
  import { page } from '$app/stores';
  import { goto, invalidateAll } from '$app/navigation';
  import { api, ApiError } from '$lib/api/client';
  import type { ApiAccount } from '$lib/api/client';
  import type { LayoutData } from '../$types';
  import { SidebarRail, Topbar, Toaster, NotificationCenter, OnboardingProvider, ChatDock, ChallengeWidget, Dialog } from '$lib/components/organisms/index.js';
  import type { NotificationItem } from '$lib/components/organisms/shared.js';
  import { Avatar, Button, Input } from '$lib/components/atoms/index.js';
  import { DropdownMenu, FormField, toast, type MenuItem } from '$lib/components/molecules/index.js';
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
    InformationCircleIcon,
    Menu01Icon,
    SquareDashedKanbanIcon,
    UserSwitchIcon,
    Add01Icon,
    BubbleChatIcon,
    PanelLeftOpenIcon
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
  let switchingAccount = $state(false);
  let notificationItems = $state<NotificationItem[]>([]);
  let accounts = $state<ApiAccount[]>([]);
  let sidebarCollapsed = $state(false);
  let workspaces = $state<
    Array<{ id: string; name: string; slug: string; role: 'owner' | 'member'; joinedAt: string }>
  >([]);
  let mobileNavOpen = $state(false);
  let creatingWorkspace = $state(false);
  let createWorkspaceOpen = $state(false);
  let newWorkspaceName = $state('');
  let createWorkspaceError = $state('');
  let unreadMessageCount = $state(0);
  let unreadRefreshSequence = 0;

  async function loadUnreadMessages(workspaceId: string) {
    const requestSequence = ++unreadRefreshSequence;
    try {
      const result = await api.getChatUnread(workspaceId);
      if (requestSequence === unreadRefreshSequence) {
        unreadMessageCount = result.unread;
      }
    } catch {
      // Keep the last known count when the authoritative refresh fails.
    }
  }

  $effect(() => {
    const workspaceId = data.workspace?.id;
    const userId = data.user?.id;

    if (!workspaceId || !userId) {
      unreadRefreshSequence += 1;
      unreadMessageCount = 0;
      return;
    }

    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const maxRetries = 5;

    const scheduleReconnect = () => {
      if (disposed || retryCount >= maxRetries) return;
      retryCount += 1;
      reconnectTimer = setTimeout(connect, 2500 * retryCount);
    };

    const connect = () => {
      if (disposed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = import.meta.env.DEV ? `${window.location.hostname}:3001` : window.location.host;
      const url = `${protocol}//${wsHost}/api/chat/ws?workspaceId=${encodeURIComponent(workspaceId)}`;

      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        retryCount = 0;
        void loadUnreadMessages(workspaceId);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type?: string;
            userId?: string;
            message?: { senderId?: string };
          };

          const senderId = payload.message?.senderId;
          if (payload.type === 'message:new' && senderId && senderId !== userId) {
            unreadMessageCount += 1;
          } else if (payload.type === 'read' && payload.userId === userId) {
            void loadUnreadMessages(workspaceId);
          }
        } catch {
          // Ignore malformed socket payloads.
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (!disposed) scheduleReconnect();
      };
    };

    void loadUnreadMessages(workspaceId);
    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  });

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

  $effect(() => {
    if (!data.user) {
      accounts = [];
      return;
    }

    api
      .listAccounts()
      .then((res) => {
        accounts = res.accounts ?? [];
      })
      .catch(() => {
        accounts = [];
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
      href: '/dashboard/chat',
      label: tr('nav.messages'),
      active: $page.url.pathname.startsWith('/dashboard/chat'),
      badge: unreadMessageCount > 0 ? unreadMessageCount : undefined,
      icon: messagesIcon
    },
    {
      href: '/dashboard/workflows',
      label: tr('nav.workflows'),
      active: $page.url.pathname.startsWith('/dashboard/workflows'),
      icon: workflowsIcon
    },
    {
      href: '/dashboard/boards',
      label: tr('nav.boards'),
      active: $page.url.pathname.startsWith('/dashboard/boards'),
      icon: boardsIcon
    },
    {
      href: '/dashboard/members',
      label: tr('nav.members'),
      active: $page.url.pathname.startsWith('/dashboard/members'),
      icon: usersIcon
    }
  ]);

  const isChatPage = $derived($page.url.pathname.startsWith('/dashboard/chat'));
  const isBoardDetailPage = $derived(
    $page.url.pathname.startsWith('/dashboard/boards/') &&
    $page.url.pathname !== '/dashboard/boards'
  );
  const isWorkflowDetailPage = $derived(
    $page.url.pathname.startsWith('/dashboard/workflows/') &&
    $page.url.pathname !== '/dashboard/workflows' &&
    $page.url.pathname !== '/dashboard/workflows/new-ai' &&
    !$page.url.pathname.endsWith('/stats') &&
    !$page.url.pathname.endsWith('/settings')
  );

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
      await goto('/dashboard/chat');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('shell.switchWorkspace'));
    } finally {
      switchingWorkspace = false;
    }
  }

  function openCreateWorkspace() {
    newWorkspaceName = '';
    createWorkspaceError = '';
    createWorkspaceOpen = true;
  }

  async function createWorkspace() {
    const name = newWorkspaceName.trim();
    if (!name || creatingWorkspace) return;

    creatingWorkspace = true;
    createWorkspaceError = '';
    try {
      await api.createWorkspace(name);
      createWorkspaceOpen = false;
      await invalidateAll();
      await goto('/dashboard');
    } catch (err) {
      createWorkspaceError = err instanceof ApiError ? err.message : tr('shell.createWorkspaceError');
    } finally {
      creatingWorkspace = false;
    }
  }

  async function switchAccount(accountId: string) {
    if (!data.user || accountId === data.user.id || switchingAccount) return;

    switchingAccount = true;
    try {
      await api.switchAccount(accountId);
      await invalidateAll();
      await goto('/dashboard');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('shell.switchAccountError'));
    } finally {
      switchingAccount = false;
    }
  }

  const workspaceMenuItems = $derived<MenuItem[]>([
    ...workspaces.map((workspace) => ({
      label: workspace.name,
      disabled: switchingWorkspace || creatingWorkspace || workspace.id === data.workspace?.id,
      icon: workspace.id === data.workspace?.id ? checkIcon : buildingIcon,
      onselect: () => switchWorkspace(workspace.id)
    })),
    {
      label: tr('shell.addWorkspace'),
      icon: addIcon,
      separatorBefore: workspaces.length > 0,
      disabled: creatingWorkspace,
      onselect: openCreateWorkspace
    }
  ]);

  const canSwitchWorkspace = $derived(Boolean(data.user));

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

    return () => {
      clearInterval(timer);
    };
  });

  async function markAllNotificationsRead() {
    if (!data.workspace?.id) return;
    await api.markAllNotificationsRead(data.workspace.id);
    await loadNotifications();
  }

  const switchAccountMenuItems = $derived<MenuItem[]>([
    ...accounts.map((account) => ({
      label: account.name,
      description: account.email,
      avatar: { name: account.name, src: account.avatarUrl },
      active: account.id === data.user?.id,
      disabled: switchingAccount || account.id === data.user?.id,
      onselect: () => switchAccount(account.id)
    })),
    {
      label: tr('shell.addAccount'),
      icon: userSwitchIcon,
      separatorBefore: accounts.length > 0,
      onselect: () => goto('/login?addAccount=1')
    }
  ]);

  const userMenuItems = $derived<MenuItem[]>([
    {
      label: data.user?.name ?? tr('shell.myAccount'),
      disabled: true
    },
    {
      label: tr('shell.switchWorkspace') || 'Tukar ruang kerja',
      icon: buildingIcon,
      submenu: workspaceMenuItems
    },
    {
      label: tr('shell.switchAccount'),
      icon: userSwitchIcon,
      submenu: switchAccountMenuItems
    },
    {
      label: tr('shell.profileSettings'),
      icon: settingsIcon,
      separatorBefore: true,
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
  let challengeData = $state<{ challenges: any[]; labels: any } | null>(null);
  $effect(() => {
    function handleChallengeData(e: Event) {
      challengeData = (e as CustomEvent).detail;
    }
    window.addEventListener('challenge-data', handleChallengeData);
    return () => window.removeEventListener('challenge-data', handleChallengeData);
  });
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
{#snippet boardsIcon()}
  <HugeiconsIcon icon={SquareDashedKanbanIcon} size={20} strokeWidth={1.8} />
{/snippet}
{#snippet messagesIcon()}
  <HugeiconsIcon icon={BubbleChatIcon} size={20} strokeWidth={1.8} />
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
{#snippet userSwitchIcon()}
  <HugeiconsIcon icon={UserSwitchIcon} size={16} strokeWidth={1.8} />
{/snippet}
{#snippet addIcon()}
  <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
{/snippet}
{#snippet checkIcon()}
  <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={1.8} />
{/snippet}
{#snippet buildingIcon()}
  <HugeiconsIcon icon={Building06Icon} size={16} strokeWidth={1.8} />
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
    workspaceName={data.workspace?.name ?? 'actjom'}
    workspaceRole={data.workspace?.role ? (data.workspace.role === 'owner' ? 'Owner' : 'Member') : undefined}
    workspaces={workspaces}
    currentWorkspaceId={data.workspace?.id}
    onSwitchWorkspace={switchWorkspace}
    onCreateWorkspace={openCreateWorkspace}
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
      addWorkspace: tr('shell.addWorkspace'),
    }}
  />

  <div class="flex h-screen min-w-0 flex-1 flex-col {isChatPage || isBoardDetailPage || isWorkflowDetailPage ? 'overflow-hidden' : 'overflow-y-auto'} transition-[padding] duration-200 ease-out {sidebarCollapsed ? 'md:pl-[68px]' : 'md:pl-[248px]'}">
    <Topbar
      title={data.workspace?.name ?? 'actjom'}
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

          {#if sidebarCollapsed}
            <button
              type="button"
              onclick={toggleSidebar}
              class="hidden size-9 shrink-0 items-center justify-center rounded-lg text-mute transition-colors hover:bg-canvas-sunken hover:text-ink md:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
              aria-label="Kembangkan sidebar"
              title="Kembangkan sidebar (⌘B)"
            >
              <HugeiconsIcon icon={PanelLeftOpenIcon} size={18} strokeWidth={1.8} />
            </button>
          {/if}

          {#if !isBoardDetailPage && !isWorkflowDetailPage}
            <h2 class="truncate text-sm font-semibold text-ink sm:text-base sm:font-semibold">
              {switchingWorkspace ? tr('shell.switchingWorkspace') : (data.workspace?.name ?? 'actjom')}
            </h2>
          {/if}
        </div>
      {/snippet}
      {#snippet actions()}
        <button
          type="button"
          onclick={() => (window as any).__onboardingReplayTour?.()}
          class="flex size-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-card text-mute shadow-control transition-colors hover:border-hairline-strong hover:text-ink"
          aria-label={tr('onboarding.tourReplay')}
          title={tr('onboarding.tourReplay')}
        >
          <HugeiconsIcon icon={InformationCircleIcon} size={16} strokeWidth={1.8} />
        </button>
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

    {#if isChatPage}
      <main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas p-0">
        <div class="flex h-full w-full min-h-0 flex-1 flex-col">
          <OnboardingProvider>
            {@render children()}
          </OnboardingProvider>
        </div>
      </main>
    {:else if isBoardDetailPage || isWorkflowDetailPage}
      <div class="flex min-h-0 flex-1 overflow-hidden">
        <main class="flex-1 min-w-0 flex flex-col overflow-hidden bg-canvas p-0">
          <div class="flex h-full w-full min-h-0 flex-1 flex-col">
            <OnboardingProvider>
              {@render children()}
            </OnboardingProvider>
          </div>
        </main>

        {#if data.workspace?.id && data.user}
          <ChatDock
            workspaceId={data.workspace.id}
            userId={data.user.id}
            userName={data.user.name}
            userAvatarUrl={data.user.avatarUrl ?? null}
          />
        {/if}
      </div>
    {:else}
      <div class="flex min-h-0 flex-1 overflow-hidden">
        <main class="flex-1 min-w-0 overflow-y-auto bg-canvas px-3.5 pt-4 pb-8 sm:px-6 md:px-8 md:pt-16 md:pb-10">
          <div class="mx-auto w-full max-w-[1280px]">
            <OnboardingProvider>
              {@render children()}
            </OnboardingProvider>
          </div>
        </main>

        {#if data.workspace?.id && data.user}
          <ChatDock
            workspaceId={data.workspace.id}
            userId={data.user.id}
            userName={data.user.name}
            userAvatarUrl={data.user.avatarUrl ?? null}
          />
        {/if}
      </div>
    {/if}
  </div>
  {#if challengeData && !isChatPage}
    <ChallengeWidget challenges={challengeData.challenges} labels={challengeData.labels} />
  {/if}
  <Toaster />

  <Dialog
    bind:open={createWorkspaceOpen}
    title={tr('shell.createWorkspaceTitle')}
    description={tr('shell.createWorkspaceDescription')}
  >
    <form
      class="space-y-4"
      onsubmit={(event) => {
        event.preventDefault();
        void createWorkspace();
      }}
    >
      <FormField label={tr('shell.workspaceName')} required>
        {#snippet control(args)}
          <Input
            {...args}
            bind:value={newWorkspaceName}
            maxlength={120}
            required
            disabled={creatingWorkspace}
            placeholder={tr('shell.workspaceNamePlaceholder')}
          />
        {/snippet}
      </FormField>
      {#if createWorkspaceError}
        <p class="ds-caption text-status-urgent" role="alert">{createWorkspaceError}</p>
      {/if}
    </form>
    {#snippet footer()}
      <div class="flex justify-end gap-2">
        <Button variant="secondary" disabled={creatingWorkspace} onclick={() => (createWorkspaceOpen = false)}>
          {tr('common.cancel')}
        </Button>
        <Button
          variant="primary"
          loading={creatingWorkspace}
          disabled={!newWorkspaceName.trim() || creatingWorkspace}
          onclick={createWorkspace}
        >
          {tr('shell.createWorkspace')}
        </Button>
      </div>
    {/snippet}
  </Dialog>
</div>
