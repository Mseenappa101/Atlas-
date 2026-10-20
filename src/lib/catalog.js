import { supabase } from './supabase';
import { normalizeListing } from './listings';
import { windowStatus } from './status';

// ─── FIRM TYPES ──────────────────────────────────────────────────────────────
// `group` is how a state's employers are sectioned on Explore; BigLaw always comes last.

export const FIRM_TYPES = [
  { value: 'litigation-boutique', label: 'Litigation boutique', group: 'Boutiques' },
  { value: 'specialty-boutique', label: 'Specialty boutique', group: 'Boutiques' },
  { value: 'plaintiff', label: 'Plaintiff', group: 'Plaintiff firms' },
  { value: 'mid-size', label: 'Mid-size', group: 'Mid-size firms' },
  { value: 'regional', label: 'Regional full-service', group: 'Regional firms' },
  { value: 'government', label: 'Government', group: 'Government' },
  { value: 'public-interest', label: 'Public interest', group: 'Public interest' },
  { value: 'biglaw', label: 'BigLaw', group: 'BigLaw' },
];
const TYPE = Object.fromEntries(FIRM_TYPES.map((t) => [t.value, t]));
export const GROUP_ORDER = [...new Set(FIRM_TYPES.map((t) => t.group)), 'Not yet classified'];

export const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};
export const STATE_BY_NAME = Object.fromEntries(Object.entries(STATE_NAMES).map(([a, n]) => [n, a]));

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function parseDate(v) {
  if (!v) return null;
  const [y, m, d] = String(v).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

const STATUS_RANK = { open: 0, soon: 1, rolling: 2, upcoming: 3, closed: 4, unknown: 5, locked: 6 };

// Shown instead of a window status until the visitor unlocks the full data.
export const LOCKED_STATUS = { kind: 'locked', label: 'Window locked', sortKey: Number.MAX_SAFE_INTEGER };

// `row` has only the public columns when the visitor hasn't unlocked (no window_kind).
function office(row) {
  const locked = !('window_kind' in row);
  const start = parseDate(row.app_window_start);
  const end = parseDate(row.app_window_end);
  const kind = row.window_kind ?? (start || end ? 'dated' : 'unknown');
  return {
    id: row.id,
    city: row.city,
    state: row.state,
    careersUrl: row.careers_url || null,
    applyUrl: row.apply_url || null,
    start,
    end,
    kind,
    hires: locked ? 'locked' : row.hires_1l ?? 'unknown',
    hiresFor: row.hires_for ?? [],
    verifiedAt: row.last_verified_at ? new Date(row.last_verified_at) : null,
    status: locked ? LOCKED_STATUS : windowStatus({ start, end, kind }),
  };
}

function firm(row, offices) {
  const locked = !('hires_for' in row);
  const best = [...offices].sort(
    (a, b) => STATUS_RANK[a.status.kind] - STATUS_RANK[b.status.kind] || a.status.sortKey - b.status.sortKey
  )[0];
  const t = TYPE[row.firm_type];
  const verified = [row.last_verified_at, ...offices.map((o) => o.verifiedAt)].filter(Boolean).map((d) => new Date(d));
  return {
    id: row.id,
    slug: row.slug ?? slugify(row.name),
    name: row.name,
    type: t?.value ?? null,
    typeLabel: t?.label ?? null,
    group: t?.group ?? 'Not yet classified',
    practice: (row.practice_areas ?? []).map((p) => p.charAt(0).toUpperCase() + p.slice(1)),
    size: row.size || null,
    locked,
    hires: locked ? 'locked' : row.hires_1l ?? 'unknown',
    hiresFor: row.hires_for ?? [],
    website: row.website || null,
    notes: row.notes || null,
    fellowship: row.has_fellowship ? row.fellowship_name || 'Diversity fellowship' : null,
    splitSummers: row.split_summers ?? null,
    programWeeks: row.program_length_weeks ?? null,
    offices,
    states: [...new Set(offices.map((o) => o.state))],
    cities: [...new Set(offices.map((o) => o.city))],
    status: locked ? LOCKED_STATUS : best?.status ?? windowStatus(null),
    recruitingEmail: row.recruiting_email || null,
    applyUrl: best?.applyUrl ?? offices.find((o) => o.applyUrl)?.applyUrl ?? null,
    careersUrl: best?.careersUrl ?? offices.find((o) => o.careersUrl)?.careersUrl ?? null,
    verifiedAt: verified.length ? new Date(Math.max(...verified)) : null,
    source: row.source ?? 'Firm careers page',
  };
}

// ─── LOADING ─────────────────────────────────────────────────────────────────
// Everyone can read the public columns. Hiring details come from the API for visitors who unlocked
// with their email (token) or are signed in (accessToken), and are merged in by id.

export const PUBLIC_FIRM = 'id,name,slug,state,city,size,practice_areas,firm_type,last_verified_at,source';
export const PUBLIC_OFFICE = 'id,firm_id,city,state,last_verified_at';

async function selectAll(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

async function fetchPrivate({ token, accessToken }) {
  const res = await fetch('/api/catalog/private', {
    headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(token ? { 'X-Unlock-Token': token } : {}) },
  });
  if (res.status === 401) return null; // token no longer valid: stay on the public view
  if (!res.ok) throw new Error('Couldn’t load the full firm data.');
  return res.json();
}

export async function fetchCatalog({ token = null, accessToken = null } = {}) {
  const [firmRows, officeRows, detail] = await Promise.all([
    selectAll('firms', PUBLIC_FIRM),
    selectAll('offices', PUBLIC_OFFICE),
    token || accessToken ? fetchPrivate({ token, accessToken }) : null,
  ]);
  const merge = (rows, extra) => {
    if (!extra) return rows;
    const byId = new Map(extra.map((r) => [r.id, r]));
    return rows.map((r) => ({ ...r, ...byId.get(r.id) }));
  };
  const firms = merge(firmRows, detail?.firms);
  const offices = merge(officeRows, detail?.offices);
  const byFirm = new Map();
  for (const o of offices) (byFirm.get(o.firm_id) ?? byFirm.set(o.firm_id, []).get(o.firm_id)).push(office(o));
  return {
    firms: firms.map((f) => firm(f, byFirm.get(f.id) ?? [])),
    listings: (detail?.listings ?? []).map(normalizeListing),
    unlocked: Boolean(detail),
    idMap: null,
  };
}

// ─── ORDERING ────────────────────────────────────────────────────────────────

// Recommended: known windows first, then matches to the student's profile, non-BigLaw before BigLaw.
export function recommended(firms, profile) {
  const markets = new Set((profile?.target_market ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  const score = (f) =>
    (f.status.kind === 'unknown' || f.status.kind === 'locked' ? 4 : 0) +
    (f.type === 'biglaw' ? 2 : 0) +
    (markets.size && !f.cities.some((c) => markets.has(c.toLowerCase())) ? 1 : 0);
  return [...firms].sort(
    (a, b) => score(a) - score(b) || STATUS_RANK[a.status.kind] - STATUS_RANK[b.status.kind] || a.status.sortKey - b.status.sortKey || a.name.localeCompare(b.name)
  );
}

export function byDeadline(firms) {
  const key = (f) => (f.status.kind === 'open' || f.status.kind === 'soon' ? f.status.sortKey : Number.MAX_SAFE_INTEGER);
  return [...firms].sort((a, b) => key(a) - key(b) || a.name.localeCompare(b.name));
}

export function byName(firms) {
  return [...firms].sort((a, b) => a.name.localeCompare(b.name));
}

export function groupByType(firms) {
  const groups = new Map(GROUP_ORDER.map((g) => [g, []]));
  for (const f of firms) groups.get(f.group).push(f);
  return [...groups].filter(([, list]) => list.length).map(([group, list]) => ({ group, firms: list }));
}

export function countsByState(firms) {
  const counts = {};
  for (const f of firms) for (const s of f.states) counts[s] = (counts[s] ?? 0) + 1;
  return counts;
}
