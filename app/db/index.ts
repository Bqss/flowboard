import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env';
import { getDevGlobal, isDevRuntime, setDevGlobal } from '../core/dev-runtime';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;

/**
 * Vite HMR re-evaluates server modules on every save. Without a process-level
 * singleton, each reload opens a new postgres-js pool while the old ones stay
 * open until the dev server is restarted — eventually exhausting connections
 * and making every API call fail (pages then show stale error states).
 */
const client = getDevGlobal('__flowboard_db_client') ?? postgres(env.databaseUrl, { max: 10 });
const db = getDevGlobal('__flowboard_db') ?? drizzle(client, { schema });

if (isDevRuntime()) {
  setDevGlobal('__flowboard_db_client', client);
  setDevGlobal('__flowboard_db', db);
}

export { client, db };
export * from './schema';
