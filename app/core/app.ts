import { Elysia } from 'elysia';
import { formatValidationError } from './validation';

/**
 * Base Elysia factory. Every API app starts here so error handling and the
 * `/api` prefix are defined in exactly one place. Route tables (`routes/*.ts`)
 * are mounted onto the instance this returns.
 */
export const createApiApp = () =>
  new Elysia({ prefix: '/api' }).onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422;
      return formatValidationError(error.all);
    }
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { error: 'Not found' };
    }
    console.error('[api] Unhandled error:', error);
    set.status = 500;
    return { error: 'Internal server error' };
  });
