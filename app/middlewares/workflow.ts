import { Elysia } from 'elysia';
import { and, eq } from 'drizzle-orm';
import { db, workflows } from '@db';
import { getMembership } from '@services/workspace';
import { getUserBySession } from '@services';
import { env } from '@config/env';

const resolveUser = async (cookie: Record<string, { value?: unknown }>) => {
  const sessionId = cookie[env.sessionCookie]?.value as string | undefined;
  return getUserBySession(sessionId);
};

/**
 * Resolves workflow from `:workflowId` and verifies it belongs to the workspace.
 */
export const createWithWorkflow = () =>
  new Elysia().derive({ as: 'scoped' }, async ({ cookie, params }) => {
    const workflowId = params.workflowId;
    const workspaceId = params.workspaceId;
    if (!workflowId || !workspaceId) {
      return { workflow: null };
    }

    const user = await resolveUser(cookie);
    if (!user) {
      return { workflow: null };
    }

    const membership = await getMembership(workspaceId, user.id);
    if (!membership) {
      return { workflow: null };
    }

    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.workspaceId, workspaceId)))
      .limit(1);

    return { workflow: workflow ?? null };
  });

export const createRequireWorkflow = () =>
  createWithWorkflow().onBeforeHandle({ as: 'scoped' }, (ctx) => {
    const { workflow, set } = ctx as typeof ctx & { workflow: unknown };
    if (!workflow) {
      set.status = 404;
      return { error: 'Workflow not found' };
    }
  });

