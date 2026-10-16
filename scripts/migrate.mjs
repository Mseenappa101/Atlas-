// Runs SQL migrations in supabase/migrations against the live database, in order, once each.
//   node scripts/migrate.mjs            apply pending migrations
//   node scripts/migrate.mjs --status   list applied / pending
// Connection: SUPABASE_DB_URL, or SUPABASE_DB_PASSWORD combined with the session-pooler address below.
import dotenv from 'dotenv';
import pg from 'pg';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(ROOT, '.env.local'), quiet: true });

const POOLER = { user: 'postgres.cshcvlohguasuojlolws', host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres' };

function connection() {
  if (process.env.SUPABASE_DB_URL && !process.env.SUPABASE_DB_URL.includes('[YOUR-PASSWORD]')) {
    return { connectionString: process.env.SUPABASE_DB_URL };
  }
  if (process.env.SUPABASE_DB_PASSWORD) return { ...POOLER, password: process.env.SUPABASE_DB_PASSWORD };
  console.error('Add SUPABASE_DB_PASSWORD (or a full SUPABASE_DB_URL) to .env.local.');
  process.exit(1);
}

const dir = join(ROOT, 'supabase', 'migrations');
const files = readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();

const client = new pg.Client({ ...connection(), ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS public._atlas_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  await client.query('ALTER TABLE public._atlas_migrations ENABLE ROW LEVEL SECURITY');
  const applied = new Set((await client.query('SELECT name FROM public._atlas_migrations')).rows.map((r) => r.name));

  // 001 and 002 were applied by hand before this runner existed.
  for (const f of ['001_initial_schema.sql', '002_listings_and_scraper.sql']) {
    if (!applied.has(f) && files.includes(f)) {
      await client.query('INSERT INTO public._atlas_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [f]);
      applied.add(f);
    }
  }

  const pending = files.filter((f) => !applied.has(f));
  if (process.argv.includes('--status')) {
    for (const f of files) console.log(`${applied.has(f) ? 'applied' : 'PENDING'}  ${f}`);
  } else if (!pending.length) {
    console.log('Nothing to apply.');
  } else {
    for (const f of pending) {
      const sql = readFileSync(join(dir, f), 'utf8');
      process.stdout.write(`applying ${f} … `);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO public._atlas_migrations (name) VALUES ($1)', [f]);
        await client.query('COMMIT');
        console.log('done');
      } catch (e) {
        await client.query('ROLLBACK');
        console.log('FAILED, rolled back');
        throw e;
      }
    }
  }
} finally {
  await client.end();
}
