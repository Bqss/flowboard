import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../config/env';

const client = postgres(env.databaseUrl, { max: 1 });
const db = drizzle(client);

console.log('Running migrations...');
await migrate(db, { migrationsFolder: './drizzle' });

// PostgreSQL cannot use enum values added earlier in the same Drizzle transaction.
// This runs after migrate() commits, so the new taskboard/workflow values are safe.
await db.execute(sql`ALTER TABLE "chat_conversations" DROP CONSTRAINT IF EXISTS "chat_conversations_kind_check"`);
await db.execute(sql`
  UPDATE "chat_conversations"
  SET "kind" = 'taskboard'
  WHERE "context_type" = 'taskboard'
    AND "kind" <> 'taskboard'
`);
await db.execute(sql`
  UPDATE "chat_conversations"
  SET "kind" = 'workflow'
  WHERE "context_type" = 'workflow'
    AND "kind" <> 'workflow'
`);
await db.execute(sql`
  ALTER TABLE "chat_conversations"
  ADD CONSTRAINT "chat_conversations_kind_check"
  CHECK (
    ("kind" = 'direct' AND "direct_key" IS NOT NULL AND "name" IS NULL)
    OR ("kind" IN ('group', 'taskboard', 'workflow') AND "name" IS NOT NULL AND "direct_key" IS NULL)
  )
`);

console.log('Migrations complete.');

await client.end();
process.exit(0);
