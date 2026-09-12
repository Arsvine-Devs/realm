import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { loadProjectEnv } from './lib/load-env.mjs';

loadProjectEnv();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('[visitor-stats] DATABASE_URL is required');
  process.exit(1);
}

const migrationPath = path.join(process.cwd(), 'db', 'migrations', '0001_visitor_stats.sql');
const migration = await readFile(migrationPath, 'utf8');
const statements = migration
  .split(/;\r?\n/)
  .map((statement) => statement.trim())
  .filter(Boolean);

const sql = neon(databaseUrl);
await sql.transaction(statements.map((statement) => sql.query(statement)));
console.log('[visitor-stats] migration applied');
