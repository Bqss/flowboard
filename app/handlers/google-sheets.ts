import { type Ctx } from '@core';
import { env } from '@/config/env';
import { generateState, getGoogleSheetsAuthUrl, exchangeCodeForSheetsTokens, refreshGoogleSheetsToken } from '@/services/oauth';
import {
  listSpreadsheets,
  browseDrive,
  listSheetTabs,
  getSheetHeaders,
  listConnections,
  listConnectionsForWorkflow,
  getConnection,
  createConnection,
  updateConnection,
  deleteConnection,
  syncConnection,
  getAccessTokenForConnection,
  type SheetsConnectionInput,
  type SheetsConnectionUpdate,
  type ColumnMapping
} from '@/services/google-sheets';
// Cookie names for the Sheets OAuth flow
const STATE_COOKIE = 'sheets_oauth_state';
const RT_COOKIE = 'sheets_rt';

type WorkspaceParams = { workspaceId: string };
type ConnectionParams = { connectionId: string };
type SpreadsheetsQuery = Record<string, string | undefined>;
type SheetsQuery = Record<string, string | undefined>;
type CreateSheetsBody = Omit<SheetsConnectionInput, 'refreshToken'>;
type ConfigureSheetsBody = {
  workflowId: string;
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  columnMapping: ColumnMapping;
  headerRowCount?: number;
};

const requireOwner = (ctx: Pick<Ctx, 'user' | 'workspace' | 'membership' | 'set'>) => {
  if (!ctx.user || !ctx.workspace || !ctx.membership) {
    ctx.set.status = 403;
    return { error: 'Forbidden' } as const;
  }
  if (ctx.membership.role !== 'owner') {
    ctx.set.status = 403;
    return { error: 'Workspace owner required' } as const;
  }
  return null;
};

/** Read the refresh token from the sheets_rt cookie, refresh it, return access token. */
async function getAccessTokenFromCookie(cookie: Ctx['cookie']): Promise<string | null> {
  const rt = cookie[RT_COOKIE]?.value as string | undefined;
  if (!rt) return null;
  try {
    const { access_token } = await refreshGoogleSheetsToken(rt);
    return access_token;
  } catch {
    return null;
  }
}

/** Resolve access token: try cookie first (OAuth flow), then DB (saved connection). */
async function resolveAccessToken(
  cookie: Ctx['cookie'],
  query: Record<string, string | undefined>,
  workspace: { id: string } | null | undefined
): Promise<string | null> {
  // Try cookie first (during initial OAuth flow)
  const cookieToken = await getAccessTokenFromCookie(cookie);
  if (cookieToken) return cookieToken;
  // Fall back to DB-stored token (when configuring from workflow setup page)
  const connectionId = query.connectionId;
  if (connectionId && workspace) {
    return await getAccessTokenForConnection(workspace.id, connectionId);
  }
  return null;
}

// ---------------------------------------------------------------------------
// OAuth redirect + callback (GET endpoints — return 302, not JSON)
// ---------------------------------------------------------------------------

/** GET /api/workspaces/:workspaceId/integrations/google-sheets/auth */
export async function authRedirect({ cookie, set }: Ctx) {
  if (!env.googleClientId || !env.googleClientSecret) {
    set.status = 503;
    return { error: 'Google OAuth is not configured.' };
  }

  const state = generateState();
  cookie[STATE_COOKIE]?.set({
    value: state,
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: 10 * 60
  });

  set.headers['Location'] = getGoogleSheetsAuthUrl(state);
  set.status = 302;
  return '';
}

/** GET /api/integrations/google-sheets/callback */
export async function oauthCallback({ query, cookie, set }: Ctx) {
  const { code, state } = query;
  const storedState = cookie[STATE_COOKIE]?.value as string | undefined;

  cookie[STATE_COOKIE]?.remove?.();

  if (!code || !state) {
    set.status = 400;
    return { error: 'Missing code or state.' };
  }
  if (!storedState || state !== storedState) {
    set.status = 400;
    return { error: 'Invalid state parameter.' };
  }

  try {
    const tokens = await exchangeCodeForSheetsTokens(code);
    if (!tokens.refresh_token) {
      set.status = 400;
      return { error: 'No refresh token returned. Please revoke access and try again.' };
    }

    // Store refresh token in a short-lived httpOnly cookie for the multi-step wizard
    cookie[RT_COOKIE]?.set({
      value: tokens.refresh_token,
      httpOnly: true,
      sameSite: 'lax',
      secure: env.nodeEnv === 'production',
      path: '/',
      maxAge: 10 * 60
    });

    set.headers['Location'] = '/dashboard/settings/integrations?sheets_step=select';
    set.status = 302;
    return '';
  } catch (err) {
    console.error('[sheets-oauth] callback failed:', err);
    set.headers['Location'] = '/dashboard/settings/integrations?sheets_error=1';
    set.status = 302;
    return '';
  }
}

// ---------------------------------------------------------------------------
// Discovery endpoints (use sheets_rt cookie for access token)
// ---------------------------------------------------------------------------

/** GET /api/workspaces/:workspaceId/integrations/google-sheets/spreadsheets?connectionId=... */
export async function listUserSpreadsheets({
  query,
  cookie,
  workspace,
  set
}: Ctx<unknown, WorkspaceParams> & { query: SheetsQuery }) {
  const accessToken = await resolveAccessToken(cookie, query, workspace);
  if (!accessToken) {
    set.status = 401;
    return { error: 'Google Sheets not connected. Please authenticate first.' };
  }
  try {
    const spreadsheets = await listSpreadsheets(accessToken);
    return { spreadsheets };
  } catch (err) {
    set.status = 502;
    return { error: err instanceof Error ? err.message : 'Failed to list spreadsheets' };
  }
}

/** GET /api/workspaces/:workspaceId/integrations/google-sheets/browse?connectionId=...&parentId=... */
export async function browseDriveItems({
  query,
  cookie,
  workspace,
  set
}: Ctx<unknown, WorkspaceParams> & { query: SheetsQuery }) {
  const accessToken = await resolveAccessToken(cookie, query, workspace);
  if (!accessToken) {
    set.status = 401;
    return { error: 'Google Sheets not connected. Please authenticate first.' };
  }
  try {
    const items = await browseDrive(accessToken, query.parentId);
    return { items };
  } catch (err) {
    set.status = 502;
    return { error: err instanceof Error ? err.message : 'Failed to browse Drive' };
  }
}

/** GET /api/workspaces/:workspaceId/integrations/google-sheets/sheets?spreadsheetId=...&connectionId=... */
export async function listUserSheetTabs({
  query,
  cookie,
  workspace,
  set
}: Ctx<unknown, WorkspaceParams> & { query: SheetsQuery }) {
  const accessToken = await resolveAccessToken(cookie, query, workspace);
  if (!accessToken) {
    set.status = 401;
    return { error: 'Google Sheets not connected. Please authenticate first.' };
  }
  const spreadsheetId = query.spreadsheetId;
  if (!spreadsheetId) {
    set.status = 400;
    return { error: 'Missing spreadsheetId.' };
  }
  try {
    const tabs = await listSheetTabs(accessToken, spreadsheetId);
    return { sheets: tabs };
  } catch (err) {
    set.status = 502;
    return { error: err instanceof Error ? err.message : 'Failed to list sheet tabs' };
  }
}
/** GET /api/workspaces/:workspaceId/integrations/google-sheets/headers?spreadsheetId=...&sheetName=...&connectionId=... */
export async function listUserHeaders({
  query,
  cookie,
  workspace,
  set
}: Ctx<unknown, WorkspaceParams> & { query: SheetsQuery }) {
  const accessToken = await resolveAccessToken(cookie, query, workspace);
  if (!accessToken) {
    set.status = 401;
    return { error: 'Google Sheets not connected. Please authenticate first.' };
  }
  const { spreadsheetId, sheetName } = query;
  if (!spreadsheetId || !sheetName) {
    set.status = 400;
    return { error: 'Missing spreadsheetId or sheetName.' };
  }
  try {
    const headers = await getSheetHeaders(accessToken, spreadsheetId, sheetName);
    return { headers };
  } catch (err) {
    set.status = 502;
    return { error: err instanceof Error ? err.message : 'Failed to get headers' };
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/** GET /api/workspaces/:workspaceId/integrations/google-sheets */
export async function listAll({ workspace, membership, set }: Ctx<unknown, WorkspaceParams>) {
  if (!workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }
  return { connections: await listConnections(workspace.id) };
}

/** GET /api/workspaces/:workspaceId/integrations/google-sheets/workflow/:workflowId */
export async function listForWorkflow({
  workspace,
  membership,
  params,
  set
}: Ctx<unknown, WorkspaceParams & { workflowId: string }>) {
  if (!workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }
  return { connections: await listConnectionsForWorkflow(workspace.id, params.workflowId) };
}

/** POST /api/workspaces/:workspaceId/integrations/google-sheets */
export async function create({
  user,
  workspace,
  membership,
  body,
  cookie,
  set
}: Ctx<CreateSheetsBody, WorkspaceParams>) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };

  // Read refresh token from cookie
  const refreshToken = cookie[RT_COOKIE]?.value as string | undefined;
  if (!refreshToken) {
    set.status = 400;
    return { error: 'Google Sheets not authenticated. Please connect first.' };
  }

  try {
    const connection = await createConnection(workspace.id, {
      ...body,
      refreshToken
    });

    // Clear the temporary cookie — refresh token is now stored encrypted in DB
    cookie[RT_COOKIE]?.remove?.();

    return { connection };
  } catch (err) {
    set.status = 400;
    return { error: err instanceof Error ? err.message : 'Failed to create connection' };
  }
}

/** PATCH /api/workspaces/:workspaceId/integrations/google-sheets/:connectionId */
export async function update({
  user,
  workspace,
  membership,
  params,
  body,
  set
}: Ctx<SheetsConnectionUpdate, ConnectionParams>) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };

  const connection = await updateConnection(workspace.id, params.connectionId, body);
  if (!connection) {
    set.status = 404;
    return { error: 'Connection not found' };
  }
  return { connection };
}

/** PUT /api/workspaces/:workspaceId/integrations/google-sheets/:connectionId/configure */
export async function configure({
  user,
  workspace,
  membership,
  params,
  body,
  set
}: Ctx<ConfigureSheetsBody, ConnectionParams>) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };

  const connection = await updateConnection(workspace.id, params.connectionId, {
    workflowId: body.workflowId,
    spreadsheetId: body.spreadsheetId,
    spreadsheetName: body.spreadsheetName,
    sheetName: body.sheetName,
    columnMapping: body.columnMapping,
    headerRowCount: body.headerRowCount
  });
  if (!connection) {
    set.status = 404;
    return { error: 'Connection not found' };
  }
  return { connection };
}

/** DELETE /api/workspaces/:workspaceId/integrations/google-sheets/:connectionId */
export async function remove({
  user,
  workspace,
  membership,
  params,
  set
}: Ctx<unknown, ConnectionParams>) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };

  const deleted = await deleteConnection(workspace.id, params.connectionId);
  if (!deleted) {
    set.status = 404;
    return { error: 'Connection not found' };
  }
  return { ok: true };
}

/** POST /api/workspaces/:workspaceId/integrations/google-sheets/:connectionId/sync */
export async function manualSync({
  user,
  workspace,
  membership,
  params,
  set
}: Ctx<unknown, ConnectionParams>) {
  const denied = requireOwner({ user, workspace, membership, set });
  if (denied || !workspace) return denied ?? { error: 'Forbidden' };

  const conn = await getConnection(workspace.id, params.connectionId);
  if (!conn) {
    set.status = 404;
    return { error: 'Connection not found' };
  }

  console.log(`[sheets-sync] manual sync — ${conn.name} (${params.connectionId})`);
   const result = await syncConnection(params.connectionId);
}
