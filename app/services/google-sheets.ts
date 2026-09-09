import { eq, and } from 'drizzle-orm';
import { db, googleSheetsConnections, workflows, type GoogleSheetsConnection } from '@db';
import { env } from '@/config/env';
import { encryptSecret, decryptSecret } from './integration-secrets';
import { refreshGoogleSheetsToken } from './oauth';
import { createCard, WorkflowError } from './workflow';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColumnMapping = {
  name: number;   // 0-based column index for customer name
  wa: number;     // 0-based column index for WhatsApp number
  product?: number | null;
  tag?: number | null;
};

export type SheetsConnectionInput = {
  name: string;
  refreshToken: string;
};

export type SheetsConnectionUpdate = {
  name?: string;
  workflowId?: string | null;
  spreadsheetId?: string | null;
  spreadsheetName?: string | null;
  sheetName?: string;
  columnMapping?: ColumnMapping | null;
  headerRowCount?: number;
  enabled?: boolean;
};

export type PublicSheetsConnection = {
  id: string;
  workspaceId: string;
  workflowId: string | null;
  name: string;
  spreadsheetId: string | null;
  spreadsheetName: string | null;
  sheetName: string;
  columnMapping: ColumnMapping | null;
  headerRowCount: number;
  lastSyncedRow: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};


export type SpreadsheetInfo = {
  id: string;
  name: string;
};

export type SheetTabInfo = {
  title: string;
  index: number;
};

export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
};

// ---------------------------------------------------------------------------
// Google Sheets API helpers
// ---------------------------------------------------------------------------

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

/** List all spreadsheets the user has access to (via Drive API). */
export async function listSpreadsheets(accessToken: string): Promise<SpreadsheetInfo[]> {
  const res = await fetch(
    `${DRIVE_API_BASE}/files?q=mimeType%3D'application%2Fvnd.google-apps.spreadsheet'&fields=files(id,name)&pageSize=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API list failed: ${res.status} ${text}`);
  }
  const data = await res.json() as { files: Array<{ id: string; name: string }> };
  return data.files ?? [];
}

/** Browse Google Drive: list folders + spreadsheets at a given parent (default: root "My Drive"). */
export async function browseDrive(accessToken: string, parentId?: string): Promise<DriveItem[]> {
  const parent = parentId ?? 'root';
  const q = `(mimeType='application/vnd.google-apps.folder' or mimeType='application/vnd.google-apps.spreadsheet') and trashed=false and '${parent}' in parents`;
  const res = await fetch(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)&pageSize=200`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API browse failed: ${res.status} ${text}`);
  }
  const data = await res.json() as { files: Array<{ id: string; name: string; mimeType: string }> };
  const items = (data.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    isFolder: f.mimeType === 'application/vnd.google-apps.folder'
  }));
  // Sort: folders first, then alphabetical
  items.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return items;
}

/** List sheet tabs within a spreadsheet. */
export async function listSheetTabs(accessToken: string, spreadsheetId: string): Promise<SheetTabInfo[]> {
  const res = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties(title,index)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API metadata failed: ${res.status} ${text}`);
  }
  const data = await res.json() as { sheets?: Array<{ properties: { title: string; index: number } }> };
  return (data.sheets ?? []).map((s) => ({ title: s.properties.title, index: s.properties.index }));
}

/** Fetch header row (first N rows) from a sheet tab. Returns row values. */
export async function getSheetHeaders(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  headerRowCount = 1
): Promise<string[][]> {
  const range = `${sheetName}!A1:${headerRowCount > 1 ? headerRowCount : 1}`;
  const res = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API headers failed: ${res.status} ${text}`);
  }
  const data = await res.json() as { values?: string[][] };
  return data.values ?? [];
}

/** Fetch rows from a given 1-based row number, optionally limited to `limit` rows. */
async function getSheetRowsFrom(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  startRow: number,
  limit?: number
): Promise<string[][]> {
  const endCol = 'Z';
  const endRow = limit ? `${startRow + limit - 1}` : '';
  const range = `${sheetName}!A${startRow}:${endCol}${endRow}`;
  const res = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API rows failed: ${res.status} ${text}`);
  }
  const data = await res.json() as { values?: string[][] };
  return data.values ?? [];
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

/** Decrypt the stored refresh token and return a fresh access token. */
async function getAccessToken(connection: GoogleSheetsConnection): Promise<string> {
  const refreshToken = decryptSecret(connection.refreshTokenEncrypted);
  const { access_token } = await refreshGoogleSheetsToken(refreshToken);
  return access_token;
}

/** Get an access token for a saved connection (used by discovery endpoints). */
export async function getAccessTokenForConnection(
  workspaceId: string,
  connectionId: string
): Promise<string | null> {
  const conn = await getConnection(workspaceId, connectionId);
  if (!conn) return null;
  try {
    return await getAccessToken(conn);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

function toPublic(conn: GoogleSheetsConnection): PublicSheetsConnection {
  return {
    id: conn.id,
    workspaceId: conn.workspaceId,
    workflowId: conn.workflowId,
    name: conn.name,
    spreadsheetId: conn.spreadsheetId,
    spreadsheetName: conn.spreadsheetName,
    sheetName: conn.sheetName,
    columnMapping: (conn.columnMapping as ColumnMapping | null) ?? null,
    headerRowCount: conn.headerRowCount,
    lastSyncedRow: conn.lastSyncedRow,
    lastSyncedAt: conn.lastSyncedAt?.toISOString() ?? null,
    lastError: conn.lastError,
    enabled: conn.enabled,
    createdAt: conn.createdAt.toISOString(),
    updatedAt: conn.updatedAt.toISOString()
  };
}

export async function listConnections(workspaceId: string): Promise<PublicSheetsConnection[]> {
  const rows = await db
    .select()
    .from(googleSheetsConnections)
    .where(eq(googleSheetsConnections.workspaceId, workspaceId));
  return rows.map(toPublic);
}

export async function listConnectionsForWorkflow(
  workspaceId: string,
  workflowId: string
): Promise<PublicSheetsConnection[]> {
  const rows = await db
    .select()
    .from(googleSheetsConnections)
    .where(
      and(
        eq(googleSheetsConnections.workspaceId, workspaceId),
        eq(googleSheetsConnections.workflowId, workflowId)
      )
    );
  return rows.map(toPublic);
}

export async function getConnection(workspaceId: string, connectionId: string): Promise<GoogleSheetsConnection | null> {
  const [row] = await db
    .select()
    .from(googleSheetsConnections)
    .where(
      and(
        eq(googleSheetsConnections.id, connectionId),
        eq(googleSheetsConnections.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function createConnection(
  workspaceId: string,
  input: SheetsConnectionInput
): Promise<PublicSheetsConnection> {
  const [row] = await db
    .insert(googleSheetsConnections)
    .values({
      workspaceId,
      name: input.name,
      refreshTokenEncrypted: encryptSecret(input.refreshToken)
    })
    .returning();

  return toPublic(row);
}

export async function updateConnection(
  workspaceId: string,
  connectionId: string,
  input: SheetsConnectionUpdate
): Promise<PublicSheetsConnection | null> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.workflowId !== undefined) updates.workflowId = input.workflowId;
  if (input.spreadsheetId !== undefined) updates.spreadsheetId = input.spreadsheetId;
  if (input.spreadsheetName !== undefined) updates.spreadsheetName = input.spreadsheetName;
  if (input.sheetName !== undefined) updates.sheetName = input.sheetName;
  if (input.columnMapping !== undefined) updates.columnMapping = input.columnMapping;
  if (input.headerRowCount !== undefined) updates.headerRowCount = input.headerRowCount;
  if (input.enabled !== undefined) updates.enabled = input.enabled;

  const [row] = await db
    .update(googleSheetsConnections)
    .set(updates)
    .where(
      and(
        eq(googleSheetsConnections.id, connectionId),
        eq(googleSheetsConnections.workspaceId, workspaceId)
      )
    )
    .returning();

  return row ? toPublic(row) : null;
}

export async function deleteConnection(workspaceId: string, connectionId: string): Promise<boolean> {
  const result = await db
    .delete(googleSheetsConnections)
    .where(
      and(
        eq(googleSheetsConnections.id, connectionId),
        eq(googleSheetsConnections.workspaceId, workspaceId)
      )
    );
  return result.count > 0;
}

// ---------------------------------------------------------------------------
// Sync — fetch new rows and create cards
// ---------------------------------------------------------------------------

/** Rows fetched per Google Sheets API call. */
const SYNC_BATCH_SIZE = 100;
/** Max batches processed per sync run (safety cap: 100 × 10 = 1000 rows/tick). */
const MAX_BATCHES_PER_RUN = 10;

/** Sync a single connection: fetch new rows since last sync and create cards. */
export async function syncConnection(connectionId: string): Promise<{ created: number; skipped: number; error?: string }> {
  const [conn] = await db
    .select()
    .from(googleSheetsConnections)
    .where(eq(googleSheetsConnections.id, connectionId))
    .limit(1);

  if (!conn) {
    console.log(`[sheets-sync] ${connectionId} — skipped: not found`);
    return { created: 0, skipped: 0, error: 'Connection not found' };
  }
  if (!conn.enabled) {
    console.log(`[sheets-sync] ${conn.name} (${connectionId}) — skipped: disabled`);
    return { created: 0, skipped: 0, error: 'Connection disabled' };
  }
  if (!conn.workflowId || !conn.spreadsheetId || !conn.columnMapping) {
    console.log(`[sheets-sync] ${conn.name} (${connectionId}) — skipped: not configured`);
    return { created: 0, skipped: 0, error: 'Connection not yet configured' };
  }

  console.log(`[sheets-sync] ${conn.name} (${connectionId}) — syncing from row ${Math.max(conn.headerRowCount + 1, conn.lastSyncedRow + 1)}…`);

  try {
    const accessToken = await getAccessToken(conn);
    const mapping = conn.columnMapping as ColumnMapping;

    // Fetch the workflow (needed for createCard)
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, conn.workflowId))
      .limit(1);

    if (!workflow) {
      throw new Error('Target workflow no longer exists');
    }

    // Process in batches of SYNC_BATCH_SIZE, up to MAX_BATCHES_PER_RUN per tick.
    let batchStartRow = Math.max(conn.headerRowCount + 1, conn.lastSyncedRow + 1);
    let created = 0;
    let skipped = 0;
    let lastProcessedRow = conn.lastSyncedRow;
    let batchCount = 0;

    while (batchCount < MAX_BATCHES_PER_RUN) {
      const rows = await getSheetRowsFrom(accessToken, conn.spreadsheetId, conn.sheetName, batchStartRow, SYNC_BATCH_SIZE);
      if (rows.length === 0) break;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const absoluteRow = batchStartRow + i;

        const name = row[mapping.name]?.trim();
        const wa = row[mapping.wa]?.trim();

        if (!name || !wa) {
          skipped++;
          lastProcessedRow = absoluteRow;
          continue;
        }

        const product = mapping.product != null ? row[mapping.product]?.trim() || null : null;
        const tag = mapping.tag != null ? row[mapping.tag]?.trim() || null : null;

        try {
          await createCard(workflow, {
            name,
            wa,
            product,
            tag,
            source: 'sheets',
            allowDuplicate: false
          });
          created++;
        } catch (err) {
          if (err instanceof WorkflowError) {
            skipped++;
          } else {
            console.error(`[sheets-sync] Row ${absoluteRow} failed:`, err);
            skipped++;
          }
        }
        lastProcessedRow = absoluteRow;
      }

      batchStartRow += rows.length;
      batchCount++;

      // Last batch (fewer rows than requested) — no more data
      if (rows.length < SYNC_BATCH_SIZE) break;
    }

    // No new rows at all
    if (created === 0 && skipped === 0 && batchCount === 0) {
      console.log(`[sheets-sync] ${conn.name} — no new rows`);
    } else {
      console.log(`[sheets-sync] ${conn.name} — done: ${created} created, ${skipped} skipped, ${batchCount} batch(es), rows up to ${lastProcessedRow}`);
    }

    // Update sync state
    await db
      .update(googleSheetsConnections)
      .set({
        lastSyncedRow: lastProcessedRow,
        lastSyncedAt: new Date(),
        lastError: null,
        updatedAt: new Date()
      })
      .where(eq(googleSheetsConnections.id, connectionId));
     return { created, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(googleSheetsConnections)
      .set({ lastError: message, lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(googleSheetsConnections.id, connectionId));
    console.error(`[sheets-sync] Connection ${connectionId} failed:`, error);
    return { created: 0, skipped: 0, error: message };
  }
}

/** Sync all enabled connections — called by the scheduler. */
export async function syncAllConnections(): Promise<void> {
  const connections = await db
    .select({ id: googleSheetsConnections.id })
    .from(googleSheetsConnections)
    .where(eq(googleSheetsConnections.enabled, true));

  if (connections.length === 0) return;
  console.log(`[sheets-sync] auto-sync — ${connections.length} enabled connection(s)`);
  for (const conn of connections) {
    try {
      await syncConnection(conn.id);
    } catch (error) {
      console.error(`[sheets-sync] Unexpected error for ${conn.id}:`, error);
    }
  }
}
