import { supabase } from './supabase';

// Launch markets, in the order they appear in the market filter.
export const FEATURED_MARKETS = ['Dallas', 'Houston', 'Austin', 'New Orleans', 'Atlanta', 'Nashville', 'New York'];

export const FIRM_TYPES = [
  { value: 'boutique', label: 'Boutique' },
  { value: 'mid-size', label: 'Mid-size' },
  { value: 'plaintiff', label: 'Plaintiff' },
  { value: 'regional', label: 'Regional' },
  { value: 'government', label: 'Government' },
  { value: 'public-interest', label: 'Public interest' },
  { value: 'biglaw', label: 'BigLaw' },
];

const TYPE_LABELS = Object.fromEntries(FIRM_TYPES.map((t) => [t.value, t.label]));

export const HIRES_LABELS = { yes: 'Yes', unknown: 'Unknown', no: 'No' };

export async function fetchFirms() {
  const { data, error } = await supabase.from('firms').select('*').order('name');
  if (error) throw new Error(error.message);
  return data.map(normalizeFirm);
}

// Works before and after migration 002 (hires_1l, firm_type, last_verified_at).
export function normalizeFirm(row) {
  const hires = row.hires_1l ?? (row.has_1l_program ? 'yes' : 'unknown');
  const verified = row.last_verified_at ?? row.last_scraped_at ?? null;
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    place: [row.city, row.state].filter(Boolean).join(', '),
    type: row.firm_type ?? null,
    typeLabel: TYPE_LABELS[row.firm_type] ?? null,
    practice: (row.practice_areas ?? []).slice(0, 2).map(capitalize),
    practiceAll: (row.practice_areas ?? []).map(capitalize),
    size: formatSize(row.size),
    hires,
    windowStart: parseDate(row.app_window_start),
    windowEnd: parseDate(row.app_window_end),
    applyUrl: row.apply_url || null,
    careersUrl: row.careers_url || null,
    website: row.website || null,
    notes: row.notes || null,
    fellowship: row.has_fellowship ? row.fellowship_name || 'Diversity fellowship' : null,
    verifiedAt: verified ? new Date(verified) : null,
    source: row.source ?? (row.careers_url ? 'Firm careers page' : null),
  };
}

export function isWindowOpen(firm, today = startOfToday()) {
  if (!firm.windowStart && !firm.windowEnd) return false;
  if (firm.windowStart && firm.windowStart > today) return false;
  if (firm.windowEnd && firm.windowEnd < today) return false;
  return true;
}

export function isWindowPast(firm, today = startOfToday()) {
  return Boolean(firm.windowEnd && firm.windowEnd < today);
}

export function formatWindow(firm) {
  const { windowStart: s, windowEnd: e } = firm;
  if (s && e) return `${shortDate(s)} – ${shortDate(e)}`;
  if (e) return `Until ${shortDate(e)}`;
  if (s) return `From ${shortDate(s)}`;
  return null;
}

export function shortDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function longDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function latestVerified(firms) {
  let max = null;
  for (const f of firms) if (f.verifiedAt && (!max || f.verifiedAt > max)) max = f.verifiedAt;
  return max;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(v) {
  if (!v) return null;
  const [y, m, d] = String(v).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Scraped sizes are free text ("approximately 2,200 lawyers", "Midsize"). Reduce to something scannable.
function formatSize(raw) {
  if (!raw) return null;
  const n = raw.replace(/,/g, '').match(/\d{2,5}/);
  if (n && /lawyer|attorney|people|\+|^\d/i.test(raw)) return `~${Number(n[0]).toLocaleString()}`;
  if (/mid/i.test(raw)) return 'Mid-size';
  if (/boutique/i.test(raw)) return 'Boutique';
  if (/amlaw|vault/i.test(raw)) return 'Large';
  return null;
}
