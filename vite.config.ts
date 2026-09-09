import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
const backendRe =
  /(?:^|\/)(?:app\/(?:handlers|middlewares|services|db|core|validators|config)|routes)\/|hooks\.server\.ts$/;

/** Rebuild the Elysia graph when backend files change so SSR fetches never hit a stale app. */
const backendHmr = (): Plugin => ({
  name: 'flowboard-backend-hmr',
  configureServer(server: ViteDevServer) {
    server.watcher.on('change', (file) => {
      if (!backendRe.test(file)) return;

      server.ws.send({ type: 'custom', event: 'flowboard:api-reload' });

      for (const mod of server.moduleGraph.idToModuleMap.values()) {
        if (mod.id && backendRe.test(mod.id)) {
          server.moduleGraph.invalidateModule(mod);
        }
      }
    });
  }
});

/** WebSocket support for chat realtime in dev mode.
 *  Vite's dev server doesn't support WS upgrades natively, so we intercept
 *  the `upgrade` event and handle `/api/chat/ws` with the `ws` package.
 *  In prod, `Bun.serve` handles WS natively via `server.ts`. */
const CHAT_WS_PORT = 3001;

// Minimal Bun type for the WS server — avoids importing ws package which hangs
// in the Vite plugin context under bunx --bun.
interface BunServeOptions {
  port: number;
  fetch: (req: Request, srv: { upgrade: (req: Request, opts: { data: unknown }) => boolean }) => Response | undefined;
  websocket: {
    open: (ws: { send: (data: string) => void; data: unknown }) => void;
    close: (ws: object) => void;
  };
}
interface BunGlobal {
  serve: (opts: BunServeOptions) => { stop: () => void };
}

const chatWsPlugin = (): Plugin => ({
  name: 'flowboard-chat-ws',
  configureServer(server: ViteDevServer) {
    try {
      console.log('[chat-ws] configureServer START');
      const g = globalThis as Record<string, unknown>;
      const connections = (g.__chatSocketConnections ??= new Map()) as Map<object, { workspaceId: string; userId: string }>;

      function subscribe(ws: object, workspaceId: string, userId: string) {
        connections.set(ws, { workspaceId, userId });
      }
      function unsubscribe(ws: object) {
        connections.delete(ws);
      }

      async function validateSession(cookie: string): Promise<string | null> {
        const res = await fetch(`http://localhost:${server.config.server?.port ?? 3000}/api/auth/me`, {
          headers: { cookie }
        });
        if (!res.ok) return null;
        const data = await res.json() as { user?: { id?: string } };
        return data.user?.id ?? null;
      }

      // Use Bun.serve with native WebSocket support — works in bunx --bun context.
      // Bun global is available because dev runs via `bunx --bun vite dev`.
      const bunServe = (globalThis as Record<string, unknown>).Bun as BunGlobal | undefined;
      if (!bunServe) {
        console.error('[chat-ws] Bun.serve not available — WS will not work');
        return () => {};
      }
      const bunServer = bunServe.serve({
        port: CHAT_WS_PORT,
        async fetch(req, srv) {
          const url = new URL(req.url);
          const cookie = req.headers.get('cookie') ?? '';
          const sessionId = parseCookie(cookie, 'sid');
          const workspaceId = url.searchParams.get('workspaceId');

          if (!sessionId || !workspaceId) {
            return new Response('Unauthorized', { status: 401 });
          }

          const userId = await validateSession(cookie);
          if (!userId) {
            return new Response('Unauthorized', { status: 401 });
          }

          if (srv.upgrade(req, { data: { userId, workspaceId } })) {
            return undefined;
          }
          return new Response('Upgrade failed', { status: 400 });
        },
        websocket: {
          open(ws) {
            const { userId, workspaceId } = ws.data as { userId: string; workspaceId: string };
            subscribe(ws, workspaceId, userId);
            ws.send(JSON.stringify({ type: 'connected', userId }));
          },
          close(ws) {
            unsubscribe(ws);
          }
        }
      });

      console.log(`[chat-ws] listening on port ${CHAT_WS_PORT}`);

      // Don't return a cleanup function — Vite calls the return from
      // configureServer as a post-hook immediately after setup, which would
      // stop the WS server. Clean up on process exit instead.
      process.on('exit', () => bunServer.stop());
    } catch (err) {
      console.error('[chat-ws] configureServer FAILED:', err);
      return () => {};
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

export default defineConfig(({ mode }) => {
  // Bun auto-loads `.env` for its own entrypoints (migrate.ts, server.ts), but
  // the Vite dev server runs under Node and does not. Without this, server-side
  // code that reads `process.env` (e.g. `config/env.ts`) falls back to defaults.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [backendHmr(), chatWsPlugin(), tailwindcss(), sveltekit()],
    server: {
      port: Number(process.env.PORT) || 3000,
      fs: {
        // `app.css` sits at the `app/` root (nara-style layout), which is outside
        // SvelteKit's default allow list (app/pages, app/lib, src, ...). Allow it.
        allow: ['app']
      }
    },
    ssr: {
      // Keep the postgres driver out of the SSR bundle so Vite HMR does not
      // re-instantiate connection pools on every backend file save.
      external: ['postgres']
    }
  };
});
