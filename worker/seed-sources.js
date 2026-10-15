// Seeds `sources` from firms.careers_url, importing firms from scripts/output/firms.json that the DB lacks.
// Idempotent. node worker/seed-sources.js [--dry-run]
import { readFileSync } from 'fs';
import { join } from 'path';
import { ROOT, config } from './config.js';
import { getDb, q, selectAll } from './db.js';
import { USAJOBS_QUERIES, usajobsUrl } from './ats/usajobs.js';

const dry = process.argv.includes('--dry-run');
const key = (f) => `${f.name.trim().toLowerCase()}|${f.city.trim().toLowerCase()}`;
const STAGGER_MIN = 120; // spread first checks over 2h so the first cycles aren't a thundering herd

function firmRow(f) {
  return {
    name: f.name.trim(),
    city: f.city.trim(),
    state: f.state,
    careers_url: f.careers_url || null,
    size: f.firm_size || null,
    practice_areas: f.practice_areas || [],
    has_1l_program: f.has_1l_program === true,
    has_fellowship: f.has_fellowship === true,
    fellowship_name: f.fellowship_name || null,
    app_window_start: /^\d{4}-\d{2}-\d{2}$/.test(f.app_window_start || '') ? f.app_window_start : null,
    app_window_end: /^\d{4}-\d{2}-\d{2}$/.test(f.app_window_end || '') ? f.app_window_end : null,
    apply_url: f.apply_url || null,
    notes: f.notes || null,
    last_scraped_at: f.scraped_at || null,
    hires_1l: f.has_1l_program === true ? 'yes' : 'unknown',
    source: f.careers_url ? 'Firm careers page' : null,
  };
}

async function main() {
  const db = getDb();
  const firms = await selectAll((a, b) => db.from('firms').select('id, name, city, state, careers_url, created_at')
    .order('created_at', { ascending: true }).order('id').range(a, b));
  const have = new Set(firms.map(key));

  // firms.json has repeat scrapes of the same firm; keep the latest per name+city.
  const json = JSON.parse(readFileSync(join(ROOT, 'scripts/output/firms.json'), 'utf8'));
  const latest = new Map();
  for (const f of json) {
    if (!f.name || !f.city || !f.state) continue;
    const prev = latest.get(key(f));
    if (!prev || (f.scraped_at || '') > (prev.scraped_at || '')) latest.set(key(f), f);
  }
  const toImport = [...latest.values()].filter((f) => !have.has(key(f)));
  console.log(`firms: ${firms.length} in DB, ${json.length} rows in firms.json (${latest.size} distinct), ${toImport.length} to import`);

  if (toImport.length && !dry) {
    // Already filtered by lower(name)+lower(city); that unique index is an expression, which on_conflict can't target.
    const inserted = await q(db.from('firms').insert(toImport.map(firmRow))
      .select('id, name, city, state, careers_url, created_at'));
    firms.push(...inserted);
    console.log(`  imported ${inserted.length} firm(s)`);
  }

  let existing = [];
  try {
    existing = await selectAll((a, b) => db.from('sources').select('url').range(a, b));
  } catch (e) {
    if (!dry) throw e;
    console.log(`  (sources table not readable: ${e.message} — counting as empty)`);
  }
  const haveUrl = new Set(existing.map((s) => s.url));

  // One source per distinct careers URL; firm_id = first firm row with that URL.
  const byUrl = new Map();
  for (const f of firms) {
    const url = f.careers_url?.trim();
    if (url && !byUrl.has(url)) byUrl.set(url, f);
  }
  const now = Date.now();
  const rows = [...byUrl.entries()].filter(([url]) => !haveUrl.has(url)).map(([url, f]) => ({
    firm_id: f.id ?? null, kind: 'page', url, employer_name: f.name, city: f.city, state: f.state,
    next_check_at: new Date(now + Math.random() * STAGGER_MIN * 60_000).toISOString(),
  }));

  if (config.usajobsKey) {
    for (const kw of USAJOBS_QUERIES) {
      const url = usajobsUrl(kw);
      if (!haveUrl.has(url)) rows.push({ firm_id: null, kind: 'usajobs', url, employer_name: 'USAJOBS', check_interval_minutes: 720 });
    }
  } else {
    console.log('  USAJOBS_API_KEY not set — skipping USAJOBS sources');
  }

  const shared = [...byUrl.keys()].filter((u) => firms.filter((f) => f.careers_url?.trim() === u).length > 1).length;
  console.log(`sources: ${existing.length} existing, ${byUrl.size} distinct careers URLs (${shared} shared by multiple firm rows), ${rows.length} to create`);
  if (dry) { console.log('dry run — nothing written'); return; }

  let created = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const res = await q(db.from('sources').upsert(rows.slice(i, i + 200), { onConflict: 'url', ignoreDuplicates: true }).select('id'));
    created += res.length;
  }
  console.log(`  created ${created} source(s)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
