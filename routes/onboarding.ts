import { Elysia } from 'elysia';
import * as onboardingHandlers from '@handlers/onboarding';
import { createRequireAuth } from '@middlewares';
import { UpdateOnboardingSchema } from '@validators';

export const createOnboardingRoutes = () =>
  new Elysia({ prefix: '/onboarding' })
    .use(createRequireAuth())
    .get('/state', onboardingHandlers.getOnboardingState)
    .patch('/state', onboardingHandlers.updateOnboardingState, {
      body: UpdateOnboardingSchema
    })
    .post('/reset', onboardingHandlers.resetOnboardingState);
