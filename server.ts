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
import { api } from '@routes/api';
import { env } from '@config/env';
import { startScheduler } from '@services/scheduler';
import { getUserBySession } from '@services/auth';
import { subscribe, unsubscribe, type ChatSocket } from '@services/chatSocket';

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
  sessionId: string;
  workspaceId: string;
}>({
  port: env.port,
  hostname: '0.0.0.0',
  fetch(request, srv) {
    const { pathname, searchParams } = new URL(request.url);

    // WebSocket upgrade for chat realtime
    if (pathname === '/api/chat/ws') {
      const cookieHeader = request.headers.get('cookie') ?? '';
      const sessionId = parseCookie(cookieHeader, env.sessionCookie);
      const workspaceId = searchParams.get('workspaceId');
      if (!sessionId || !workspaceId) {
        return new Response('Missing auth', { status: 401 });
      }
      // Verify session asynchronously — Bun upgrade is sync, so we use the
      // promise-based approach: upgrade first, validate in `open`.
      if (srv.upgrade(request, { data: { sessionId, workspaceId } })) {
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
      const { sessionId, workspaceId } = ws.data;
      const user = await getUserBySession(sessionId);
      if (!user) {
        ws.close(4001, 'Unauthorized');
        return;
      }
      subscribe(ws as unknown as ChatSocket, workspaceId, user.id);
      ws.send(JSON.stringify({ type: 'connected', userId: user.id }));
    },
    message(ws, message) {
      // Client messages are ignored — all events are server-pushed
      // Keep alive / ping handling is automatic via Bun
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
