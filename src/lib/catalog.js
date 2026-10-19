import { supabase } from './supabase';
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

const STATUS_RANK = { open: 0, soon: 1, rolling: 2, upcoming: 3, closed: 4, unknown: 5 };

function office(row) {
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
    hires: row.hires_1l ?? 'unknown',
    verifiedAt: row.last_verified_at ? new Date(row.last_verified_at) : null,
    status: windowStatus({ start, end, kind }),
  };
}

function firm(row, offices) {
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
    hires: row.hires_1l ?? 'unknown',
    website: row.website || null,
    notes: row.notes || null,
    fellowship: row.has_fellowship ? row.fellowship_name || 'Diversity fellowship' : null,
    splitSummers: row.split_summers ?? null,
    programWeeks: row.program_length_weeks ?? null,
    offices,
    states: [...new Set(offices.map((o) => o.state))],
    cities: [...new Set(offices.map((o) => o.city))],
    status: best?.status ?? windowStatus(null),
    applyUrl: best?.applyUrl ?? offices.find((o) => o.applyUrl)?.applyUrl ?? null,
    careersUrl: best?.careersUrl ?? offices.find((o) => o.careersUrl)?.careersUrl ?? null,
    // Where emailed applications go, when the firm publishes an address.
    recruitingEmail: row.recruiting_email || null,
    verifiedAt: verified.length ? new Date(Math.max(...verified)) : null,
    source: row.source ?? 'Firm careers page',
  };
}

// ─── LOADING ─────────────────────────────────────────────────────────────────
// After migration 004: firms + offices tables. Before it: firm rows are per office,
// so group them by name, picking the same canonical row the migration will keep.

async function selectAll(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

function canonicalFirst(a, b) {
  const score = (r) => [r.hires_1l === 'yes' ? 0 : 1, r.app_window_start || r.app_window_end ? 0 : 1, r.firm_type ? 0 : 1];
  const [sa, sb] = [score(a), score(b)];
  for (let i = 0; i < 3; i++) if (sa[i] !== sb[i]) return sa[i] - sb[i];
  return String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id));
}

// Old boutique rows split the way migration 004 splits them.
function legacyType(row) {
  if (row.firm_type !== 'boutique') return row.firm_type;
  return /(litigation|trial|disputes|appellate)/i.test((row.practice_areas ?? []).join(' ')) ? 'litigation-boutique' : 'specialty-boutique';
}

export async function fetchCatalog() {
  let officeRows;
  try {
    officeRows = await selectAll('offices', '*');
  } catch {
    officeRows = null; // migration 004 not applied yet
  }

  if (officeRows) {
    const firms = await selectAll('firms', '*');
    const byFirm = new Map();
    for (const o of officeRows) (byFirm.get(o.firm_id) ?? byFirm.set(o.firm_id, []).get(o.firm_id)).push(office(o));
    return { firms: firms.map((f) => firm(f, byFirm.get(f.id) ?? [])), idMap: null };
  }

  const rows = await selectAll('firms', '*');
  const groups = new Map();
  for (const r of rows) (groups.get(r.name.toLowerCase()) ?? groups.set(r.name.toLowerCase(), []).get(r.name.toLowerCase())).push(r);
  const idMap = new Map();
  const firms = [...groups.values()].map((g) => {
    const sorted = [...g].sort(canonicalFirst);
    const head = sorted[0];
    g.forEach((r) => idMap.set(r.id, head.id));
    const merged = {
      ...head,
      firm_type: legacyType(sorted.find((r) => r.firm_type) ?? head),
      hires_1l: g.some((r) => r.hires_1l === 'yes') ? 'yes' : head.hires_1l,
      practice_areas: [...new Set(g.flatMap((r) => r.practice_areas ?? []))],
      size: head.size ?? g.find((r) => r.size)?.size,
    };
    return firm(merged, g.map(office));
  });
  return { firms, idMap };
}

// ─── ORDERING ────────────────────────────────────────────────────────────────

// Recommended: known windows first, then matches to the student's profile, non-BigLaw before BigLaw.
export function recommended(firms, profile) {
  const markets = new Set((profile?.target_market ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  const score = (f) =>
    (f.status.kind === 'unknown' ? 4 : 0) +
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
