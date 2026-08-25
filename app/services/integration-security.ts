import { randomUUID } from 'node:crypto';
import { and, eq, lt } from 'drizzle-orm';
import { db, integrationAuditLogs, integrationIdempotencyKeys } from '@db';
import { env } from '@config/env';

const buckets = new Map<string, { startedAt: number; count: number }>();
const idempotencyProcessingTimeoutMs = Math.max(env.wajomRequestTimeoutMs * 2, 5 * 60_000);

const isStaleProcessing = (updatedAt: Date) =>
  Date.now() - updatedAt.getTime() >= idempotencyProcessingTimeoutMs;

export const checkIntegrationRateLimit = (key: string) => {
  const now = Date.now();
  const windowMs = 60_000;
  const current = buckets.get(key);

  if (!current || now - current.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= env.integrationRateLimitPerMinute) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000))
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
};

export const createRequestId = (provided?: string) => provided?.trim() || randomUUID();

export const recordIntegrationAudit = async (input: {
  workspaceId: string;
  connectionId?: string | null;
  requestId: string;
  tool: string;
  method: string;
  inputKeys?: string[];
  success: boolean;
  statusCode: number;
  latencyMs: number;
  resultSummary?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
}) => {
  await db.insert(integrationAuditLogs).values({
    workspaceId: input.workspaceId,
    connectionId: input.connectionId ?? null,
    requestId: input.requestId,
    tool: input.tool,
    method: input.method,
    inputKeys: input.inputKeys ?? [],
    success: input.success,
    statusCode: input.statusCode,
    latencyMs: input.latencyMs,
    resultSummary: input.resultSummary ?? null,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null
  });
};

export const getIdempotentResponse = async (connectionId: string, key: string, tool: string) => {
  const [row] = await db
    .select()
    .from(integrationIdempotencyKeys)
    .where(
      and(
        eq(integrationIdempotencyKeys.connectionId, connectionId),
        eq(integrationIdempotencyKeys.key, key),
        eq(integrationIdempotencyKeys.tool, tool)
      )
    )
    .limit(1);

  if (row?.status === 'processing' && isStaleProcessing(row.updatedAt)) return null;
  return row ?? null;
};

export const reserveIdempotencyKey = async (connectionId: string, key: string, tool: string) => {
  const [created] = await db
    .insert(integrationIdempotencyKeys)
    .values({ connectionId, key, tool, status: 'processing' })
    .onConflictDoNothing({ target: [integrationIdempotencyKeys.connectionId, integrationIdempotencyKeys.key] })
    .returning();

  if (created) return created;

  const [reclaimed] = await db
    .update(integrationIdempotencyKeys)
    .set({
      status: 'processing',
      response: null,
      statusCode: null,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(integrationIdempotencyKeys.connectionId, connectionId),
        eq(integrationIdempotencyKeys.key, key),
        eq(integrationIdempotencyKeys.tool, tool),
        eq(integrationIdempotencyKeys.status, 'processing'),
        lt(
          integrationIdempotencyKeys.updatedAt,
          new Date(Date.now() - idempotencyProcessingTimeoutMs)
        )
      )
    )
    .returning();

  return reclaimed ?? null;
};

export const completeIdempotencyKey = async (
  connectionId: string,
  key: string,
  response: unknown,
  statusCode: number
) => {
  await db
    .update(integrationIdempotencyKeys)
    .set({ status: 'completed', response, statusCode, updatedAt: new Date() })
    .where(
      and(eq(integrationIdempotencyKeys.connectionId, connectionId), eq(integrationIdempotencyKeys.key, key))
    );
};

export const releaseIdempotencyKey = async (connectionId: string, key: string) => {
  await db
    .delete(integrationIdempotencyKeys)
    .where(and(eq(integrationIdempotencyKeys.connectionId, connectionId), eq(integrationIdempotencyKeys.key, key)));
};
