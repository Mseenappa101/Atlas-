import { HttpError } from './http.js';
import { getDb } from './db.js';
import { verifyUnlock } from './forms.js';

// The gated firm fields: hiring roles, windows, how to apply, recruiting contacts, notes, open postings.
// The public site can read only names, places, practice areas, type and size (migration 008). Visitors who
// unlocked with their email (a signed token from /api/subscribe) or who are signed in get the rest here.

export const PRIVATE_FIRM = 'id, hires_1l, hires_for, careers_url, apply_url, recruiting_email, notes, has_fellowship, fellowship_name, split_summers, program_length_weeks, app_window_start, app_window_end';
export const PRIVATE_OFFICE = 'id, firm_id, careers_url, apply_url, app_window_start, app_window_end, window_kind, hires_1l, hires_for';
export const LISTING_COLUMNS = 'id, firm_id, office_id, title, employer_name, class_years, roles, posting_type, city, state, window_start, deadline, apply_url, summary, rolling, first_seen_at';

const TTL = 5 * 60_000;
let cache = { at: 0, data: null, pending: null };

async function selectAll(table, columns, build = (x) => x) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(getDb().from(table).select(columns)).range(from, from + 999);
    if (error) throw new Error(`db: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

async function load() {
  const [firms, offices, listings] = await Promise.all([
    selectAll('firms', PRIVATE_FIRM),
    selectAll('offices', PRIVATE_OFFICE),
    selectAll('listings', LISTING_COLUMNS, (b) => b.eq('status', 'open').order('deadline', { ascending: true, nullsFirst: false })),
  ]);
  return { firms, offices, listings };
}

function current() {
  if (cache.data && Date.now() - cache.at < TTL) return Promise.resolve(cache.data);
  cache.pending ??= load().then((data) => {
    cache = { at: Date.now(), data, pending: null };
    return data;
  }).catch((e) => {
    cache.pending = null;
    throw e;
  });
  return cache.pending;
}

/** GET /api/catalog/private: needs an unlock token (X-Unlock-Token) or a signed-in user (checked by the caller). */
export async function privateCatalog(req, user) {
  if (!user && !verifyUnlock(req.headers['x-unlock-token'])) {
    throw new HttpError(401, 'locked', 'Enter your email to unlock the full firm data.');
  }
  return current();
}
