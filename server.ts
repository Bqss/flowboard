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

// Resolved at runtime (after `vite build`). The computed specifier keeps tsc
// from type-checking the generated file, which may not exist at check time.
const handlerPath = new URL('./build/handler.js', import.meta.url).href;
const { getHandler } = (await import(handlerPath)) as {
  getHandler: () => {
    fetch: (request: Request, server: unknown) => Response | Promise<Response>;
  };
};

const { fetch: svelteFetch } = getHandler();

const server = Bun.serve({
  port: env.port,
  hostname: '0.0.0.0',
  fetch(request, srv) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api')) {
      return api.handle(request);
    }
    return svelteFetch(request, srv);
  }
});

console.log(`Listening on ${server.url}`);
