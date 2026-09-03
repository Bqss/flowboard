import { type Ctx } from '@core';
import { db, onboardingState } from '@db';
import { eq } from 'drizzle-orm';

type UpdateOnboardingBody = {
  completedChallenges?: string[];
  seenTours?: string[];
  // Incremental updates — append a single challenge or tour
  completeChallenge?: string;
  markTourSeen?: string;
};

/**
 * Get or create the onboarding state for the current user.
 * Auto-creates a row on first access so every user always has state.
 */
async function getOrCreateState(userId: string) {
  const [existing] = await db
    .select()
    .from(onboardingState)
    .where(eq(onboardingState.userId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(onboardingState)
    .values({ userId })
    .returning();

  return created;
}

export const getOnboardingState = async (ctx: Ctx) => {
  if (!ctx.user) {
    ctx.set.status = 401;
    return { error: 'Unauthorized' };
  }

  const state = await getOrCreateState(ctx.user.id);
  return {
    state: {
      completedChallenges: state.completedChallenges as string[],
      seenTours: state.seenTours as string[]
    }
  };
};

export const updateOnboardingState = async (ctx: Ctx) => {
  if (!ctx.user) {
    ctx.set.status = 401;
    return { error: 'Unauthorized' };
  }

  const body = ctx.body as UpdateOnboardingBody;
  const state = await getOrCreateState(ctx.user.id);

  const completed = new Set(state.completedChallenges as string[]);
  const seen = new Set(state.seenTours as string[]);

  if (body.completeChallenge) completed.add(body.completeChallenge);
  if (body.markTourSeen) seen.add(body.markTourSeen);
  if (body.completedChallenges) for (const c of body.completedChallenges) completed.add(c);
  if (body.seenTours) for (const t of body.seenTours) seen.add(t);

  const [updated] = await db
    .update(onboardingState)
    .set({
      completedChallenges: [...completed],
      seenTours: [...seen],
      updatedAt: new Date()
    })
    .where(eq(onboardingState.userId, ctx.user.id))
    .returning();

  return {
    state: {
      completedChallenges: updated.completedChallenges as string[],
      seenTours: updated.seenTours as string[]
    }
  };
};

export const resetOnboardingState = async (ctx: Ctx) => {
  if (!ctx.user) {
    ctx.set.status = 401;
    return { error: 'Unauthorized' };
  }

  const [updated] = await db
    .update(onboardingState)
    .set({
      completedChallenges: [],
      seenTours: [],
      updatedAt: new Date()
    })
    .where(eq(onboardingState.userId, ctx.user.id))
    .returning();

  if (!updated) {
    // No row yet — create fresh
    const [created] = await db
      .insert(onboardingState)
      .values({ userId: ctx.user.id })
      .returning();
    return {
      state: {
        completedChallenges: created.completedChallenges as string[],
        seenTours: created.seenTours as string[]
      }
    };
  }

  return {
    state: {
      completedChallenges: updated.completedChallenges as string[],
      seenTours: updated.seenTours as string[]
    }
  };
};
