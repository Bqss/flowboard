import { db, client, users } from './index';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/services';
import { createWorkspaceForUser } from '@/services/workspace';

const email = 'admin@example.com';

const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

if (existing.length === 0) {
  const passwordHash = await hashPassword('password');
  const [user] = await db
    .insert(users)
    .values({ email, name: 'Admin', passwordHash })
    .returning();

  await createWorkspaceForUser(user.id, 'Admin Workspace');
  console.log(`Seeded user: ${email} / password + workspace`);
} else {
  const user = existing[0];
  if (!user.activeWorkspaceId) {
    await createWorkspaceForUser(user.id, 'Admin Workspace');
    console.log(`Backfilled workspace for ${email}`);
  } else {
    console.log(`User ${email} already exists, skipping.`);
  }
}

await client.end();
process.exit(0);
