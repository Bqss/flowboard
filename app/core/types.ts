import type { User } from '@db';

/**
 * A minimal, framework-light view of an Elysia request context.
 *
 * Handlers accept this instead of Elysia's full `Context` so they read as plain
 * request→response logic and the route table (`routes/*.ts`) owns wiring +
 * validation.
 *
 * Design note: `body`, `params`, and `user` are strongly typed — that's the
 * safety that matters for handler logic. The framework "plumbing" fields (`set`,
 * `cookie`) are intentionally loose so Elysia's real context (whose `set.headers`
 * are `string | number` and whose cookies are invariant `Cookie<unknown>`) is
 * always assignable to `Ctx`. Fighting those types buys nothing for a handler
 * that only calls `set.status = …`, `cookie[x].set(…)`, and `cookie[x].remove()`.
 *
 * `user` is optional: routes that mount `withUser` / `requireAuth` populate it;
 * routes that don't simply omit it.
 */
export interface Ctx<Body = unknown, Params = Record<string, string>> {
  body: Body;
  params: Params;
  query: Record<string, string | undefined>;
  set: { status?: number | string; headers: Record<string, string | number> };
  cookie: Record<string, CookieJar>;
  user?: User | null;
  /** Best-effort client IP. Populated by `withClientIp`; used for throttling. */
  clientIp?: string;
}

/** The cookie operations handlers rely on, loose enough to accept Elysia's `Cookie`. */
export interface CookieJar {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(options: { value: string } & Record<string, any>): void;
  remove(): void;
}
