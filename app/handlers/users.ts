import { eq } from 'drizzle-orm';
import { db, users } from '../db';
import { toPublicUser, type Ctx } from '../core';

/** User handlers. Routing + validation live in `routes/users.ts`. */

type UpdateBody = { name: string; phone?: string };
type IdParams = { id: string };

export async function list() {
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users);
  return { users: rows };
}

export async function show({ params, set }: Ctx<unknown, IdParams>) {
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, params.id))
    .limit(1);

  if (!user) {
    set.status = 404;
    return { error: 'User not found' };
  }
  return { user };
}

export async function update({ params, body, set }: Ctx<UpdateBody, IdParams>) {
  const [user] = await db
    .update(users)
    .set({ name: body.name, phone: body.phone, updatedAt: new Date() })
    .where(eq(users.id, params.id))
    .returning();

  if (!user) {
    set.status = 404;
    return { error: 'User not found' };
  }
  return { user: toPublicUser(user) };
}

export async function remove({ params, set }: Ctx<unknown, IdParams>) {
  const deleted = await db
    .delete(users)
    .where(eq(users.id, params.id))
    .returning({ id: users.id });

  if (deleted.length === 0) {
    set.status = 404;
    return { error: 'User not found' };
  }
  return { ok: true };
}
