import { Elysia } from 'elysia';
import * as sheets from '@handlers/google-sheets';
import { createRequireAuth, createRequireWorkspaceOwner } from '@middlewares';
import {
  CreateSheetsConnectionSchema,
  ConfigureSheetsConnectionSchema,
  UpdateSheetsConnectionSchema,
  SheetsConnectionParam,
  SheetsSheetsQuery,
  SheetsHeadersQuery,
  WorkspaceIdParam,
  WorkflowIdParam
} from '@validators';

/**
 * Workspace-scoped Google Sheets management routes (session auth + owner guard).
 * The OAuth callback is a standalone GET that doesn't require auth (Google redirect).
 */
const sheetsWorkspaceRoutes = () =>
  new Elysia({ prefix: '/workspaces/:workspaceId/integrations/google-sheets' })
    .use(createRequireAuth())
    .use(createRequireWorkspaceOwner())
    .get('/', sheets.listAll, { params: WorkspaceIdParam })
    .get('/spreadsheets', sheets.listUserSpreadsheets, { params: WorkspaceIdParam })
    .get('/browse', sheets.browseDriveItems, { params: WorkspaceIdParam })
    .get('/workflow/:workflowId', sheets.listForWorkflow, { params: WorkflowIdParam })
    .get('/auth', sheets.authRedirect, { params: WorkspaceIdParam })
    .get('/headers', sheets.listUserHeaders, { params: WorkspaceIdParam, query: SheetsHeadersQuery })
    .get('/sheets', sheets.listUserSheetTabs, { params: WorkspaceIdParam, query: SheetsSheetsQuery })
    .post('/', sheets.create, { params: WorkspaceIdParam, body: CreateSheetsConnectionSchema })
    .patch('/:connectionId', sheets.update, {
      params: SheetsConnectionParam,
      body: UpdateSheetsConnectionSchema
    })
    .put('/:connectionId/configure', sheets.configure, {
      params: SheetsConnectionParam,
      body: ConfigureSheetsConnectionSchema
    })
    .delete('/:connectionId', sheets.remove, { params: SheetsConnectionParam })
    .post('/:connectionId/sync', sheets.manualSync, { params: SheetsConnectionParam });

/**
 * OAuth callback — standalone GET, no auth required (Google redirect target).
 */
const sheetsOAuthRoutes = () =>
  new Elysia({ prefix: '/integrations/google-sheets' }).get('/callback', sheets.oauthCallback);

export const createGoogleSheetsRoutes = () =>
  new Elysia().use(sheetsWorkspaceRoutes()).use(sheetsOAuthRoutes());

export const googleSheetsRoutes = createGoogleSheetsRoutes();
