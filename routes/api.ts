import { createApiApp } from '@core';
import { getDevGlobal, resetDevRuntime, setDevGlobal } from '@core/dev-runtime';
import { healthRoutes } from './health';
import { createAuthRoutes } from './auth';
import { createUsersRoutes } from './users';
import { createWorkspacesRoutes } from './workspaces';
import { createWorkflowsRoutes } from './workflows';
import { createNotificationsRoutes } from './notifications';
import { createWebhooksRoutes } from './webhooks';
import { createIntegrationsRoutes } from './integrations';

/**
 * The API surface. `createApiApp()` provides the `/api` prefix plus shared
 * error handling; each feature route table is mounted here. Add a feature by
 * creating `routes/<name>.ts` and `.use()`-ing it below.
 */
export const buildApi = () =>
  createApiApp()
    .use(healthRoutes)
    .use(createAuthRoutes())
    .use(createUsersRoutes())
    .use(createWorkspacesRoutes())
    .use(createWorkflowsRoutes())
    .use(createNotificationsRoutes())
    .use(createWebhooksRoutes())
    .use(createIntegrationsRoutes());

export type Api = ReturnType<typeof buildApi>;

/**
 * Returns the live API instance. In dev we rebuild after Vite invalidates backend
 * modules so `hooks.server.ts` never dispatches to a stale Elysia graph.
 */
export const getApi = (): Api => {
  const cached = getDevGlobal('__flowboard_api');
  if (cached) return cached;

  const app = buildApi();
  setDevGlobal('__flowboard_api', app);
  return app;
};

/** Bust the cached API graph — called from the Vite backend HMR plugin. */
export const reloadApi = () => {
  resetDevRuntime();
  return getApi();
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    resetDevRuntime();
  });
}

export const api = getApi();
