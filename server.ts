/**
 * Production entry — Elysia owns the server.
 *
 * Elysia holds `Bun.serve` directly. Requests under `/api` are handled natively
 * by Elysia (no SvelteKit pipeline, full throughput); everything else is
 * delegated to the SvelteKit handler produced by `svelte-adapter-bun` (static
 * assets, prerendered pages, SSR). One port, one process — but the API never
 * pays the cost of passing through SvelteKit's request pipeline.
 *
 * In dev there is no build output, so `app/hooks.server.ts` keeps `/api` working
 * on the same Vite port. Both paths dispatch to the same `api` instance, so
 * behaviour is identical; only the transport wrapper differs.
 */
import { join, normalize } from 'node:path';
import { api } from '@routes/api';
import { env } from '@config/env';
import { getUserByMobileAccessToken } from '@services/mobile-auth';
import { getUserBySession } from '@services/auth';
import { startScheduler } from '@services/scheduler';
import { subscribe, unsubscribe, handleClientMessage, type ChatSocket } from '@services/chatSocket';

// Resolved at runtime (after `vite build`). The computed specifier keeps tsc
// from type-checking the generated file, which may not exist at check time.
const handlerPath = new URL('./build/handler.js', import.meta.url).href;
const { getHandler } = (await import(handlerPath)) as {
  getHandler: () => {
    fetch: (request: Request, server: unknown) => Response | Promise<Response>;
  };
};

const { fetch: svelteFetch } = getHandler();

const server = Bun.serve<{
  sessionId?: string;
  accessToken?: string;
  workspaceId: string;
}>({
  port: env.port,
  hostname: '0.0.0.0',
  async fetch(request, srv) {
    const { pathname, searchParams } = new URL(request.url);

    // Serve dynamically uploaded chat, task, task-description image, and avatar files.
    const uploadPrefixes = ['/chat-uploads/', '/task-uploads/', '/task-description-images/', '/avatars/'];
    if (uploadPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      const safePath = normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
      const filePath = join(process.cwd(), 'static', safePath);
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }
      return new Response('Not Found', { status: 404 });
    }

    // WebSocket upgrade for chat realtime
    if (pathname === '/api/chat/ws') {
      const cookieHeader = request.headers.get('cookie') ?? '';
      const sessionId = parseCookie(cookieHeader, env.sessionCookie);
      const authorization = request.headers.get('authorization');
      const accessToken = authorization?.startsWith('Bearer ')
        ? authorization.slice(7).trim() || undefined
        : searchParams.get('token') || undefined;
      const workspaceId = searchParams.get('workspaceId');
      if ((!sessionId && !accessToken) || !workspaceId) {
        return new Response('Missing auth', { status: 401 });
      }
      // Verify session asynchronously — Bun upgrade is sync, so we use the
      // promise-based approach: upgrade first, validate in `open`.
      if (srv.upgrade(request, { data: { sessionId, accessToken, workspaceId } })) {
        return new Response(null, { status: 101 });
      }
      return new Response('Upgrade failed', { status: 400 });
    }

    if (pathname.startsWith('/api')) {
      return api.handle(request);
    }
    return svelteFetch(request, srv);
  },
  websocket: {
    async open(ws) {
      const { sessionId, accessToken, workspaceId } = ws.data;
      const user = accessToken
        ? await getUserByMobileAccessToken(accessToken)
        : await getUserBySession(sessionId);
      if (!user) {
        ws.close(4001, 'Unauthorized');
        return;
      }
      const { onlineUsers } = subscribe(ws as unknown as ChatSocket, workspaceId, user.id);
      ws.send(JSON.stringify({ type: 'connected', userId: user.id, onlineUsers }));
      ws.send(JSON.stringify({ type: 'presence:state', userIds: onlineUsers }));
    },
    async message(ws, message) {
      await handleClientMessage(ws as unknown as ChatSocket, message);
    },
    close(ws) {
      unsubscribe(ws as unknown as ChatSocket);
    }
  }
});

/** Parse a cookie value from the Cookie header. */
function parseCookie(header: string, name: string): string | undefined {
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

  startScheduler();
