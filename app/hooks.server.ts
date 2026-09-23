import { join, normalize } from 'node:path';
import type { Handle } from '@sveltejs/kit';
import { getApi, reloadApi } from '@routes/api';
import { startScheduler, stopScheduler } from '@services/scheduler';
startScheduler();

/**
 * Routes internal `/api` calls to Elysia.
 *
 * DEV: the app is served by Vite (no build output for `entry.ts` to wrap), so
 * this hook is the single-port glue for every `/api` request.
 *
 * PROD: external `/api` requests are intercepted by `entry.ts` (`Bun.serve`)
 * before SvelteKit sees them — those skip this hook entirely and hit Elysia
 * natively. This hook still runs for `/api` fetches made *from inside SSR*
 * (e.g. a `+page.server.ts` load calling `api.me(fetch)`): SvelteKit resolves
 * those in-process through here, so there is no network hop.
 *
 * Both paths dispatch to the same `api` instance, so behaviour is identical.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname;

  const uploadPrefixes = ['/chat-uploads/', '/task-uploads/', '/avatars/'];
  if (uploadPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const safePath = normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const filePath = join(process.cwd(), 'static', safePath);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
  }

  if (pathname.startsWith('/api')) {
    return getApi().handle(event.request);
  }

  return resolve(event);
};

if (import.meta.hot) {
  import.meta.hot.on('flowboard:api-reload', () => {
    reloadApi();
  });
  import.meta.hot.dispose(() => {
    stopScheduler();
  });
}
