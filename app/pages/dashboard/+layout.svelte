<script lang="ts">
  import { page } from '$app/stores';
  import { goto, invalidateAll } from '$app/navigation';
  import { api, ApiError } from '$lib/api/client';
  import type { ApiAccount, ApiNotification } from '$lib/api/client';
  import type { LayoutData } from '../$types';
  import { SidebarRail, Topbar, Toaster, NotificationCenter, OnboardingProvider, ChatDock, ChallengeWidget, Dialog, BottomTabBar, MobileMenuDrawer } from '$lib/components/organisms/index.js';
  import type { NotificationItem } from '$lib/components/organisms/shared.js';
  import { Avatar, Button, Input, Logo } from '$lib/components/atoms/index.js';
  import { DropdownMenu, FormField, toast, type MenuItem } from '$lib/components/molecules/index.js';
  import { dashboardIntlLocale, dashboardText } from '$lib/i18n/dashboard.js';
  import { locale, locales, setLocale } from '$lib/i18n/index.js';
  import { setMode, userPrefersMode } from 'mode-watcher';
  import { unlockNotificationSound } from '$lib/notifications/sound.js';
  import { triggerBuzz } from '$lib/notifications/buzz.js';
  import {
    isAutoBuzzTaskNotification,
    shouldAutoBuzzIncomingMessage
  } from '$lib/notifications/auto-buzz.js';
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
    PanelLeftOpenIcon,
    Globe02Icon,
    Sun02Icon,
    Moon02Icon
  } from '@hugeicons/core-free-icons';
  let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  const isNotificationType = (value: unknown): value is ApiNotification['type'] => {
    switch (value) {
      case 'wa_failed':
      case 'customer_replied':
      case 'card_overdue':
      case 'card_due_soon':
      case 'handover':
      case 'workflow_action':
      case 'chat_reaction':
      case 'task_assigned':
      case 'task_comment':
      case 'task_mention':
      case 'task_due_soon':
      case 'task_overdue':
        return true;
      default:
        return false;
    }
  };

  const isNullableString = (value: unknown): value is string | null =>
    value === null || typeof value === 'string';

  const isWorkspaceNotification = (
    value: unknown
  ): value is ApiNotification & { workspaceId: string } => {
    if (!value || typeof value !== 'object') return false;
    return (
      'id' in value &&
      typeof value.id === 'string' &&
      'workspaceId' in value &&
      typeof value.workspaceId === 'string' &&
      'type' in value &&
      isNotificationType(value.type) &&
      'title' in value &&
      typeof value.title === 'string' &&
      'body' in value &&
      typeof value.body === 'string' &&
      'cardId' in value &&
      isNullableString(value.cardId) &&
      'conversationId' in value &&
      isNullableString(value.conversationId) &&
      'boardId' in value &&
      isNullableString(value.boardId) &&
      'taskId' in value &&
      isNullableString(value.taskId) &&
      'read' in value &&
      typeof value.read === 'boolean' &&
      'createdAt' in value &&
      typeof value.createdAt === 'string'
    );
  };

  type PushNotificationAlert = {
    notificationId: string;
    workspaceId: string;
    type: ApiNotification['type'];
    title: string;
    body: string;
    appBody: string;
    url: string;
  };

  const readPushNotificationAlert = (value: unknown): PushNotificationAlert | null => {
    if (!value || typeof value !== 'object') return null;
    if (
      !('notificationId' in value) ||
      typeof value.notificationId !== 'string' ||
      !('workspaceId' in value) ||
      typeof value.workspaceId !== 'string' ||
      !('type' in value) ||
      !isNotificationType(value.type) ||
      !('title' in value) ||
      typeof value.title !== 'string' ||
      !('body' in value) ||
      typeof value.body !== 'string' ||
      !('url' in value) ||
      typeof value.url !== 'string'
    ) {
      return null;
    }
    return {
      notificationId: value.notificationId,
      workspaceId: value.workspaceId,
      type: value.type,
      title: value.title,
      body: value.body,
      appBody: 'appBody' in value && typeof value.appBody === 'string' ? value.appBody : value.body,
      url: value.url
    };
  };

  const notificationTitle = (item: Pick<ApiNotification, 'type' | 'title'>) => {
    switch (item.type) {
      case 'chat_message':
        return item.title || tr('notifications.chatMessage');
      case 'task_assigned':
        return tr('notifications.taskAssigned');
      case 'task_comment':
        return tr('notifications.taskComment');
      case 'task_mention':
        return tr('notifications.taskMention');
      case 'task_due_soon':
        return tr('notifications.taskDueSoon');
      case 'task_overdue':
        return tr('notifications.taskOverdue');
      default:
        return item.title;
    }
  };

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
  let notificationUnreadCount = $state(0);
  let soundAlertsEnabled = $state(false);
  const seenNotificationIds = new Map<string, Set<string>>();
  const notificationBaselineWorkspaces = new Set<string>();
  let notificationLoadSequence = 0;
  let handledPushReadKey = '';
  let handledNotificationWorkspaceSwitchKey = '';
  let accounts = $state<ApiAccount[]>([]);
  let sidebarCollapsed = $state(false);
  let workspaces = $state<
    Array<{ id: string; name: string; slug: string; role: 'owner' | 'member'; joinedAt: string }>
  >([]);
  let mobileNavOpen = $state(false);
  let mobileDrawerOpen = $state(false);
  let creatingWorkspace = $state(false);
  let createWorkspaceOpen = $state(false);
  let newWorkspaceName = $state('');
  let createWorkspaceError = $state('');
  let unreadMessageCount = $state(0);
  let unreadRefreshSequence = 0;

  async function loadUnreadMessages() {
    const requestSequence = ++unreadRefreshSequence;
    try {
      const result = await api.getAllChatUnread();
      if (requestSequence === unreadRefreshSequence) {
        unreadMessageCount = result.unread;
      }
    } catch {
      // Keep the last known count when the authoritative refresh fails.
    }
  }

  $effect(() => {
    const userId = data.user?.id;
    const workspaceIds = workspaces.map((workspace) => workspace.id);

    if (!userId) {
      unreadRefreshSequence += 1;
      unreadMessageCount = 0;
      return;
    }

    let disposed = false;
    const sockets = new Map<string, WebSocket>();
    const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const retryCounts = new Map<string, number>();
    const maxRetries = 5;
    const membershipWorkspaceIds = new Set(workspaceIds);

    const scheduleReconnect = (workspaceId: string) => {
      if (
        disposed ||
        reconnectTimers.has(workspaceId) ||
        !membershipWorkspaceIds.has(workspaceId)
      ) return;
      const retryCount = retryCounts.get(workspaceId) ?? 0;
      if (retryCount >= maxRetries) return;
      const nextRetry = retryCount + 1;
      retryCounts.set(workspaceId, nextRetry);
      const timer = setTimeout(() => {
        reconnectTimers.delete(workspaceId);
        connect(workspaceId);
      }, 2500 * nextRetry);
      reconnectTimers.set(workspaceId, timer);
    };

    const connect = (workspaceId: string) => {
      if (disposed || sockets.has(workspaceId) || !membershipWorkspaceIds.has(workspaceId)) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = import.meta.env.DEV ? `${window.location.hostname}:3001` : window.location.host;
      const url = `${protocol}//${wsHost}/api/chat/ws?workspaceId=${encodeURIComponent(workspaceId)}`;

      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect(workspaceId);
        return;
      }
      sockets.set(workspaceId, socket);

      socket.onopen = () => {
        if (sockets.get(workspaceId) !== socket) return;
        retryCounts.delete(workspaceId);
        void loadUnreadMessages();
      };
      socket.onmessage = (event) => {
        try {
          const payload: unknown = JSON.parse(event.data);
          if (!payload || typeof payload !== 'object' || !('type' in payload)) return;
          if (payload.type === 'notification:new' && 'notification' in payload) {
            const notification = isWorkspaceNotification(payload.notification)
              ? payload.notification
              : null;
            if (notification) handleIncomingNotification(notification);
          }
          if (payload.type === 'buzz:send') {
            handleIncomingBuzz(payload);
          }
          if (payload.type === 'message:new') {
            handleIncomingMessage(payload, workspaceId);
          }
          if (
            payload.type === 'message:new' ||
            payload.type === 'message:delete' ||
            payload.type === 'read'
          ) {
            void loadUnreadMessages();
          }
        } catch {
          // Ignore malformed socket payloads.
        }
      };

      socket.onerror = () => socket.close();
      socket.onclose = () => {
        if (sockets.get(workspaceId) !== socket) return;
        sockets.delete(workspaceId);
        scheduleReconnect(workspaceId);
      };
    };

    void loadUnreadMessages();
    for (const workspaceId of workspaceIds) connect(workspaceId);

    return () => {
      disposed = true;
      for (const timer of reconnectTimers.values()) clearTimeout(timer);
      for (const socket of sockets.values()) {
        socket.onclose = null;
        socket.close();
      }
    };
  });


  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    if (typeof localStorage !== 'undefined' && !isBoardDetailPage) {
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

  const isMenuDrawerPageActive = $derived(
    mobileDrawerOpen ||
    $page.url.pathname.startsWith('/dashboard/members') ||
    $page.url.pathname.startsWith('/dashboard/settings') ||
    $page.url.pathname.startsWith('/dashboard/admin')
  );

  const bottomNavItems = $derived([
    {
      href: '/dashboard/chat',
      label: 'Chat',
      active: $page.url.pathname.startsWith('/dashboard/chat'),
      badge: unreadMessageCount > 0 ? (unreadMessageCount > 99 ? '99+' : unreadMessageCount) : undefined,
      icon: messagesIcon
    },
    {
      href: '/dashboard/workflows',
      label: 'Workflow',
      active: $page.url.pathname.startsWith('/dashboard/workflows'),
      icon: workflowsIcon
    },
    {
      href: '/dashboard',
      label: 'Home',
      active: $page.url.pathname === '/dashboard' || $page.url.pathname === '/dashboard/',
      icon: homeIcon
    },
    {
      href: '/dashboard/boards',
      label: 'Taskboard',
      active: $page.url.pathname.startsWith('/dashboard/boards'),
      icon: boardsIcon
    },
    {
      label: 'Menu',
      onselect: () => {
        mobileDrawerOpen = !mobileDrawerOpen;
      },
      active: isMenuDrawerPageActive,
      icon: menuIcon
    }
  ]);

  const mobilePageTitle = $derived.by(() => {
    const path = $page.url.pathname;
    if (path.startsWith('/dashboard/chat')) return tr('nav.messages') || 'Mesej';
    if (path.startsWith('/dashboard/workflows')) return 'Workflow';
    if (path.startsWith('/dashboard/boards')) return 'Taskboard';
    if (path.startsWith('/dashboard/members')) return tr('nav.members') || 'Ahli';
    if (path.startsWith('/dashboard/settings/integrations')) return tr('nav.integrations') || 'Integrasi';
    if (path.startsWith('/dashboard/settings')) return tr('nav.settings') || 'Tetapan';
    if (path.startsWith('/dashboard/admin')) return tr('nav.admin') || 'Pentadbiran';
    return tr('nav.dashboard') || 'Papan Pemuka';
  });

  const mobilePageSubtitle = $derived.by(() => {
    const path = $page.url.pathname;
    if (path.startsWith('/dashboard/chat')) return 'Perbualan & aliran kerja';
    if (path.startsWith('/dashboard/workflows')) return 'Automasi aliran kerja';
    if (path.startsWith('/dashboard/boards')) return 'Pengurusan tugasan';
    if (path.startsWith('/dashboard/members')) return 'Ahli ruang kerja';
    if (path.startsWith('/dashboard/settings/integrations')) return 'WhatsApp & sambungan luaran';
    if (path.startsWith('/dashboard/settings')) return 'Profil & keselamatan';
    if (path.startsWith('/dashboard/admin')) return 'Panel pentadbir';
    return data.workspace?.name ?? 'actjom';
  });

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

  let previousNavPath = '';

  $effect(() => {
    const currentPath = $page.url.pathname;
    const isBoard = isBoardDetailPage;

    if (currentPath !== previousNavPath) {
      if (isBoard) {
        sidebarCollapsed = true;
      } else {
        if (typeof localStorage !== 'undefined') {
          sidebarCollapsed = localStorage.getItem('flowboard-sidebar-collapsed') === 'true';
        }
      }
      previousNavPath = currentPath;
    }
  });

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

  async function clearCurrentPushSubscription() {
    const workspaceId = data.workspace?.id;
    if (!workspaceId || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return;
      await api.removePushSubscription(workspaceId, subscription.endpoint).catch(() => undefined);
      await subscription.unsubscribe().catch(() => false);
    } catch {
      // Do not prevent sign-out or account switching if browser push cleanup fails.
    }
  }

  async function logout() {
    loggingOut = true;
    try {
      await clearCurrentPushSubscription();
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
  async function switchNotificationWorkspace(workspaceId: string) {
    if (!data.user || workspaceId === data.workspace?.id || switchingWorkspace) return;
    switchingWorkspace = true;
    try {
      await api.switchWorkspace(workspaceId);
      await invalidateAll();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : tr('shell.switchWorkspace'));
    } finally {
      switchingWorkspace = false;
    }
  }

  $effect(() => {
    const targetWorkspaceId = $page.url.pathname.startsWith('/dashboard/boards/')
      ? $page.url.searchParams.get('workspaceId')
      : null;
    const currentWorkspaceId = data.workspace?.id;
    if (
      !data.user ||
      !targetWorkspaceId ||
      targetWorkspaceId === currentWorkspaceId ||
      switchingWorkspace ||
      !workspaces.some((workspace) => workspace.id === targetWorkspaceId)
    ) {
      return;
    }
    const key = `${targetWorkspaceId}:${currentWorkspaceId ?? ''}`;
    if (handledNotificationWorkspaceSwitchKey === key) return;
    handledNotificationWorkspaceSwitchKey = key;
    void switchNotificationWorkspace(targetWorkspaceId);
  });


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
      await clearCurrentPushSubscription();
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

  const seenForWorkspace = (workspaceId: string) => {
    let seen = seenNotificationIds.get(workspaceId);
    if (!seen) {
      seen = new Set<string>();
      seenNotificationIds.set(workspaceId, seen);
    }
    return seen;
  };

  const notificationTargetUrl = (item: ApiNotification, workspaceId: string) => {
    if ((item.type === 'chat_message' || item.type === 'chat_reaction') && item.conversationId) {
      return `/dashboard/chat?workspaceId=${encodeURIComponent(workspaceId)}&conversationId=${encodeURIComponent(item.conversationId)}`;
    }
    if (item.boardId && item.taskId) {
      return `/dashboard/boards/${encodeURIComponent(item.boardId)}?workspaceId=${encodeURIComponent(workspaceId)}&task=${encodeURIComponent(item.taskId)}`;
    }
    return null;
  };

  async function openNotification(
    item: ApiNotification,
    workspaceId: string,
    targetUrl?: string
  ) {
    if (!item.read) {
      await api.markNotificationRead(workspaceId, item.id).catch(() => undefined);
    }
    if (workspaceId === data.workspace?.id) await loadNotifications();
    const target = targetUrl ?? notificationTargetUrl(item, workspaceId);
    if (target) await goto(target);
  }

  function showNotificationAlert(
    item: ApiNotification,
    workspaceId: string,
    targetUrl?: string
  ) {
    if (item.type === 'chat_message') return;

    if (isAutoBuzzTaskNotification(item.type)) {
      if (item.title.startsWith('💥 BOMB!')) return;
      const actionUrl = targetUrl ?? notificationTargetUrl(item, workspaceId) ?? undefined;
      triggerBuzz({
        senderName: 'ActJom',
        title: notificationTitle(item),
        note: item.body,
        actionUrl,
        onaction: actionUrl
          ? () => {
              void openNotification(item, workspaceId, targetUrl);
            }
          : undefined,
        sound: soundAlertsEnabled
      });
      return;
    }

    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;

    toast.info(notificationTitle(item), {
      description: item.body,
      duration: 7000,
      action:
        item.type === 'chat_reaction'
          ? undefined
          : {
              label: tr('shell.openNotification'),
              onclick: () => {
                void openNotification(item, workspaceId, targetUrl);
              }
            }
    });
  }

  function handleIncomingMessage(payload: unknown, workspaceId: string) {
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('message' in payload) ||
      !('conversationId' in payload) ||
      typeof payload.conversationId !== 'string'
    ) return;

    const message = payload.message;
    if (!message || typeof message !== 'object' || !('senderId' in message)) return;
    if (!shouldAutoBuzzIncomingMessage(message.senderId, data.user?.id)) return;

    const senderName =
      'senderName' in message && typeof message.senderName === 'string'
        ? message.senderName
        : 'Rakan sekerja';
    const body = 'body' in message && typeof message.body === 'string' ? message.body.trim() : '';
    const hasAttachments =
      'attachments' in message && Array.isArray(message.attachments) && message.attachments.length > 0;

    triggerBuzz({
      senderName,
      title: tr('notifications.chatMessage'),
      note: body
        ? `${senderName}: ${body}`
        : hasAttachments
          ? `${senderName}: 📎 Lampiran baharu diterima.`
          : `${senderName}: Anda menerima mesej baharu.`,
      sound: soundAlertsEnabled
    });
  }

  function handleIncomingNotification(notification: ApiNotification & { workspaceId: string }) {
    const seen = seenForWorkspace(notification.workspaceId);
    if (seen.has(notification.id)) return;
    seen.add(notification.id);

    if (!notification.read && notification.workspaceId === data.workspace?.id) {
      notificationUnreadCount += 1;
    }
    showNotificationAlert(notification, notification.workspaceId);
    if (notification.workspaceId === data.workspace?.id) void loadNotifications();
  }

  function handlePushNotificationAlert(alert: PushNotificationAlert) {
    const seen = seenForWorkspace(alert.workspaceId);
    if (seen.has(alert.notificationId)) return;
    seen.add(alert.notificationId);

    const notification: ApiNotification = {
      id: alert.notificationId,
      type: alert.type,
      title: alert.title,
      body: alert.appBody,
      cardId: null,
      conversationId: null,
      boardId: null,
      taskId: null,
      read: false,
      createdAt: new Date().toISOString()
    };
    if (alert.workspaceId === data.workspace?.id) notificationUnreadCount += 1;
    showNotificationAlert(notification, alert.workspaceId, alert.url);
    if (alert.workspaceId === data.workspace?.id) void loadNotifications();
  }

  function handleIncomingBuzz(dataPayload: unknown) {
    if (!dataPayload || typeof dataPayload !== 'object') return;
    const buzz = dataPayload as {
      senderId?: string;
      senderName?: string;
      conversationId?: string;
      taskId?: string;
      taskTitle?: string;
      note?: string;
      workspaceId?: string;
    };
    if (buzz.senderId === data.user?.id || buzz.conversationId) return;

    const actionUrl = buzz.taskId
      ? `/dashboard/boards?workspaceId=${encodeURIComponent(buzz.workspaceId || data.workspace?.id || '')}&task=${encodeURIComponent(buzz.taskId)}`
      : undefined;

    triggerBuzz({
      senderName: buzz.senderName || 'Rakan sekerja',
      title: `Buzz dari ${buzz.senderName || 'Rakan sekerja'}`,
      note: buzz.note || (buzz.taskTitle ? `Perhatian untuk tugasan: "${buzz.taskTitle}"` : 'Perhatian! Mesej penting memerlukan tindakan anda segera!'),
      actionUrl,
      onaction: actionUrl
        ? () => {
            void goto(actionUrl);
          }
        : undefined,
      sound: soundAlertsEnabled
    });
  }

  async function loadNotifications() {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) {
      notificationItems = [];
      notificationUnreadCount = 0;
      return;
    }

    const requestSequence = ++notificationLoadSequence;
    const isBaseline = !notificationBaselineWorkspaces.has(workspaceId);
    const seen = seenForWorkspace(workspaceId);
    try {
      const res = await api.listNotifications(workspaceId);
      if (requestSequence !== notificationLoadSequence || data.workspace?.id !== workspaceId) return;
      notificationUnreadCount = res.unread;

      if (!isBaseline) {
        for (const item of [...res.notifications].reverse()) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          if (!item.read) showNotificationAlert(item, workspaceId);
        }
      }
      for (const item of res.notifications) seen.add(item.id);
      notificationBaselineWorkspaces.add(workspaceId);

      notificationItems = res.notifications.map((item) => ({
        id: item.id,
        title: notificationTitle(item),
        body: item.body,
        time: new Date(item.createdAt).toLocaleString(dashboardIntlLocale($locale), {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }),
        unread: !item.read,
        onselect: () => {
          void openNotification(item, workspaceId);
        }
      }));
    } catch {
      // Keep the last known list and unread count when the refresh fails.
    }
  }

  $effect(() => {
    $locale;
    if (!data.workspace?.id) {
      notificationItems = [];
      notificationUnreadCount = 0;
      return;
    }
    void loadNotifications();

    const timer = setInterval(() => {
      void loadNotifications();
    }, 30_000);

    return () => {
      clearInterval(timer);
    };
  });

  $effect(() => {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) {
      soundAlertsEnabled = false;
      return;
    }

    let disposed = false;
    void api
      .getNotificationSettings(workspaceId)
      .then(({ settings }) => {
        if (!disposed && data.workspace?.id === workspaceId) {
          soundAlertsEnabled = settings.soundEnabled;
        }
      })
      .catch(() => {
        if (!disposed) soundAlertsEnabled = false;
      });

    return () => {
      disposed = true;
    };
  });

  $effect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent<unknown>) => {
      const message = event.data;
      if (
        !message ||
        typeof message !== 'object' ||
        !('type' in message) ||
        message.type !== 'FLOWBOARD_PUSH_NOTIFICATION' ||
        !('notification' in message)
      ) {
        return;
      }
      const alert = readPushNotificationAlert(message.notification);
      if (alert) handlePushNotificationAlert(alert);
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    const unlockAudio = () => {
      void unlockNotificationSound().catch(() => undefined);
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  });
  $effect(() => {
    const notificationId = $page.url.searchParams.get('notificationId');
    const workspaceId = $page.url.searchParams.get('notificationWorkspaceId');
    if (!data.user || !notificationId || !workspaceId) return;

    const key = `${workspaceId}:${notificationId}`;
    if (handledPushReadKey === key) return;
    handledPushReadKey = key;

    void (async () => {
      await api.markNotificationRead(workspaceId, notificationId).catch(() => undefined);
      if (workspaceId === data.workspace?.id) void loadNotifications();

      const url = new URL($page.url);
      url.searchParams.delete('notificationId');
      url.searchParams.delete('notificationWorkspaceId');
      if (
        $page.url.searchParams.get('notificationId') === notificationId &&
        $page.url.searchParams.get('notificationWorkspaceId') === workspaceId
      ) {
        await goto(`${url.pathname}${url.search}${url.hash}`, {
          replaceState: true,
          keepFocus: true,
          noScroll: true
        });
      }
    })();
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
    ...(data.user?.platformAdmin
      ? [
          {
            label: adminMode ? (tr('nav.exitAdmin') || 'Keluar Mod Pentadbir') : (tr('nav.adminMode') || 'Mod Pentadbir'),
            icon: shieldUserIcon,
            onselect: toggleAdminMode
          }
        ]
      : []),
    {
      label: tr('language.label') || 'Bahasa',
      icon: globeIcon,
      submenu: locales.map((lang) => ({
        label: `${tr(`language.${lang.code}`) || (lang.code === 'ms' ? 'Bahasa Melayu' : 'English')} (${lang.short})`,
        icon: $locale === lang.code ? checkIcon : undefined,
        onselect: () => setLocale(lang.code)
      }))
    },
    {
      label: tr('theme.label') || 'Tema',
      icon: sunIcon,
      submenu: [
        {
          label: 'Terang',
          icon: userPrefersMode.current === 'light' ? checkIcon : sunIcon,
          onselect: () => setMode('light')
        },
        {
          label: 'Gelap',
          icon: userPrefersMode.current === 'dark' ? checkIcon : moonIcon,
          onselect: () => setMode('dark')
        },
        {
          label: 'Sistem',
          icon: userPrefersMode.current === 'system' ? checkIcon : undefined,
          onselect: () => setMode('system')
        }
      ]
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
{#snippet menuIcon()}
  <HugeiconsIcon icon={Menu01Icon} size={20} strokeWidth={1.8} />
{/snippet}
{#snippet globeIcon()}
  <HugeiconsIcon icon={Globe02Icon} size={16} strokeWidth={1.8} />
{/snippet}
{#snippet sunIcon()}
  <HugeiconsIcon icon={Sun02Icon} size={16} strokeWidth={1.8} />
{/snippet}
{#snippet moonIcon()}
  <HugeiconsIcon icon={Moon02Icon} size={16} strokeWidth={1.8} />
{/snippet}
{#snippet shieldUserIcon()}
  <HugeiconsIcon icon={ShieldUserIcon} size={16} strokeWidth={1.8} />
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

  <div class="flex h-[100dvh] max-h-[100dvh] min-w-0 flex-1 flex-col {isChatPage || isBoardDetailPage || isWorkflowDetailPage ? 'overflow-hidden' : 'overflow-y-auto'} transition-[padding] duration-200 ease-out {sidebarCollapsed ? 'md:pl-[68px]' : 'md:pl-[248px]'}">
    <Topbar
      title={data.workspace?.name ?? 'actjom'}
      showSearch={false}
      searchPlaceholder={tr('shell.search')}
      themeLabels={themeLabels}
    >
      {#snippet heading()}
        <!-- Mobile Header (matching Image #1) -->
        <div class="flex items-center gap-2.5 md:hidden min-w-0">
          <a href="/dashboard" class="flex flex-col items-center shrink-0 leading-none">
            <Logo size={28} />
            <span class="text-[9px] font-bold text-primary tracking-tight -mt-0.5">actjom</span>
          </a>
          <div class="min-w-0">
            <h1 class="text-base font-bold text-ink leading-tight truncate">
              {mobilePageTitle}
            </h1>
            <p class="text-[11px] text-mute leading-tight truncate">
              {mobilePageSubtitle}
            </p>
          </div>
        </div>

        <!-- Desktop Header -->
        <div class="hidden md:flex items-center gap-2">
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
          unreadCount={notificationUnreadCount}
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
      <main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas p-0 pb-16 md:pb-0">
        <div class="flex h-full w-full min-h-0 flex-1 flex-col">
          <OnboardingProvider>
            {@render children()}
          </OnboardingProvider>
        </div>
      </main>
    {:else if isBoardDetailPage || isWorkflowDetailPage}
      <div class="flex min-h-0 flex-1 overflow-hidden">
        <main class="flex-1 min-w-0 flex flex-col overflow-hidden bg-canvas p-0 pb-16 md:pb-0">
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
        <main class="flex-1 min-w-0 overflow-y-auto bg-canvas px-3.5 pt-4 pb-24 sm:px-6 md:px-8 md:pt-16 md:pb-10">
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

    <BottomTabBar items={bottomNavItems} />
  </div>
  {#if challengeData && !isChatPage}
    <ChallengeWidget challenges={challengeData.challenges} labels={challengeData.labels} sidebarCollapsed={sidebarCollapsed} />
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

  <MobileMenuDrawer
    bind:open={mobileDrawerOpen}
    currentPath={$page.url.pathname}
    workspaceName={data.workspace?.name ?? 'actjom'}
    workspaceRole={data.workspace?.role}
    currentWorkspaceId={data.workspace?.id}
    workspaces={workspaces}
    onSwitchWorkspace={switchWorkspace}
    onCreateWorkspace={openCreateWorkspace}
    userName={data.user?.name ?? 'User'}
    userEmail={data.user?.email}
    userRole={data.user?.platformAdmin ? 'Platform Admin' : (data.workspace?.role === 'owner' ? 'Owner' : 'Member')}
    userSrc={data.user?.avatarUrl ?? undefined}
    accounts={accounts}
    currentUserId={data.user?.id}
    onSwitchAccount={switchAccount}
    isPlatformAdmin={Boolean(data.user?.platformAdmin)}
    adminMode={adminMode}
    onToggleAdminMode={toggleAdminMode}
    onLogout={logout}
    labels={{
      menuTitle: tr('nav.menu') || 'Menu Utama',
      members: tr('nav.members') || 'Ahli',
      integrations: tr('nav.integrations') || 'Integrasi',
      settings: tr('nav.settings') || 'Tetapan',
      signOut: tr('shell.signOut') || 'Log Keluar',
      addWorkspace: tr('shell.addWorkspace') || 'Cipta baharu',
      adminMode: tr('nav.adminMode') || 'Mod Pentadbir',
      exitAdmin: tr('nav.exitAdmin') || 'Keluar Mod Pentadbir',
      adminOverview: tr('admin.nav.overview') || 'Ringkasan Platform',
      adminUsers: tr('admin.nav.users') || 'Pengguna',
      adminSubscriptions: tr('admin.nav.subscriptions') || 'Langganan',
      adminVouchers: tr('admin.nav.vouchers') || 'Baucar'
    }}
  />
</div>
