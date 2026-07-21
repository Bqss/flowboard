import type { Handle } from '@sveltejs/kit';
import { api } from '@routes/api';

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
  if (event.url.pathname.startsWith('/api')) {
    return api.handle(event.request);
  }

  return resolve(event);
};
