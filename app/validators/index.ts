import { t } from 'elysia';

/**
 * Request schemas, one place for all input validation. Route tables attach
 * these; Elysia validates before a handler runs, so handlers can trust `body`.
 */

export const RegisterSchema = t.Object({
  email: t.String({ format: 'email' }),
  name: t.String({ minLength: 1 }),
  password: t.String({ minLength: 8 })
});

export const LoginSchema = t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 1 })
});

export const ChangePasswordSchema = t.Object({
  currentPassword: t.String({ minLength: 1 }),
  newPassword: t.String({ minLength: 8 })
});

export const AvatarSchema = t.Object({
  avatar: t.File()
});

export const UserIdParam = t.Object({
  id: t.String({ format: 'uuid' })
});

export const UpdateUserSchema = t.Object({
  name: t.String({ minLength: 1 })
});
