import { neon } from '@neondatabase/serverless';
import { loadProjectEnv } from './lib/load-env.mjs';

loadProjectEnv();

const BASELINE_NAME = 'pre-visitor-stats';

function parseTotal(argv) {
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--total') return argv[index + 1];
    if (argument.startsWith('--total=')) return argument.slice('--total='.length);
  }
  return undefined;
}

const rawTotal = parseTotal(process.argv);
const total = Number(rawTotal);
if (!rawTotal || !Number.isSafeInteger(total) || total < 0) {
  console.error(
    '[visitor-stats] usage: pnpm db:seed:visitor-stats -- --total <non-negative integer>',
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('[visitor-stats] DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(databaseUrl);
const rows = await sql`
  WITH baseline AS (
    INSERT INTO arsvine_visitor_baselines (baseline_name, added_visitors)
    VALUES (${BASELINE_NAME}, ${total})
    ON CONFLICT (baseline_name) DO NOTHING
    RETURNING added_visitors
  )
  UPDATE arsvine_visitor_totals
  SET total_visitors = total_visitors + COALESCE((SELECT added_visitors FROM baseline), 0),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = TRUE
  RETURNING
    total_visitors,
    (SELECT COUNT(*) FROM baseline)::integer AS applied
`;

const row = rows[0];
if (!row) {
  console.error('[visitor-stats] totals row is missing; run pnpm db:migrate first');
  process.exit(1);
}

if (Number(row.applied) === 1) {
  console.log(`[visitor-stats] applied historical baseline: ${total}`);
} else {
  console.log('[visitor-stats] historical baseline was already applied; no change made');
}

console.log(`[visitor-stats] total visitors: ${row.total_visitors}`);
