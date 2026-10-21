import { Elysia } from 'elysia';
import { healthRoutes } from './health';
import { createWorkspacesRoutes } from './workspaces';
import { createWorkflowsRoutes } from './workflows';
import { createTaskBoardsRoutes } from './task-boards';
import { createNotificationsRoutes } from './notifications';
import { createChatRoutes } from './chat';
import { createWajomRoutes } from './wajom';
import { createGoogleSheetsRoutes } from './google-sheets';
import { createOnboardingRoutes } from './onboarding';
import { createMobileAuthRoutes } from './mobile-auth';

/**
 * Native mobile API surface. It intentionally excludes platform admin,
 * global user management, and backend webhook routes while reusing the same
 * feature route tables and services.
 */
export const createMobileRoutes = () =>
  new Elysia({ prefix: '/v1' })
    .use(healthRoutes)
    .use(createMobileAuthRoutes())
    .use(createWorkspacesRoutes())
    .use(createWorkflowsRoutes())
    .use(createTaskBoardsRoutes())
    .use(createNotificationsRoutes())
    .use(createChatRoutes())
    .use(createWajomRoutes())
    .use(createGoogleSheetsRoutes())
    .use(createOnboardingRoutes());

export const mobileRoutes = createMobileRoutes();
