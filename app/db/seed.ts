import { db, client, users } from './index';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/services';

const email = 'admin@example.com';

const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

if (existing.length === 0) {
  const passwordHash = await hashPassword('password');
  await db.insert(users).values({ email, name: 'Admin', passwordHash });
  console.log(`Seeded user: ${email} / password`);
} else {
  console.log(`User ${email} already exists, skipping.`);
}

await client.end();
process.exit(0);
