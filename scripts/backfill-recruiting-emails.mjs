// Fills firms.recruiting_email from careers pages the scraper already stored. Only addresses that look
// like a recruiting inbox (by name, or written next to words about applying) are used.
//   node scripts/backfill-recruiting-emails.mjs [--dry-run]
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pickRecruitingEmail } from '../worker/recruiting-email.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local'), quiet: true });
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dry = process.argv.includes('--dry-run');

async function all(table, cols, build = (x) => x) {
  const out = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await build(db.from(table).select(cols)).range(i, i + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

const firms = await all('firms', 'id, name, website, recruiting_email');
const sources = await all('sources', 'id, firm_id');
const jobs = await all('extraction_jobs', 'source_id, page_text, created_at', (b) => b.not('page_text', 'is', null).order('created_at', { ascending: false }));

const latest = new Map();
for (const j of jobs) if (!latest.has(j.source_id)) latest.set(j.source_id, j.page_text);

let found = 0;
for (const f of firms.filter((x) => !x.recruiting_email)) {
  const pages = sources.filter((s) => s.firm_id === f.id).map((s) => latest.get(s.id)).filter(Boolean);
  const email = pages.map((p) => pickRecruitingEmail(p, f.website)).find(Boolean);
  if (!email) continue;
  found++;
  console.log(`${f.name.padEnd(44)} ${email}`);
  if (!dry) {
    const { error } = await db.from('firms').update({ recruiting_email: email }).eq('id', f.id);
    if (error) console.log(`  failed: ${error.message}`);
  }
}
console.log(`\n${found} firm(s) ${dry ? 'would get' : 'now have'} a recruiting email.`);
