import { Elysia } from 'elysia';

/**
 * Derives a best-effort client IP and adds `clientIp` to the context.
 *
 * Both entrypoints (`hooks.server.ts` in dev, `server.ts` in prod) call
 * `api.handle(request)` with a bare `Request`, so Elysia's socket-level
 * `server.requestIP` is not available. We read the standard forwarding headers
 * instead. Behind a trusted proxy these are set by the proxy; with no proxy
 * they are absent and we fall back to a constant, which still lets the throttle
 * work per-identifier.
 *
 * Note: forwarding headers are client-controllable when you are NOT behind a
 * trusted proxy. Only rely on them for throttling once such a proxy is in place.
 */
export const createWithClientIp = () =>
  new Elysia().derive({ as: 'scoped' }, ({ headers }) => {
    const forwarded = headers['x-forwarded-for'];
    const clientIp = forwarded?.split(',')[0]?.trim() || headers['x-real-ip'] || 'unknown';
    return { clientIp };
  });

