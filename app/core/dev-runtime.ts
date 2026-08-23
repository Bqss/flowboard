/**
 * Dev-only helpers for surviving Vite SSR module reloads.
 *
 * Vite re-evaluates server modules on save. Without process-level singletons
 * the DB pool and Elysia app graph can desync (stale `api` in hooks, fresh
 * handlers elsewhere, or the reverse) and every SSR fetch starts failing until
 * the dev server is restarted.
 */

type DevGlobals = {
  __flowboard_db_client?: import('postgres').Sql;
  __flowboard_db?: import('drizzle-orm/postgres-js').PostgresJsDatabase<
    typeof import('@db/schema')
  >;
  __flowboard_api?: import('@routes/api').Api;
};

const g = globalThis as typeof globalThis & DevGlobals;

export const isDevRuntime = () => import.meta.env.DEV;

export const getDevGlobal = <K extends keyof DevGlobals>(key: K): DevGlobals[K] => g[key];

export const setDevGlobal = <K extends keyof DevGlobals>(key: K, value: DevGlobals[K]) => {
  (g as DevGlobals)[key] = value;
};

/** Drop cached server singletons before rebuilding the API graph. */
export const resetDevRuntime = () => {
  delete g.__flowboard_api;
};
