/**
 * MCP API keys — per-workspace key for MCP tool access.
 *
 * Replaces the global FLOWBOARD_API_KEY with DB-managed keys that:
 * - Are scoped to a single workspace (workspace resolved from key, not body)
 * - Can be revoked individually
 * - Track last-used time for audit
 * - Use the same SHA-256 + pepper hashing as connector tokens
 * - Support workflow scope (all | selected) and per-key enabled tools
 *
 * The plaintext key is shown once at creation time and never stored.
 * Only the hash + prefix (for display) are persisted.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db, mcpApiKeys, mcpApiKeyWorkflows, workflows, type McpApiKey } from '@db';
import { env } from '@config/env';
import { MCP_TOOL_NAMES, type McpToolName } from './integration-tools';

const KEY_PREFIX = 'fbm_'; // flowboard mcp
const KEY_BYTES = 32;

const getPepper = () => {
  const pepper = env.integrationTokenPepper;
  if (!pepper) throw new Error('Missing required secret: INTEGRATION_TOKEN_PEPPER');
  return pepper;
};

export const hashApiKey = (key: string) => {
  const pepper = getPepper();
  return createHash('sha256').update(`${pepper}:${key}`).digest('hex');
};

export const verifyApiKey = (key: string, expectedHash: string) => {
  const actual = Buffer.from(hashApiKey(key), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const getKeyPrefix = (key: string) => key.slice(0, KEY_PREFIX.length + 8);

/** Generate a new plaintext key + its hash. The plaintext is returned once. */
export const generateApiKey = () => {
  const key = `${KEY_PREFIX}${randomBytes(KEY_BYTES).toString('base64url')}`;
  return { key, hash: hashApiKey(key), prefix: getKeyPrefix(key) };
};

export type McpScopeMode = 'all' | 'selected';

export type ApiKeyWithContext = {
  id: string;
  workspaceId: string;
  label: string;
  keyPrefix: string;
  scopeMode: McpScopeMode;
  enabledTools: McpToolName[];
  allowedWorkflowIds: string[];
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export type ResolvedApiKey = {
  workspaceId: string;
  keyId: string;
  label: string;
  scopeMode: McpScopeMode;
  enabledTools: McpToolName[];
  allowedWorkflowIds: string[];
};

export type ApiKeyInput = {
  label: string;
  scopeMode: McpScopeMode;
  enabledTools: McpToolName[];
  workflowIds?: string[];
};

/** Default tools for a given scope mode + workflow count. */
export const defaultToolsForScope = (scopeMode: McpScopeMode, workflowCount: number): McpToolName[] => {
  // Single selected workflow → omit list_workflows (agent already knows its only workflow).
  // All / multiple selected → include all 10 tools.
  if (scopeMode === 'selected' && workflowCount === 1) {
    return MCP_TOOL_NAMES.filter((name) => name !== 'list_workflows');
  }
  return [...MCP_TOOL_NAMES];
};

const cleanTools = (tools: string[]): McpToolName[] => {
  const valid = new Set<string>(MCP_TOOL_NAMES);
  const seen = new Set<McpToolName>();
  const result: McpToolName[] = [];
  for (const t of tools) {
    if (valid.has(t) && !seen.has(t as McpToolName)) {
      seen.add(t as McpToolName);
      result.push(t as McpToolName);
    }
  }
  return result;
};

/** Validate that all workflowIds belong to the given workspace. */
const validateWorkflowIds = async (workspaceId: string, workflowIds: string[]): Promise<void> => {
  if (workflowIds.length === 0) return;
  const rows = await db
    .select({ id: workflows.id })
    .from(workflows)
    .where(and(eq(workflows.workspaceId, workspaceId), inArray(workflows.id, workflowIds)));
  if (rows.length !== workflowIds.length) {
    throw new Error('One or more workflows do not belong to this workspace.');
  }
};

/** Load allowed workflow IDs for a key (only meaningful for selected scope). */
const loadAllowedWorkflowIds = async (keyId: string): Promise<string[]> => {
  const rows = await db
    .select({ workflowId: mcpApiKeyWorkflows.workflowId })
    .from(mcpApiKeyWorkflows)
    .where(eq(mcpApiKeyWorkflows.apiKeyId, keyId));
  return rows.map((r) => r.workflowId);
};

/** Replace workflow mappings for a key (used by create/update/rotate). */
const syncWorkflowMappings = async (keyId: string, workflowIds: string[]): Promise<void> => {
  await db.delete(mcpApiKeyWorkflows).where(eq(mcpApiKeyWorkflows.apiKeyId, keyId));
  if (workflowIds.length === 0) return;
  await db
    .insert(mcpApiKeyWorkflows)
    .values(workflowIds.map((workflowId) => ({ apiKeyId: keyId, workflowId })));
};

/**
 * Resolve a plaintext API key to its workspace + scope.
 * Returns null if the key is unknown, revoked, or the hash does not match.
 * Updates lastUsedAt on success.
 */
export const resolveApiKey = async (plaintext: string): Promise<ResolvedApiKey | null> => {
  if (!plaintext.startsWith(KEY_PREFIX)) return null;

  // We cannot look up by hash directly (we'd need the exact hash column match).
  // Instead, scan candidate rows by prefix to narrow the search, then verify.
  const prefix = getKeyPrefix(plaintext);
  const candidates = await db
    .select()
    .from(mcpApiKeys)
    .where(and(eq(mcpApiKeys.keyPrefix, prefix), isNull(mcpApiKeys.revokedAt)));

  for (const row of candidates) {
    if (verifyApiKey(plaintext, row.keyHash)) {
      // Fire-and-forget lastUsedAt update.
      db.update(mcpApiKeys)
        .set({ lastUsedAt: new Date(), updatedAt: new Date() })
        .where(eq(mcpApiKeys.id, row.id))
        .execute()
        .catch(() => {});

      const allowedWorkflowIds =
        row.scopeMode === 'selected' ? await loadAllowedWorkflowIds(row.id) : [];

      return {
        workspaceId: row.workspaceId,
        keyId: row.id,
        label: row.label,
        scopeMode: row.scopeMode as McpScopeMode,
        enabledTools: cleanTools(row.enabledTools),
        allowedWorkflowIds
      };
    }
  }

  return null;
};

export const listWorkspaceApiKeys = async (workspaceId: string): Promise<ApiKeyWithContext[]> => {
  const rows = await db
    .select()
    .from(mcpApiKeys)
    .where(eq(mcpApiKeys.workspaceId, workspaceId))
    .orderBy(desc(mcpApiKeys.createdAt));

  const result: ApiKeyWithContext[] = [];
  for (const row of rows) {
    const allowedWorkflowIds = await loadAllowedWorkflowIds(row.id);
    result.push({
      id: row.id,
      workspaceId: row.workspaceId,
      label: row.label,
      keyPrefix: row.keyPrefix,
      scopeMode: row.scopeMode as McpScopeMode,
      enabledTools: cleanTools(row.enabledTools),
      allowedWorkflowIds,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt
    });
  }
  return result;
};

export type CreatedApiKey = ApiKeyWithContext & { key: string };

export const createApiKey = async (
  workspaceId: string,
  input: ApiKeyInput
): Promise<CreatedApiKey> => {
  const workflowIds = input.scopeMode === 'selected' ? (input.workflowIds ?? []) : [];
  if (input.scopeMode === 'selected' && workflowIds.length === 0) {
    throw new Error('Selected scope requires at least one workflow.');
  }
  await validateWorkflowIds(workspaceId, workflowIds);

  const enabledTools = input.enabledTools.length > 0 ? input.enabledTools : defaultToolsForScope(input.scopeMode, workflowIds.length);

  const { key, hash, prefix } = generateApiKey();
  const [row] = await db
    .insert(mcpApiKeys)
    .values({
      workspaceId,
      label: input.label,
      keyHash: hash,
      keyPrefix: prefix,
      scopeMode: input.scopeMode,
      enabledTools
    })
    .returning();

  if (workflowIds.length > 0) {
    await syncWorkflowMappings(row.id, workflowIds);
  }

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    label: row.label,
    keyPrefix: row.keyPrefix,
    scopeMode: row.scopeMode as McpScopeMode,
    enabledTools: cleanTools(row.enabledTools),
    allowedWorkflowIds: workflowIds,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    key
  };
};

export const updateApiKey = async (
  workspaceId: string,
  keyId: string,
  input: Partial<ApiKeyInput>
): Promise<ApiKeyWithContext | null> => {
  const [existing] = await db
    .select()
    .from(mcpApiKeys)
    .where(and(eq(mcpApiKeys.id, keyId), eq(mcpApiKeys.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) return null;
  if (existing.revokedAt) throw new Error('Cannot update a revoked API key.');

  const scopeMode = (input.scopeMode ?? existing.scopeMode) as McpScopeMode;
  const workflowIds = scopeMode === 'selected' ? (input.workflowIds ?? (await loadAllowedWorkflowIds(keyId))) : [];
  if (scopeMode === 'selected' && workflowIds.length === 0) {
    throw new Error('Selected scope requires at least one workflow.');
  }
  await validateWorkflowIds(workspaceId, workflowIds);

  const enabledTools =
    input.enabledTools && input.enabledTools.length > 0
      ? input.enabledTools
      : input.scopeMode
        ? defaultToolsForScope(scopeMode, workflowIds.length)
        : cleanTools(existing.enabledTools);

  const [row] = await db
    .update(mcpApiKeys)
    .set({
      ...(input.label ? { label: input.label } : {}),
      scopeMode,
      enabledTools,
      updatedAt: new Date()
    })
    .where(and(eq(mcpApiKeys.id, keyId), eq(mcpApiKeys.workspaceId, workspaceId)))
    .returning();

  await syncWorkflowMappings(keyId, scopeMode === 'selected' ? workflowIds : []);

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    label: row.label,
    keyPrefix: row.keyPrefix,
    scopeMode: row.scopeMode as McpScopeMode,
    enabledTools: cleanTools(row.enabledTools),
    allowedWorkflowIds: scopeMode === 'selected' ? workflowIds : [],
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt
  };
};

export const revokeApiKey = async (workspaceId: string, keyId: string): Promise<boolean> => {
  await db.delete(mcpApiKeyWorkflows).where(eq(mcpApiKeyWorkflows.apiKeyId, keyId));
  const [row] = await db
    .delete(mcpApiKeys)
    .where(and(eq(mcpApiKeys.id, keyId), eq(mcpApiKeys.workspaceId, workspaceId)))
    .returning();
  return Boolean(row);
};

export const rotateApiKey = async (
  workspaceId: string,
  keyId: string
): Promise<{ created: CreatedApiKey | null }> => {
  const [existing] = await db
    .select()
    .from(mcpApiKeys)
    .where(and(eq(mcpApiKeys.id, keyId), eq(mcpApiKeys.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) return { created: null };

  const existingWorkflowIds = await loadAllowedWorkflowIds(keyId);
  const scopeMode = existing.scopeMode as McpScopeMode;
  const enabledTools = cleanTools(existing.enabledTools);
  const generated = generateApiKey();

  const result = await db.transaction(async (tx) => {
    // Hard delete old key + workflow mappings
    await tx.delete(mcpApiKeyWorkflows).where(eq(mcpApiKeyWorkflows.apiKeyId, keyId));
    await tx
      .delete(mcpApiKeys)
      .where(and(eq(mcpApiKeys.id, keyId), eq(mcpApiKeys.workspaceId, workspaceId)));

    const [createdRow] = await tx
      .insert(mcpApiKeys)
      .values({
        workspaceId,
        label: existing.label,
        keyHash: generated.hash,
        keyPrefix: generated.prefix,
        scopeMode,
        enabledTools
      })
      .returning();

    if (scopeMode === 'selected' && existingWorkflowIds.length > 0) {
      await tx.insert(mcpApiKeyWorkflows).values(
        existingWorkflowIds.map((workflowId) => ({ apiKeyId: createdRow.id, workflowId }))
      );
    }

    return { createdRow };
  });

  return {
    created: {
      id: result.createdRow.id,
      workspaceId: result.createdRow.workspaceId,
      label: result.createdRow.label,
      keyPrefix: result.createdRow.keyPrefix,
      scopeMode: result.createdRow.scopeMode as McpScopeMode,
      enabledTools: cleanTools(result.createdRow.enabledTools),
      allowedWorkflowIds: scopeMode === 'selected' ? existingWorkflowIds : [],
      lastUsedAt: result.createdRow.lastUsedAt,
      revokedAt: result.createdRow.revokedAt,
      createdAt: result.createdRow.createdAt,
      key: generated.key
    }
  };
};
