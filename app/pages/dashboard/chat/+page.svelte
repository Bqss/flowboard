<script lang="ts">
  import { onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    api,
    ApiError,
    type ApiChatAttachment,
    type ApiChatInboxConversation,
    type ApiChatInboxWorkspace,
    type ApiChatMessage,
    type ApiChatMember
  } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Avatar, Badge, Button, IconButton, Input, Skeleton, Switch, Tooltip } from '$lib/components/atoms/index.js';
  import { ChatVideoPlayer, FormField, SearchInput, toast } from '$lib/components/molecules/index.js';
  import { Dialog, ConfirmDialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    AlertCircleIcon,
    ArrowLeft01Icon,
    Attachment01Icon,
    BubbleChatIcon,
    Building06Icon,
    Cancel01Icon,
    Delete02Icon,
    Download04Icon,
    Edit01Icon,
    File02Icon,
    KanbanIcon,
    MailReply01Icon,
    MoreVerticalIcon,
    Mic01Icon,
    PauseIcon,
    PlayIcon,
    StopIcon,
    SentIcon,
    Tick02Icon,
    UserGroupIcon,
    Video01Icon,
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
  let conversations = $state<ApiChatInboxConversation[]>([]);
  let conversationsLoading = $state(true);
  let conversationsLoadFailed = $state(false);
  let inboxWorkspaces = $state<ApiChatInboxWorkspace[]>([]);
  let searchQuery = $state('');
  let categoryFilter = $state<'all' | 'board' | 'workflow' | 'group' | 'direct' | 'unread'>('all');
  let allWorkspacesEnabled = $state(false);
  let workspaceFilter = $state<string>('all');

  let activeConversationId = $state<string | null>(null);
  let activeConversation = $state<ApiChatInboxConversation | null>(null);
  let selectedGroup = $state<ApiChatInboxConversation | null>(null);
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
  let voiceDraftFile = $state<File | null>(null);
  let voiceDraftUrl = $state<string | null>(null);
  let voiceDraftAudioEl = $state<HTMLAudioElement | null>(null);
  let voiceDraftIsPlaying = $state(false);
  let voiceDraftCurrentTime = $state(0);
  let voiceDraftDuration = $state(0);
  let isStartingVoiceRecording = $state(false);
  let isRecordingVoice = $state(false);
  let voiceRecordingSeconds = $state(0);
  let mediaRecorder: MediaRecorder | null = null;
  let recordingStream: MediaStream | null = null;
  let recordingChunks: Blob[] = [];
  let recordingTimer: ReturnType<typeof setInterval> | null = null;
  let discardRecording = false;
  let recordingAttempt = 0;

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

    if (!allWorkspacesEnabled && workspaceId) {
      list = list.filter((c) => c.workspaceId === workspaceId);
    } else if (allWorkspacesEnabled && workspaceFilter !== 'all') {
      list = list.filter((c) => c.workspaceId === workspaceFilter);
    }

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

  $effect(() => {
    if (!allWorkspacesEnabled) {
      workspaceFilter = 'all';
      if (workspaceId) {
        if (selectedGroup && selectedGroup.workspaceId !== workspaceId) {
          selectedGroup = null;
        }
        if (activeConversation && activeConversation.workspaceId !== workspaceId) {
          activeConversationId = null;
          activeConversation = null;
          messages = [];
        }
      }
    } else if (workspaceFilter !== 'all') {
      if (selectedGroup && selectedGroup.workspaceId !== workspaceFilter) {
        selectedGroup = null;
      }
      if (activeConversation && activeConversation.workspaceId !== workspaceFilter) {
        activeConversationId = null;
        activeConversation = null;
        messages = [];
      }
    }
  });

  const channelsForSelectedGroup = $derived.by(() => {
    if (!selectedGroup || !selectedGroup.groupId) return [];
    return conversations.filter(
      (c) =>
        c.groupId === selectedGroup!.groupId &&
        (c.kind === 'taskboard' || c.kind === 'workflow')
    );
  });

  function getConversationUnread(conv: ApiChatInboxConversation): number {
    if (conv.kind === 'group' && conv.groupId) {
      const channelUnreads = conversations
        .filter((c) => c.groupId === conv.groupId && c.id !== conv.id)
        .reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      return (conv.unreadCount || 0) + channelUnreads;
    }
    return conv.unreadCount || 0;
  }

  function handleRootItemClick(conv: ApiChatInboxConversation) {
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
  const wsConnections = new Map<string, WebSocket>();
  const wsReconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const wsRetryCounts = new Map<string, number>();
  const onlineUsersByWorkspace = new Map<string, Set<string>>();
  let connectedWorkspaceIds = $state<Set<string>>(new Set());
  const WS_MAX_RETRIES = 5;

  function connectWs(workspaceId: string) {
    if (wsConnections.has(workspaceId) || !inboxWorkspaces.some((workspace) => workspace.id === workspaceId)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.DEV ? `${window.location.hostname}:3001` : window.location.host;
    const url = `${protocol}//${wsHost}/api/chat/ws?workspaceId=${encodeURIComponent(workspaceId)}`;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      scheduleWsReconnect(workspaceId);
      return;
    }
    wsConnections.set(workspaceId, socket);

    socket.onopen = () => {
      if (wsConnections.get(workspaceId) !== socket) return;
      wsRetryCounts.delete(workspaceId);
      connectedWorkspaceIds = new Set([...connectedWorkspaceIds, workspaceId]);
    };

    socket.onclose = () => {
      if (wsConnections.get(workspaceId) !== socket) return;
      wsConnections.delete(workspaceId);
      connectedWorkspaceIds = new Set(
        [...connectedWorkspaceIds].filter((connectedId) => connectedId !== workspaceId)
      );
      scheduleWsReconnect(workspaceId);
    };

    socket.onerror = () => socket.close();
    socket.onmessage = (event) => {
      try {
        handleWsMessage(JSON.parse(event.data), workspaceId);
      } catch {
        // Ignore malformed payloads.
      }
    };
  }

  function scheduleWsReconnect(workspaceId: string) {
    if (wsReconnectTimers.has(workspaceId) || !inboxWorkspaces.some((workspace) => workspace.id === workspaceId)) {
      return;
    }
    const retryCount = wsRetryCounts.get(workspaceId) ?? 0;
    if (retryCount >= WS_MAX_RETRIES) return;
    const nextRetry = retryCount + 1;
    wsRetryCounts.set(workspaceId, nextRetry);
    const timer = setTimeout(() => {
      wsReconnectTimers.delete(workspaceId);
      connectWs(workspaceId);
    }, 2500 * nextRetry);
    wsReconnectTimers.set(workspaceId, timer);
  }

  function disconnectWs(workspaceId: string) {
    const timer = wsReconnectTimers.get(workspaceId);
    if (timer) clearTimeout(timer);
    wsReconnectTimers.delete(workspaceId);
    wsRetryCounts.delete(workspaceId);
    const socket = wsConnections.get(workspaceId);
    wsConnections.delete(workspaceId);
    connectedWorkspaceIds = new Set(
      [...connectedWorkspaceIds].filter((connectedId) => connectedId !== workspaceId)
    );
    onlineUsersByWorkspace.delete(workspaceId);
    onlineUserIds = new Set([...onlineUsersByWorkspace.values()].flatMap((ids) => [...ids]));
    if (socket) {
      socket.onclose = null;
      socket.close();
    }
  }

  function syncWorkspaceSockets(workspaces: ApiChatInboxWorkspace[]) {
    const nextWorkspaceIds = new Set(workspaces.map((workspace) => workspace.id));
    for (const workspaceId of wsConnections.keys()) {
      if (!nextWorkspaceIds.has(workspaceId)) disconnectWs(workspaceId);
    }
    for (const workspaceId of wsReconnectTimers.keys()) {
      if (!nextWorkspaceIds.has(workspaceId)) disconnectWs(workspaceId);
    }
    inboxWorkspaces = workspaces;
    for (const workspaceId of nextWorkspaceIds) connectWs(workspaceId);
  }

  function handleWsMessage(data: any, workspaceId: string) {
    switch (data.type) {
      case 'message:new': {
        const msg = data.message as ApiChatMessage;
        const convId = data.conversationId as string;
        const conversation = conversations.find(
          (item) => item.id === convId && item.workspaceId === workspaceId
        );
        if (!conversation) break;

        const isActive = activeConversation?.id === convId && activeConversation.workspaceId === workspaceId;
        if (isActive) {
          if (!messages.some((message) => message.id === msg.id)) {
            messages = [...messages, msg];
            scrollToBottom();
          }
          void api.markChatRead(workspaceId, convId).catch(() => {});
        }

        conversations = conversations.map((item) =>
          item.id === convId && item.workspaceId === workspaceId
            ? {
                ...item,
                lastMessage: {
                  id: msg.id,
                  body: msg.body,
                  senderId: msg.senderId,
                  senderName: msg.senderName,
                  createdAt: msg.createdAt,
                  deletedAt: msg.deletedAt
                },
                updatedAt: msg.createdAt,
                unreadCount: isActive ? 0 : (item.unreadCount ?? 0) + 1
              }
            : item
        );
        conversations.sort((a, b) => {
          const timeA = new Date(a.lastMessage?.createdAt ?? a.updatedAt).getTime();
          const timeB = new Date(b.lastMessage?.createdAt ?? b.updatedAt).getTime();
          return timeB - timeA;
        });
        break;
      }

      case 'message:edit': {
        if (activeConversation && activeConversation.id === data.conversationId && activeConversation.workspaceId === workspaceId) {
          messages = messages.map((message) =>
            message.id === data.messageId
              ? { ...message, body: data.body, editedAt: data.editedAt }
              : message
          );
        }
        break;
      }

      case 'message:delete': {
        if (activeConversation && activeConversation.id === data.conversationId && activeConversation.workspaceId === workspaceId) {
          messages = messages.map((message) =>
            message.id === data.messageId
              ? { ...message, body: '', deletedAt: data.deletedAt }
              : message
          );
        }
        break;
      }

      case 'reaction:toggle': {
        if (activeConversation && activeConversation.id === data.conversationId && activeConversation.workspaceId === workspaceId) {
          messages = messages.map((message) => {
            if (message.id !== data.messageId) return message;
            if (data.action === 'added') {
              const existing = message.reactions.find(
                (reaction) => reaction.userId === data.userId && reaction.reaction === data.reaction
              );
              if (existing) return message;
              return {
                ...message,
                reactions: [
                  ...message.reactions,
                  { reaction: data.reaction, userId: data.userId, userName: data.userName }
                ]
              };
            }
            return {
              ...message,
              reactions: message.reactions.filter(
                (reaction) => !(reaction.userId === data.userId && reaction.reaction === data.reaction)
              )
            };
          });
        }
        break;
      }

      case 'typing': {
        const convId = data.conversationId as string;
        if (!conversations.some((item) => item.id === convId && item.workspaceId === workspaceId)) break;
        const typingUserId = data.userId as string;
        const current = new Set(typingUsers.get(convId) ?? []);
        if (data.isTyping) current.add(typingUserId);
        else current.delete(typingUserId);
        typingUsers = new Map(typingUsers.set(convId, current));
        break;
      }

      case 'presence': {
        onlineUsersByWorkspace.set(workspaceId, new Set(data.onlineUserIds as string[]));
        onlineUserIds = new Set([...onlineUsersByWorkspace.values()].flatMap((ids) => [...ids]));
        break;
      }
    }
  }

  /* ------------------------------------------------------- helpers */
  function conversationDisplayName(conv: ApiChatInboxConversation): string {
    if (conv.kind !== 'direct') return conv.name ?? 'Grup';
    return conv.partner?.name ?? 'Personal';
  }

  function lastMessagePreview(conv: ApiChatInboxConversation): string {
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
    const conversation = activeConversation;
    if (!conversation || !activeConversationId) return;
    const socket = wsConnections.get(conversation.workspaceId);
    if (!socket || !connectedWorkspaceIds.has(conversation.workspaceId)) return;
    try {
      socket.send(JSON.stringify({ type: 'typing', conversationId: activeConversationId, isTyping }));
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
    if (!userId) return;
    conversationsLoading = true;
    try {
      const res = await api.listAllChatConversations();
      const seen = new Set<string>();
      conversations = res.conversations.filter((conversation) => {
        const key = `${conversation.workspaceId}:${conversation.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      conversationsLoadFailed = false;
      syncWorkspaceSockets(res.workspaces);
    } catch {
      conversationsLoadFailed = true;
      toast.error('Gagal memuat daftar obrolan');
    } finally {
      conversationsLoading = false;
    }
  }

  async function selectConversation(conv: ApiChatInboxConversation) {
    cancelVoiceRecording();
    clearVoiceDraft();
    activeConversationId = conv.id;
    activeConversation = conv;
    messages = [];
    messagesLoading = true;
    hasOlderMessages = false;
    loadingOlder = false;
    replyToMessage = null;
    pendingAttachments = [];
    uploadingAttachment = false;

    const isCurrentConversation = () =>
      activeConversationId === conv.id && activeConversation?.workspaceId === conv.workspaceId;

    try {
      const [detailRes, msgRes] = await Promise.all([
        api.getChatConversation(conv.workspaceId, conv.id),
        api.getChatMessages(conv.workspaceId, conv.id)
      ]);
      if (!isCurrentConversation()) return;
      roomParticipants = detailRes.participants ?? [];
      messages = msgRes.messages ?? [];
      hasOlderMessages = (msgRes.messages ?? []).length >= 50;

      await api.markChatRead(conv.workspaceId, conv.id).catch(() => {});
      if (!isCurrentConversation()) return;
      conversations = conversations.map((conversation) =>
        conversation.id === conv.id && conversation.workspaceId === conv.workspaceId
          ? { ...conversation, unreadCount: 0 }
          : conversation
      );
      scrollToBottom(false);
    } catch {
      if (isCurrentConversation()) toast.error('Gagal memuat pesan');
    } finally {
      if (isCurrentConversation()) messagesLoading = false;
    }
  }

  async function loadOlderMessages() {
    const conversation = activeConversation;
    const conversationId = activeConversationId;
    if (!conversation || conversation.id !== conversationId || loadingOlder || !hasOlderMessages || messages.length === 0) {
      return;
    }
    loadingOlder = true;
    const oldest = messages[0];
    const cursor = `${new Date(oldest.createdAt).toISOString()}:${oldest.id}`;
    const isCurrentConversation = () =>
      activeConversationId === conversationId &&
      activeConversation?.workspaceId === conversation.workspaceId;
    try {
      const res = await api.getChatMessages(conversation.workspaceId, conversationId, cursor);
      if (!isCurrentConversation()) return;
      if (res.messages.length === 0) {
        hasOlderMessages = false;
      } else {
        const existingIds = new Set(messages.map((message) => message.id));
        const fresh = res.messages.filter((message) => !existingIds.has(message.id));
        if (fresh.length === 0) {
          hasOlderMessages = false;
        } else {
          messages = [...fresh, ...messages];
        }
      }
    } catch {
      // ignore
    } finally {
      if (isCurrentConversation()) loadingOlder = false;
    }
  }
  async function sendMessage() {
    const text = composerText.trim();
    const composerTextAtSend = composerText;
    const conversation = activeConversation;
    const conversationId = activeConversationId;
    if (
      (!text && pendingAttachments.length === 0 && !voiceDraftFile) ||
      !conversation ||
      conversation.id !== conversationId ||
      sendingMessage ||
      uploadingAttachment ||
      isStartingVoiceRecording ||
      isRecordingVoice
    ) return;
    sendingMessage = true;
    const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const replyId = replyToMessage?.id;
    const voiceFile = voiceDraftFile;
    const attachmentIds = pendingAttachments.map((attachment) => attachment.id);
    let uploadingVoiceAttachment = false;
    const isCurrentConversation = () =>
      activeConversationId === conversationId &&
      activeConversation?.workspaceId === conversation.workspaceId;

    try {
      if (voiceFile) {
        uploadingVoiceAttachment = true;
        const upload = await api.uploadChatAttachment(conversation.workspaceId, conversationId, voiceFile);
        attachmentIds.push(upload.attachment.id);
        if (isCurrentConversation()) {
          pendingAttachments = [...pendingAttachments, upload.attachment];
          clearVoiceDraft();
        }
        uploadingVoiceAttachment = false;
      }

      const res = await api.sendChatMessage(
        conversation.workspaceId,
        conversationId,
        text,
        clientMessageId,
        replyId,
        attachmentIds
      );
      if (isCurrentConversation()) {
        if (!messages.some((message) => message.id === res.message.id)) {
          messages = [...messages, res.message];
        }
        if (composerText === composerTextAtSend) composerText = '';
        if (replyToMessage?.id === replyId) replyToMessage = null;
        const sentAttachmentIds = new Set(attachmentIds);
        pendingAttachments = pendingAttachments.filter((attachment) => !sentAttachmentIds.has(attachment.id));
        scrollToBottom();
      }
    } catch {
      toast.error(uploadingVoiceAttachment ? 'Gagal mengunggah rekaman suara' : 'Gagal mengirim pesan');
    } finally {
      sendingMessage = false;
    }
  }

  async function handleFileUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await uploadAttachment(file);
    input.value = '';
  }

  async function handleComposerPaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    const conversation = activeConversation;
    if (!items || !conversation || conversation.id !== activeConversationId) return;
    const imageFiles = Array.from(items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (imageFiles.length === 0) return;

    event.preventDefault();
    for (const [index, file] of imageFiles.entries()) {
      const extension = file.type.split('/')[1]?.replace('+xml', '') || 'png';
      const image = file.name
        ? file
        : new File([file], `pasted-image-${Date.now()}-${index + 1}.${extension}`, { type: file.type });
      await uploadAttachment(image, conversation);
    }
  }

  async function uploadAttachment(
    file: File,
    conversation: ApiChatInboxConversation | null = activeConversation
  ) {
    if (
      !conversation ||
      conversation.id !== activeConversationId ||
      activeConversation?.workspaceId !== conversation.workspaceId
    ) return;
    uploadingAttachment = true;
    try {
      const res = await api.uploadChatAttachment(conversation.workspaceId, conversation.id, file);
      if (
        activeConversationId === conversation.id &&
        activeConversation?.workspaceId === conversation.workspaceId
      ) {
        pendingAttachments = [...pendingAttachments, res.attachment];
      }
    } catch {
      if (
        activeConversationId === conversation.id &&
        activeConversation?.workspaceId === conversation.workspaceId
      ) {
        toast.error('Gagal mengunggah file');
      }
    } finally {
      if (
        activeConversationId === conversation.id &&
        activeConversation?.workspaceId === conversation.workspaceId
      ) {
        uploadingAttachment = false;
      }
    }
  }
  function clearVoiceDraft() {
    if (voiceDraftAudioEl) {
      voiceDraftAudioEl.pause();
      voiceDraftAudioEl.currentTime = 0;
    }
    voiceDraftIsPlaying = false;
    voiceDraftCurrentTime = 0;
    voiceDraftDuration = 0;
    voiceDraftFile = null;
    if (voiceDraftUrl) URL.revokeObjectURL(voiceDraftUrl);
    voiceDraftUrl = null;
  }

  function toggleVoiceDraftPlayback() {
    if (!voiceDraftAudioEl) return;
    if (voiceDraftIsPlaying) {
      voiceDraftAudioEl.pause();
    } else {
      voiceDraftAudioEl.play().catch(() => {});
    }
  }

  function handleVoiceDraftSeek(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const time = parseFloat(target.value);
    if (voiceDraftAudioEl && Number.isFinite(time)) {
      voiceDraftAudioEl.currentTime = time;
      voiceDraftCurrentTime = time;
    }
  }

  function formatVoiceDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function releaseRecordingResources() {
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
    recordingStream?.getTracks().forEach((track) => track.stop());
    recordingStream = null;
  }

  async function startVoiceRecording() {
    const conversationId = activeConversationId;
    if (
      !conversationId ||
      isStartingVoiceRecording ||
      isRecordingVoice ||
      voiceDraftFile ||
      uploadingAttachment ||
      sendingMessage
    ) return;

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      toast.error('Perekaman suara tidak didukung di browser ini');
      return;
    }

    const attempt = ++recordingAttempt;
    isStartingVoiceRecording = true;
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (attempt !== recordingAttempt || activeConversationId !== conversationId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const preferredType = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ].find((type) => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      recordingStream = stream;
      mediaRecorder = recorder;
      recordingChunks = [];
      discardRecording = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunks.push(event.data);
      };
      recorder.onerror = () => {
        discardRecording = true;
        toast.error('Perekaman suara terhenti. Coba lagi.');
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      };
      recorder.onstop = () => {
        const type = recorder?.mimeType || recordingChunks[0]?.type || 'audio/webm';
        const blob = new Blob(recordingChunks, { type });
        const shouldDiscard = discardRecording;
        discardRecording = false;
        recordingChunks = [];
        if (mediaRecorder === recorder) mediaRecorder = null;
        releaseRecordingResources();
        isRecordingVoice = false;
        voiceRecordingSeconds = 0;

        if (shouldDiscard) return;
        if (blob.size === 0) {
          toast.error('Rekaman kosong. Coba rekam lagi.');
          return;
        }
        if (blob.size > 50 * 1024 * 1024) {
          toast.error('Rekaman melebihi batas 50 MB. Rekam pesan yang lebih singkat.');
          return;
        }

        clearVoiceDraft();
        const extension = type.includes('ogg') ? 'oga' : type.includes('mp4') ? 'm4a' : 'weba';
        const file = new File([blob], `voice-message-${Date.now()}.${extension}`, { type });
        voiceDraftFile = file;
        voiceDraftUrl = URL.createObjectURL(file);
        voiceDraftCurrentTime = 0;
        voiceDraftDuration = voiceRecordingSeconds || 0;
        voiceDraftIsPlaying = false;
      };

      recorder.start();
      isRecordingVoice = true;
      voiceRecordingSeconds = 0;
      recordingTimer = setInterval(() => voiceRecordingSeconds += 1, 1000);
    } catch {
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        if (recorder.state !== 'inactive') recorder.stop();
      }
      if (mediaRecorder === recorder) mediaRecorder = null;
      if (recordingStream === stream) recordingStream = null;
      stream?.getTracks().forEach((track) => track.stop());
      recordingChunks = [];
      isRecordingVoice = false;
      if (attempt === recordingAttempt) {
        toast.error('Tidak bisa mengakses mikrofon. Periksa izin mikrofon lalu coba lagi.');
      }
    } finally {
      if (attempt === recordingAttempt) isStartingVoiceRecording = false;
    }
  }

  function stopVoiceRecording(discard = false) {
    const recorder = mediaRecorder;
    if (!recorder) return;
    discardRecording = discard;
    if (recorder.state !== 'inactive') recorder.stop();
  }

  function cancelVoiceRecording() {
    recordingAttempt += 1;
    isStartingVoiceRecording = false;
    discardRecording = true;
    if (mediaRecorder) {
      stopVoiceRecording(true);
      return;
    }
    isRecordingVoice = false;
    voiceRecordingSeconds = 0;
    releaseRecordingResources();
    recordingChunks = [];
  }

  onDestroy(() => {
    for (const workspaceId of new Set([...wsConnections.keys(), ...wsReconnectTimers.keys()])) {
      disconnectWs(workspaceId);
    }
    recordingAttempt += 1;
    discardRecording = true;
    if (mediaRecorder) {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onerror = null;
      mediaRecorder.onstop = null;
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      mediaRecorder = null;
    }
    recordingChunks = [];
    releaseRecordingResources();
    clearVoiceDraft();
  });

  async function toggleReaction(msg: ApiChatMessage, reaction: string) {
    const conversation = activeConversation;
    if (!conversation || conversation.id !== activeConversationId) return;
    try {
      await api.toggleChatReaction(conversation.workspaceId, conversation.id, msg.id, reaction);
      reactionPickerMessageId = null;
    } catch {
      // ignore
    }
  }

  async function confirmDeleteMessage() {
    const conversation = activeConversation;
    if (!conversation || conversation.id !== activeConversationId || !deleteMessageTarget) return;
    try {
      await api.deleteChatMessage(conversation.workspaceId, conversation.id, deleteMessageTarget.id);
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
    if (userId) {
      void loadConversations();
    } else {
      conversations = [];
      conversationsLoadFailed = false;
      syncWorkspaceSockets([]);
    }
  });
  let handledConversationQuery = '';

  $effect(() => {
    const requestedConversationId = $page.url.searchParams.get('conversationId');
    if (!requestedConversationId) {
      handledConversationQuery = '';
      return;
    }
    const requestedWorkspaceId = $page.url.searchParams.get('workspaceId');
    if (!requestedWorkspaceId || conversationsLoading) return;

    const key = `${requestedWorkspaceId}:${requestedConversationId}`;
    if (handledConversationQuery === key) return;
    const conversation = conversations.find(
      (item) => item.id === requestedConversationId && item.workspaceId === requestedWorkspaceId
    );
    if (!conversation) return;
    handledConversationQuery = key;

    void selectConversation(conversation).finally(() => {
      const url = new URL($page.url);
      if (url.searchParams.get('conversationId') !== requestedConversationId) return;
      url.searchParams.delete('conversationId');
      url.searchParams.delete('workspaceId');
      void goto(`${url.pathname}${url.search}${url.hash}`, {
        replaceState: true,
        keepFocus: true,
        noScroll: true
      });
    });
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
            <IconButton variant="card" size="sm" label="Tulis pesan" onclick={openNewDirectModal}>
              <HugeiconsIcon icon={Edit01Icon} size={16} strokeWidth={1.8} />
            </IconButton>
          </Tooltip>
          <Tooltip text="Buat grup" side="bottom">
            <IconButton variant="card" size="sm" label="Buat grup" onclick={openCreateGroupModal}>
              <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <SearchInput bind:value={searchQuery} placeholder="Cari obrolan…" />

      <!-- Toggler Semua Workspace -->
      <div class="flex items-center justify-between px-1">
        <button
          type="button"
          onclick={() => (allWorkspacesEnabled = !allWorkspacesEnabled)}
          class="text-xs font-medium transition-colors {allWorkspacesEnabled ? 'text-ink font-semibold' : 'text-mute hover:text-ink'}"
        >
          Semua workspace
        </button>
        <Switch bind:checked={allWorkspacesEnabled} size="sm" aria-label="Semua workspace" />
      </div>

      <!-- Filter Workspace -->
      {#if allWorkspacesEnabled && inboxWorkspaces.length > 0}
        <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
          <button
            type="button"
            onclick={() => (workspaceFilter = 'all')}
            class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors {workspaceFilter === 'all' ? 'bg-ink font-semibold text-white shadow-xs' : 'bg-canvas-sunken font-medium text-mute hover:text-ink'}"
          >
            <HugeiconsIcon icon={Building06Icon} size={13} strokeWidth={1.8} class="shrink-0" />
            <span>Semua</span>
          </button>
          {#each inboxWorkspaces as ws (ws.id)}
            <button
              type="button"
              onclick={() => (workspaceFilter = ws.id)}
              class="inline-flex max-w-44 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors {workspaceFilter === ws.id ? 'bg-ink font-semibold text-white shadow-xs' : 'bg-canvas-sunken font-medium text-mute hover:text-ink'}"
              title={ws.name}
            >
              <HugeiconsIcon icon={Building06Icon} size={13} strokeWidth={1.8} class="shrink-0" />
              <span class="truncate">{ws.name}</span>
            </button>
          {/each}
        </div>
      {/if}
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
      {:else if conversationsLoadFailed && conversations.length === 0}
        <div class="grid h-full place-items-center p-6 text-center">
          <div class="flex flex-col items-center">
            <p class="text-sm font-semibold text-ink">Gagal memuat obrolan</p>
            <p class="mt-1 text-xs text-mute">Periksa koneksi Anda lalu coba lagi.</p>
            <Button variant="ghost" size="sm" onclick={loadConversations} class="mt-2">Coba lagi</Button>
          </div>
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
                {#if allWorkspacesEnabled && conv.workspaceName}
                  <div class="mb-0.5 flex items-center">
                    <Badge tone="neutral" class="max-w-40 truncate text-[10px] py-0 px-1.5 leading-tight">
                      {conv.workspaceName}
                    </Badge>
                  </div>
                {/if}
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
            onclick={() => {
              cancelVoiceRecording();
              clearVoiceDraft();
              activeConversationId = null;
            }}
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

          <div class="min-w-0 flex-1">
            <h2 class="truncate text-base font-bold text-ink leading-tight">
              {conversationDisplayName(activeConversation!)}
            </h2>
            <div class="mt-1 flex min-w-0 items-center gap-2">
              {#if allWorkspacesEnabled && activeConversation?.workspaceName}
                <Badge tone="neutral" class="max-w-36 truncate">{activeConversation.workspaceName}</Badge>
              {/if}
              <p class="truncate text-xs text-mute">
                {#if activeConversation?.kind === 'direct'}
                  {activeConversation.partner?.id && onlineUserIds.has(activeConversation.partner.id) ? 'Online' : 'Offline'}
                {:else}
                  {roomParticipants.length} anggota
                {/if}
              </p>
            </div>
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
            {@const visualAttachments = !msg.deletedAt && msg.attachments ? msg.attachments.filter((att) => att.fileType.startsWith('image/') || att.fileType.startsWith('video/')) : []}
            {@const nonVisualAttachments = !msg.deletedAt && msg.attachments ? msg.attachments.filter((att) => !att.fileType.startsWith('image/') && !att.fileType.startsWith('video/')) : []}
            {@const hasVisualMedia = visualAttachments.length > 0}
            {@const hasCaption = Boolean(!msg.deletedAt && msg.body && msg.body.trim().length > 0)}
            <div class="group flex flex-col {isOwn ? 'items-end' : 'items-start'}">
              {#if !isOwn && activeConversation?.kind !== 'direct'}
                <span class="mb-1 text-[11px] font-semibold text-mute px-1">
                  {msg.senderName}
                </span>
              {/if}

              <div class="relative flex max-w-[85%] sm:max-w-[70%] items-end gap-1.5">
                <!-- Message Bubble -->
                {#if hasVisualMedia}
                  <!-- Visual Media Bubble: Flush on top/sides, padding only on caption below (Image #1, #2, #3) -->
                  <div
                    class="overflow-hidden rounded-2xl shadow-xs {isOwn ? 'bg-[#2563eb] text-white rounded-br-sm' : 'bg-card border border-hairline text-ink rounded-bl-sm'}"
                  >
                    {#if msg.replyToMessageId}
                      <div class="m-2 mb-1.5 rounded-lg border-l-2 border-primary-border/60 bg-black/5 dark:bg-white/5 p-2 text-xs opacity-80">
                        <span class="font-bold block">{msg.replyToSenderName ?? 'Balasan'}</span>
                        <span class="truncate block">{msg.replyToBody ?? 'Pesan'}</span>
                      </div>
                    {/if}

                    <!-- Media at top (no outer padding on top/left/right) -->
                    <div class="space-y-0.5">
                      {#each visualAttachments as att, attIdx (att.id)}
                        {#if att.fileType.startsWith('image/')}
                          <button
                            type="button"
                            onclick={() => (lightboxSrc = att.filePath)}
                            class="group/img relative block w-full overflow-hidden text-left focus:outline-hidden"
                          >
                            <img
                              src={att.filePath}
                              alt={att.fileName}
                              class="max-h-80 w-full object-contain bg-black/5 dark:bg-white/5 transition-opacity group-hover/img:opacity-95"
                              loading="lazy"
                            />
                            <div class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/img:opacity-100 bg-black/20">
                              <div class="flex size-8 items-center justify-center rounded-full bg-black/60 text-white">
                                <HugeiconsIcon icon={ZoomIcon} size={16} strokeWidth={2} />
                              </div>
                            </div>
                            {#if !hasCaption && nonVisualAttachments.length === 0 && attIdx === visualAttachments.length - 1}
                              <span class="pointer-events-none absolute bottom-2.5 right-2.5 rounded-md bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-xs tabular-nums">
                                {formatDate(msg.createdAt)}
                              </span>
                            {/if}
                          </button>
                        {:else if att.fileType.startsWith('video/')}
                          <ChatVideoPlayer
                            src={att.filePath}
                            fileName={att.fileName}
                            hasCaption={hasCaption || nonVisualAttachments.length > 0}
                            timestamp={formatDate(msg.createdAt)}
                          />
                        {/if}
                      {/each}
                    </div>

                    <!-- Non-visual attachments (audio / documents) if mixed -->
                    {#if nonVisualAttachments.length > 0}
                      <div class="px-3 pt-2 space-y-1.5">
                        {#each nonVisualAttachments as att (att.id)}
                          {#if att.fileType.startsWith('audio/')}
                            <audio
                              src={att.filePath}
                              controls
                              preload="metadata"
                              aria-label={`Putar rekaman suara dari ${msg.senderName}`}
                              class="block h-10 w-full min-w-[220px] max-w-[280px]"
                            ></audio>
                          {:else}
                            <a
                              href={att.filePath}
                              target="_blank"
                              rel="noreferrer"
                              download={att.fileName}
                              class="flex items-center gap-2 rounded-lg p-2 text-xs font-medium transition-colors {isOwn ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 text-ink'}"
                            >
                              <HugeiconsIcon icon={File02Icon} size={16} />
                              <span class="truncate">{att.fileName}</span>
                              <HugeiconsIcon icon={Download04Icon} size={14} class="ml-auto opacity-70 shrink-0" />
                            </a>
                          {/if}
                        {/each}
                      </div>
                    {/if}

                    <!-- Caption at bottom with padding -->
                    {#if hasCaption}
                      <div class="px-3.5 pt-2 pb-1.5">
                        <p class="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.body}</p>
                        <span class="mt-1 block text-right text-[11px] font-medium tabular-nums {isOwn ? 'text-white/95' : 'text-mute'}">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    {/if}
                  </div>
                {:else}
                  <!-- Standard Text / File Bubble: Normal padding -->
                  <div
                    class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs {isOwn ? 'bg-[#2563eb] text-white rounded-br-sm' : 'bg-card border border-hairline text-ink rounded-bl-sm'}"
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

                      {#if msg.attachments && msg.attachments.length > 0}
                        <div class="space-y-1.5">
                          {#each msg.attachments as att (att.id)}
                            {#if att.fileType.startsWith('audio/')}
                              <audio
                                src={att.filePath}
                                controls
                                preload="metadata"
                                aria-label={`Putar rekaman suara dari ${msg.senderName}`}
                                class="block h-10 w-full min-w-[220px] max-w-[280px]"
                              ></audio>
                            {:else}
                              <a
                                href={att.filePath}
                                target="_blank"
                                rel="noreferrer"
                                download={att.fileName}
                                class="flex items-center gap-2 rounded-lg p-2 text-xs font-medium transition-colors {isOwn ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 text-ink'}"
                              >
                                <HugeiconsIcon icon={File02Icon} size={16} />
                                <span class="truncate">{att.fileName}</span>
                                <HugeiconsIcon icon={Download04Icon} size={14} class="ml-auto opacity-70 shrink-0" />
                              </a>
                            {/if}
                          {/each}
                        </div>
                      {/if}

                      {#if msg.body && msg.body.trim().length > 0}
                        <p class="{msg.attachments && msg.attachments.length > 0 ? 'mt-2' : ''} whitespace-pre-wrap break-words">{msg.body}</p>
                      {/if}
                    {/if}

                    <span class="mt-1 block text-right text-[11px] font-medium tabular-nums {isOwn ? 'text-white/95' : 'text-mute'}">
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                {/if}

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
        {#if voiceDraftUrl}
          <div class="mb-2 flex items-center gap-2.5 rounded-xl border border-hairline bg-canvas-sunken p-2.5 shadow-xs">
            <audio
              bind:this={voiceDraftAudioEl}
              src={voiceDraftUrl}
              preload="metadata"
              ontimeupdate={() => {
                if (voiceDraftAudioEl) voiceDraftCurrentTime = voiceDraftAudioEl.currentTime;
              }}
              onloadedmetadata={() => {
                if (voiceDraftAudioEl && Number.isFinite(voiceDraftAudioEl.duration) && voiceDraftAudioEl.duration > 0) {
                  voiceDraftDuration = voiceDraftAudioEl.duration;
                }
              }}
              onended={() => {
                voiceDraftIsPlaying = false;
                voiceDraftCurrentTime = 0;
                if (voiceDraftAudioEl) voiceDraftAudioEl.currentTime = 0;
              }}
              onpause={() => (voiceDraftIsPlaying = false)}
              onplay={() => (voiceDraftIsPlaying = true)}
            ></audio>
            <span class="shrink-0 text-xs font-semibold text-ink">Pratinjau suara</span>
            <button
              type="button"
              onclick={toggleVoiceDraftPlayback}
              class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-xs transition-colors hover:bg-primary-hover focus:outline-hidden"
              aria-label={voiceDraftIsPlaying ? 'Jeda rekaman' : 'Putar rekaman'}
            >
              {#if voiceDraftIsPlaying}
                <HugeiconsIcon icon={PauseIcon} size={14} strokeWidth={2.2} />
              {:else}
                <HugeiconsIcon icon={PlayIcon} size={14} strokeWidth={2.2} class="translate-x-0.5" />
              {/if}
            </button>
            <span class="shrink-0 text-xs tabular-nums text-mute font-medium">
              {formatVoiceDuration(Math.floor(voiceDraftCurrentTime))} / {formatVoiceDuration(Math.floor(voiceDraftDuration || voiceRecordingSeconds || 0))}
            </span>
            <input
              type="range"
              min="0"
              max={voiceDraftDuration || voiceRecordingSeconds || 1}
              step="0.05"
              value={voiceDraftCurrentTime}
              oninput={handleVoiceDraftSeek}
              class="h-1.5 flex-1 cursor-pointer accent-primary"
              aria-label="Posisi rekaman suara"
            />
            <IconButton
              variant="ghost"
              size="sm"
              label="Hapus rekaman suara"
              onclick={clearVoiceDraft}
              disabled={sendingMessage}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </IconButton>
          </div>
        {/if}

        {#if pendingAttachments.length > 0}
          <div class="mb-2 flex flex-wrap gap-2">
            {#each pendingAttachments as att (att.id)}
              <div class="flex items-center gap-1.5 rounded-lg border border-hairline bg-canvas-sunken px-2 py-1 text-xs text-ink">
                {#if att.fileType.startsWith('image/')}
                  <img src={att.filePath} alt={att.fileName} class="size-9 rounded object-cover" />
                {:else if att.fileType.startsWith('audio/')}
                  <audio
                    src={att.filePath}
                    controls
                    preload="metadata"
                    aria-label={`Putar ${att.fileName}`}
                    class="h-8 w-44 max-w-full"
                  ></audio>
                {:else}
                  <HugeiconsIcon icon={File02Icon} size={14} />
                {/if}
                <span class="max-w-[120px] truncate">{att.fileName}</span>
                <button
                  type="button"
                  onclick={() => (pendingAttachments = pendingAttachments.filter((a) => a.id !== att.id))}
                  disabled={sendingMessage}
                  class="text-mute hover:text-ink disabled:opacity-40"
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
            disabled={uploadingAttachment || sendingMessage}
          >
            <HugeiconsIcon icon={Attachment01Icon} size={18} strokeWidth={1.8} />
          </IconButton>
          {#if isRecordingVoice}
            <span
              class="flex items-center gap-1.5 text-xs font-semibold text-status-urgent-ink"
              role="timer"
              aria-label={`Durasi rekaman ${formatVoiceDuration(voiceRecordingSeconds)}`}
            >
              <span class="size-2 rounded-full bg-status-urgent animate-pulse"></span>
              {formatVoiceDuration(voiceRecordingSeconds)}
            </span>
            <IconButton
              variant="ghost"
              size="md"
              label="Batalkan rekaman suara"
              onclick={() => stopVoiceRecording(true)}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.8} />
            </IconButton>
            <IconButton
              variant="primary"
              size="md"
              label="Selesai merekam suara"
              onclick={() => stopVoiceRecording()}
            >
              <HugeiconsIcon icon={StopIcon} size={18} strokeWidth={1.8} />
            </IconButton>
          {:else}
            <IconButton
              variant="ghost"
              size="md"
              label={isStartingVoiceRecording ? 'Meminta izin mikrofon' : 'Rekam pesan suara'}
              onclick={startVoiceRecording}
              disabled={isStartingVoiceRecording || uploadingAttachment || sendingMessage || voiceDraftFile !== null}
            >
              {#if isStartingVoiceRecording}
                <span class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true"></span>
              {:else}
                <HugeiconsIcon icon={Mic01Icon} size={18} strokeWidth={1.8} />
              {/if}
            </IconButton>
          {/if}

          <Input
            bind:value={composerText}
            oninput={handleComposerInput}
            placeholder="Tulis pesan… (Tekan Enter untuk kirim)"
            onpaste={handleComposerPaste}
            class="h-10 flex-1 rounded-xl"
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={
              (!composerText.trim() && pendingAttachments.length === 0 && !voiceDraftFile) ||
              sendingMessage ||
              uploadingAttachment ||
              isStartingVoiceRecording ||
              isRecordingVoice
            }
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
  destructive={true}
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
