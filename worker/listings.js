import { getDb, q } from './db.js';
import { sha1 } from './text.js';

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const listingKey = (l) => sha1(`${norm(l.title)}|${l.apply_url || ''}|${norm(l.city)}`);

/** Same-name firm rows (multi-office firms share one careers page). Cached per process. */
const firmFamilies = new Map();
async function firmFamily(firmId) {
  if (!firmId) return [];
  if (firmFamilies.has(firmId)) return firmFamilies.get(firmId);
  const db = getDb();
  const firm = await q(db.from('firms').select('id, name').eq('id', firmId).maybeSingle());
  const rows = firm ? await q(db.from('firms').select('id, name, city').ilike('name', firm.name.replace(/[%_\\]/g, '\\$&'))) : [];
  firmFamilies.set(firmId, rows);
  return rows;
}

function pickFirmId(source, family, city) {
  if (!source.firm_id) return null;
  const c = norm(city);
  return (c && family.find((f) => norm(f.city) === c)?.id) || source.firm_id;
}

/**
 * Upserts an extraction's listings for a source and closes the source's open listings that vanished.
 * extraction: { listings, firm|null }. Returns { opened, closed }.
 */
export async function applyExtraction(source, extraction) {
  const db = getDb();
  const now = new Date().toISOString();
  const family = await firmFamily(source.firm_id);

  const rows = new Map();
  for (const l of extraction.listings) {
    const key = listingKey(l);
    if (rows.has(key)) continue;
    rows.set(key, {
      source_id: source.id,
      firm_id: pickFirmId(source, family, l.city),
      listing_key: key,
      title: l.title,
      employer_name: l.employer_name || source.employer_name,
      class_years: l.class_years,
      posting_type: l.posting_type,
      // Pages often omit the office; fall back to the office the source belongs to.
      city: l.city || (l.state ? null : source.city),
      state: l.state || source.state,
      window_start: l.window_start,
      deadline: l.deadline,
      apply_url: l.apply_url,
      summary: l.summary,
      status: 'open',
      last_seen_at: now,
      closed_at: null,
    });
  }

  const open = await q(db.from('listings').select('id, listing_key').eq('source_id', source.id).eq('status', 'open'));
  const openKeys = new Set(open.map((r) => r.listing_key));
  const opened = [...rows.keys()].filter((k) => !openKeys.has(k)).length;

  // first_seen_at is omitted so the column default applies on insert and is untouched on update.
  if (rows.size) await q(db.from('listings').upsert([...rows.values()], { onConflict: 'source_id,listing_key' }));

  const gone = open.filter((r) => !rows.has(r.listing_key)).map((r) => r.id);
  if (gone.length) await q(db.from('listings').update({ status: 'closed', closed_at: now }).in('id', gone));

  if (source.firm_id) await updateFirms(source, [...rows.values()], extraction.firm);
  return { opened, closed: gone.length };
}

/** Closes every open listing for a source (page changed and no longer mentions student roles). */
export async function closeAllForSource(sourceId) {
  const rows = await q(getDb().from('listings').update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('source_id', sourceId).eq('status', 'open').select('id'));
  return rows.length;
}

async function updateFirms(source, rows, meta) {
  const db = getDb();
  const ids = [...new Set([source.firm_id, ...rows.map((r) => r.firm_id)].filter(Boolean))];
  const firms = await q(db.from('firms')
    .select('id, hires_1l, firm_type, practice_areas, size').in('id', ids));
  const now = new Date().toISOString();

  for (const f of firms) {
    const mine = rows.filter((r) => r.firm_id === f.id);
    const oneL = mine.filter((r) => r.class_years.includes('1L'))
      .sort((a, b) => (a.deadline || a.window_start || '9999').localeCompare(b.deadline || b.window_start || '9999'));
    const patch = { last_verified_at: now, source: 'Firm careers page' };

    // hires_1l: unknown -> yes/no only; an actual 1L listing is evidence enough to say yes.
    if (oneL.length && f.hires_1l !== 'yes') patch.hires_1l = 'yes';
    else if (f.hires_1l === 'unknown' && meta?.hires_1l && meta.hires_1l !== 'unknown') patch.hires_1l = meta.hires_1l;

    if (meta) {
      if (!f.firm_type && meta.firm_type) patch.firm_type = meta.firm_type;
      if (!f.practice_areas?.length && meta.practice_areas.length) patch.practice_areas = meta.practice_areas;
      if (!f.size && meta.size) patch.size = meta.size;
    }
    const first = oneL[0];
    if (first) {
      if (first.window_start) patch.app_window_start = first.window_start;
      if (first.deadline) patch.app_window_end = first.deadline;
      if (first.apply_url) patch.apply_url = first.apply_url;
    }
    await q(db.from('firms').update(patch).eq('id', f.id));
  }
}
