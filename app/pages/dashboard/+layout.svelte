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
    Tick02Icon
  } from '@hugeicons/core-free-icons';

  let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

  let loggingOut = $state(false);
  let switchingWorkspace = $state(false);
  let notificationItems = $state<NotificationItem[]>([]);
  let workspaces = $state<
    Array<{ id: string; name: string; slug: string; role: 'owner' | 'member'; joinedAt: string }>
  >([]);

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
      label: 'Dashboard',
      active: $page.url.pathname === '/dashboard',
      icon: homeIcon
    },
    {
      href: '/dashboard/workflows',
      label: 'Workflows',
      active: $page.url.pathname.startsWith('/dashboard/workflows'),
      icon: workflowsIcon
    },
    {
      href: '/dashboard/members',
      label: 'Members',
      active: $page.url.pathname.startsWith('/dashboard/members'),
      icon: usersIcon
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      active:
        $page.url.pathname === '/dashboard/settings' ||
        $page.url.pathname === '/dashboard/settings/',
      icon: settingsIcon
    },
    {
      href: '/dashboard/settings/integrations',
      label: 'Integrations',
      active: $page.url.pathname.startsWith('/dashboard/settings/integrations'),
      icon: settingsIcon
    }
  ]);

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
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengganti workspace.');
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
        time: new Date(item.createdAt).toLocaleString('id-ID', {
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
      label: data.user?.name ?? 'Akun Saya',
      disabled: true
    },
    {
      label: 'Pengaturan Profil',
      icon: settingsIcon,
      onselect: () => goto('/dashboard/settings')
    },
    {
      label: 'Anggota Workspace',
      icon: usersIcon,
      onselect: () => goto('/dashboard/members')
    },
    {
      label: loggingOut ? 'Keluar…' : 'Keluar (Sign out)',
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

<div data-theme="app" class="flex min-h-screen w-full bg-canvas text-body">
  <SidebarRail items={navItems} userName={data.user?.name ?? 'User'} userSrc={data.user?.avatarUrl ?? undefined} />

  <div class="flex min-w-0 flex-1 flex-col md:pl-[76px]">
    <Topbar
      title={data.workspace?.name ?? 'Flowboard'}
      showSearch={false}
    >
      {#snippet heading()}
        {#if canSwitchWorkspace}
          <DropdownMenu items={workspaceMenuItems} align="start" label="Pilih workspace">
            {#snippet trigger({ open, toggle })}
              <button
                type="button"
                onclick={toggle}
                class="flex max-w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-canvas-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                aria-expanded={open}
                aria-label="Ganti workspace"
                disabled={switchingWorkspace}
              >
                <span class="ds-section-title truncate text-ink">
                  {switchingWorkspace ? 'Mengganti…' : (data.workspace?.name ?? 'Flowboard')}
                </span>
                <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={1.8} class="shrink-0 text-mute" />
              </button>
            {/snippet}
          </DropdownMenu>
        {:else}
          <h2 class="ds-section-title text-ink">{data.workspace?.name ?? 'Flowboard'}</h2>
        {/if}
      {/snippet}
      {#snippet actions()}
        <NotificationCenter
          items={notificationItems}
          onmarkAllRead={markAllNotificationsRead}
        />
        <DropdownMenu items={userMenuItems} align="end">
          {#snippet trigger({ open, toggle })}
            <button
              type="button"
              onclick={toggle}
              class="flex items-center gap-2.5 rounded-full border border-hairline bg-card py-1 pl-1.5 pr-3 shadow-control transition-all hover:border-hairline-strong hover:bg-canvas-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              aria-expanded={open}
              aria-label="Menu pengguna"
            >
              <div class="relative">
                <Avatar name={data.user?.name} src={data.user?.avatarUrl ?? undefined} size={28} />
                <span class="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-card bg-presence-online"></span>
              </div>
              <span class="ds-label hidden max-w-[130px] truncate text-ink md:inline">{data.user?.name ?? 'User'}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={1.8} class="text-mute" />
            </button>
          {/snippet}
        </DropdownMenu>
      {/snippet}
    </Topbar>

    <main class="flex-1 overflow-auto bg-canvas p-6 md:p-8">
      <div class="mx-auto w-full max-w-[1280px]">
        {@render children()}
      </div>
    </main>
  </div>

  <Toaster />
</div>
