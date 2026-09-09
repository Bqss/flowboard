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
  | { type: 'conversation:update'; conversationId: string };

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

/** Register a new connection. */
export function subscribe(socket: ChatSocket, workspaceId: string, userId: string): void {
  connections.set(socket, { workspaceId, userId });
}

/** Remove a connection on close. */
export function unsubscribe(socket: ChatSocket): void {
  connections.delete(socket);
}

/**
 * Broadcast an event to all active participants of a conversation.
 * `participantIds` is the list of userIds that should receive the event.
 */
export function broadcastToUsers(
  workspaceId: string,
  participantIds: string[],
  event: ChatSocketEvent
): void {
  if (connections.size === 0) return;
  const payload = JSON.stringify(event);
  for (const [socket, meta] of connections) {
    if (meta.workspaceId === workspaceId && participantIds.includes(meta.userId) && socket.readyState === OPEN) {
      try {
        socket.send(payload);
      } catch {
        // Connection closed — clean up
        connections.delete(socket);
      }
    }
  }
}

/** Get the count of active connections (for debugging). */
export function connectionCount(): number {
  return connections.size;
}
