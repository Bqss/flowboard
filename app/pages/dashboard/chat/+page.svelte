<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    api,
    ApiError,
    type ApiChatAttachment,
    type ApiChatConversation,
    type ApiChatMessage,
    type ApiChatMember
  } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Avatar, Badge, Button, IconButton, Input, Skeleton, Tooltip } from '$lib/components/atoms/index.js';
  import { FormField, SearchInput, toast } from '$lib/components/molecules/index.js';
  import { Dialog, ConfirmDialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    AlertCircleIcon,
    ArrowLeft01Icon,
    Attachment01Icon,
    BubbleChatIcon,
    Cancel01Icon,
    Delete02Icon,
    Download04Icon,
    Edit01Icon,
    File02Icon,
    KanbanIcon,
    MailReply01Icon,
    MoreVerticalIcon,
    SentIcon,
    Tick02Icon,
    UserGroupIcon,
    WorkflowSquare01Icon,
    ZoomIcon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  const workspaceId = $derived(data.workspace?.id ?? '');
  const userId = $derived(data.user?.id ?? '');
  const userName = $derived(data.user?.name ?? '');

  /* ------------------------------------------------------- state */
  let conversations = $state<ApiChatConversation[]>([]);
  let conversationsLoading = $state(true);
  let searchQuery = $state('');
  let categoryFilter = $state<'all' | 'board' | 'workflow' | 'group' | 'direct' | 'unread'>('all');

  let activeConversationId = $state<string | null>(null);
  let activeConversation = $state<ApiChatConversation | null>(null);
  let selectedGroup = $state<ApiChatConversation | null>(null);
  let messages = $state<ApiChatMessage[]>([]);
  let messagesLoading = $state(false);
  let loadingOlder = $state(false);
  let hasOlderMessages = $state(false);

  let composerText = $state('');
  let sendingMessage = $state(false);
  let replyToMessage = $state<ApiChatMessage | null>(null);
  let pendingAttachments = $state<ApiChatAttachment[]>([]);
  let uploadingAttachment = $state(false);
  let fileInputEl = $state<HTMLInputElement | null>(null);
  let lightboxSrc = $state<string | null>(null);

  let messageContainerEl = $state<HTMLDivElement | null>(null);

  // Online users & typing indicators
  let onlineUserIds = $state<Set<string>>(new Set());
  let typingUsers = $state<Map<string, Set<string>>>(new Map());
  let isCurrentlyTyping = false;
  let typingTimer: ReturnType<typeof setTimeout> | null = null;

  // Modals state
  let newDirectOpen = $state(false);
  let createGroupOpen = $state(false);
  let membersList = $state<ApiChatMember[]>([]);
  let membersLoading = $state(false);
  let memberSearch = $state('');

  let groupName = $state('');
  let selectedGroupMemberIds = $state<string[]>([]);
  let groupCreating = $state(false);

  let roomInfoOpen = $state(false);
  let roomParticipants = $state<Array<{ userId: string; name: string; email: string; avatarUrl: string | null; role: string }>>([]);

  let reactionPickerMessageId = $state<string | null>(null);
  const ALLOWED_REACTIONS = ['👍', '❤️', '😂', '🎉', '🙏', '👀'];

  let deleteMessageTarget = $state<ApiChatMessage | null>(null);

  /* ------------------------------------------------------- derived */
  let filteredConversations = $derived.by(() => {
    const query = searchQuery.trim().toLowerCase();
    let list = conversations.filter((c) => {
      if (!query) return true;
      const displayName = conversationDisplayName(c).toLowerCase();
      const lastBody = (c.lastMessage?.body ?? '').toLowerCase();
      return displayName.includes(query) || lastBody.includes(query);
    });

    // In the main list, hide taskboards and workflows that are assigned to a group!
    list = list.filter((c) => {
      if ((c.kind === 'taskboard' || c.kind === 'workflow') && c.groupId != null) {
        return false;
      }
      return true;
    });

    if (categoryFilter === 'unread') {
      list = list.filter((c) => getConversationUnread(c) > 0);
    } else if (categoryFilter === 'board') {
      list = list.filter((c) => c.kind === 'taskboard');
    } else if (categoryFilter === 'workflow') {
      list = list.filter((c) => c.kind === 'workflow');
    } else if (categoryFilter === 'group') {
      list = list.filter((c) => c.kind === 'group');
    } else if (categoryFilter === 'direct') {
      list = list.filter((c) => c.kind === 'direct');
    }

    return list;
  });

  const channelsForSelectedGroup = $derived.by(() => {
    if (!selectedGroup || !selectedGroup.groupId) return [];
    return conversations.filter(
      (c) =>
        c.groupId === selectedGroup!.groupId &&
        (c.kind === 'taskboard' || c.kind === 'workflow')
    );
  });

  function getConversationUnread(conv: ApiChatConversation): number {
    if (conv.kind === 'group' && conv.groupId) {
      const channelUnreads = conversations
        .filter((c) => c.groupId === conv.groupId && c.id !== conv.id)
        .reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      return (conv.unreadCount || 0) + channelUnreads;
    }
    return conv.unreadCount || 0;
  }

  function handleRootItemClick(conv: ApiChatConversation) {
    if (conv.kind === 'group' && conv.groupId) {
      selectedGroup = conv;
    } else {
      selectedGroup = null;
      selectConversation(conv);
    }
  }

  const activeTypingUserIds = $derived(
    activeConversationId ? Array.from(typingUsers.get(activeConversationId) ?? []) : []
  );

  const typingStatusText = $derived(() => {
    if (activeTypingUserIds.length === 0) return '';
    if (activeTypingUserIds.length === 1) return 'Sedang mengetik…';
    return `${activeTypingUserIds.length} orang sedang mengetik…`;
  });

  /* ------------------------------------------------------- websocket */
  let ws: WebSocket | null = null;
  let wsConnected = $state(false);
  let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let wsRetryCount = 0;
  const WS_MAX_RETRIES = 5;

  function connectWs() {
    if (!workspaceId) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.DEV ? `${window.location.hostname}:3001` : window.location.host;
    const url = `${protocol}//${wsHost}/api/chat/ws?workspaceId=${encodeURIComponent(workspaceId)}`;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }

    ws.onopen = () => {
      wsConnected = true;
      wsRetryCount = 0;
    };

    ws.onclose = () => {
      wsConnected = false;
      if (wsRetryCount < WS_MAX_RETRIES) {
        wsRetryCount++;
        wsReconnectTimer = setTimeout(connectWs, 2500 * wsRetryCount);
      }
    };

    ws.onerror = () => {
      wsConnected = false;
    };

    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        handleWsMessage(payload);
      } catch {
        // ignore malformed
      }
    };
  }

  function handleWsMessage(data: any) {
    switch (data.type) {
      case 'message:new': {
        const msg = data.message as ApiChatMessage;
        const convId = data.conversationId as string;

        if (activeConversationId === convId) {
          if (!messages.some((m) => m.id === msg.id)) {
            messages = [...messages, msg];
            scrollToBottom();
          }
          void api.markChatRead(workspaceId, convId).catch(() => {});
        }

        conversations = conversations.map((c) =>
          c.id === convId
            ? {
                ...c,
                lastMessage: {
                  id: msg.id,
                  body: msg.body,
                  senderId: msg.senderId,
                  senderName: msg.senderName,
                  createdAt: msg.createdAt,
                  deletedAt: msg.deletedAt
                },
                updatedAt: msg.createdAt,
                unreadCount: activeConversationId === convId ? 0 : (c.unreadCount ?? 0) + 1
              }
            : c
        );

        // Re-sort conversation list
        conversations.sort((a, b) => {
          const tA = new Date(a.lastMessage?.createdAt ?? a.updatedAt).getTime();
          const tB = new Date(b.lastMessage?.createdAt ?? b.updatedAt).getTime();
          return tB - tA;
        });
        break;
      }

      case 'message:edit': {
        if (activeConversationId === data.conversationId) {
          messages = messages.map((m) =>
            m.id === data.messageId ? { ...m, body: data.body, editedAt: data.editedAt } : m
          );
        }
        break;
      }

      case 'message:delete': {
        if (activeConversationId === data.conversationId) {
          messages = messages.map((m) =>
            m.id === data.messageId ? { ...m, body: '', deletedAt: data.deletedAt } : m
          );
        }
        break;
      }

      case 'reaction:toggle': {
        if (activeConversationId === data.conversationId) {
          messages = messages.map((m) => {
            if (m.id !== data.messageId) return m;
            if (data.action === 'added') {
              const existing = m.reactions.find(
                (r) => r.userId === data.userId && r.reaction === data.reaction
              );
              if (existing) return m;
              return {
                ...m,
                reactions: [...m.reactions, { reaction: data.reaction, userId: data.userId, userName: data.userName }]
              };
            } else {
              return {
                ...m,
                reactions: m.reactions.filter(
                  (r) => !(r.userId === data.userId && r.reaction === data.reaction)
                )
              };
            }
          });
        }
        break;
      }

      case 'typing': {
        const convId = data.conversationId as string;
        const typingUserId = data.userId as string;
        const isTyping = data.isTyping as boolean;
        const current = new Set(typingUsers.get(convId) ?? []);
        if (isTyping) {
          current.add(typingUserId);
        } else {
          current.delete(typingUserId);
        }
        typingUsers = new Map(typingUsers.set(convId, current));
        break;
      }

      case 'presence': {
        onlineUserIds = new Set(data.onlineUserIds as string[]);
        break;
      }
    }
  }

  /* ------------------------------------------------------- helpers */
  function conversationDisplayName(conv: ApiChatConversation): string {
    if (conv.kind !== 'direct') return conv.name ?? 'Grup';
    return conv.partner?.name ?? 'Personal';
  }

  function lastMessagePreview(conv: ApiChatConversation): string {
    if (!conv.lastMessage) {
      if (conv.kind === 'taskboard') return 'Obrolan papan tugas';
      if (conv.kind === 'workflow') return 'Obrolan alur kerja';
      if (conv.kind === 'group') return 'Obrolan tim / grup';
      return 'Mulai obrolan…';
    }
    if (conv.lastMessage.deletedAt) return tr('chat.deleted');
    const prefix = conv.lastMessage.senderId === userId ? 'Anda: ' : '';
    return prefix + conv.lastMessage.body;
  }

  function formatDate(iso: string | Date | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  function scrollToBottom(smooth = true) {
    if (typeof requestAnimationFrame === 'undefined') return;
    requestAnimationFrame(() => {
      if (messageContainerEl) {
        messageContainerEl.scrollTo({
          top: messageContainerEl.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    });
  }

  function notifyTyping(isTyping: boolean) {
    if (!ws || !wsConnected || !activeConversationId) return;
    try {
      ws.send(JSON.stringify({ type: 'typing', conversationId: activeConversationId, isTyping }));
    } catch {
      // ignore
    }
  }

  function handleComposerInput() {
    if (!activeConversationId) return;
    if (!isCurrentlyTyping) {
      isCurrentlyTyping = true;
      notifyTyping(true);
    }
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      isCurrentlyTyping = false;
      notifyTyping(false);
    }, 2500);
  }

  /* ------------------------------------------------------- data loading */
  async function loadConversations() {
    if (!workspaceId) return;
    conversationsLoading = true;
    try {
      const res = await api.listChatConversations(workspaceId);
      const seen = new Set<string>();
      conversations = res.conversations.filter((c) => !seen.has(c.id) && seen.add(c.id));
    } catch (err) {
      toast.error('Gagal memuat daftar obrolan');
    } finally {
      conversationsLoading = false;
    }
  }

  async function selectConversation(conv: ApiChatConversation) {
    activeConversationId = conv.id;
    activeConversation = conv;
    messages = [];
    messagesLoading = true;
    hasOlderMessages = false;
    replyToMessage = null;
    pendingAttachments = [];

    try {
      const [detailRes, msgRes] = await Promise.all([
        api.getChatConversation(workspaceId, conv.id),
        api.getChatMessages(workspaceId, conv.id)
      ]);
      roomParticipants = detailRes.participants ?? [];
      messages = msgRes.messages ?? [];
      hasOlderMessages = (msgRes.messages ?? []).length >= 50;

      // Mark read in local & backend
      await api.markChatRead(workspaceId, conv.id).catch(() => {});
      conversations = conversations.map((c) =>
        c.id === conv.id ? { ...c, unreadCount: 0 } : c
      );
      scrollToBottom(false);
    } catch {
      toast.error('Gagal memuat pesan');
    } finally {
      messagesLoading = false;
    }
  }

  async function loadOlderMessages() {
    if (!activeConversationId || loadingOlder || !hasOlderMessages || messages.length === 0) return;
    loadingOlder = true;
    const oldest = messages[0];
    const cursor = `${new Date(oldest.createdAt).toISOString()}:${oldest.id}`;
    try {
      const res = await api.getChatMessages(workspaceId, activeConversationId, cursor);
      if (res.messages.length === 0) {
        hasOlderMessages = false;
      } else {
        const existingIds = new Set(messages.map((m) => m.id));
        const fresh = res.messages.filter((m) => !existingIds.has(m.id));
        if (fresh.length === 0) {
          hasOlderMessages = false;
        } else {
          messages = [...fresh, ...messages];
        }
      }
    } catch {
      // ignore
    } finally {
      loadingOlder = false;
    }
  }

  async function sendMessage() {
    const text = composerText.trim();
    if ((!text && pendingAttachments.length === 0) || !activeConversationId || sendingMessage) return;
    sendingMessage = true;
    const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const replyId = replyToMessage?.id;
    const attachmentIds = pendingAttachments.map((a) => a.id);

    try {
      const res = await api.sendChatMessage(
        workspaceId,
        activeConversationId,
        text,
        clientMessageId,
        replyId,
        attachmentIds
      );
      if (!messages.some((m) => m.id === res.message.id)) {
        messages = [...messages, res.message];
      }
      composerText = '';
      replyToMessage = null;
      pendingAttachments = [];
      scrollToBottom();
    } catch {
      toast.error('Gagal mengirim pesan');
    } finally {
      sendingMessage = false;
    }
  }

  async function handleFileUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !activeConversationId) return;
    uploadingAttachment = true;
    try {
      const res = await api.uploadChatAttachment(workspaceId, activeConversationId, file);
      pendingAttachments = [...pendingAttachments, res.attachment];
    } catch {
      toast.error('Gagal mengunggah file');
    } finally {
      uploadingAttachment = false;
      input.value = '';
    }
  }

  async function toggleReaction(msg: ApiChatMessage, reaction: string) {
    if (!activeConversationId) return;
    try {
      await api.toggleChatReaction(workspaceId, activeConversationId, msg.id, reaction);
      reactionPickerMessageId = null;
    } catch {
      // ignore
    }
  }

  async function confirmDeleteMessage() {
    if (!activeConversationId || !deleteMessageTarget) return;
    try {
      await api.deleteChatMessage(workspaceId, activeConversationId, deleteMessageTarget.id);
      deleteMessageTarget = null;
    } catch {
      toast.error('Gagal menghapus pesan');
    }
  }

  /* ------------------------------------------------------- new chat modal */
  async function openNewDirectModal() {
    newDirectOpen = true;
    memberSearch = '';
    membersLoading = true;
    try {
      const res = await api.listChatMembers(workspaceId);
      membersList = (res.members ?? []).filter((m) => m.id !== userId);
    } catch {
      membersList = [];
    } finally {
      membersLoading = false;
    }
  }

  async function startDirectChat(partnerId: string) {
    newDirectOpen = false;
    try {
      const res = await api.createDirectChat(workspaceId, partnerId);
      await loadConversations();
      const conv = conversations.find((c) => c.id === res.conversation.id);
      if (conv) {
        await selectConversation(conv);
      }
    } catch {
      toast.error('Gagal memulai obrolan');
    }
  }

  async function openCreateGroupModal() {
    createGroupOpen = true;
    groupName = '';
    selectedGroupMemberIds = [];
    membersLoading = true;
    try {
      const res = await api.listChatMembers(workspaceId);
      membersList = (res.members ?? []).filter((m) => m.id !== userId);
    } catch {
      membersList = [];
    } finally {
      membersLoading = false;
    }
  }

  async function submitCreateGroup() {
    if (!groupName.trim() || selectedGroupMemberIds.length === 0 || groupCreating) return;
    groupCreating = true;
    try {
      const res = await api.createGroupRoom(workspaceId, groupName.trim(), selectedGroupMemberIds);
      createGroupOpen = false;
      await loadConversations();
      const conv = conversations.find((c) => c.id === res.conversation.id);
      if (conv) {
        await selectConversation(conv);
      }
      toast.success('Grup obrolan berhasil dibuat');
    } catch {
      toast.error('Gagal membuat grup');
    } finally {
      groupCreating = false;
    }
  }

  /* ------------------------------------------------------- lifecycle */
  $effect(() => {
    if (workspaceId) {
      loadConversations();
      connectWs();
    }
    return () => {
      if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
      }
    };
  });
</script>

<svelte:head>
  <title>Mesej — actjom</title>
</svelte:head>

<div class="flex h-full w-full flex-1 min-h-0 overflow-hidden border-t border-hairline bg-card">
  <!-- SISI KIRI: Daftar Percakapan -->
  <aside
    class="flex flex-col border-r border-hairline bg-card transition-all duration-200 {activeConversationId ? 'hidden md:flex md:w-80 lg:w-96 shrink-0' : 'w-full md:w-80 lg:w-96 shrink-0'}"
  >
    {#if selectedGroup}
      <!-- SUB-VIEW: Telegram Topic/Channel view (Matching Image #2) -->
      <div class="space-y-3 border-b border-hairline p-4">
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            onclick={() => (selectedGroup = null)}
            class="flex size-8 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink transition-colors"
            aria-label="Kembali"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2} />
          </button>
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary font-bold">
            <HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={1.8} />
          </div>
          <div class="min-w-0 flex-1 truncate">
            <h2 class="text-base font-bold text-ink truncate">{selectedGroup.name}</h2>
            <p class="text-[11px] text-mute">{channelsForSelectedGroup.length + 1} channels</p>
          </div>
        </div>
      </div>

      <!-- Channel List (Image #2) -->
      <div class="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
        <!-- 1. # General -->
        {#if selectedGroup}
          {@const isGeneralSelected = activeConversationId === selectedGroup.id}
          <button
            type="button"
            onclick={() => selectConversation(selectedGroup!)}
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 {isGeneralSelected ? 'bg-primary-soft text-ink font-semibold shadow-xs ring-1 ring-primary/20' : 'hover:bg-canvas-sunken/70 text-body'} {selectedGroup.unreadCount > 0 && !isGeneralSelected ? 'font-semibold text-ink' : ''}"
          >
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary font-bold text-base">
            #
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-1.5">
              <span class="truncate text-sm font-semibold text-ink">General</span>
              <span class="shrink-0 text-[11px] text-faint">
                {selectedGroup.lastMessage ? formatDate(selectedGroup.lastMessage.createdAt) : formatDate(selectedGroup.updatedAt)}
              </span>
            </div>
            <div class="mt-0.5 flex items-center justify-between gap-2">
              <span class="truncate text-xs {selectedGroup.lastMessage ? 'text-mute' : 'text-faint italic'}">
                {lastMessagePreview(selectedGroup)}
              </span>
              {#if selectedGroup.unreadCount > 0}
                <span class="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                  {selectedGroup.unreadCount > 99 ? '99+' : selectedGroup.unreadCount}
                </span>
              {/if}
            </div>
          </div>
        </button>
        {/if}

        <!-- 2..N. Assigned Taskboards & Workflows -->
        {#each channelsForSelectedGroup as channel (channel.id)}
          {@const isChannelSelected = activeConversationId === channel.id}
          <button
            type="button"
            onclick={() => selectConversation(channel)}
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 {isChannelSelected ? 'bg-primary-soft text-ink font-semibold shadow-xs ring-1 ring-primary/20' : 'hover:bg-canvas-sunken/70 text-body'} {channel.unreadCount > 0 && !isChannelSelected ? 'font-semibold text-ink' : ''}"
          >
            {#if channel.kind === 'taskboard'}
              <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                <HugeiconsIcon icon={KanbanIcon} size={18} strokeWidth={1.8} />
              </div>
            {:else if channel.kind === 'workflow'}
              <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <HugeiconsIcon icon={WorkflowSquare01Icon} size={18} strokeWidth={1.8} />
              </div>
            {:else}
              <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary font-bold text-base">
                #
              </div>
            {/if}
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-1.5">
                <span class="truncate text-sm font-semibold text-ink">{conversationDisplayName(channel)}</span>
                <span class="shrink-0 text-[11px] text-faint">
                  {channel.lastMessage ? formatDate(channel.lastMessage.createdAt) : formatDate(channel.updatedAt)}
                </span>
              </div>
              <div class="mt-0.5 flex items-center justify-between gap-2">
                <span class="truncate text-xs {channel.lastMessage ? 'text-mute' : 'text-faint italic'}">
                  {lastMessagePreview(channel)}
                </span>
                {#if channel.unreadCount > 0}
                  <span class="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                    {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                  </span>
                {/if}
              </div>
            </div>
          </button>
        {/each}

        {#if channelsForSelectedGroup.length === 0}
          <div class="p-6 text-center text-xs text-mute font-medium">
            Belum ada papan tugas atau alur kerja yang ditugaskan ke grup ini.
          </div>
        {/if}
      </div>
    {:else}
      <!-- ROOT LIST: Image #1 -->
      <div class="space-y-3 border-b border-hairline p-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold tracking-tight text-ink">Mesej</h1>
        <div class="flex items-center gap-1.5">
          <Tooltip text="Tulis pesan" side="bottom">
            <IconButton variant="secondary" size="sm" label="Tulis pesan" onclick={openNewDirectModal}>
              <HugeiconsIcon icon={Edit01Icon} size={16} strokeWidth={1.8} />
            </IconButton>
          </Tooltip>
          <Tooltip text="Buat grup" side="bottom">
            <IconButton variant="secondary" size="sm" label="Buat grup" onclick={openCreateGroupModal}>
              <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <SearchInput bind:value={searchQuery} placeholder="Cari obrolan…" />

      <!-- Filter Kategori -->
      <div class="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          type="button"
          onclick={() => (categoryFilter = 'all')}
          class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors {categoryFilter === 'all' ? 'bg-primary text-white' : 'bg-canvas-sunken text-mute hover:text-ink'}"
        >
          Semua
        </button>
        <button
          type="button"
          onclick={() => (categoryFilter = 'board')}
          class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors {categoryFilter === 'board' ? 'bg-primary text-white' : 'bg-canvas-sunken text-mute hover:text-ink'}"
        >
          Board
        </button>
        <button
          type="button"
          onclick={() => (categoryFilter = 'workflow')}
          class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors {categoryFilter === 'workflow' ? 'bg-primary text-white' : 'bg-canvas-sunken text-mute hover:text-ink'}"
        >
          Workflow
        </button>
        <button
          type="button"
          onclick={() => (categoryFilter = 'group')}
          class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors {categoryFilter === 'group' ? 'bg-primary text-white' : 'bg-canvas-sunken text-mute hover:text-ink'}"
        >
          Grup
        </button>
        <button
          type="button"
          onclick={() => (categoryFilter = 'direct')}
          class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors {categoryFilter === 'direct' ? 'bg-primary text-white' : 'bg-canvas-sunken text-mute hover:text-ink'}"
        >
          Direct
        </button>
        <button
          type="button"
          onclick={() => (categoryFilter = 'unread')}
          class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors {categoryFilter === 'unread' ? 'bg-primary text-white' : 'bg-canvas-sunken text-mute hover:text-ink'}"
        >
          Belum Dibaca
        </button>
      </div>
    </div>

    <!-- List Percakapan -->
    <div class="min-h-0 flex-1 overflow-y-auto">
      {#if conversationsLoading}
        <div class="space-y-1 p-2">
          {#each Array(6) as _, i (i)}
            <div class="flex items-center gap-3 rounded-xl p-3">
              <Skeleton class="size-10 shrink-0 rounded-full" />
              <div class="flex-1 space-y-1.5">
                <Skeleton class="h-4 w-28 rounded-md" />
                <Skeleton class="h-3 w-44 rounded-md" />
              </div>
            </div>
          {/each}
        </div>
      {:else if filteredConversations.length === 0}
        <div class="grid h-full place-items-center p-6 text-center">
          <div class="flex flex-col items-center">
            <div class="flex size-12 items-center justify-center rounded-2xl bg-canvas-sunken text-faint mb-2">
              <HugeiconsIcon icon={BubbleChatIcon} size={24} strokeWidth={1.8} />
            </div>
            <p class="text-sm font-semibold text-ink">Tidak ada obrolan</p>
            <p class="mt-1 text-xs text-mute max-w-[200px]">Mulai obrolan baru dengan rekan tim Anda.</p>
          </div>
        </div>
      {:else}
        <div class="space-y-1 p-2">
          {#each filteredConversations as conv (conv.id)}
            {@const isSelected = activeConversationId === conv.id}
            <button
              type="button"
              onclick={() => handleRootItemClick(conv)}
              class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 {isSelected ? 'bg-primary-soft text-ink font-semibold shadow-xs ring-1 ring-primary/20' : 'hover:bg-canvas-sunken/70 text-body'} {conv.unreadCount > 0 && !isSelected ? 'font-semibold text-ink' : ''}"
            >
              <!-- Icon/Avatar -->
              {#if conv.kind === 'taskboard'}
                <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                  <HugeiconsIcon icon={KanbanIcon} size={20} strokeWidth={1.8} />
                </div>
              {:else if conv.kind === 'workflow'}
                <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  <HugeiconsIcon icon={WorkflowSquare01Icon} size={20} strokeWidth={1.8} />
                </div>
              {:else if conv.kind === 'group'}
                <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <HugeiconsIcon icon={UserGroupIcon} size={20} strokeWidth={1.8} />
                </div>
              {:else}
                <Avatar
                  name={conversationDisplayName(conv)}
                  src={conv.partner?.avatarUrl ?? undefined}
                  size={40}
                  online={Boolean(conv.partner?.id && onlineUserIds.has(conv.partner.id))}
                />
              {/if}

              <!-- Detail Text -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-1.5">
                  <span class="truncate text-sm font-semibold text-ink">{conversationDisplayName(conv)}</span>
                  <span class="shrink-0 text-[11px] text-faint">
                    {conv.lastMessage ? formatDate(conv.lastMessage.createdAt) : formatDate(conv.updatedAt)}
                  </span>
                </div>
                <div class="mt-0.5 flex items-center justify-between gap-2">
                  <span class="truncate text-xs {conv.lastMessage ? 'text-mute' : 'text-faint italic'}">
                    {lastMessagePreview(conv)}
                  </span>
                  {#if getConversationUnread(conv) > 0}
                    <span class="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                      {getConversationUnread(conv) > 99 ? '99+' : getConversationUnread(conv)}
                    </span>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}
      </div>
    {/if}
  </aside>

  <!-- SISI KANAN: Window Obrolan Aktif -->
  <main class="flex min-w-0 flex-1 flex-col bg-canvas-sunken/20 {activeConversationId ? 'flex' : 'hidden md:flex'}">
    {#if !activeConversationId}
      <!-- Empty Placeholder Window -->
      <div class="grid h-full place-items-center p-8 text-center">
        <div class="flex flex-col items-center max-w-sm">
          <div class="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-xs mb-4">
            <HugeiconsIcon icon={BubbleChatIcon} size={32} strokeWidth={1.8} />
          </div>
          <h2 class="text-lg font-bold text-ink tracking-tight">Pilih percakapan</h2>
          <p class="mt-1.5 text-sm text-mute leading-relaxed">
            Pilih room dari daftar di sebelah kiri untuk membaca dan mengirim pesan secara realtime.
          </p>
          <div class="mt-5 flex gap-2">
            <Button variant="secondary" size="sm" onclick={openNewDirectModal}>
              Tulis Pesan
            </Button>
            <Button variant="primary" size="sm" onclick={openCreateGroupModal}>
              Buat Grup
            </Button>
          </div>
        </div>
      </div>
    {:else}
      <!-- Active Thread Header -->
      <header class="flex h-16 shrink-0 items-center justify-between border-b border-hairline bg-card px-4 sm:px-6 shadow-xs">
        <div class="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onclick={() => (activeConversationId = null)}
            class="flex size-8 md:hidden items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink"
            aria-label="Kembali"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2} />
          </button>

          {#if activeConversation?.kind === 'taskboard'}
            <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
              <HugeiconsIcon icon={KanbanIcon} size={18} strokeWidth={1.8} />
            </div>
          {:else if activeConversation?.kind === 'workflow'}
            <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <HugeiconsIcon icon={WorkflowSquare01Icon} size={18} strokeWidth={1.8} />
            </div>
          {:else if activeConversation?.kind === 'group'}
            <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={1.8} />
            </div>
          {:else}
            <Avatar
              name={conversationDisplayName(activeConversation!)}
              src={activeConversation?.partner?.avatarUrl ?? undefined}
              size={36}
              online={Boolean(activeConversation?.partner?.id && onlineUserIds.has(activeConversation.partner.id))}
            />
          {/if}

          <div class="min-w-0 flex-1 truncate">
            <h2 class="truncate text-base font-bold text-ink leading-tight">
              {conversationDisplayName(activeConversation!)}
            </h2>
            <p class="truncate text-xs text-mute">
              {#if activeConversation?.kind === 'direct'}
                {activeConversation.partner?.id && onlineUserIds.has(activeConversation.partner.id) ? 'Online' : 'Offline'}
              {:else}
                {roomParticipants.length} anggota
              {/if}
            </p>
          </div>
        </div>

        {#if activeConversation?.kind !== 'direct'}
          <IconButton variant="ghost" size="sm" label="Anggota obrolan" onclick={() => (roomInfoOpen = !roomInfoOpen)}>
            <HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={1.8} />
          </IconButton>
        {/if}
      </header>

      <!-- Message History Container -->
      <div
        bind:this={messageContainerEl}
        class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5"
      >
        {#if hasOlderMessages}
          <div class="flex justify-center pt-2">
            <Button variant="ghost" size="sm" loading={loadingOlder} onclick={loadOlderMessages} class="text-xs">
              Muat pesan sebelumnya
            </Button>
          </div>
        {/if}

        {#if messagesLoading}
          <div class="space-y-4 py-8">
            {#each Array(4) as _, i (i)}
              <div class="flex {i % 2 === 0 ? 'justify-start' : 'justify-end'}">
                <Skeleton class="h-12 w-48 rounded-2xl" />
              </div>
            {/each}
          </div>
        {:else if messages.length === 0}
          <div class="grid h-full place-items-center py-16 text-center text-mute">
            <div class="flex flex-col items-center">
              <HugeiconsIcon icon={BubbleChatIcon} size={28} strokeWidth={1.8} class="text-faint mb-2" />
              <p class="text-sm font-semibold text-ink">Belum ada pesan</p>
              <p class="text-xs text-mute mt-0.5">Kirim pesan pertama untuk memulai percakapan.</p>
            </div>
          </div>
        {:else}
          {#each messages as msg (msg.id)}
            {@const isOwn = msg.senderId === userId}
            <div class="group flex flex-col {isOwn ? 'items-end' : 'items-start'}">
              {#if !isOwn && activeConversation?.kind !== 'direct'}
                <span class="mb-1 text-[11px] font-semibold text-mute px-1">
                  {msg.senderName}
                </span>
              {/if}

              <div class="relative flex max-w-[85%] sm:max-w-[70%] items-end gap-1.5">
                <!-- Message Bubble -->
                <div
                  class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs {isOwn ? 'bg-primary text-white rounded-br-sm' : 'bg-card border border-hairline text-ink rounded-bl-sm'}"
                >
                  {#if msg.deletedAt}
                    <span class="italic opacity-60 text-xs">Pesan ini telah dihapus</span>
                  {:else}
                    {#if msg.replyToMessageId}
                      <div class="mb-1.5 rounded-lg border-l-2 border-primary-border/60 bg-black/5 dark:bg-white/5 p-2 text-xs opacity-80">
                        <span class="font-bold block">{msg.replyToSenderName ?? 'Balasan'}</span>
                        <span class="truncate block">{msg.replyToBody ?? 'Pesan'}</span>
                      </div>
                    {/if}

                    <p class="whitespace-pre-wrap break-words">{msg.body}</p>

                    {#if msg.attachments && msg.attachments.length > 0}
                      <div class="mt-2 space-y-1.5">
                        {#each msg.attachments as att (att.id)}
                          {#if att.fileType.startsWith('image/')}
                            <button
                              type="button"
                              onclick={() => (lightboxSrc = att.filePath)}
                              class="block overflow-hidden rounded-lg border border-hairline/60"
                            >
                              <img src={att.filePath} alt={att.fileName} class="max-h-48 rounded object-cover" />
                            </button>
                          {:else}
                            <a
                              href={att.filePath}
                              target="_blank"
                              rel="noreferrer"
                              download={att.fileName}
                              class="flex items-center gap-2 rounded-lg bg-black/5 dark:bg-white/5 p-2 text-xs font-medium hover:underline"
                            >
                              <HugeiconsIcon icon={File02Icon} size={16} />
                              <span class="truncate">{att.fileName}</span>
                              <HugeiconsIcon icon={Download04Icon} size={14} class="ml-auto opacity-70" />
                            </a>
                          {/if}
                        {/each}
                      </div>
                    {/if}
                  {/if}

                  <span class="mt-1 block text-right text-[10px] opacity-70">
                    {formatDate(msg.createdAt)}
                  </span>
                </div>

                <!-- Action Button Hover Menu -->
                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                  <IconButton
                    variant="ghost"
                    size="sm"
                    label="Balas"
                    onclick={() => (replyToMessage = msg)}
                  >
                    <HugeiconsIcon icon={MailReply01Icon} size={14} strokeWidth={1.8} />
                  </IconButton>

                  {#if isOwn}
                    <IconButton
                      variant="ghost"
                      size="sm"
                      label="Hapus pesan"
                      onclick={() => (deleteMessageTarget = msg)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
                    </IconButton>
                  {/if}
                </div>
              </div>

              <!-- Reactions List -->
              {#if msg.reactions && msg.reactions.length > 0}
                <div class="mt-1 flex flex-wrap gap-1 px-1">
                  {#each msg.reactions as r}
                    <span class="rounded-full border border-hairline bg-card px-2 py-0.5 text-xs text-ink shadow-xs">
                      {r.reaction}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        {/if}

        {#if activeTypingUserIds.length > 0}
          <div class="px-2 text-xs italic text-mute animate-pulse">
            {typingStatusText()}
          </div>
        {/if}
      </div>

      <!-- Composer Bar -->
      <footer class="border-t border-hairline bg-card p-3 sm:p-4">
        {#if replyToMessage}
          <div class="mb-2 flex items-center justify-between rounded-xl bg-canvas-sunken p-2.5 text-xs">
            <div class="min-w-0 flex-1">
              <span class="font-bold text-ink">Membalas {replyToMessage.senderName}</span>
              <p class="truncate text-mute">{replyToMessage.body}</p>
            </div>
            <IconButton variant="ghost" size="sm" label="Batal balas" onclick={() => (replyToMessage = null)}>
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </IconButton>
          </div>
        {/if}

        {#if pendingAttachments.length > 0}
          <div class="mb-2 flex flex-wrap gap-2">
            {#each pendingAttachments as att (att.id)}
              <div class="flex items-center gap-1.5 rounded-lg border border-hairline bg-canvas-sunken px-2 py-1 text-xs text-ink">
                <HugeiconsIcon icon={File02Icon} size={14} />
                <span class="max-w-[120px] truncate">{att.fileName}</span>
                <button
                  type="button"
                  onclick={() => (pendingAttachments = pendingAttachments.filter((a) => a.id !== att.id))}
                  class="text-mute hover:text-ink"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} />
                </button>
              </div>
            {/each}
          </div>
        {/if}

        <form
          onsubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          class="flex items-center gap-2"
        >
          <input
            type="file"
            bind:this={fileInputEl}
            onchange={handleFileUpload}
            class="hidden"
          />

          <IconButton
            variant="ghost"
            size="md"
            label="Lampirkan file"
            onclick={() => fileInputEl?.click()}
            disabled={uploadingAttachment}
          >
            <HugeiconsIcon icon={Attachment01Icon} size={18} strokeWidth={1.8} />
          </IconButton>

          <Input
            bind:value={composerText}
            oninput={handleComposerInput}
            placeholder="Tulis pesan… (Tekan Enter untuk kirim)"
            class="h-10 flex-1 rounded-xl"
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={(!composerText.trim() && pendingAttachments.length === 0) || sendingMessage}
            class="rounded-xl px-4"
          >
            <HugeiconsIcon icon={SentIcon} size={18} strokeWidth={1.8} />
          </Button>
        </form>
      </footer>
    {/if}
  </main>
</div>

<!-- Modal: Tulis Pesan Baru (Direct) -->
<Dialog bind:open={newDirectOpen} title="Tulis Pesan Baru" description="Pilih rekan kerja untuk memulai obrolan langsung." size="md">
  <div class="space-y-3">
    <SearchInput bind:value={memberSearch} placeholder="Cari rekan kerja…" />
    <div class="max-h-60 overflow-y-auto divide-y divide-hairline">
      {#if membersLoading}
        <div class="p-4 text-center text-xs text-mute">Memuat anggota…</div>
      {:else}
        {#each membersList.filter((m) => !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase())) as member (member.id)}
          <button
            type="button"
            onclick={() => startDirectChat(member.id)}
            class="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-canvas-sunken"
          >
            <Avatar name={member.name} src={member.avatarUrl ?? undefined} size={36} online={onlineUserIds.has(member.id)} />
            <div class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-ink">{member.name}</span>
              <span class="block truncate text-xs text-mute">{member.email}</span>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
</Dialog>

<!-- Modal: Buat Grup Baru -->
<Dialog bind:open={createGroupOpen} title="Buat Grup Baru" description="Buat room obrolan grup baru dengan anggota tim." size="md">
  <div class="space-y-4">
    <FormField label="Nama Grup" required>
      {#snippet control(args)}
        <Input {...args} bind:value={groupName} placeholder="Contoh: Tim Koordinasi Proyek" />
      {/snippet}
    </FormField>

    <div>
      <span class="ds-label text-ink block mb-2">Pilih Anggota ({selectedGroupMemberIds.length} dipilih)</span>
      <div class="max-h-52 overflow-y-auto divide-y divide-hairline rounded-xl border border-hairline bg-canvas-sunken/40">
        {#each membersList as member (member.id)}
          {@const isChecked = selectedGroupMemberIds.includes(member.id)}
          <button
            type="button"
            onclick={() => {
              if (isChecked) {
                selectedGroupMemberIds = selectedGroupMemberIds.filter((id) => id !== member.id);
              } else {
                selectedGroupMemberIds = [...selectedGroupMemberIds, member.id];
              }
            }}
            class="flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:bg-canvas-sunken {isChecked ? 'bg-primary-soft/30' : ''}"
          >
            <Avatar name={member.name} src={member.avatarUrl ?? undefined} size={32} />
            <div class="min-w-0 flex-1">
              <span class="block truncate text-xs font-semibold text-ink">{member.name}</span>
              <span class="block truncate text-[11px] text-mute">{member.email}</span>
            </div>
            {#if isChecked}
              <HugeiconsIcon icon={Tick02Icon} size={16} class="text-primary" />
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (createGroupOpen = false)}>Batal</Button>
      <Button
        variant="primary"
        loading={groupCreating}
        disabled={!groupName.trim() || selectedGroupMemberIds.length === 0}
        onclick={submitCreateGroup}
      >
        Buat Grup
      </Button>
    </div>
  {/snippet}
</Dialog>

<!-- Confirm Delete Message Modal -->
<ConfirmDialog
  open={deleteMessageTarget !== null}
  title="Hapus Pesan?"
  description="Pesan ini akan dihapus untuk semua peserta percakapan."
  confirmLabel="Hapus"
  tone="destructive"
  onconfirm={confirmDeleteMessage}
  oncancel={() => (deleteMessageTarget = null)}
/>

<!-- Lightbox Modal -->
{#if lightboxSrc}
  <div
    role="dialog"
    tabindex="-1"
    class="fixed inset-0 z-[300] grid place-items-center bg-black/80 p-4"
    onclick={() => (lightboxSrc = null)}
    onkeydown={(e) => e.key === 'Escape' && (lightboxSrc = null)}
  >
    <img src={lightboxSrc} alt="Preview" class="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" />
  </div>
{/if}
