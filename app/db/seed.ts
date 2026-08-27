import { db, client, users, plans, subscriptions, workspaces } from './index';
import { eq, isNull } from 'drizzle-orm';
import { hashPassword } from '@/services';
import { createWorkspaceForUser } from '@/services/workspace';
import { ensureSubscriptionForWorkspace } from '@/services/billing';

const email = 'admin@example.com';

// 1. Default plans (idempotent upsert by slug).
const defaultPlans = [
  {
    slug: 'trial',
    name: 'Trial',
    description: 'Free trial — limited seats, workflows, and WA messages.',
    priceCents: 0,
    currency: 'MYR',
    interval: 'monthly' as const,
    seatsLimit: 3,
    workflowsLimit: 2,
    waMessagesPerMonth: 50,
    trialDays: 14,
    active: true,
    sortOrder: 0
  },
  {
    slug: 'starter',
    name: 'Starter',
    description: 'For small teams getting started with onboarding workflows.',
    priceCents: 4900,
    currency: 'MYR',
    interval: 'monthly' as const,
    seatsLimit: 5,
    workflowsLimit: 10,
    waMessagesPerMonth: 500,
    trialDays: 14,
    active: true,
    sortOrder: 1
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'For growing teams that need more seats and WA volume.',
    priceCents: 9900,
    currency: 'MYR',
    interval: 'monthly' as const,
    seatsLimit: 20,
    workflowsLimit: 50,
    waMessagesPerMonth: 5000,
    trialDays: 14,
    active: true,
    sortOrder: 2
  }
];

for (const plan of defaultPlans) {
  const [existing] = await db.select({ id: plans.id }).from(plans).where(eq(plans.slug, plan.slug)).limit(1);
  if (existing) {
    await db
      .update(plans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(plans.id, existing.id));
    console.log(`Plan updated: ${plan.slug}`);
  } else {
    await db.insert(plans).values(plan);
    console.log(`Plan created: ${plan.slug}`);
  }
}

const [trialPlan] = await db.select({ id: plans.id }).from(plans).where(eq(plans.slug, 'trial')).limit(1);

// 2. Seed admin user + flag as platform_admin.
const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

if (existing.length === 0) {
  const passwordHash = await hashPassword('password');
  const [user] = await db
    .insert(users)
    .values({ email, name: 'Admin', passwordHash, platformAdmin: true })
    .returning();

  await createWorkspaceForUser(user.id, 'Admin Workspace');
  console.log(`Seeded user: ${email} / password + workspace (platform_admin)`);
} else {
  const user = existing[0];
  if (!user.platformAdmin) {
    await db.update(users).set({ platformAdmin: true }).where(eq(users.id, user.id));
    console.log(`Flagged ${email} as platform_admin`);
  }
  if (!user.activeWorkspaceId) {
    await createWorkspaceForUser(user.id, 'Admin Workspace');
    console.log(`Backfilled workspace for ${email}`);
  } else {
    console.log(`User ${email} already exists, skipping.`);
  }
}

// 3. Backfill trial subscriptions for workspaces that don't have one yet.
if (trialPlan) {
  const orphanWorkspaces = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .leftJoin(subscriptions, eq(subscriptions.workspaceId, workspaces.id))
    .where(isNull(subscriptions.id));

  for (const ws of orphanWorkspaces) {
    await ensureSubscriptionForWorkspace(ws.id, trialPlan.id);
  }
  if (orphanWorkspaces.length > 0) {
    console.log(`Backfilled ${orphanWorkspaces.length} trial subscription(s).`);
  }
}

await client.end();
process.exit(0);
