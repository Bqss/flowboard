import { and, count, eq, sql } from 'drizzle-orm';
import { db, plans, subscriptions, voucherRedemptions, vouchers, workspaces } from '@db';
import { env } from '@config/env';
import type { Plan, Subscription, Voucher, VoucherType } from '@db';

/**
 * Billing service — plans, subscriptions, vouchers, redemptions.
 *
 * One subscription per workspace (enforced by unique index). Status lifecycle:
 *   trial → active → past_due → canceled
 * A workspace past its trial / grace window becomes read-only (see
 * `getSubscriptionGateState`); the quota service enforces hard limits on
 * seats / workflows / WA messages.
 */

const TRIAL_PLAN_SLUG = 'trial';

/**
 * Thrown when a billing gate (read-only / quota) blocks an action. Handlers
 * map this to HTTP 402 Payment Required so the client can surface an upgrade
 * prompt. Distinct from `WorkflowError` so the workflow handler can branch.
 */
export class BillingError extends Error {
  constructor(
    message: string,
    public code: 'read_only' | 'quota_exceeded' = 'read_only',
    public kind?: 'seats' | 'workflows' | 'wa_messages'
  ) {
    super(message);
    this.name = 'BillingError';
  }
}

/** Convert a quota check result into a thrown `BillingError` when it fails. */
export const assertCheck = (check: {
  ok: boolean;
  code?: 'read_only' | 'quota_exceeded';
  message?: string;
  kind?: 'seats' | 'workflows' | 'wa_messages';
}): void => {
  if (check.ok) return;
  throw new BillingError(check.message ?? 'Billing gate blocked this action', check.code ?? 'read_only', check.kind);
};

/* ------------------------------------------------------------------ plans */

export const listActivePlans = async (): Promise<Plan[]> =>
  db.select().from(plans).where(eq(plans.active, true)).orderBy(plans.sortOrder);

export const listAllPlans = async (): Promise<Plan[]> =>
  db.select().from(plans).orderBy(plans.sortOrder);

export const getPlan = async (planId: string): Promise<Plan | null> => {
  const [row] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
  return row ?? null;
};

export const getPlanBySlug = async (slug: string): Promise<Plan | null> => {
  const [row] = await db.select().from(plans).where(eq(plans.slug, slug)).limit(1);
  return row ?? null;
};

export const createPlan = async (input: {
  slug: string;
  name: string;
  description?: string;
  priceCents: number;
  currency?: string;
  interval: 'monthly' | 'yearly';
  seatsLimit: number;
  workflowsLimit: number;
  waMessagesPerMonth: number;
  trialDays?: number;
  sortOrder?: number;
}): Promise<Plan> => {
  const [row] = await db
    .insert(plans)
    .values({
      slug: input.slug,
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      currency: input.currency ?? 'MYR',
      interval: input.interval,
      seatsLimit: input.seatsLimit,
      workflowsLimit: input.workflowsLimit,
      waMessagesPerMonth: input.waMessagesPerMonth,
      trialDays: input.trialDays ?? 0,
      sortOrder: input.sortOrder ?? 0
    })
    .returning();
  return row;
};

export const updatePlan = async (
  planId: string,
  input: Partial<{
    name: string;
    description: string | null;
    priceCents: number;
    currency: string;
    interval: 'monthly' | 'yearly';
    seatsLimit: number;
    workflowsLimit: number;
    waMessagesPerMonth: number;
    trialDays: number;
    active: boolean;
    sortOrder: number;
  }>
): Promise<Plan> => {
  const [row] = await db
    .update(plans)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(plans.id, planId))
    .returning();
  return row;
};

/* --------------------------------------------------------- subscriptions */

/**
 * Ensure a workspace has a subscription. Called on workspace creation (trial)
 * and by the seed backfill. Idempotent: returns the existing row if present.
 */
export const ensureSubscriptionForWorkspace = async (
  workspaceId: string,
  planId: string
): Promise<Subscription> => {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);
  if (existing) return existing;

  const plan = await getPlan(planId);
  const trialDays = plan?.trialDays ?? 14;
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  const [row] = await db
    .insert(subscriptions)
    .values({
      workspaceId,
      planId,
      status: 'trial',
      trialEndsAt
    })
    .returning();
  return row;
};

/** Create a trial subscription for a freshly-created workspace. */
export const createTrialSubscription = async (workspaceId: string): Promise<Subscription> => {
  const trialPlan = await getPlanBySlug(TRIAL_PLAN_SLUG);
  if (!trialPlan) throw new Error('Trial plan not configured');
  return ensureSubscriptionForWorkspace(workspaceId, trialPlan.id);
};

export const getSubscription = async (workspaceId: string): Promise<Subscription | null> => {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);
  return row ?? null;
};

export const getSubscriptionWithPlan = async (
  workspaceId: string
): Promise<{ subscription: Subscription; plan: Plan } | null> => {
  const [row] = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);
  return row ?? null;
};

/** Switch the plan a subscription is on (admin comp or owner upgrade). */
export const changeSubscriptionPlan = async (
  workspaceId: string,
  planId: string
): Promise<Subscription> => {
  const [row] = await db
    .update(subscriptions)
    .set({ planId, updatedAt: new Date() })
    .where(eq(subscriptions.workspaceId, workspaceId))
    .returning();
  return row;
};

/** Mark a subscription active after a successful Chip payment. */
export const activateSubscription = async (
  workspaceId: string,
  input: {
    chipPurchaseId?: string;
    chipRecurringToken?: string | null;
    chipClientEmail?: string;
    periodStart?: Date;
    periodEnd?: Date;
  }
): Promise<Subscription> => {
  const now = new Date();
  const periodEnd =
    input.periodEnd ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30d default
  const [row] = await db
    .update(subscriptions)
    .set({
      status: 'active',
      chipPurchaseId: input.chipPurchaseId,
      chipRecurringToken: input.chipRecurringToken ?? null,
      chipClientEmail: input.chipClientEmail,
      currentPeriodStart: input.periodStart ?? now,
      currentPeriodEnd: periodEnd,
      canceledAt: null,
      graceEndsAt: null,
      updatedAt: now
    })
    .where(eq(subscriptions.workspaceId, workspaceId))
    .returning();
  return row;
};

/** Mark a subscription past_due (e.g. renewal payment failed). */
export const markPastDue = async (workspaceId: string, graceEndsAt: Date): Promise<Subscription> => {
  const [row] = await db
    .update(subscriptions)
    .set({ status: 'past_due', graceEndsAt, updatedAt: new Date() })
    .where(eq(subscriptions.workspaceId, workspaceId))
    .returning();
  return row;
};

/** Cancel a subscription (owner self-serve or admin). */
export const cancelSubscription = async (workspaceId: string): Promise<Subscription> => {
  const now = new Date();
  const graceEndsAt = new Date(now.getTime() + env.billingGraceDays * 24 * 60 * 60 * 1000);
  const [row] = await db
    .update(subscriptions)
    .set({ status: 'canceled', canceledAt: now, graceEndsAt, updatedAt: now })
    .where(eq(subscriptions.workspaceId, workspaceId))
    .returning();
  return row;
};

/** Admin: extend a trial by N days. */
export const extendTrial = async (workspaceId: string, days: number): Promise<Subscription> => {
  const current = await getSubscription(workspaceId);
  const base =
    current?.trialEndsAt && current.trialEndsAt > new Date()
      ? current.trialEndsAt
      : new Date();
  const trialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  const [row] = await db
    .update(subscriptions)
    .set({ status: 'trial', trialEndsAt, canceledAt: null, graceEndsAt: null, updatedAt: new Date() })
    .where(eq(subscriptions.workspaceId, workspaceId))
    .returning();
  return row;
};

/* --------------------------------------------------------------- vouchers */

const VOUCHER_CODE_RE = /^[A-Z0-9][A-Z0-9-]{3,38}[A-Z0-9]$/;

export const normalizeVoucherCode = (raw: string): string =>
  raw.trim().toUpperCase().replace(/\s+/g, '-');

export const isValidVoucherCode = (code: string): boolean => VOUCHER_CODE_RE.test(code);

export const listVouchers = async (): Promise<Voucher[]> =>
  db.select().from(vouchers).orderBy(vouchers.createdAt);

export const getVoucherByCode = async (code: string): Promise<Voucher | null> => {
  const [row] = await db
    .select()
    .from(vouchers)
    .where(eq(vouchers.code, normalizeVoucherCode(code)))
    .limit(1);
  return row ?? null;
};

export const createVoucher = async (input: {
  code: string;
  type: VoucherType;
  value: number;
  durationCycles?: number | null;
  planId?: string | null;
  maxRedemptions?: number | null;
  maxRedemptionsPerWorkspace?: number;
  expiresAt?: Date | null;
  note?: string | null;
  createdById?: string | null;
}): Promise<Voucher> => {
  const code = normalizeVoucherCode(input.code);
  if (!isValidVoucherCode(code)) throw new Error('Invalid voucher code format');
  if (input.type === 'percent' && (input.value < 1 || input.value > 100)) {
    throw new Error('Percent voucher value must be 1–100');
  }
  if (input.value < 0) throw new Error('Voucher value must be non-negative');

  const [row] = await db
    .insert(vouchers)
    .values({
      code,
      type: input.type,
      value: input.value,
      durationCycles: input.durationCycles ?? null,
      planId: input.planId ?? null,
      maxRedemptions: input.maxRedemptions ?? null,
      maxRedemptionsPerWorkspace: input.maxRedemptionsPerWorkspace ?? 1,
      expiresAt: input.expiresAt ?? null,
      note: input.note ?? null,
      createdById: input.createdById ?? null
    })
    .returning();
  return row;
};

export const updateVoucher = async (
  voucherId: string,
  input: Partial<{
    value: number;
    durationCycles: number | null;
    planId: string | null;
    maxRedemptions: number | null;
    maxRedemptionsPerWorkspace: number;
    expiresAt: Date | null;
    active: boolean;
    note: string | null;
  }>
): Promise<Voucher> => {
  const [row] = await db
    .update(vouchers)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(vouchers.id, voucherId))
    .returning();
  return row;
};

export const countVoucherRedemptions = async (voucherId: string): Promise<number> => {
  const [row] = await db
    .select({ n: count() })
    .from(voucherRedemptions)
    .where(eq(voucherRedemptions.voucherId, voucherId));
  return row?.n ?? 0;
};

export const countWorkspaceRedemptions = async (
  voucherId: string,
  workspaceId: string
): Promise<number> => {
  const [row] = await db
    .select({ n: count() })
    .from(voucherRedemptions)
    .where(
      and(eq(voucherRedemptions.voucherId, voucherId), eq(voucherRedemptions.workspaceId, workspaceId))
    );
  return row?.n ?? 0;
};

export type RedeemResult =
  | { ok: true; voucher: Voucher; redemption: { id: string } }
  | { error: string };

/**
 * Validate and redeem a voucher for a workspace.
 *
 * - `trial_days` → extends the trial window (no checkout discount).
 * - `percent` / `fixed` → recorded as a redemption; the checkout flow reads
 *   active redemptions to compute the discount to pass to Chip.
 *
 * Enforces: active, not expired, global cap, per-workspace cap, plan restriction.
 */
export const redeemVoucher = async (
  code: string,
  workspaceId: string,
  redeemedById: string
): Promise<RedeemResult> => {
  const voucher = await getVoucherByCode(code);
  if (!voucher) return { error: 'Voucher not found' };
  if (!voucher.active) return { error: 'Voucher is no longer active' };
  if (voucher.expiresAt && voucher.expiresAt < new Date()) {
    return { error: 'Voucher has expired' };
  }
  if (voucher.maxRedemptions !== null && voucher.redeemedCount >= voucher.maxRedemptions) {
    return { error: 'Voucher redemption limit reached' };
  }

  const sub = await getSubscription(workspaceId);
  if (!sub) return { error: 'Workspace has no subscription' };

  if (voucher.planId && voucher.planId !== sub.planId) {
    return { error: 'Voucher is not valid for your current plan' };
  }

  const workspaceRedemptions = await countWorkspaceRedemptions(voucher.id, workspaceId);
  if (workspaceRedemptions >= voucher.maxRedemptionsPerWorkspace) {
    return { error: 'Voucher already redeemed by this workspace' };
  }

  // trial_days: extend the trial immediately, no redemption row needed for
  // checkout, but we still record one to enforce the per-workspace cap.
  if (voucher.type === 'trial_days') {
    await extendTrial(workspaceId, voucher.value);
  }

  const [redemption] = await db
    .insert(voucherRedemptions)
    .values({
      voucherId: voucher.id,
      workspaceId,
      subscriptionId: sub.id,
      redeemedById
    })
    .returning({ id: voucherRedemptions.id });

  await db
    .update(vouchers)
    .set({ redeemedCount: sql`${vouchers.redeemedCount} + 1`, updatedAt: new Date() })
    .where(eq(vouchers.id, voucher.id));

  return { ok: true, voucher, redemption: { id: redemption.id } };
};

/**
 * Active discount redemptions (percent/fixed) for a workspace, used to compute
 * the Chip checkout total. trial_days redemptions don't reduce checkout price.
 */
export const listActiveDiscountRedemptions = async (workspaceId: string) => {
  return db
    .select({
      redemption: voucherRedemptions,
      voucher: vouchers
    })
    .from(voucherRedemptions)
    .innerJoin(vouchers, eq(vouchers.id, voucherRedemptions.voucherId))
    .where(
      and(
        eq(voucherRedemptions.workspaceId, workspaceId),
        eq(vouchers.active, true),
        sql`${vouchers.type} != 'trial_days'`
      )
    );
};

/**
 * Compute the payable amount (in cents) for a plan given the workspace's
 * active discount redemptions. Applies the best single discount (we do not
 * stack percent + fixed in v1).
 */
export const computeCheckoutTotal = async (
  workspaceId: string,
  plan: Plan
): Promise<{ totalCents: number; discountCents: number; appliedVoucherCode: string | null }> => {
  const redemptions = await listActiveDiscountRedemptions(workspaceId);
  if (redemptions.length === 0) {
    return { totalCents: plan.priceCents, discountCents: 0, appliedVoucherCode: null };
  }

  let bestDiscount = 0;
  let bestCode: string | null = null;
  for (const { voucher } of redemptions) {
    let discount = 0;
    if (voucher.type === 'percent') {
      discount = Math.round((plan.priceCents * voucher.value) / 100);
    } else if (voucher.type === 'fixed') {
      discount = voucher.value;
    }
    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestCode = voucher.code;
    }
  }

  return {
    totalCents: Math.max(0, plan.priceCents - bestDiscount),
    discountCents: bestDiscount,
    appliedVoucherCode: bestCode
  };
};

/* ------------------------------------------------------- gate state (read) */

export type GateState = {
  status: Subscription['status'];
  /** Workspace is past trial / grace and should be treated as read-only. */
  readOnly: boolean;
  /** True while still inside the trial window. */
  inTrial: boolean;
  trialEndsAt: Date | null;
  graceEndsAt: Date | null;
  plan: Plan | null;
};

/**
 * Resolve the effective gate state for a workspace. A workspace is read-only
 * when:
 *   - status is `canceled` and `graceEndsAt` has passed, or
 *   - status is `past_due` and `graceEndsAt` has passed, or
 *   - status is `trial` and `trialEndsAt` has passed.
 *
 * Read-only means: no new cards, no new workflows, no new members, no WA sends.
 * Existing data stays visible (per PLAN.md §6.10).
 */
export const getGateState = async (workspaceId: string): Promise<GateState> => {
  const ctx = await getSubscriptionWithPlan(workspaceId);
  if (!ctx) {
    return {
      status: 'trial',
      readOnly: false,
      inTrial: true,
      trialEndsAt: null,
      graceEndsAt: null,
      plan: null
    };
  }

  const { subscription, plan } = ctx;
  const now = new Date();
  const inTrial = subscription.status === 'trial' && (!subscription.trialEndsAt || subscription.trialEndsAt > now);
  const trialExpired = subscription.status === 'trial' && subscription.trialEndsAt ? subscription.trialEndsAt <= now : false;
  const graceExpired =
    (subscription.status === 'canceled' || subscription.status === 'past_due') &&
    subscription.graceEndsAt
      ? subscription.graceEndsAt <= now
      : false;

  return {
    status: subscription.status,
    readOnly: trialExpired || graceExpired,
    inTrial,
    trialEndsAt: subscription.trialEndsAt,
    graceEndsAt: subscription.graceEndsAt,
    plan
  };
};

/* ----------------------------------------------------------- admin listing */

export const listAllSubscriptionsWithDetails = async () => {
  return db
    .select({
      subscription: subscriptions,
      plan: plans,
      workspace: workspaces
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(workspaces, eq(workspaces.id, subscriptions.workspaceId))
    .orderBy(subscriptions.createdAt);
};

/** Count subscriptions by status — for the admin overview. */
export const countSubscriptionsByStatus = async () => {
  const rows = await db
    .select({ status: subscriptions.status, n: count() })
    .from(subscriptions)
    .groupBy(subscriptions.status);
  const out: Record<string, number> = { trial: 0, active: 0, past_due: 0, canceled: 0 };
  for (const row of rows) out[row.status] = row.n;
  return out;
};
