import { getDb, q } from './db.js';
import { sha1 } from './text.js';

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const listingKey = (l) => sha1(`${norm(l.title)}|${l.apply_url || ''}|${norm(l.city)}`);

/** A firm's offices (one careers page can cover several). Cached per process. */
const officeCache = new Map();
async function firmOffices(firmId) {
  if (!firmId) return [];
  if (!officeCache.has(firmId)) {
    officeCache.set(firmId, await q(getDb().from('offices').select('id, city, state').eq('firm_id', firmId)));
  }
  return officeCache.get(firmId);
}

function pickOfficeId(source, offices, city) {
  const c = norm(city);
  return (c && offices.find((o) => norm(o.city) === c)?.id) || source.office_id || null;
}

/**
 * Upserts an extraction's listings for a source and closes the source's open listings that vanished.
 * extraction: { listings, firm|null }. Returns { opened, closed }.
 */
export async function applyExtraction(source, extraction) {
  const db = getDb();
  const now = new Date().toISOString();
  const offices = await firmOffices(source.firm_id);

  const rows = new Map();
  for (const l of extraction.listings) {
    const key = listingKey(l);
    if (rows.has(key)) continue;
    rows.set(key, {
      source_id: source.id,
      firm_id: source.firm_id,
      office_id: pickOfficeId(source, offices, l.city || source.city),
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
      rolling: Boolean(l.rolling),
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

// Firm-level facts go on the firm; windows and links go on the office they belong to.
async function updateFirms(source, rows, meta) {
  const db = getDb();
  const now = new Date().toISOString();
  const firm = await q(db.from('firms').select('id, hires_1l, firm_type, practice_areas, size, recruiting_email').eq('id', source.firm_id).maybeSingle());
  if (!firm) return;

  const oneL = rows.filter((r) => r.class_years.includes('1L'));
  const patch = { last_verified_at: now, source: 'Firm careers page' };
  // hires_1l: unknown -> yes/no only; an actual 1L listing is evidence enough to say yes.
  if (oneL.length && firm.hires_1l !== 'yes') patch.hires_1l = 'yes';
  else if (firm.hires_1l === 'unknown' && meta?.hires_1l && meta.hires_1l !== 'unknown') patch.hires_1l = meta.hires_1l;
  if (meta) {
    if (!firm.firm_type && meta.firm_type) patch.firm_type = meta.firm_type;
    if (!firm.practice_areas?.length && meta.practice_areas.length) patch.practice_areas = meta.practice_areas;
    if (!firm.size && meta.size) patch.size = meta.size;
    if (!firm.recruiting_email && meta.application_email) patch.recruiting_email = meta.application_email;
  }
  await q(db.from('firms').update(patch).eq('id', firm.id));

  // Per office: the earliest 1L listing sets its window and link.
  const byOffice = new Map();
  for (const r of oneL) {
    const id = r.office_id;
    if (!id) continue;
    const key = r.deadline || r.window_start || '9999';
    const cur = byOffice.get(id);
    if (!cur || key < (cur.deadline || cur.window_start || '9999')) byOffice.set(id, r);
  }
  const touched = new Set([source.office_id, ...byOffice.keys()].filter(Boolean));
  for (const id of touched) {
    const r = byOffice.get(id);
    const office = { last_verified_at: now };
    if (r) {
      office.hires_1l = 'yes';
      if (r.window_start || r.deadline) {
        office.app_window_start = r.window_start;
        office.app_window_end = r.deadline;
        office.window_kind = 'dated';
      } else if (r.rolling) {
        office.window_kind = 'rolling';
      }
      if (r.apply_url) office.apply_url = r.apply_url;
    }
    await q(db.from('offices').update(office).eq('id', id));
  }
}
