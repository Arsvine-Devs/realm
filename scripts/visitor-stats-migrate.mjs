import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { loadProjectEnv, readEnv } from './lib/env-provider.mjs';

loadProjectEnv();

const databaseUrl = readEnv('DATABASE_URL');
if (!databaseUrl) {
  console.error('[visitor-stats] DATABASE_URL is required');
  process.exit(1);
}

const migrationPath = path.join(process.cwd(), 'db', 'migrations', '0001_visitor_stats.sql');
const migration = await readFile(migrationPath, 'utf8');
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(migration);
  await client.query('COMMIT');
  console.log('[visitor-stats] migration applied');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
