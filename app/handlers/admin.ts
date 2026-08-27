import { count, eq } from 'drizzle-orm';
import { db, users, workspaces, workspaceMembers } from '@db';
import { type Ctx } from '@core';
import {
  changeSubscriptionPlan,
  countSubscriptionsByStatus,
  createPlan,
  createVoucher,
  extendTrial,
  listAllPlans,
  listAllSubscriptionsWithDetails,
  listVouchers,
  markPastDue,
  cancelSubscription,
  activateSubscription,
  updatePlan,
  updateVoucher
} from '@services/billing';

/**
 * Platform admin handlers. Mounted under `/admin/*` behind
 * `requirePlatformAdmin`. These are operator-only: manage plans, vouchers,
 * and any workspace's subscription (comp / extend trial / set status).
 *
 * Admin ≠ workspace owner. Admins never touch the Kanban; they manage the
 * SaaS billing layer across all workspaces.
 */

type PlanIdParams = { planId: string };
type VoucherIdParams = { voucherId: string };
type WorkspaceIdParams = { workspaceId: string };

const handleDbError = (error: unknown, set: Ctx['set']) => {
  if (error instanceof Error && error.message.includes('Invalid voucher')) {
    set.status = 400;
    return { error: error.message };
  }
  if (error instanceof Error && error.message.includes('Percent voucher')) {
    set.status = 400;
    return { error: error.message };
  }
  throw error;
};

/* ----------------------------------------------------------------- overview */

export async function overview() {
  const [workspaceCount] = await db.select({ n: count() }).from(workspaces);
  const [userCount] = await db.select({ n: count() }).from(users);
  const byStatus = await countSubscriptionsByStatus();
  return {
    workspaces: workspaceCount?.n ?? 0,
    users: userCount?.n ?? 0,
    subscriptionsByStatus: byStatus
  };
}

/* --------------------------------------------------------------- workspaces */

export async function listWorkspaces() {
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      createdAt: workspaces.createdAt
    })
    .from(workspaces)
    .orderBy(workspaces.createdAt);
  return { workspaces: rows };
}

export async function listSubscriptions() {
  const rows = await listAllSubscriptionsWithDetails();
  return {
    subscriptions: rows.map((row) => ({
      id: row.subscription.id,
      status: row.subscription.status,
      trialEndsAt: row.subscription.trialEndsAt,
      currentPeriodEnd: row.subscription.currentPeriodEnd,
      canceledAt: row.subscription.canceledAt,
      graceEndsAt: row.subscription.graceEndsAt,
      plan: {
        id: row.plan.id,
        slug: row.plan.slug,
        name: row.plan.name,
        priceCents: row.plan.priceCents,
        currency: row.plan.currency,
        interval: row.plan.interval
      },
      workspace: {
        id: row.workspace.id,
        name: row.workspace.name,
        slug: row.workspace.slug
      }
    }))
  };
}

/* -------------------------------------------------------------------- users */

export async function listUsers() {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      platformAdmin: users.platformAdmin,
      activeWorkspaceId: users.activeWorkspaceId,
      createdAt: users.createdAt
    })
    .from(users)
    .orderBy(users.createdAt);
  return { users: rows };
}

/* -------------------------------------------------------------------- plans */

export async function listPlans() {
  const rows = await listAllPlans();
  return { plans: rows };
}

export async function createPlanHandler({ body, set }: Ctx<CreatePlanBody>) {
  try {
    const plan = await createPlan({
      ...body,
      description: body.description ?? undefined
    });
    return { plan };
  } catch (error) {
    return handleDbError(error, set);
  }
}

type CreatePlanBody = {
  slug: string;
  name: string;
  description?: string | null;
  priceCents: number;
  currency?: string;
  interval: 'monthly' | 'yearly';
  seatsLimit: number;
  workflowsLimit: number;
  waMessagesPerMonth: number;
  trialDays?: number;
  sortOrder?: number;
};

export async function updatePlanHandler({
  params,
  body,
  set
}: Ctx<UpdatePlanBody, PlanIdParams>) {
  try {
    const plan = await updatePlan(params.planId, body);
    return { plan };
  } catch (error) {
    return handleDbError(error, set);
  }
}

type UpdatePlanBody = Partial<CreatePlanBody> & { active?: boolean };

/* ------------------------------------------------------------------ vouchers */

export async function listVouchersHandler() {
  const rows = await listVouchers();
  return { vouchers: rows };
}

export async function createVoucherHandler({ user, body, set }: Ctx<CreateVoucherBody>) {
  try {
    const voucher = await createVoucher({
      code: body.code,
      type: body.type,
      value: body.value,
      durationCycles: body.durationCycles ?? null,
      planId: body.planId ?? null,
      maxRedemptions: body.maxRedemptions ?? null,
      maxRedemptionsPerWorkspace: body.maxRedemptionsPerWorkspace,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      note: body.note ?? null,
      createdById: user?.id ?? null
    });
    return { voucher };
  } catch (error) {
    return handleDbError(error, set);
  }
}

type CreateVoucherBody = {
  code: string;
  type: 'percent' | 'fixed' | 'trial_days';
  value: number;
  durationCycles?: number | null;
  planId?: string | null;
  maxRedemptions?: number | null;
  maxRedemptionsPerWorkspace?: number;
  expiresAt?: string | null;
  note?: string | null;
};

export async function updateVoucherHandler({
  params,
  body,
  set
}: Ctx<UpdateVoucherBody, VoucherIdParams>) {
  try {
    const expiresAt =
      body.expiresAt === null
        ? null
        : body.expiresAt
          ? new Date(body.expiresAt)
          : undefined;
    const voucher = await updateVoucher(params.voucherId, {
      ...body,
      expiresAt: expiresAt as Date | null | undefined
    });
    return { voucher };
  } catch (error) {
    return handleDbError(error, set);
  }
}

type UpdateVoucherBody = {
  value?: number;
  durationCycles?: number | null;
  planId?: string | null;
  maxRedemptions?: number | null;
  maxRedemptionsPerWorkspace?: number;
  expiresAt?: string | null;
  active?: boolean;
  note?: string | null;
};

/* ----------------------------------------------- subscription comp (admin) */

export async function changePlan({ params, body, set }: Ctx<ChangePlanBody, WorkspaceIdParams>) {
  const sub = await changeSubscriptionPlan(params.workspaceId, body.planId);
  return { subscription: { id: sub.id, planId: sub.planId, status: sub.status } };
}

type ChangePlanBody = { planId: string };

export async function extendTrialHandler({
  params,
  body
}: Ctx<ExtendTrialBody, WorkspaceIdParams>) {
  const sub = await extendTrial(params.workspaceId, body.days);
  return {
    subscription: {
      id: sub.id,
      status: sub.status,
      trialEndsAt: sub.trialEndsAt
    }
  };
}

type ExtendTrialBody = { days: number };

export async function setStatus({ params, body, set }: Ctx<SetStatusBody, WorkspaceIdParams>) {
  const now = new Date();
  const grace = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (body.status === 'active') {
    const sub = await activateSubscription(params.workspaceId, {
      periodStart: now,
      periodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    });
    return { subscription: { id: sub.id, status: sub.status } };
  }
  if (body.status === 'past_due') {
    const sub = await markPastDue(params.workspaceId, grace);
    return { subscription: { id: sub.id, status: sub.status, graceEndsAt: sub.graceEndsAt } };
  }
  if (body.status === 'canceled') {
    const sub = await cancelSubscription(params.workspaceId);
    return {
      subscription: { id: sub.id, status: sub.status, graceEndsAt: sub.graceEndsAt }
    };
  }
  // trial — extend with 0 days just to flip status back
  const sub = await extendTrial(params.workspaceId, 0);
  return { subscription: { id: sub.id, status: sub.status, trialEndsAt: sub.trialEndsAt } };
}

type SetStatusBody = { status: 'trial' | 'active' | 'past_due' | 'canceled' };

/* ------------------------------------------------------- workspace members */

export async function listWorkspaceMembers({ params }: Ctx<unknown, WorkspaceIdParams>) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, params.workspaceId));
  return { members: rows };
}
