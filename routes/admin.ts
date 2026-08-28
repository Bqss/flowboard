import { Elysia } from 'elysia';
import * as admin from '@handlers/admin';
import { createRequirePlatformAdmin } from '@middlewares';
import {
  PlanIdParam,
  VoucherIdParam,
  AdminWorkspaceIdParam,
  CreatePlanSchema,
  UpdatePlanSchema,
  CreateVoucherSchema,
  UpdateVoucherSchema,
  AdminChangePlanSchema,
  AdminExtendTrialSchema,
  AdminSetStatusSchema
} from '@validators';

/**
 * Platform admin routes — mounted under `/admin`. All routes require
 * `platform_admin` (a flag on `users`, distinct from workspace `owner`).
 */
export const createAdminRoutes = () =>
  new Elysia({ prefix: '/admin' })
    .use(createRequirePlatformAdmin())
    .get('/overview', admin.overview)
    .get('/workspaces', admin.listWorkspaces)
    .get('/users', admin.listUsers)
    .get('/subscriptions', admin.listSubscriptions)
    .get('/plans', admin.listPlans)
    .post('/plans', admin.createPlanHandler, { body: CreatePlanSchema })
    .patch('/plans/:planId', admin.updatePlanHandler, {
      params: PlanIdParam,
      body: UpdatePlanSchema
    })
    .get('/vouchers', admin.listVouchersHandler)
    .post('/vouchers', admin.createVoucherHandler, { body: CreateVoucherSchema })
    .patch('/vouchers/:voucherId', admin.updateVoucherHandler, {
      params: VoucherIdParam,
      body: UpdateVoucherSchema
    })
    .group('/workspaces/:workspaceId', (app) =>
      app
        .get('/members', admin.listWorkspaceMembers, { params: AdminWorkspaceIdParam })
        .post('/change-plan', admin.changePlan, {
          params: AdminWorkspaceIdParam,
          body: AdminChangePlanSchema
        })
        .post('/extend-trial', admin.extendTrialHandler, {
          params: AdminWorkspaceIdParam,
          body: AdminExtendTrialSchema
        })
        .post('/status', admin.setStatus, {
          params: AdminWorkspaceIdParam,
          body: AdminSetStatusSchema
        })
    );
