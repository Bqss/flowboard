import { db, chatParticipants } from '@db';
import { and, eq, isNull } from 'drizzle-orm';

/**
 * WebSocket connection manager for chat realtime.
 *
 * Each connection is keyed by `workspaceId:userId`. When a chat event occurs
 * (message sent, edited, deleted, reaction toggled, read), the service calls
 * `broadcastToUsers()` which looks up participant userIds and pushes the
 * event to all their active sockets.
 *
 * Works with both Bun's native WebSocket (prod) and the `ws` package (dev/Vite).
 */

export type ChatSocketEvent =
  | { type: 'message:new'; conversationId: string; message: unknown }
  | { type: 'message:edit'; conversationId: string; messageId: string; body: string; editedAt: string }
  | { type: 'message:delete'; conversationId: string; messageId: string; deletedAt: string }
  | { type: 'reaction:toggle'; conversationId: string; messageId: string; userId: string; reaction: string; action: 'added' | 'removed' }
  | { type: 'read'; conversationId: string; userId: string }
  | { type: 'conversation:update'; conversationId: string }
  | { type: 'presence:state'; userIds: string[] }
  | { type: 'presence:user_online'; userId: string }
  | { type: 'presence:user_offline'; userId: string }
  | { type: 'typing'; conversationId: string; userId: string; isTyping: boolean }
  | { type: 'connected'; userId: string; onlineUsers: string[] }
  | { type: 'pong' };

export type ClientChatSocketMessage =
  | { type: 'ping' }
  | { type: 'presence:get' }
  | { type: 'typing'; conversationId: string; isTyping?: boolean }
  | { type: 'typing:start'; conversationId: string }
  | { type: 'typing:stop'; conversationId: string };
/** Minimal socket interface — compatible with both Bun WS and `ws` package. */
export interface ChatSocket {
  send(data: string): number | void;
  readyState: number;
  close(code?: number, reason?: string): void;
}

/** Per-connection metadata. */
interface ConnMeta {
  workspaceId: string;
  userId: string;
}

const OPEN = 1; // WebSocket.READY_STATE_OPEN

// Use globalThis so the Vite dev plugin (vite.config.ts) and the SSR-loaded
// service share the same Map — ssrLoadModule hangs in dev, so the vite plugin
// manages connections directly via this global instead.
const g = globalThis as Record<string, unknown>;
const connections = (g.__chatSocketConnections ??= new Map<ChatSocket, ConnMeta>()) as Map<ChatSocket, ConnMeta>;

/** Retrieve active participant user IDs for a conversation. */
export async function getConversationParticipantUserIds(conversationId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: chatParticipants.userId })
    .from(chatParticipants)
    .where(
      and(
        eq(chatParticipants.conversationId, conversationId),
        isNull(chatParticipants.leftAt)
      )
    );
  return rows.map((r) => r.userId);
}

/** Get list of unique active userIds in a workspace. */
export function getOnlineUserIds(workspaceId: string): string[] {
  const userIds = new Set<string>();
  for (const [socket, meta] of connections) {
    if (meta.workspaceId === workspaceId && socket.readyState === OPEN) {
      userIds.add(meta.userId);
    }
  }
  return Array.from(userIds);
}

/** Check if a user is currently online in a workspace. */
export function isUserOnline(workspaceId: string, userId: string): boolean {
  for (const [socket, meta] of connections) {
    if (meta.workspaceId === workspaceId && meta.userId === userId && socket.readyState === OPEN) {
      return true;
    }
  }
  return false;
}

/** Broadcast event to all connections in a workspace (e.g. presence). */
export function broadcastToWorkspace(
  workspaceId: string,
  event: ChatSocketEvent,
  excludeSocket?: ChatSocket
): void {
  if (connections.size === 0) return;
  const payload = JSON.stringify(event);
  for (const [socket, meta] of connections) {
    if (meta.workspaceId === workspaceId && socket !== excludeSocket && socket.readyState === OPEN) {
      try {
        socket.send(payload);
      } catch {
        connections.delete(socket);
      }
    }
  }
}

/** Register a new connection and emit presence events if newly online. */
export function subscribe(
  socket: ChatSocket,
  workspaceId: string,
  userId: string
): { onlineUsers: string[] } {
  const wasAlreadyOnline = isUserOnline(workspaceId, userId);
  connections.set(socket, { workspaceId, userId });

  if (!wasAlreadyOnline) {
    broadcastToWorkspace(workspaceId, { type: 'presence:user_online', userId }, socket);
  }

  return { onlineUsers: getOnlineUserIds(workspaceId) };
}

/** Remove a connection on close and emit presence events if now offline. */
export function unsubscribe(socket: ChatSocket): void {
  const meta = connections.get(socket);
  if (!meta) return;

  connections.delete(socket);

  const isStillOnline = isUserOnline(meta.workspaceId, meta.userId);
  if (!isStillOnline) {
    broadcastToWorkspace(meta.workspaceId, { type: 'presence:user_offline', userId: meta.userId });
  }
}

/** Broadcast typing event to conversation participants. */
export async function handleTyping(
  workspaceId: string,
  senderUserId: string,
  conversationId: string,
  isTyping: boolean,
  senderSocket?: ChatSocket
): Promise<void> {
  const participantIds = await getConversationParticipantUserIds(conversationId);
  if (!participantIds.includes(senderUserId)) return;

  broadcastToUsers(
    workspaceId,
    participantIds,
    {
      type: 'typing',
      conversationId,
      userId: senderUserId,
      isTyping
    },
    senderSocket
  );
}

/** Handle incoming client messages (ping, typing, presence). */
export async function handleClientMessage(
  socket: ChatSocket,
  rawData: string | Buffer | unknown
): Promise<void> {
  const meta = connections.get(socket);
  if (!meta) return;

  let msg: ClientChatSocketMessage;
  try {
    const text =
      typeof rawData === 'string'
        ? rawData
        : Buffer.isBuffer(rawData)
          ? rawData.toString('utf-8')
          : String(rawData);
    msg = JSON.parse(text);
  } catch {
    return;
  }

  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'ping') {
    try {
      socket.send(JSON.stringify({ type: 'pong' }));
    } catch {
      // socket closed
    }
    return;
  }

  if (msg.type === 'presence:get') {
    try {
      const userIds = getOnlineUserIds(meta.workspaceId);
      socket.send(JSON.stringify({ type: 'presence:state', userIds }));
    } catch {
      // socket closed
    }
    return;
  }

  if (msg.type === 'typing' || msg.type === 'typing:start' || msg.type === 'typing:stop') {
    const isTyping =
      msg.type === 'typing'
        ? typeof msg.isTyping === 'boolean'
          ? msg.isTyping
          : true
        : msg.type === 'typing:start';

    if (typeof msg.conversationId === 'string' && msg.conversationId.trim()) {
      await handleTyping(
        meta.workspaceId,
        meta.userId,
        msg.conversationId.trim(),
        isTyping,
        socket
      );
    }
  }
}

/**
 * Broadcast an event to all active participants of a conversation.
 * `participantIds` is the list of userIds that should receive the event.
 */
export function broadcastToUsers(
  workspaceId: string,
  participantIds: string[],
  event: ChatSocketEvent,
  excludeSocket?: ChatSocket
): void {
  if (connections.size === 0) return;
  const payload = JSON.stringify(event);
  for (const [socket, meta] of connections) {
    if (
      meta.workspaceId === workspaceId &&
      participantIds.includes(meta.userId) &&
      socket !== excludeSocket &&
      socket.readyState === OPEN
    ) {
      try {
        socket.send(payload);
      } catch {
        connections.delete(socket);
      }
    }
  }
}
/** Get the count of active connections (for debugging). */
export function connectionCount(): number {
  return connections.size;
}
