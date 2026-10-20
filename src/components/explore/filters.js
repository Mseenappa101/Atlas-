import { FIRM_TYPES, STATE_NAMES } from '../../lib/catalog';
import { STATUS_FILTERS } from '../../lib/status';
import { ROLE_LABEL } from '../../lib/roles';

// Every filter lives in the URL so views are shareable and the back button works.
const MULTI = ['type', 'city', 'status', 'size', 'practice', 'role'];
const SINGLE = ['state', 'q', 'hires', 'verified', 'split', 'nobiglaw'];

export function readFilters(p) {
  const f = {};
  for (const k of MULTI) f[k] = p.getAll(k);
  for (const k of SINGLE) f[k] = p.get(k) ?? '';
  return f;
}

export function writeFilters(params, f) {
  const next = new URLSearchParams(params);
  for (const k of [...MULTI, ...SINGLE]) next.delete(k);
  for (const k of MULTI) for (const v of f[k] ?? []) next.append(k, v);
  for (const k of SINGLE) if (f[k]) next.set(k, f[k]);
  return next;
}

export const EMPTY = Object.fromEntries([...MULTI.map((k) => [k, []]), ...SINGLE.map((k) => [k, ''])]);

export function isFiltered(f) {
  return MULTI.some((k) => f[k].length) || SINGLE.some((k) => f[k]);
}

export const SIZE_BUCKETS = [
  { value: 'small', label: 'Under 50 lawyers' },
  { value: 'mid', label: '50–300 lawyers' },
  { value: 'large', label: '300+ lawyers' },
];

// Scraped sizes are free text ("approximately 120 lawyers", "Midsize", "AmLaw 200").
export function sizeBucket(firm) {
  const raw = firm.size ?? '';
  const n = Number(raw.replace(/,/g, '').match(/\d{2,5}/)?.[0]);
  if (n) return n < 50 ? 'small' : n <= 300 ? 'mid' : 'large';
  if (/boutique/i.test(raw) || firm.type?.endsWith('boutique')) return 'small';
  if (/mid/i.test(raw) || firm.type === 'mid-size') return 'mid';
  if (/amlaw|vault/i.test(raw) || firm.type === 'biglaw') return 'large';
  return null;
}

const DAY = 86_400_000;

// Filters on fields only unlocked visitors can see. For locked firms they match everything, and the
// page asks the visitor to unlock instead of showing an empty list.
export const GATED = ['role', 'status', 'hires', 'split'];
export const gatedInUse = (f) => GATED.some((k) => (Array.isArray(f[k]) ? f[k].length : f[k]));

// Each test is separate so the empty state can tell which filter rules out the most firms.
const TESTS = {
  state: (f, v) => f.states.includes(v),
  city: (f, v) => f.cities.some((c) => v.includes(c)),
  q: (f, v) => {
    const q = v.trim().toLowerCase();
    return f.name.toLowerCase().includes(q) || f.cities.some((c) => c.toLowerCase().includes(q)) || f.practice.some((p) => p.toLowerCase().includes(q));
  },
  type: (f, v) => v.includes(f.type),
  hires: (f, v) => f.locked || f.hires === v,
  role: (f, v) => f.locked || v.some((r) => f.hiresFor.includes(r)),
  status: (f, v) => f.locked || v.includes(f.status.kind === 'upcoming' ? 'soon' : f.status.kind),
  size: (f, v) => v.includes(sizeBucket(f)),
  practice: (f, v) => f.practice.some((p) => v.includes(p)),
  verified: (f, v) => f.verifiedAt && Date.now() - f.verifiedAt.getTime() <= Number(v) * DAY,
  split: (f) => f.locked || f.splitSummers === true,
  nobiglaw: (f) => f.type !== 'biglaw',
};

const active = (f) => Object.keys(TESTS).filter((k) => (Array.isArray(f[k]) ? f[k].length : f[k]));

export function applyFilters(firms, f) {
  const keys = active(f);
  return firms.filter((firm) => keys.every((k) => TESTS[k](firm, f[k])));
}

// Which single filter, if removed, would bring back the most firms.
export function mostRestrictive(firms, f) {
  let best = null;
  for (const k of active(f)) {
    const without = { ...f, [k]: Array.isArray(f[k]) ? [] : '' };
    const n = applyFilters(firms, without).length;
    if (!best || n > best.n) best = { key: k, n };
  }
  return best;
}

const TYPE_LABEL = Object.fromEntries(FIRM_TYPES.map((t) => [t.value, t.label]));
const STATUS_LABEL = Object.fromEntries(STATUS_FILTERS.map((s) => [s.value, s.label]));
const SIZE_LABEL = Object.fromEntries(SIZE_BUCKETS.map((s) => [s.value, s.label]));
const HIRES_LABEL = { yes: 'Hires for 1L summer', unknown: 'Hiring not published', no: 'Doesn’t hire 1Ls' };

// Applied filters as removable chips: [{ key, value, label }].
export function chips(f) {
  const out = [];
  if (f.state) out.push({ key: 'state', label: STATE_NAMES[f.state] ?? f.state });
  for (const v of f.city) out.push({ key: 'city', value: v, label: v });
  if (f.q) out.push({ key: 'q', label: `“${f.q}”` });
  for (const v of f.type) out.push({ key: 'type', value: v, label: TYPE_LABEL[v] ?? v });
  if (f.hires) out.push({ key: 'hires', label: HIRES_LABEL[f.hires] });
  for (const v of f.role) out.push({ key: 'role', value: v, label: `Hires for: ${ROLE_LABEL[v] ?? v}` });
  for (const v of f.status) out.push({ key: 'status', value: v, label: STATUS_LABEL[v] ?? v });
  for (const v of f.size) out.push({ key: 'size', value: v, label: SIZE_LABEL[v] ?? v });
  for (const v of f.practice) out.push({ key: 'practice', value: v, label: v });
  if (f.verified) out.push({ key: 'verified', label: `Verified within ${f.verified} days` });
  if (f.split) out.push({ key: 'split', label: 'Split summers allowed' });
  if (f.nobiglaw) out.push({ key: 'nobiglaw', label: 'Hiding BigLaw' });
  return out;
}

export function removeChip(f, chip) {
  if (chip.value != null) return { ...f, [chip.key]: f[chip.key].filter((v) => v !== chip.value) };
  return { ...f, [chip.key]: '' };
}

export function chipLabelFor(f, key) {
  const c = chips(f).find((x) => x.key === key);
  return c?.label ?? key;
}
