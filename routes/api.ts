import { createApiApp } from '@core';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { usersRoutes } from './users';

/**
 * The API surface. `createApiApp()` provides the `/api` prefix plus shared
 * error handling; each feature route table is mounted here. Add a feature by
 * creating `routes/<name>.ts` and `.use()`-ing it below.
 */
export const api = createApiApp()
  .use(healthRoutes)
  .use(authRoutes)
  .use(usersRoutes);

export type Api = typeof api;
