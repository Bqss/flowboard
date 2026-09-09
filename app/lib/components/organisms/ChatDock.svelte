<script lang="ts">
  import { api, ApiError, type ApiChatAttachment, type ApiChatConversation, type ApiChatMessage, type ApiChatMember } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Avatar, Badge, Button, Skeleton } from '$lib/components/atoms/index.js';
  import { SearchInput, AlertInline } from '$lib/components/molecules/index.js';
  import { ConfirmDialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    BubbleChatIcon,
    SentIcon,
    ArrowUp01Icon,
    Add01Icon,
    Attachment01Icon,
    Download04Icon,
    File02Icon,
    ZoomIcon,
    Cancel01Icon,
    Delete02Icon,
    Tick02Icon,
    ArrowLeft01Icon,
    Edit01Icon,
    MailReply01Icon,
    MoreVerticalIcon,
    Minimize02Icon,
    CheckmarkCircle02Icon,
    UserGroupIcon,
    AlertCircleIcon
  } from '@hugeicons/core-free-icons';

  type Props = {
    workspaceId: string;
    userId: string;
    userName: string;
    userAvatarUrl: string | null;
  };

  let { workspaceId, userId, userName, userAvatarUrl }: Props = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  /* ------------------------------------------------------- dock state */
  type DockMode = 'collapsed' | 'list' | 'thread' | 'newDirect' | 'createGroup';
  let dockMode = $state<DockMode>('collapsed');
  let isMobile = $state(false);

  // Check viewport
  $effect(() => {
    const check = () => { isMobile = window.innerWidth < 768; };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  });

  /* ------------------------------------------------------- conversation list */
  let conversations = $state<ApiChatConversation[]>([]);
  let conversationsLoading = $state(false);
  let showConvSkeleton = $state(false);
  let convSkeletonTimer: ReturnType<typeof setTimeout> | null = null;
  let conversationsError = $state(false);
  let searchQuery = $state('');
  let filterUnread = $state(false);
  let unreadTotal = $state(0);

  let filteredConversations = $derived.by(() => {
    const seen = new Set<string>();
    const deduped = conversations.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    return filterUnread ? deduped.filter((c) => c.unreadCount > 0) : deduped;
  });

  async function loadConversations() {
    if (!workspaceId) return;
    conversationsLoading = true;
    conversationsError = false;
    if (convSkeletonTimer) { clearTimeout(convSkeletonTimer); convSkeletonTimer = null; }
    showConvSkeleton = false;
    convSkeletonTimer = setTimeout(() => { showConvSkeleton = true; }, 200);
    try {
      const [convRes, unreadRes] = await Promise.all([
        api.listChatConversations(workspaceId, searchQuery || undefined),
        api.getChatUnread(workspaceId)
      ]);
      const seen = new Set<string>();
      conversations = convRes.conversations.filter((c) => !seen.has(c.id) && seen.add(c.id));
      unreadTotal = unreadRes.unread;
    } catch {
      conversationsError = true;
    } finally {
      conversationsLoading = false;
      if (convSkeletonTimer) { clearTimeout(convSkeletonTimer); convSkeletonTimer = null; }
      showConvSkeleton = false;
    }
  }

  // WebSocket connection for realtime updates
  let ws: WebSocket | null = null;
  let wsConnected = $state(false);
  let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let wsRetryCount = 0;
  const WS_MAX_RETRIES = 5;

  $effect(() => {
    if (!workspaceId) return;

    function connectWs() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = import.meta.env.DEV ? `${window.location.hostname}:3001` : window.location.host;
      const url = `${protocol}//${wsHost}/api/chat/ws?workspaceId=${encodeURIComponent(workspaceId)}`;
      try {
        ws = new WebSocket(url);
      } catch {
        // WebSocket not supported — rely on polling
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
          wsReconnectTimer = setTimeout(connectWs, 3000 * wsRetryCount);
        }
      };

      ws.onerror = () => {
        wsConnected = false;
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          handleWsEvent(data);
        } catch { /* ignore malformed */ }
      };
    }

    connectWs();

    return () => {
      if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
      if (ws) { ws.onclose = null; ws.close(); ws = null; }
      wsConnected = false;
    };
  });

  async function loadUnreadOnly() {
    if (!workspaceId) return;
    try {
      const res = await api.getChatUnread(workspaceId);
      unreadTotal = res.unread;
    } catch { /* silent */ }
  }

  // Debounced search
  // Load conversations when dock opens (initial fetch, WS handles updates after)
  $effect(() => {
    if (dockMode !== 'collapsed' && workspaceId) {
      void loadConversations();
    }
  });

  // Fallback: poll conversations when WS is disconnected
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  $effect(() => {
    if (dockMode === 'collapsed' || !workspaceId || wsConnected) {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      return;
    }
    pollTimer = setInterval(() => void loadConversations(), 10_000);
    return () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };
  });

  // Load unread badge on mount + fallback poll when WS disconnected
  let collapsedPollTimer: ReturnType<typeof setInterval> | null = null;
  $effect(() => {
    if (!workspaceId) return;
    // Always do initial unread load
    if (dockMode === 'collapsed') {
      void loadUnreadOnly();
    }
    // Fallback poll only when WS is down
    if (wsConnected) {
      if (collapsedPollTimer) { clearInterval(collapsedPollTimer); collapsedPollTimer = null; }
      return;
    }
    if (dockMode !== 'collapsed') {
      if (collapsedPollTimer) { clearInterval(collapsedPollTimer); collapsedPollTimer = null; }
      return;
    }
    collapsedPollTimer = setInterval(() => void loadUnreadOnly(), 15_000);
    return () => { if (collapsedPollTimer) { clearInterval(collapsedPollTimer); collapsedPollTimer = null; } };
  });

  /* ------------------------------------------------------- thread state */
  let activeConversationId = $state<string | null>(null);
  let activeConversation = $state<ApiChatConversation | null>(null);
  let messages = $state<ApiChatMessage[]>([]);
  let messagesLoading = $state(false);
  let showMsgSkeleton = $state(false);
  let msgSkeletonTimer: ReturnType<typeof setTimeout> | null = null;
  let messagesError = $state(false);
  let threadTitle = $state('');
  let threadAvatar = $state<string | null>(null);
  let threadIsGroup = $state(false);
  let hasOlderMessages = $state(false);
  let loadingOlder = $state(false);

  // Composer
  let composerText = $state('');
  let sendingMessage = $state(false);
  let sendError = $state(false);
  let replyToMessage = $state<ApiChatMessage | null>(null);
  let pendingAttachments = $state<ApiChatAttachment[]>([]);
  let uploadingAttachment = $state(false);
  let attachmentError = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);
  let lightboxSrc = $state<string | null>(null);
  let editingMessageId = $state<string | null>(null);
  let editText = $state('');

  // Message action menu
  let openMenuMessageId = $state<string | null>(null);

  // Delete confirmation
  let deleteTargetId = $state<string | null>(null);

  // Leave room confirmation
  let showLeaveConfirm = $state(false);

  // Room info
  let showRoomInfo = $state(false);
  let roomParticipants = $state<Array<{ userId: string; name: string; email: string; avatarUrl: string | null; role: string }>>([]);
  let userRole = $state<'admin' | 'member'>('member');

  // Reaction picker
  let reactionPickerMessageId = $state<string | null>(null);
  const ALLOWED_REACTIONS = ['👍', '❤️', '😂', '🎉', '🙏', '👀'];

  async function openConversation(conv: ApiChatConversation) {
    activeConversationId = conv.id;
    activeConversation = conv;
    threadIsGroup = conv.kind === 'group';
    if (conv.kind === 'group') {
      threadTitle = conv.name ?? '';
      threadAvatar = null;
    } else if (conv.partner) {
      threadTitle = conv.partner.name;
      threadAvatar = conv.partner.avatarUrl;
    }
    dockMode = 'thread';
    await loadMessages();
    await api.markChatRead(workspaceId, conv.id).catch(() => {});
    // Update local unread
    conversations = conversations.map((c) =>
      c.id === conv.id ? { ...c, unreadCount: 0 } : c
    );
  }

  async function loadMessages(older = false) {
    if (!activeConversationId) return;
    if (!older) {
      messagesLoading = true;
      if (msgSkeletonTimer) { clearTimeout(msgSkeletonTimer); msgSkeletonTimer = null; }
      showMsgSkeleton = false;
      msgSkeletonTimer = setTimeout(() => { showMsgSkeleton = true; }, 200);
    } else {
      loadingOlder = true;
    }
    messagesError = false;
    try {
      let before: string | undefined;
      if (older && messages.length > 0) {
        const oldest = messages[0];
        before = `${new Date(oldest.createdAt).toISOString()}:${oldest.id}`;
      }
      const res = await api.getChatMessages(workspaceId, activeConversationId!, before);
      if (older) {
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
      } else {
        messages = res.messages;
        hasOlderMessages = res.messages.length >= 50;
      }
    } catch {
      messagesError = true;
    } finally {
      messagesLoading = false;
      loadingOlder = false;
      if (msgSkeletonTimer) { clearTimeout(msgSkeletonTimer); msgSkeletonTimer = null; }
      showMsgSkeleton = false;
    }
  }

  // WebSocket event handler — updates local state from server-pushed events
  function handleWsEvent(data: any) {
    switch (data.type) {
      case 'message:new': {
        const msg = data.message as ApiChatMessage;
        const convId = data.conversationId as string;
        if (dockMode === 'thread' && activeConversationId === convId) {
          if (!messages.some((m) => m.id === msg.id)) {
            messages = [...messages, msg];
          }
        }
        conversations = conversations.map((c) =>
          c.id === convId
            ? {
                ...c,
                lastMessage: { id: msg.id, body: msg.body, senderId: msg.senderId, senderName: msg.senderName, createdAt: msg.createdAt, deletedAt: msg.deletedAt },
                updatedAt: msg.createdAt,
                unreadCount: (dockMode === 'thread' && activeConversationId === convId) ? 0 : (c.unreadCount ?? 0) + 1
              }
            : c
        );
        if (!(dockMode === 'thread' && activeConversationId === convId)) {
          unreadTotal += 1;
        }
        if (msg.senderId !== userId) {
          playNotificationSound();
        }
        break;
      }
      case 'message:edit': {
        if (dockMode === 'thread' && activeConversationId === data.conversationId) {
          messages = messages.map((m) =>
            m.id === data.messageId
              ? { ...m, body: data.body, editedAt: data.editedAt }
              : m
          );
        }
        break;
      }
      case 'message:delete': {
        if (dockMode === 'thread' && activeConversationId === data.conversationId) {
          messages = messages.map((m) =>
            m.id === data.messageId
              ? { ...m, body: '', deletedAt: data.deletedAt, editedAt: null, reactions: [] }
              : m
          );
        }
        break;
      }
      case 'reaction:toggle': {
        if (dockMode === 'thread' && activeConversationId === data.conversationId) {
          messages = messages.map((m) => {
            if (m.id !== data.messageId) return m;
            if (data.action === 'added') {
              const exists = m.reactions.some((r) => r.userId === data.userId && r.reaction === data.reaction);
              if (exists) return m;
              return { ...m, reactions: [...m.reactions, { reaction: data.reaction, userId: data.userId, userName: '' }] };
            } else {
              return { ...m, reactions: m.reactions.filter((r) => !(r.userId === data.userId && r.reaction === data.reaction)) };
            }
          });
        }
        break;
      }
      case 'read': {
        if (data.userId !== userId) {
          // No local state to update for other users' read receipts yet
        } else {
          conversations = conversations.map((c) =>
            c.id === data.conversationId ? { ...c, unreadCount: 0 } : c
          );
        }
        break;
      }
    }
  }
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const ACCEPTED_FILE_TYPES = '.png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.webm,.mov,.pdf,.txt,.md,.doc,.docx';

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    for (const file of Array.from(input.files)) {
      await uploadFile(file);
    }
    input.value = '';
  }

  async function uploadFile(file: File) {
    if (!activeConversationId) return;
    if (file.size > MAX_FILE_SIZE) {
      attachmentError = true;
      return;
    }
    uploadingAttachment = true;
    attachmentError = false;
    try {
      const res = await api.uploadChatAttachment(workspaceId, activeConversationId, file);
      pendingAttachments = [...pendingAttachments, res.attachment];
    } catch {
      attachmentError = true;
    } finally {
      uploadingAttachment = false;
    }
  }

  function removePendingAttachment(id: string) {
    pendingAttachments = pendingAttachments.filter((a) => a.id !== id);
  }

  function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          void uploadFile(file);
        }
      }
    }
  }

  function isImageType(fileType: string): boolean {
    return fileType.startsWith('image/');
  }

  function isVideoType(fileType: string): boolean {
    return fileType.startsWith('video/');
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSend() {
    const text = composerText.trim();
    if ((!text && pendingAttachments.length === 0) || !activeConversationId || sendingMessage) return;
    sendingMessage = true;
    sendError = false;
    const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const replyId = replyToMessage?.id;
    const attachmentIds = pendingAttachments.length > 0 ? pendingAttachments.map((a) => a.id) : undefined;
    try {
      const res = await api.sendChatMessage(workspaceId, activeConversationId, text, clientMessageId, replyId, attachmentIds);
      if (!messages.some((m) => m.id === res.message.id)) {
        messages = [...messages, res.message];
      }
      composerText = '';
      replyToMessage = null;
      pendingAttachments = [];
      // Update conversation list
      conversations = conversations.map((c) =>
        c.id === activeConversationId
          ? { ...c, lastMessage: { id: res.message.id, body: res.message.body || (res.message.attachments.length > 0 ? '📎' : ''), senderId: res.message.senderId, senderName: res.message.senderName, createdAt: res.message.createdAt, deletedAt: res.message.deletedAt }, updatedAt: res.message.createdAt }
          : c
      );
    } catch {
      sendError = true;
    } finally {
      sendingMessage = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function startReply(msg: ApiChatMessage) {
    replyToMessage = msg;
    openMenuMessageId = null;
    editingMessageId = null;
  }

  function cancelReply() {
    replyToMessage = null;
  }

  function startEdit(msg: ApiChatMessage) {
    editingMessageId = msg.id;
    editText = msg.body;
    openMenuMessageId = null;
    replyToMessage = null;
  }

  async function saveEdit() {
    if (!editingMessageId || !activeConversationId || !editText.trim()) return;
    try {
      await api.editChatMessage(workspaceId, activeConversationId, editingMessageId, editText.trim());
      messages = messages.map((m) =>
        m.id === editingMessageId ? { ...m, body: editText.trim(), editedAt: new Date().toISOString() } : m
      );
      editingMessageId = null;
      editText = '';
    } catch { /* silent */ }
  }

  function cancelEdit() {
    editingMessageId = null;
    editText = '';
  }

  async function confirmDelete() {
    if (!deleteTargetId || !activeConversationId) return;
    try {
      await api.deleteChatMessage(workspaceId, activeConversationId, deleteTargetId);
      messages = messages.map((m) =>
        m.id === deleteTargetId ? { ...m, body: '', deletedAt: new Date().toISOString(), editedAt: null, reactions: [] } : m
      );
      deleteTargetId = null;
    } catch { /* silent */ }
  }

  async function handleReaction(msg: ApiChatMessage, reaction: string) {
    if (!activeConversationId) return;
    reactionPickerMessageId = null;
    try {
      const res = await api.toggleChatReaction(workspaceId, activeConversationId, msg.id, reaction);
      // Update reactions locally
      messages = messages.map((m) => {
        if (m.id !== msg.id) return m;
        if (res.action === 'added') {
          return { ...m, reactions: [...m.reactions, { reaction, userId, userName }] };
        } else {
          return { ...m, reactions: m.reactions.filter((r) => !(r.reaction === reaction && r.userId === userId)) };
        }
      });
    } catch { /* silent */ }
  }

  /* ------------------------------------------------------- new direct */
  let members = $state<ApiChatMember[]>([]);
  let membersLoading = $state(false);
  let memberSearch = $state('');

  let filteredMembers = $derived(
    memberSearch.trim()
      ? members.filter((m) =>
          m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.email.toLowerCase().includes(memberSearch.toLowerCase())
        )
      : members
  );

  async function loadMembers() {
    if (!workspaceId) return;
    membersLoading = true;
    try {
      const res = await api.listChatMembers(workspaceId);
      members = res.members;
    } catch { /* silent */ } finally {
      membersLoading = false;
    }
  }

  async function startDirect(memberId: string) {
    try {
      const res = await api.createDirectChat(workspaceId, memberId);
      // Reload conversations and open the thread
      await loadConversations();
      const conv = conversations.find((c) => c.id === res.conversation.id);
      if (conv) {
        await openConversation(conv);
      } else {
        // Create a temporary conversation object
        activeConversationId = res.conversation.id;
        threadTitle = res.partner.name;
        threadAvatar = res.partner.avatarUrl;
        threadIsGroup = false;
        activeConversation = {
          id: res.conversation.id,
          kind: 'direct',
          name: null,
          partner: { id: res.partner.id, name: res.partner.name, email: res.partner.email, avatarUrl: res.partner.avatarUrl },
          lastMessage: null,
          unreadCount: 0,
          updatedAt: new Date().toISOString()
        };
        dockMode = 'thread';
        messages = [];
        await loadMessages();
      }
    } catch { /* silent */ }
  }

  /* ------------------------------------------------------- create group */
  let selectedMemberIds = $state<string[]>([]);
  let groupName = $state('');
  let creatingGroup = $state(false);
  let groupStep = $state<1 | 2>(1);

  function toggleMemberSelection(id: string) {
    if (selectedMemberIds.includes(id)) {
      selectedMemberIds = selectedMemberIds.filter((mid) => mid !== id);
    } else {
      selectedMemberIds = [...selectedMemberIds, id];
    }
  }

  async function createGroup() {
    if (!groupName.trim() || selectedMemberIds.length < 1 || creatingGroup) return;
    creatingGroup = true;
    try {
      const res = await api.createGroupRoom(workspaceId, groupName.trim(), selectedMemberIds);
      await loadConversations();
      const conv = conversations.find((c) => c.id === res.conversation.id);
      if (conv) {
        await openConversation(conv);
      } else {
        activeConversationId = res.conversation.id;
        threadTitle = res.conversation.name;
        threadAvatar = null;
        threadIsGroup = true;
        dockMode = 'thread';
        messages = [];
      }
      // Reset group form
      groupName = '';
      selectedMemberIds = [];
      groupStep = 1;
    } catch { /* silent */ } finally {
      creatingGroup = false;
    }
  }

  /* ------------------------------------------------------- room management */
  async function loadRoomInfo() {
    if (!activeConversationId) return;
    try {
      const res = await api.getChatConversation(workspaceId, activeConversationId);
      roomParticipants = res.participants;
      userRole = res.userRole;
      showRoomInfo = true;
    } catch { /* silent */ }
  }

  async function leaveRoom() {
    if (!activeConversationId) return;
    try {
      await api.removeChatParticipant(workspaceId, activeConversationId, userId);
      showLeaveConfirm = false;
      showRoomInfo = false;
      dockMode = 'list';
      activeConversationId = null;
      activeConversation = null;
      await loadConversations();
    } catch { /* silent */ }
  }

  /* ------------------------------------------------------- helpers */
  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString($locale === 'ms' ? 'ms-MY' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(dateStr);
    return d.toLocaleDateString($locale === 'ms' ? 'ms-MY' : 'en-US', { month: 'short', day: 'numeric' });
  }

  function formatUnread(count: number): string {
    return count > 99 ? '99+' : String(count);
  }

  function conversationDisplayName(conv: ApiChatConversation): string {
    if (conv.kind === 'group') return conv.name ?? '';
    return conv.partner?.name ?? '';
  }

  function conversationAvatar(conv: ApiChatConversation): string | null {
    if (conv.kind === 'group') return null;
    return conv.partner?.avatarUrl ?? null;
  }

  function lastMessagePreview(conv: ApiChatConversation): string {
    if (!conv.lastMessage) return '';
    if (conv.lastMessage.deletedAt) return tr('chat.deleted');
    const prefix = conv.lastMessage.senderId === userId ? tr('chat.youPrefix', { message: '' }).replace(': ', '') + ': ' : '';
    return prefix + conv.lastMessage.body;
  }

  function isOwnMessage(msg: ApiChatMessage): boolean {
    return msg.senderId === userId;
  }

  function playNotificationSound() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      osc.onended = () => ctx.close();
    } catch {
      // AudioContext not available
    }
  }

  function reactionCounts(msg: ApiChatMessage): Array<{ reaction: string; count: number; reactedByMe: boolean }> {
    const grouped = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const r of msg.reactions ?? []) {
      const existing = grouped.get(r.reaction);
      if (existing) {
        existing.count++;
        if (r.userId === userId) existing.reactedByMe = true;
      } else {
        grouped.set(r.reaction, { count: 1, reactedByMe: r.userId === userId });
      }
    }
    return Array.from(grouped.entries()).map(([reaction, info]) => ({ reaction, ...info }));
  }

  function backToList() {
    dockMode = 'list';
    activeConversationId = null;
    activeConversation = null;
    replyToMessage = null;
    editingMessageId = null;
    openMenuMessageId = null;
    showRoomInfo = false;
    showLeaveConfirm = false;
  }

  function collapse() {
    dockMode = 'collapsed';
    activeConversationId = null;
    replyToMessage = null;
    editingMessageId = null;
    pendingAttachments = [];
    attachmentError = false;
  }

  function expand() {
    dockMode = 'list';
  }


  // Close dock when clicking outside (desktop only)
  function clickOutside(node: HTMLElement) {
    function handle(event: MouseEvent) {
      const target = event.target as Node;
      if (!node.contains(target) && !document.querySelector('[data-lightbox]')?.contains(target)) {
        collapse();
      }
    }
    // Defer listener so the click that expanded doesn't immediately close
    const id = setTimeout(() => {
      document.addEventListener('click', handle, true);
    }, 0);
    return {
      destroy() {
        clearTimeout(id);
        document.removeEventListener('click', handle, true);
      }
    };
  }

  function openCompose() {
    void loadMembers();
    dockMode = 'newDirect';
  }

  function openCreateGroup() {
    void loadMembers();
    selectedMemberIds = [];
    groupName = '';
    groupStep = 1;
    dockMode = 'createGroup';
  }

  // Listen for external "open chat with member" events (from Members page)
  $effect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) void startDirect(detail);
    };
    window.addEventListener('chat-open-member', handler);
    return () => window.removeEventListener('chat-open-member', handler);
  });

  // Scroll to bottom when new messages arrive
  let threadContainer: HTMLDivElement | null = $state(null);
  $effect(() => {
    messages.length;
    if (threadContainer && dockMode === 'thread') {
      requestAnimationFrame(() => {
        threadContainer?.scrollTo({ top: threadContainer.scrollHeight, behavior: 'smooth' });
      });
    }
  });
</script>

<!-- Collapsed: floating buttons -->
{#if dockMode === 'collapsed'}
  <div data-onboarding="chat-widget" class="flex shrink-0 items-center rounded-full border border-hairline bg-card shadow-popover">
    <button
      type="button"
      onclick={expand}
      class="flex items-center gap-2.5 rounded-l-full px-4 py-3 transition-all hover:bg-canvas-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      aria-label={tr('chat.expand')}
    >
      <HugeiconsIcon icon={BubbleChatIcon} size={22} strokeWidth={1.8} class="text-primary" />
      <span class="ds-label text-ink">{tr('chat.dockTitle')}</span>
      {#if unreadTotal > 0}
        <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
          {formatUnread(unreadTotal)}
        </span>
      {/if}
    </button>
    <button
      type="button"
      onclick={openCompose}
      class="flex size-11 items-center justify-center transition-all hover:bg-canvas-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      aria-label={tr('chat.newMessage')}
    >
      <HugeiconsIcon icon={Edit01Icon} size={18} strokeWidth={1.8} class="text-mute hover:text-ink" />
    </button>
    <button
      type="button"
      onclick={expand}
      class="flex size-11 items-center justify-center rounded-r-full transition-all hover:bg-canvas-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      aria-label={tr('chat.expandPanel')}
    >
      <HugeiconsIcon icon={ArrowUp01Icon} size={18} strokeWidth={1.8} class="text-mute hover:text-ink" />
    </button>
  </div>
{:else if isMobile}
  <!-- Mobile: full-screen panel -->
  <div class="fixed inset-0 z-[250] flex flex-col bg-canvas" data-theme="app">
    <!-- Mobile header -->
    <div class="flex items-center gap-2 border-b border-hairline bg-card px-3 py-3 shadow-control">
      {#if dockMode === 'list'}
        <HugeiconsIcon icon={BubbleChatIcon} size={22} strokeWidth={1.8} class="text-primary" />
        <span class="flex-1 ds-label text-ink">{tr('chat.dockTitle')}</span>
        {#if unreadTotal > 0}
          <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
            {formatUnread(unreadTotal)}
          </span>
        {/if}
        <button type="button" onclick={openCompose} class="flex size-9 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink" aria-label={tr('chat.compose')}>
          <HugeiconsIcon icon={Add01Icon} size={20} strokeWidth={1.8} />
        </button>
        <button type="button" onclick={collapse} class="flex size-9 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink" aria-label={tr('chat.close')}>
          <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.8} />
        </button>
      {:else}
        <button type="button" onclick={backToList} class="flex size-9 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink" aria-label={tr('chat.back')}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={1.8} />
        </button>
        <span class="flex-1 truncate ds-label text-ink">
          {#if dockMode === 'thread'}{threadTitle}{:else if dockMode === 'newDirect'}{tr('chat.newMessage')}{:else if dockMode === 'createGroup'}{tr('chat.createGroup')}{/if}
        </span>
        {#if dockMode === 'thread'}
          <button type="button" onclick={collapse} class="flex size-9 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink" aria-label={tr('chat.close')}>
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.8} />
          </button>
        {/if}
      {/if}
    </div>

    <!-- Mobile content -->
    <div class="flex min-h-0 flex-1 flex-col">
      {#if dockMode === 'list'}
        {#snippet listContent()}
          <div class="border-b border-hairline p-3">
            <SearchInput bind:value={searchQuery} placeholder={tr('chat.search')} />
            <div class="mt-2 flex gap-1.5">
              <button type="button" onclick={() => (filterUnread = false)} class="rounded-full px-3 py-1 text-xs font-semibold transition-colors {!filterUnread ? 'bg-primary text-white' : 'bg-canvas-sunken text-mute hover:text-ink'}">{tr('chat.all')}</button>
              <button type="button" onclick={() => (filterUnread = true)} class="rounded-full px-3 py-1 text-xs font-semibold transition-colors {filterUnread ? 'bg-primary text-white' : 'bg-canvas-sunken text-mute hover:text-ink'}">{tr('chat.unreadFilter')}</button>
            </div>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto">
            {#if showConvSkeleton}
              {#each Array(6) as _, i}
                <div class="flex items-center gap-3 px-3 py-3"><Skeleton class="size-10 rounded-full" /><div class="flex-1 space-y-2"><Skeleton class="h-3.5 w-24" /><Skeleton class="h-3 w-40" /></div></div>
              {/each}
            {:else if conversationsLoading}
              <div class="h-full"></div>
            {:else if conversationsError}
              <div class="grid h-full place-items-center p-6">
                <div class="flex flex-col items-center text-center">
                  <div class="relative mb-3">
                    <div class="absolute inset-0 rounded-full bg-status-urgent/8 blur-2xl"></div>
                    <div class="relative flex size-14 items-center justify-center rounded-2xl bg-status-urgent-soft ring-4 ring-status-urgent-soft/40">
                      <HugeiconsIcon icon={AlertCircleIcon} size={24} strokeWidth={1.8} class="text-status-urgent" />
                    </div>
                  </div>
                  <p class="text-sm font-semibold text-ink">{tr('chat.loadError')}</p>
                  <button type="button" onclick={loadConversations} class="mt-3 flex items-center gap-1.5 rounded-full bg-primary-soft/60 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-soft">
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={12} strokeWidth={2} class="rotate-180" />
                    {tr('chat.retry')}
                  </button>
                </div>
              </div>
            {:else if filteredConversations.length === 0}
              <div class="grid h-full place-items-center p-6">
                <div class="flex flex-col items-center text-center">
                  <div class="relative mb-3">
                    <div class="absolute inset-0 rounded-full bg-primary/8 blur-2xl"></div>
                    <div class="relative flex size-14 items-center justify-center rounded-2xl bg-primary-soft ring-4 ring-primary-soft/40">
                      <HugeiconsIcon icon={BubbleChatIcon} size={24} strokeWidth={1.8} class="text-primary" />
                    </div>
                  </div>
                  <p class="text-sm font-semibold text-ink">{tr('chat.noConversations')}</p>
                  <p class="mt-1 max-w-[220px] text-xs leading-relaxed text-mute">{tr('chat.noConversationsDesc')}</p>
                  <button type="button" onclick={openCompose} class="mt-3 flex items-center gap-1.5 rounded-full bg-primary-soft/60 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-soft">
                    <HugeiconsIcon icon={Edit01Icon} size={12} strokeWidth={2} />
                    {tr('chat.newMessage')}
                  </button>
                </div>
              </div>
            {:else}
              {#each filteredConversations as conv (conv.id)}
                <button type="button" onclick={() => openConversation(conv)} class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-lane/40 {conv.unreadCount > 0 ? 'bg-primary-soft/30' : ''}">
                  {#if conv.kind === 'group'}
                    <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><HugeiconsIcon icon={UserGroupIcon} size={20} strokeWidth={1.8} /></div>
                  {:else}
                    <Avatar name={conversationDisplayName(conv)} src={conversationAvatar(conv) ?? undefined} size={40} online />
                  {/if}
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2">
                      <span class="truncate text-sm font-semibold text-ink">{conversationDisplayName(conv)}</span>
                      <span class="shrink-0 text-[11px] text-faint">{conv.lastMessage ? formatDate(conv.lastMessage.createdAt) : ''}</span>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                      <span class="truncate text-xs text-mute">{lastMessagePreview(conv)}</span>
                      {#if conv.unreadCount > 0}
                        <span class="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{formatUnread(conv.unreadCount)}</span>
                      {/if}
                    </div>
                  </div>
                </button>
              {/each}
            {/if}
          </div>
        {/snippet}
        {@render listContent()}
      {:else if dockMode === 'thread' && activeConversationId}
        {#snippet threadContent()}
          {#if showRoomInfo}
            <div class="min-h-0 flex-1 overflow-y-auto p-4">
              <h3 class="ds-label text-ink">{tr('chat.participants')}</h3>
              <div class="mt-3 space-y-2">
                {#each roomParticipants as p (p.userId)}
                  <div class="flex items-center gap-3 rounded-lg border border-hairline bg-card p-3">
                    <Avatar name={p.name} src={p.avatarUrl ?? undefined} size={32} />
                    <div class="min-w-0 flex-1"><div class="truncate text-sm font-medium text-ink">{p.name}</div><div class="truncate text-xs text-mute">{p.email}</div></div>
                    {#if p.role === 'admin'}<Badge tone="queued" variant="soft">{tr('chat.admin')}</Badge>{/if}
                  </div>
                {/each}
              </div>
              <Button variant="destructive" class="mt-4 w-full" onclick={() => (showLeaveConfirm = true)} disabled={threadIsGroup === false}>
                <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
                <span>{tr('chat.leaveRoom')}</span>
              </Button>
            </div>
          {:else}
            <div bind:this={threadContainer} class="min-h-0 flex-1 overflow-y-auto bg-canvas-sunken/30 px-3 py-3">
              {#if hasOlderMessages}
                <button type="button" onclick={() => loadMessages(true)} disabled={loadingOlder} class="mx-auto mb-3 block rounded-full bg-card px-4 py-1.5 text-xs font-semibold text-primary shadow-control hover:bg-primary-soft disabled:opacity-50">
                  {loadingOlder ? '…' : tr('chat.loadOlder')}
                </button>
              {/if}
              {#if showMsgSkeleton}
                <div class="space-y-3">{#each Array(5) as _, i}<div class="flex {i % 2 === 0 ? 'justify-start' : 'justify-end'}"><div class="max-w-[70%] space-y-1"><Skeleton class="h-12 w-48 rounded-xl" /></div></div>{/each}</div>
              {:else if messagesLoading}
                <div class="h-full"></div>
              {:else if messagesError}
                <div class="grid h-full place-items-center p-6">
                  <div class="flex flex-col items-center text-center">
                    <div class="relative mb-3">
                      <div class="absolute inset-0 rounded-full bg-status-urgent/8 blur-2xl"></div>
                      <div class="relative flex size-14 items-center justify-center rounded-2xl bg-status-urgent-soft ring-4 ring-status-urgent-soft/40">
                        <HugeiconsIcon icon={AlertCircleIcon} size={24} strokeWidth={1.8} class="text-status-urgent" />
                      </div>
                    </div>
                    <p class="text-sm font-semibold text-ink">{tr('chat.loadError')}</p>
                    <button type="button" onclick={() => loadMessages()} class="mt-3 flex items-center gap-1.5 rounded-full bg-primary-soft/60 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-soft">
                      <HugeiconsIcon icon={ArrowLeft01Icon} size={12} strokeWidth={2} class="rotate-180" />
                      {tr('chat.retry')}
                    </button>
                  </div>
                </div>
              {:else if messages.length === 0}
                <div class="grid h-full place-items-center p-6">
                  <div class="flex flex-col items-center text-center">
                    <div class="relative mb-4">
                      <div class="absolute inset-0 rounded-full bg-primary/8 blur-2xl"></div>
                      {#if threadIsGroup}
                        <div class="relative flex size-16 items-center justify-center rounded-2xl bg-primary-soft ring-4 ring-primary-soft/40">
                          <HugeiconsIcon icon={UserGroupIcon} size={28} strokeWidth={1.8} class="text-primary" />
                        </div>
                      {:else}
                        <div class="relative rounded-full ring-4 ring-primary-soft/50">
                          <Avatar name={threadTitle} src={threadAvatar ?? undefined} size={64} />
                        </div>
                      {/if}
                    </div>
                    <p class="text-sm font-semibold text-ink">{tr('chat.emptyThread')}</p>
                    <p class="mt-1 max-w-[240px] text-xs leading-relaxed text-mute">{tr('chat.emptyThreadDescription', { name: threadTitle })}</p>
                    <div class="mt-3 flex items-center gap-1.5 rounded-full bg-primary-soft/60 px-3 py-1.5">
                      <HugeiconsIcon icon={BubbleChatIcon} size={12} strokeWidth={2} class="text-primary" />
                      <span class="text-[11px] font-medium text-primary">{tr('chat.emptyThreadHint')}</span>
                    </div>
                  </div>
                </div>
              {:else}
                {#each messages as msg (msg.id)}
                  <div class="mb-2 flex {isOwnMessage(msg) ? 'justify-end' : 'justify-start'}">
                    <div class="max-w-[80%]">
                      {#if msg.replyToMessageId}
                        <div class="mb-1 rounded-lg border-l-2 border-primary/40 bg-canvas-sunken/50 px-2.5 py-1 text-xs text-mute">
                          {#if msg.replyToDeleted}
                            {tr('chat.replyDeleted')}
                          {:else}
                            <span class="font-medium">{msg.replyToSenderName}: </span>{msg.replyToBody}
                          {/if}
                        </div>
                      {/if}
                      {#if !isOwnMessage(msg) && threadIsGroup}
                        <div class="mb-0.5 flex items-center gap-1.5">
                          <Avatar name={msg.senderName} src={msg.senderAvatarUrl ?? undefined} size={18} />
                          <span class="text-xs font-semibold text-mute">{msg.senderName}</span>
                        </div>
                      {/if}
                      <!-- Attachments (above bubble) -->
                      {#if !msg.deletedAt && msg.attachments && msg.attachments.length > 0}
                        <div class="mb-1 flex flex-wrap gap-1.5 {isOwnMessage(msg) ? 'justify-end' : 'justify-start'}">
                          {#each msg.attachments as att (att.id)}
                            {#if isImageType(att.fileType)}
                              <button type="button" onclick={() => (lightboxSrc = att.filePath)} class="group/img relative block cursor-zoom-in overflow-hidden rounded-lg border border-hairline">
                                <img src={att.filePath} alt={att.fileName} class="max-h-32 max-w-[180px] object-cover transition-opacity group-hover/img:opacity-80" loading="lazy" />
                                <div class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/img:opacity-100">
                                  <div class="flex size-8 items-center justify-center rounded-full bg-black/50 text-white"><HugeiconsIcon icon={ZoomIcon} size={16} strokeWidth={2} /></div>
                                </div>
                              </button>
                            {:else if isVideoType(att.fileType)}
                              <video src={att.filePath} controls class="max-h-32 max-w-[180px] rounded-lg"></video>
                            {:else}
                              <div class="flex items-center gap-1.5 rounded-lg border border-hairline bg-card px-2 py-1.5 text-xs text-mute">
                                <HugeiconsIcon icon={File02Icon} size={14} strokeWidth={1.8} />
                                <span class="truncate max-w-[100px]">{att.fileName}</span>
                                <span class="shrink-0 text-faint">{formatFileSize(att.fileSize)}</span>
                                <a href={att.filePath} download={att.fileName} class="flex size-6 items-center justify-center rounded text-mute hover:bg-canvas-sunken hover:text-ink" aria-label="Download">
                                  <HugeiconsIcon icon={Download04Icon} size={14} strokeWidth={1.8} />
                                </a>
                              </div>
                            {/if}
                          {/each}
                        </div>
                      {/if}
                      <div class="group relative rounded-2xl px-3.5 py-2 text-sm {isOwnMessage(msg) ? 'bg-primary text-white' : 'bg-card text-body border border-hairline shadow-control'} {isOwnMessage(msg) ? 'rounded-br-md' : 'rounded-bl-md'}">
                        {#if msg.deletedAt}
                          <span class="italic text-faint">{tr('chat.deleted')}</span>
                        {:else if editingMessageId === msg.id}
                          <div class="flex flex-col gap-2">
                            <textarea bind:value={editText} rows="2" class="w-full resize-none rounded-lg border border-hairline bg-card px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"></textarea>
                            <div class="flex gap-1.5">
                              <button type="button" onclick={saveEdit} class="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary hover:bg-primary-soft-hover"><HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2} /></button>
                              <button type="button" onclick={cancelEdit} class="flex size-7 items-center justify-center rounded-lg bg-canvas-sunken text-mute hover:text-ink"><HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} /></button>
                            </div>
                          </div>
                        {:else}
                          {#if msg.body}<span class="whitespace-pre-wrap break-words">{msg.body}</span>{/if}
                          {#if msg.editedAt}<span class="ml-1 text-[10px] {isOwnMessage(msg) ? 'text-white/60' : 'text-faint'}">({tr('chat.edited')})</span>{/if}
                        {/if}
                      </div>
                      <!-- Reactions -->
                      {#if !msg.deletedAt && reactionCounts(msg).length > 0}
                        <div class="mt-1 flex flex-wrap gap-1">
                          {#each reactionCounts(msg) as rc (rc.reaction)}
                            <button type="button" onclick={() => handleReaction(msg, rc.reaction)} class="flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors {rc.reactedByMe ? 'border-primary bg-primary-soft text-primary' : 'border-hairline bg-card text-mute hover:bg-canvas-sunken'}">
                              <span>{rc.reaction}</span><span class="font-semibold">{rc.count}</span>
                            </button>
                          {/each}
                        </div>
                      {/if}
                      <div class="mt-0.5 text-[10px] text-faint">{formatTime(msg.createdAt)}</div>
                      <!-- Action menu trigger -->
                      {#if !msg.deletedAt}
                        <button type="button" onclick={() => (openMenuMessageId = openMenuMessageId === msg.id ? null : msg.id)} class="absolute -top-1 {isOwnMessage(msg) ? '-left-7' : '-right-7'} flex size-6 items-center justify-center rounded-full bg-card text-faint opacity-0 shadow-control transition-opacity hover:text-ink group-hover:opacity-100" aria-label={tr('chat.moreOptions')}>
                          <HugeiconsIcon icon={MoreVerticalIcon} size={14} strokeWidth={2} />
                        </button>
                        {#if openMenuMessageId === msg.id}
                          <div class="absolute z-10 mt-1 {isOwnMessage(msg) ? 'left-0' : 'right-0'} top-full rounded-lg border border-hairline bg-card py-1 shadow-popover">
                            <button type="button" onclick={() => startReply(msg)} class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-body hover:bg-canvas-sunken"><HugeiconsIcon icon={MailReply01Icon} size={14} strokeWidth={1.8} />{tr('chat.reply')}</button>
                            <button type="button" onclick={() => (reactionPickerMessageId = reactionPickerMessageId === msg.id ? null : msg.id)} class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-body hover:bg-canvas-sunken"><span class="text-sm">😊</span>{tr('chat.reactionsLabel')}</button>
                            {#if isOwnMessage(msg)}
                              <button type="button" onclick={() => startEdit(msg)} class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-body hover:bg-canvas-sunken"><HugeiconsIcon icon={Edit01Icon} size={14} strokeWidth={1.8} />{tr('chat.edit')}</button>
                              <button type="button" onclick={() => (deleteTargetId = msg.id)} class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-status-urgent-ink hover:bg-status-urgent-soft"><HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />{tr('chat.delete')}</button>
                            {/if}
                          </div>
                          {#if reactionPickerMessageId === msg.id}
                            <div class="absolute z-20 mt-1 {isOwnMessage(msg) ? 'left-0' : 'right-0'} top-full mt-8 flex gap-1 rounded-lg border border-hairline bg-card p-1.5 shadow-popover">
                              {#each ALLOWED_REACTIONS as r}
                                <button type="button" onclick={() => handleReaction(msg, r)} class="flex size-7 items-center justify-center rounded-md text-base hover:bg-canvas-sunken">{r}</button>
                              {/each}
                            </div>
                          {/if}
                        {/if}
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
            <!-- Composer -->
            {#if replyToMessage}
              <div class="flex items-center gap-2 border-t border-hairline bg-canvas-sunken/50 px-3 py-1.5">
                <HugeiconsIcon icon={MailReply01Icon} size={14} strokeWidth={1.8} class="text-mute" />
                <span class="flex-1 truncate text-xs text-mute">{tr('chat.replyTo', { name: replyToMessage.senderName })}</span>
                <button type="button" onclick={cancelReply} class="text-mute hover:text-ink"><HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.8} /></button>
              </div>
            {/if}
            {#if sendError || attachmentError}
              <div class="px-3 py-1.5"><AlertInline tone="negative" title={tr('chat.sendErrorRetry')} /></div>
            {/if}
            {#if pendingAttachments.length > 0}
              <div class="flex flex-wrap gap-2 border-t border-hairline bg-canvas-sunken/50 px-3 py-2">
                {#each pendingAttachments as att (att.id)}
                  <div class="group relative flex items-center gap-1.5 rounded-lg border border-hairline bg-card p-1.5">
                    {#if isImageType(att.fileType)}
                      <img src={att.filePath} alt={att.fileName} class="size-9 rounded object-cover" />
                    {:else}
                      <div class="flex size-9 items-center justify-center rounded bg-canvas-sunken text-mute"><HugeiconsIcon icon={File02Icon} size={16} strokeWidth={1.8} /></div>
                    {/if}
                    <div class="min-w-0 max-w-[90px]">
                      <div class="truncate text-[11px] font-medium text-ink">{att.fileName}</div>
                      <div class="text-[9px] text-faint">{formatFileSize(att.fileSize)}</div>
                    </div>
                    <button type="button" onclick={() => removePendingAttachment(att.id)} class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-card text-mute shadow-control hover:text-ink"><HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2} /></button>
                  </div>
                {/each}
              </div>
            {/if}
            {#if uploadingAttachment}
              <div class="flex items-center gap-2 border-t border-hairline bg-canvas-sunken/50 px-3 py-1.5">
                <div class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span class="text-xs text-mute">{tr('chat.uploading')}</span>
              </div>
            {/if}
            <div class="flex items-end gap-2 border-t border-hairline bg-card p-3">
              <input bind:this={fileInput} type="file" accept={ACCEPTED_FILE_TYPES} multiple onchange={handleFileSelect} class="hidden" />
              <button type="button" onclick={() => fileInput?.click()} disabled={uploadingAttachment} class="flex size-10 shrink-0 items-center justify-center rounded-xl text-mute transition-colors hover:bg-canvas-sunken hover:text-ink disabled:opacity-40" aria-label={tr('chat.attachFile')}>
                <HugeiconsIcon icon={Attachment01Icon} size={18} strokeWidth={1.8} />
              </button>
              <textarea
                bind:value={composerText}
                onkeydown={handleKeydown}
                onpaste={handlePaste}
                rows="1"
                placeholder={tr('chat.messagePlaceholder')}
                class="max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border border-hairline bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              ></textarea>
              <button type="button" onclick={handleSend} disabled={(!composerText.trim() && pendingAttachments.length === 0) || sendingMessage} class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-40">
                <HugeiconsIcon icon={SentIcon} size={18} strokeWidth={1.8} />
              </button>
            </div>
          {/if}
        {/snippet}
        {@render threadContent()}
      {:else if dockMode === 'newDirect'}
        {#snippet newDirectContent()}
          <div class="border-b border-hairline p-3">
            <SearchInput bind:value={memberSearch} placeholder={tr('chat.searchMembers')} />
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto">
            {#if membersLoading}
              {#each Array(5) as _, i}<div class="flex items-center gap-3 px-3 py-3"><Skeleton class="size-10 rounded-full" /><Skeleton class="h-3.5 w-32" /></div>{/each}
            {:else if filteredMembers.length === 0}
              <div class="grid h-full place-items-center p-6">
                <div class="flex flex-col items-center text-center">
                  <div class="relative mb-3">
                    <div class="absolute inset-0 rounded-full bg-primary/8 blur-2xl"></div>
                    <div class="relative flex size-14 items-center justify-center rounded-2xl bg-primary-soft ring-4 ring-primary-soft/40">
                      <HugeiconsIcon icon={UserGroupIcon} size={24} strokeWidth={1.8} class="text-primary" />
                    </div>
                  </div>
                  <p class="text-sm font-semibold text-ink">{tr('chat.emptyMembersShort')}</p>
                  <p class="mt-1 max-w-[220px] text-xs leading-relaxed text-mute">{tr('chat.emptyMembersShortDesc')}</p>
                </div>
              </div>
            {:else}
              {#each filteredMembers as m (m.id)}
                <button type="button" onclick={() => startDirect(m.id)} class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-lane/40">
                  <Avatar name={m.name} src={m.avatarUrl ?? undefined} size={40} online />
                  <div class="min-w-0 flex-1"><div class="truncate text-sm font-semibold text-ink">{m.name}</div><div class="truncate text-xs text-mute">{m.email}</div></div>
                </button>
              {/each}
            {/if}
          </div>
          <div class="flex items-center gap-2 border-t border-hairline bg-card p-3">
            <Button variant="secondary" size="sm" onclick={openCreateGroup}><HugeiconsIcon icon={UserGroupIcon} size={16} strokeWidth={1.8} /><span>{tr('chat.createGroup')}</span></Button>
          </div>
        {/snippet}
        {@render newDirectContent()}
      {:else if dockMode === 'createGroup'}
        {#snippet createGroupContent()}
          {#if groupStep === 1}
            <div class="border-b border-hairline p-3">
              <SearchInput bind:value={memberSearch} placeholder={tr('chat.searchMembers')} />
              <p class="mt-2 text-xs text-mute">{tr('chat.selectedCount', { count: selectedMemberIds.length })}</p>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto">
              {#if membersLoading}
                {#each Array(5) as _, i}<div class="flex items-center gap-3 px-3 py-3"><Skeleton class="size-10 rounded-full" /><Skeleton class="h-3.5 w-32" /></div>{/each}
              {:else if filteredMembers.length === 0}
                <div class="grid h-full place-items-center p-6">
                  <div class="flex flex-col items-center text-center">
                    <div class="relative mb-3">
                      <div class="absolute inset-0 rounded-full bg-primary/8 blur-2xl"></div>
                      <div class="relative flex size-14 items-center justify-center rounded-2xl bg-primary-soft ring-4 ring-primary-soft/40">
                        <HugeiconsIcon icon={UserGroupIcon} size={24} strokeWidth={1.8} class="text-primary" />
                      </div>
                    </div>
                    <p class="text-sm font-semibold text-ink">{tr('chat.emptyMembersShort')}</p>
                    <p class="mt-1 max-w-[220px] text-xs leading-relaxed text-mute">{tr('chat.emptyMembersShortDesc')}</p>
                  </div>
                </div>
              {:else}
                {#each filteredMembers as m (m.id)}
                  <button type="button" onclick={() => toggleMemberSelection(m.id)} class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-lane/40 {selectedMemberIds.includes(m.id) ? 'bg-primary-soft/30' : ''}">
                    <Avatar name={m.name} src={m.avatarUrl ?? undefined} size={40} />
                    <div class="min-w-0 flex-1"><div class="truncate text-sm font-semibold text-ink">{m.name}</div><div class="truncate text-xs text-mute">{m.email}</div></div>
                    {#if selectedMemberIds.includes(m.id)}
                      <div class="flex size-5 items-center justify-center rounded-full bg-primary text-white"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2} /></div>
                    {/if}
                  </button>
                {/each}
              {/if}
            </div>
            <div class="flex items-center justify-between gap-2 border-t border-hairline bg-card p-3">
              <Button variant="secondary" size="sm" onclick={() => (dockMode = 'newDirect')}>{tr('chat.cancel')}</Button>
              <Button variant="primary" size="sm" onclick={() => (groupStep = 2)} disabled={selectedMemberIds.length < 1}>{tr('chat.next')}</Button>
            </div>
          {:else}
            <div class="flex min-h-0 flex-1 flex-col p-4">
              <label class="ds-label text-ink" for="group-name-input">{tr('chat.groupName')}</label>
              <input id="group-name-input" bind:value={groupName} placeholder={tr('chat.groupPlaceholder')} class="mt-2 rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-[var(--focus)]" />
              <div class="mt-4">
                <p class="ds-caption text-mute">{tr('chat.selectMembers')} ({selectedMemberIds.length})</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  {#each members.filter((m) => selectedMemberIds.includes(m.id)) as m (m.id)}
                    <div class="flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-ink">
                      <Avatar name={m.name} src={m.avatarUrl ?? undefined} size={18} />
                      {m.name}
                    </div>
                  {/each}
                </div>
              </div>
              <div class="mt-auto flex items-center justify-between gap-2 pt-4">
                <Button variant="secondary" size="sm" onclick={() => (groupStep = 1)}>{tr('chat.back')}</Button>
                <Button variant="primary" size="sm" onclick={createGroup} disabled={!groupName.trim() || creatingGroup}>{creatingGroup ? '…' : tr('chat.create')}</Button>
              </div>
            </div>
          {/if}
        {/snippet}
        {@render createGroupContent()}
      {/if}
    </div>
  </div>
{:else}
  <!-- Desktop: dock panel -->
  <div use:clickOutside class="flex w-[380px] flex-col rounded-2xl border border-hairline bg-card shadow-popover h-[600px] max-h-[calc(100vh-120px)] overflow-hidden">
    <!-- Desktop header -->
    <div class="flex items-center gap-2 border-b border-hairline px-3 py-3">
      {#if dockMode === 'list'}
        <button type="button" onclick={collapse} class="flex size-8 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink" aria-label={tr('chat.collapse')}>
          <HugeiconsIcon icon={Minimize02Icon} size={18} strokeWidth={1.8} />
        </button>
        <span class="flex-1 ds-label text-ink">{tr('chat.dockTitle')}</span>
        {#if unreadTotal > 0}
          <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{formatUnread(unreadTotal)}</span>
        {/if}
        <button type="button" onclick={openCompose} class="flex size-8 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink" aria-label={tr('chat.newMessage')}>
          <HugeiconsIcon icon={Edit01Icon} size={18} strokeWidth={1.8} />
        </button>
      {:else if dockMode === 'thread'}
        <button type="button" onclick={backToList} class="flex size-8 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink" aria-label={tr('chat.back')}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.8} />
        </button>
        {#if threadIsGroup}
          <div class="flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary"><HugeiconsIcon icon={UserGroupIcon} size={16} strokeWidth={1.8} /></div>
        {:else}
          <Avatar name={threadTitle} src={threadAvatar ?? undefined} size={28} online />
        {/if}
        <button type="button" onclick={loadRoomInfo} class="min-w-0 flex-1 truncate text-left">
          <span class="block truncate text-sm font-semibold text-ink">{threadTitle}</span>
          {#if threadIsGroup}<span class="block text-[11px] text-mute">{tr('chat.groupRoom')}</span>{/if}
        </button>
        <button type="button" onclick={openCompose} class="flex size-8 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink" aria-label={tr('chat.newMessage')}>
          <HugeiconsIcon icon={Edit01Icon} size={18} strokeWidth={1.8} />
        </button>
        <button type="button" onclick={collapse} class="flex size-8 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink" aria-label={tr('chat.collapse')}>
          <HugeiconsIcon icon={Minimize02Icon} size={18} strokeWidth={1.8} />
        </button>
      {:else}
        <button type="button" onclick={backToList} class="flex size-8 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink" aria-label={tr('chat.back')}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.8} />
        </button>
        <span class="flex-1 truncate ds-label text-ink">
          {#if dockMode === 'newDirect'}{tr('chat.newMessage')}{:else if dockMode === 'createGroup'}{tr('chat.createGroup')}{/if}
        </span>
        <button type="button" onclick={collapse} class="flex size-8 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink" aria-label={tr('chat.collapse')}>
          <HugeiconsIcon icon={Minimize02Icon} size={18} strokeWidth={1.8} />
        </button>
      {/if}
    </div>

    <!-- Desktop content -->
    {#if dockMode === 'list'}
      <div class="border-b border-hairline p-3">
        <SearchInput bind:value={searchQuery} placeholder={tr('chat.search')} />
        <div class="mt-2 flex gap-1.5">
          <button type="button" onclick={() => (filterUnread = false)} class="rounded-full px-3 py-1 text-xs font-semibold transition-colors {!filterUnread ? 'bg-primary text-white' : 'bg-canvas-sunken text-mute hover:text-ink'}">{tr('chat.all')}</button>
          <button type="button" onclick={() => (filterUnread = true)} class="rounded-full px-3 py-1 text-xs font-semibold transition-colors {filterUnread ? 'bg-primary text-white' : 'bg-canvas-sunken text-mute hover:text-ink'}">{tr('chat.unreadFilter')}</button>
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        {#if showConvSkeleton}
          {#each Array(6) as _, i}
            <div class="flex items-center gap-3 px-3 py-3"><Skeleton class="size-10 rounded-full" /><div class="flex-1 space-y-2"><Skeleton class="h-3.5 w-24" /><Skeleton class="h-3 w-40" /></div></div>
          {/each}
        {:else if conversationsLoading}
          <div class="h-full"></div>
        {:else if conversationsError}
          <div class="grid h-full place-items-center p-6">
            <div class="flex flex-col items-center text-center">
              <div class="relative mb-3">
                <div class="absolute inset-0 rounded-full bg-status-urgent/8 blur-2xl"></div>
                <div class="relative flex size-14 items-center justify-center rounded-2xl bg-status-urgent-soft ring-4 ring-status-urgent-soft/40">
                  <HugeiconsIcon icon={AlertCircleIcon} size={24} strokeWidth={1.8} class="text-status-urgent" />
                </div>
              </div>
              <p class="text-sm font-semibold text-ink">{tr('chat.loadError')}</p>
              <button type="button" onclick={loadConversations} class="mt-3 flex items-center gap-1.5 rounded-full bg-primary-soft/60 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-soft">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={12} strokeWidth={2} class="rotate-180" />
                {tr('chat.retry')}
              </button>
            </div>
          </div>
        {:else if filteredConversations.length === 0}
          <div class="grid h-full place-items-center p-6">
            <div class="flex flex-col items-center text-center">
              <div class="relative mb-3">
                <div class="absolute inset-0 rounded-full bg-primary/8 blur-2xl"></div>
                <div class="relative flex size-14 items-center justify-center rounded-2xl bg-primary-soft ring-4 ring-primary-soft/40">
                  <HugeiconsIcon icon={BubbleChatIcon} size={24} strokeWidth={1.8} class="text-primary" />
                </div>
              </div>
              <p class="text-sm font-semibold text-ink">{tr('chat.noConversations')}</p>
              <p class="mt-1 max-w-[220px] text-xs leading-relaxed text-mute">{tr('chat.noConversationsDesc')}</p>
              <button type="button" onclick={openCompose} class="mt-3 flex items-center gap-1.5 rounded-full bg-primary-soft/60 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-soft">
                <HugeiconsIcon icon={Edit01Icon} size={12} strokeWidth={2} />
                {tr('chat.newMessage')}
              </button>
            </div>
          </div>
        {:else}
          {#each filteredConversations as conv (conv.id)}
            <button type="button" onclick={() => openConversation(conv)} class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-lane/40 {conv.unreadCount > 0 ? 'bg-primary-soft/30' : ''}">
              {#if conv.kind === 'group'}
                <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><HugeiconsIcon icon={UserGroupIcon} size={20} strokeWidth={1.8} /></div>
              {:else}
                <Avatar name={conversationDisplayName(conv)} src={conversationAvatar(conv) ?? undefined} size={40} online />
              {/if}
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate text-sm font-semibold text-ink">{conversationDisplayName(conv)}</span>
                  <span class="shrink-0 text-[11px] text-faint">{conv.lastMessage ? formatDate(conv.lastMessage.createdAt) : ''}</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate text-xs text-mute">{lastMessagePreview(conv)}</span>
                  {#if conv.unreadCount > 0}
                    <span class="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{formatUnread(conv.unreadCount)}</span>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    {:else if dockMode === 'thread' && activeConversationId}
      {#if showRoomInfo}
        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <h3 class="ds-label text-ink">{tr('chat.participants')}</h3>
          <div class="mt-3 space-y-2">
            {#each roomParticipants as p (p.userId)}
              <div class="flex items-center gap-3 rounded-lg border border-hairline bg-card p-3">
                <Avatar name={p.name} src={p.avatarUrl ?? undefined} size={32} />
                <div class="min-w-0 flex-1"><div class="truncate text-sm font-medium text-ink">{p.name}</div><div class="truncate text-xs text-mute">{p.email}</div></div>
                {#if p.role === 'admin'}<Badge tone="queued" variant="soft">{tr('chat.admin')}</Badge>{/if}
              </div>
            {/each}
          </div>
          <Button variant="destructive" class="mt-4 w-full" onclick={() => (showLeaveConfirm = true)} disabled={!threadIsGroup}>
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
            <span>{tr('chat.leaveRoom')}</span>
          </Button>
          <Button variant="secondary" class="mt-2 w-full" onclick={() => (showRoomInfo = false)}>
            <span>{tr('chat.back')}</span>
          </Button>
        </div>
      {:else}
        <div bind:this={threadContainer} class="min-h-0 flex-1 overflow-y-auto bg-canvas-sunken/30 px-3 py-3">
          {#if hasOlderMessages}
            <button type="button" onclick={() => loadMessages(true)} disabled={loadingOlder} class="mx-auto mb-3 block rounded-full bg-card px-4 py-1.5 text-xs font-semibold text-primary shadow-control hover:bg-primary-soft disabled:opacity-50">
              {loadingOlder ? '…' : tr('chat.loadOlder')}
            </button>
          {/if}
          {#if showMsgSkeleton}
            <div class="space-y-3">{#each Array(5) as _, i}<div class="flex {i % 2 === 0 ? 'justify-start' : 'justify-end'}"><div class="max-w-[70%] space-y-1"><Skeleton class="h-12 w-48 rounded-xl" /></div></div>{/each}</div>
          {:else if messagesLoading}
            <div class="h-full"></div>
          {:else if messagesError}
            <div class="grid h-full place-items-center p-6">
              <div class="flex flex-col items-center text-center">
                <div class="relative mb-3">
                  <div class="absolute inset-0 rounded-full bg-status-urgent/8 blur-2xl"></div>
                  <div class="relative flex size-14 items-center justify-center rounded-2xl bg-status-urgent-soft ring-4 ring-status-urgent-soft/40">
                    <HugeiconsIcon icon={AlertCircleIcon} size={24} strokeWidth={1.8} class="text-status-urgent" />
                  </div>
                </div>
                <p class="text-sm font-semibold text-ink">{tr('chat.loadError')}</p>
                <button type="button" onclick={() => loadMessages()} class="mt-3 flex items-center gap-1.5 rounded-full bg-primary-soft/60 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-soft">
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={12} strokeWidth={2} class="rotate-180" />
                  {tr('chat.retry')}
                </button>
              </div>
            </div>
          {:else if messages.length === 0}
            <div class="grid h-full place-items-center p-6">
              <div class="flex flex-col items-center text-center">
                <div class="relative mb-4">
                  <div class="absolute inset-0 rounded-full bg-primary/8 blur-2xl"></div>
                  {#if threadIsGroup}
                    <div class="relative flex size-16 items-center justify-center rounded-2xl bg-primary-soft ring-4 ring-primary-soft/40">
                      <HugeiconsIcon icon={UserGroupIcon} size={28} strokeWidth={1.8} class="text-primary" />
                    </div>
                  {:else}
                    <div class="relative rounded-full ring-4 ring-primary-soft/50">
                      <Avatar name={threadTitle} src={threadAvatar ?? undefined} size={64} />
                    </div>
                  {/if}
                </div>
                <p class="text-sm font-semibold text-ink">{tr('chat.emptyThread')}</p>
                <p class="mt-1 max-w-[240px] text-xs leading-relaxed text-mute">{tr('chat.emptyThreadDescription', { name: threadTitle })}</p>
                <div class="mt-3 flex items-center gap-1.5 rounded-full bg-primary-soft/60 px-3 py-1.5">
                  <HugeiconsIcon icon={BubbleChatIcon} size={12} strokeWidth={2} class="text-primary" />
                  <span class="text-[11px] font-medium text-primary">{tr('chat.emptyThreadHint')}</span>
                </div>
              </div>
            </div>
          {:else}
            {#each messages as msg (msg.id)}
              <div class="mb-2 flex {isOwnMessage(msg) ? 'justify-end' : 'justify-start'}">
                <div class="group relative max-w-[80%]">
                  {#if msg.replyToMessageId}
                    <div class="mb-1 rounded-lg border-l-2 border-primary/40 bg-canvas-sunken/50 px-2.5 py-1 text-xs text-mute">
                      {#if msg.replyToDeleted}
                        {tr('chat.replyDeleted')}
                      {:else}
                        <span class="font-medium">{msg.replyToSenderName}: </span>{msg.replyToBody}
                      {/if}
                    </div>
                  {/if}
                  {#if !isOwnMessage(msg) && threadIsGroup}
                    <div class="mb-0.5 flex items-center gap-1.5">
                      <Avatar name={msg.senderName} src={msg.senderAvatarUrl ?? undefined} size={18} />
                      <span class="text-xs font-semibold text-mute">{msg.senderName}</span>
                    </div>
                  {/if}
                  <!-- Attachments (above bubble) -->
                  {#if !msg.deletedAt && msg.attachments && msg.attachments.length > 0}
                    <div class="mb-1 flex flex-wrap gap-1.5 {isOwnMessage(msg) ? 'justify-end' : 'justify-start'}">
                      {#each msg.attachments as att (att.id)}
                        {#if isImageType(att.fileType)}
                          <button type="button" onclick={() => (lightboxSrc = att.filePath)} class="group/img relative block cursor-zoom-in overflow-hidden rounded-lg border border-hairline">
                            <img src={att.filePath} alt={att.fileName} class="max-h-32 max-w-[180px] object-cover transition-opacity group-hover/img:opacity-80" loading="lazy" />
                            <div class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/img:opacity-100">
                              <div class="flex size-8 items-center justify-center rounded-full bg-black/50 text-white"><HugeiconsIcon icon={ZoomIcon} size={16} strokeWidth={2} /></div>
                            </div>
                          </button>
                        {:else if isVideoType(att.fileType)}
                          <video src={att.filePath} controls class="max-h-32 max-w-[180px] rounded-lg"></video>
                        {:else}
                          <div class="flex items-center gap-1.5 rounded-lg border border-hairline bg-card px-2 py-1.5 text-xs text-mute">
                            <HugeiconsIcon icon={File02Icon} size={14} strokeWidth={1.8} />
                            <span class="truncate max-w-[100px]">{att.fileName}</span>
                            <span class="shrink-0 text-faint">{formatFileSize(att.fileSize)}</span>
                            <a href={att.filePath} download={att.fileName} class="flex size-6 items-center justify-center rounded text-mute hover:bg-canvas-sunken hover:text-ink" aria-label="Download">
                              <HugeiconsIcon icon={Download04Icon} size={14} strokeWidth={1.8} />
                            </a>
                          </div>
                        {/if}
                      {/each}
                    </div>
                  {/if}
                  <div class="group relative rounded-2xl px-3.5 py-2 text-sm {isOwnMessage(msg) ? 'bg-primary text-white' : 'bg-card text-body border border-hairline shadow-control'} {isOwnMessage(msg) ? 'rounded-br-md' : 'rounded-bl-md'}">
                    {#if msg.deletedAt}
                      <span class="italic text-faint">{tr('chat.deleted')}</span>
                    {:else if editingMessageId === msg.id}
                      <div class="flex flex-col gap-2">
                        <textarea bind:value={editText} rows="2" class="w-full resize-none rounded-lg border border-hairline bg-canvas px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"></textarea>
                        <div class="flex gap-1.5">
                          <button type="button" onclick={saveEdit} class="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary hover:bg-primary-soft-hover"><HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2} /></button>
                          <button type="button" onclick={cancelEdit} class="flex size-7 items-center justify-center rounded-lg bg-canvas-sunken text-mute hover:text-ink"><HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} /></button>
                        </div>
                      </div>
                    {:else}
                      {#if msg.body}<span class="whitespace-pre-wrap break-words">{msg.body}</span>{/if}
                      {#if msg.editedAt}<span class="ml-1 text-[10px] {isOwnMessage(msg) ? 'text-white/60' : 'text-faint'}">({tr('chat.edited')})</span>{/if}
                    {/if}
                  </div>
                  {#if !msg.deletedAt && reactionCounts(msg).length > 0}
                    <div class="mt-1 flex flex-wrap gap-1">
                      {#each reactionCounts(msg) as rc (rc.reaction)}
                        <button type="button" onclick={() => handleReaction(msg, rc.reaction)} class="flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors {rc.reactedByMe ? 'border-primary bg-primary-soft text-primary' : 'border-hairline bg-card text-mute hover:bg-canvas-sunken'}">
                          <span>{rc.reaction}</span><span class="font-semibold">{rc.count}</span>
                        </button>
                      {/each}
                    </div>
                  {/if}
                  <div class="mt-0.5 text-[10px] text-faint">{formatTime(msg.createdAt)}</div>
                  {#if !msg.deletedAt}
                    <button type="button" onclick={() => (openMenuMessageId = openMenuMessageId === msg.id ? null : msg.id)} class="absolute -top-1 {isOwnMessage(msg) ? '-left-7' : '-right-7'} flex size-6 items-center justify-center rounded-full bg-card text-faint opacity-0 shadow-control transition-opacity hover:text-ink group-hover:opacity-100" aria-label={tr('chat.moreOptions')}>
                      <HugeiconsIcon icon={MoreVerticalIcon} size={14} strokeWidth={2} />
                    </button>
                    {#if openMenuMessageId === msg.id}
                      <div class="absolute z-10 mt-1 {isOwnMessage(msg) ? 'left-0' : 'right-0'} top-full rounded-lg border border-hairline bg-card py-1 shadow-popover">
                        <button type="button" onclick={() => startReply(msg)} class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-body hover:bg-canvas-sunken"><HugeiconsIcon icon={MailReply01Icon} size={14} strokeWidth={1.8} />{tr('chat.reply')}</button>
                        <button type="button" onclick={() => (reactionPickerMessageId = reactionPickerMessageId === msg.id ? null : msg.id)} class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-body hover:bg-canvas-sunken"><span class="text-sm">😊</span>{tr('chat.reactionsLabel')}</button>
                        {#if isOwnMessage(msg)}
                          <button type="button" onclick={() => startEdit(msg)} class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-body hover:bg-canvas-sunken"><HugeiconsIcon icon={Edit01Icon} size={14} strokeWidth={1.8} />{tr('chat.edit')}</button>
                          <button type="button" onclick={() => (deleteTargetId = msg.id)} class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-status-urgent-ink hover:bg-status-urgent-soft"><HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />{tr('chat.delete')}</button>
                        {/if}
                      </div>
                      {#if reactionPickerMessageId === msg.id}
                        <div class="absolute z-20 {isOwnMessage(msg) ? 'left-0' : 'right-0'} top-full mt-8 flex gap-1 rounded-lg border border-hairline bg-card p-1.5 shadow-popover">
                          {#each ALLOWED_REACTIONS as r}
                            <button type="button" onclick={() => handleReaction(msg, r)} class="flex size-7 items-center justify-center rounded-md text-base hover:bg-canvas-sunken">{r}</button>
                          {/each}
                        </div>
                      {/if}
                    {/if}
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>
        {#if replyToMessage}
          <div class="flex items-center gap-2 border-t border-hairline bg-canvas-sunken/50 px-3 py-1.5">
            <HugeiconsIcon icon={MailReply01Icon} size={14} strokeWidth={1.8} class="text-mute" />
            <span class="flex-1 truncate text-xs text-mute">{tr('chat.replyTo', { name: replyToMessage.senderName })}</span>
            <button type="button" onclick={cancelReply} class="text-mute hover:text-ink"><HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.8} /></button>
          </div>
        {/if}
        {#if sendError || attachmentError}
          <div class="px-3 py-1.5"><AlertInline tone="negative" title={tr('chat.sendErrorRetry')} /></div>
        {/if}
        {#if pendingAttachments.length > 0}
          <div class="flex flex-wrap gap-2 border-t border-hairline bg-canvas-sunken/50 px-3 py-2">
            {#each pendingAttachments as att (att.id)}
              <div class="group relative flex items-center gap-1.5 rounded-lg border border-hairline bg-card p-1.5">
                {#if isImageType(att.fileType)}
                  <img src={att.filePath} alt={att.fileName} class="size-9 rounded object-cover" />
                {:else}
                  <div class="flex size-9 items-center justify-center rounded bg-canvas-sunken text-mute"><HugeiconsIcon icon={File02Icon} size={16} strokeWidth={1.8} /></div>
                {/if}
                <div class="min-w-0 max-w-[90px]">
                  <div class="truncate text-[11px] font-medium text-ink">{att.fileName}</div>
                  <div class="text-[9px] text-faint">{formatFileSize(att.fileSize)}</div>
                </div>
                <button type="button" onclick={() => removePendingAttachment(att.id)} class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-card text-mute shadow-control hover:text-ink"><HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2} /></button>
              </div>
            {/each}
          </div>
        {/if}
        {#if uploadingAttachment}
          <div class="flex items-center gap-2 border-t border-hairline bg-canvas-sunken/50 px-3 py-1.5">
            <div class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span class="text-xs text-mute">{tr('chat.uploading')}</span>
          </div>
        {/if}
        <div class="flex items-end gap-2 border-t border-hairline bg-card p-3">
          <input bind:this={fileInput} type="file" accept={ACCEPTED_FILE_TYPES} multiple onchange={handleFileSelect} class="hidden" />
          <button type="button" onclick={() => fileInput?.click()} disabled={uploadingAttachment} class="flex size-10 shrink-0 items-center justify-center rounded-xl text-mute transition-colors hover:bg-canvas-sunken hover:text-ink disabled:opacity-40" aria-label={tr('chat.attachFile')}>
            <HugeiconsIcon icon={Attachment01Icon} size={18} strokeWidth={1.8} />
          </button>
          <textarea
            bind:value={composerText}
            onkeydown={handleKeydown}
            onpaste={handlePaste}
            rows="1"
            placeholder={tr('chat.messagePlaceholder')}
            class="max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border border-hairline bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
          ></textarea>
          <button type="button" onclick={handleSend} disabled={(!composerText.trim() && pendingAttachments.length === 0) || sendingMessage} class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-40">
            <HugeiconsIcon icon={SentIcon} size={18} strokeWidth={1.8} />
          </button>
        </div>
      {/if}
    {:else if dockMode === 'newDirect'}
      <div class="border-b border-hairline p-3">
        <SearchInput bind:value={memberSearch} placeholder={tr('chat.searchMembers')} />
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        {#if membersLoading}
          {#each Array(5) as _, i}<div class="flex items-center gap-3 px-3 py-3"><Skeleton class="size-10 rounded-full" /><Skeleton class="h-3.5 w-32" /></div>{/each}
        {:else if filteredMembers.length === 0}
          <div class="grid h-full place-items-center p-6">
            <div class="flex flex-col items-center text-center">
              <div class="relative mb-3">
                <div class="absolute inset-0 rounded-full bg-primary/8 blur-2xl"></div>
                <div class="relative flex size-14 items-center justify-center rounded-2xl bg-primary-soft ring-4 ring-primary-soft/40">
                  <HugeiconsIcon icon={UserGroupIcon} size={24} strokeWidth={1.8} class="text-primary" />
                </div>
              </div>
              <p class="text-sm font-semibold text-ink">{tr('chat.emptyMembersShort')}</p>
              <p class="mt-1 max-w-[220px] text-xs leading-relaxed text-mute">{tr('chat.emptyMembersShortDesc')}</p>
            </div>
          </div>
        {:else}
          {#each filteredMembers as m (m.id)}
            <button type="button" onclick={() => startDirect(m.id)} class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-lane/40">
              <Avatar name={m.name} src={m.avatarUrl ?? undefined} size={40} online />
              <div class="min-w-0 flex-1"><div class="truncate text-sm font-semibold text-ink">{m.name}</div><div class="truncate text-xs text-mute">{m.email}</div></div>
            </button>
          {/each}
        {/if}
      </div>
      <div class="flex items-center gap-2 border-t border-hairline bg-card p-3">
        <Button variant="secondary" size="sm" onclick={openCreateGroup}><HugeiconsIcon icon={UserGroupIcon} size={16} strokeWidth={1.8} /><span>{tr('chat.createGroup')}</span></Button>
      </div>
    {:else if dockMode === 'createGroup'}
      {#if groupStep === 1}
        <div class="border-b border-hairline p-3">
          <SearchInput bind:value={memberSearch} placeholder={tr('chat.searchMembers')} />
          <p class="mt-2 text-xs text-mute">{tr('chat.selectedCount', { count: selectedMemberIds.length })}</p>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto">
          {#if membersLoading}
            {#each Array(5) as _, i}<div class="flex items-center gap-3 px-3 py-3"><Skeleton class="size-10 rounded-full" /><Skeleton class="h-3.5 w-32" /></div>{/each}
          {:else if filteredMembers.length === 0}
            <div class="grid h-full place-items-center p-6">
              <div class="flex flex-col items-center text-center">
                <div class="relative mb-3">
                  <div class="absolute inset-0 rounded-full bg-primary/8 blur-2xl"></div>
                  <div class="relative flex size-14 items-center justify-center rounded-2xl bg-primary-soft ring-4 ring-primary-soft/40">
                    <HugeiconsIcon icon={UserGroupIcon} size={24} strokeWidth={1.8} class="text-primary" />
                  </div>
                </div>
                <p class="text-sm font-semibold text-ink">{tr('chat.emptyMembersShort')}</p>
                <p class="mt-1 max-w-[220px] text-xs leading-relaxed text-mute">{tr('chat.emptyMembersShortDesc')}</p>
              </div>
            </div>
          {:else}
            {#each filteredMembers as m (m.id)}
              <button type="button" onclick={() => toggleMemberSelection(m.id)} class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-lane/40 {selectedMemberIds.includes(m.id) ? 'bg-primary-soft/30' : ''}">
                <Avatar name={m.name} src={m.avatarUrl ?? undefined} size={40} />
                <div class="min-w-0 flex-1"><div class="truncate text-sm font-semibold text-ink">{m.name}</div><div class="truncate text-xs text-mute">{m.email}</div></div>
                {#if selectedMemberIds.includes(m.id)}
                  <div class="flex size-5 items-center justify-center rounded-full bg-primary text-white"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2} /></div>
                {/if}
              </button>
            {/each}
          {/if}
        </div>
        <div class="flex items-center justify-between gap-2 border-t border-hairline bg-card p-3">
          <Button variant="secondary" size="sm" onclick={() => (dockMode = 'newDirect')}>{tr('chat.cancel')}</Button>
          <Button variant="primary" size="sm" onclick={() => (groupStep = 2)} disabled={selectedMemberIds.length < 1}>{tr('chat.next')}</Button>
        </div>
      {:else}
        <div class="flex min-h-0 flex-1 flex-col p-4">
          <label class="ds-label text-ink" for="group-name-input-desktop">{tr('chat.groupName')}</label>
          <input id="group-name-input-desktop" bind:value={groupName} placeholder={tr('chat.groupPlaceholder')} class="mt-2 rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-[var(--focus)]" />
          <div class="mt-4">
            <p class="ds-caption text-mute">{tr('chat.selectMembers')} ({selectedMemberIds.length})</p>
            <div class="mt-2 flex flex-wrap gap-2">
              {#each members.filter((m) => selectedMemberIds.includes(m.id)) as m (m.id)}
                <div class="flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-ink">
                  <Avatar name={m.name} src={m.avatarUrl ?? undefined} size={18} />
                  {m.name}
                </div>
              {/each}
            </div>
          </div>
          <div class="mt-auto flex items-center justify-between gap-2 pt-4">
            <Button variant="secondary" size="sm" onclick={() => (groupStep = 1)}>{tr('chat.back')}</Button>
            <Button variant="primary" size="sm" onclick={createGroup} disabled={!groupName.trim() || creatingGroup}>{creatingGroup ? '…' : tr('chat.create')}</Button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<!-- Delete confirmation dialog -->
<ConfirmDialog
  open={deleteTargetId !== null}
  title={tr('chat.deleteConfirm')}
  description={tr('chat.deleteConfirmDesc')}
  confirmLabel={tr('chat.delete')}
  cancelLabel={tr('chat.cancel')}
  destructive
  onconfirm={confirmDelete}
  oncancel={() => (deleteTargetId = null)}
/>

<!-- Leave room confirmation dialog -->
<ConfirmDialog
  open={showLeaveConfirm}
  title={tr('chat.leaveConfirm')}
  description={tr('chat.leaveConfirmDesc')}
  confirmLabel={tr('chat.leaveRoom')}
  cancelLabel={tr('chat.cancel')}
  destructive
  onconfirm={leaveRoom}
  oncancel={() => (showLeaveConfirm = false)}
/>

<!-- Image lightbox -->
{#if lightboxSrc}
  <div
    data-lightbox
    class="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4"
    onclick={() => (lightboxSrc = null)}
    role="button"
    tabindex={0}
    onkeydown={(e) => { if (e.key === 'Escape') lightboxSrc = null; }}
  >
    <div class="absolute right-4 top-4 flex gap-2">
      <a href={lightboxSrc} download class="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Download">
        <HugeiconsIcon icon={Download04Icon} size={22} strokeWidth={1.8} />
      </a>
      <button type="button" onclick={() => (lightboxSrc = null)} class="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label={tr('chat.close')}>
        <HugeiconsIcon icon={Cancel01Icon} size={24} strokeWidth={1.8} />
      </button>
    </div>
    <img
      src={lightboxSrc}
      alt="Preview"
      class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
      onclick={(e) => e.stopPropagation()}
    />
  </div>
{/if}
