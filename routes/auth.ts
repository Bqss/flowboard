import { Elysia } from 'elysia';
import * as auth from '@handlers/auth';
import * as oauth from '@handlers/oauth';
import { createWithUser, createWithClientIp } from '@middlewares';
import { RegisterSchema, LoginSchema, ChangePasswordSchema, AvatarSchema } from '@validators';

/**
 * Auth route table: wires the auth handlers to paths, attaches request
 * validators, and mounts `withUser` so handlers can read the current session.
 * `withClientIp` supplies the IP the login throttle keys on.
 */
export const createAuthRoutes = () =>
  new Elysia({ prefix: '/auth' })
    .use(createWithUser())
    .use(createWithClientIp())
    .post('/register', auth.register, { body: RegisterSchema })
    .post('/login', auth.login, { body: LoginSchema })
    .post('/logout', auth.logout)
    .post('/change-password', auth.changePassword, { body: ChangePasswordSchema })
    .post('/avatar', auth.uploadAvatar, { body: AvatarSchema })
    .get('/me', auth.me)
    .get('/google', oauth.googleRedirect)
    .get('/google/callback', oauth.googleCallback);
