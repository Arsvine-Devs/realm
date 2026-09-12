import { readFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

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
