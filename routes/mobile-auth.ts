import { Elysia } from 'elysia';
import * as mobileAuth from '@handlers/mobile-auth';
import { createWithClientIp, createWithUser } from '@middlewares';
import {
  AvatarSchema,
  ChangePasswordSchema,
  MobileGoogleSchema,
  MobileLoginSchema,
  MobileRefreshSchema,
  MobileRegisterSchema,
  SwitchAccountSchema,
  UpdateUserSchema
} from '@validators';
export const createMobileAuthRoutes = () =>
  new Elysia({ prefix: '/auth' })
    .use(createWithUser())
    .use(createWithClientIp())
    .post('/register', mobileAuth.register, { body: MobileRegisterSchema })
    .post('/login', mobileAuth.login, { body: MobileLoginSchema })
    .post('/google', mobileAuth.google, { body: MobileGoogleSchema })
    .post('/refresh', mobileAuth.refresh, { body: MobileRefreshSchema })
    .post('/logout', mobileAuth.logout)
    .post('/logout-all', mobileAuth.logoutAll)
    .get('/me', mobileAuth.me)
    .get('/accounts', mobileAuth.listAccounts)
    .post('/switch-account', mobileAuth.switchAccount, { body: SwitchAccountSchema })
    .patch('/me', mobileAuth.updateProfile, { body: UpdateUserSchema })
    .post('/change-password', mobileAuth.changePassword, { body: ChangePasswordSchema })
    .post('/avatar', mobileAuth.uploadAvatar, { body: AvatarSchema });

export const mobileAuthRoutes = createMobileAuthRoutes();
