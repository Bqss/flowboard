import { Elysia } from 'elysia';
import * as users from '@handlers/users';
import { createRequireAuth } from '@middlewares';
import { UserIdParam, UpdateUserSchema } from '@validators';

/**
 * Users route table. Every route sits behind `requireAuth` (401 when there is
 * no valid session). Params/body are validated before the handler runs.
 */
export const createUsersRoutes = () =>
  new Elysia({ prefix: '/users' })
    .use(createRequireAuth())
    .get('/', users.list)
    .get('/:id', users.show, { params: UserIdParam })
    .patch('/:id', users.update, { params: UserIdParam, body: UpdateUserSchema })
    .delete('/:id', users.remove, { params: UserIdParam });
