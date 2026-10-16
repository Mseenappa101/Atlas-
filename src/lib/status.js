// Application-window status for an office (or a firm's best office). Always returns a text label;
// color is decoration on top.

const SOON_DAYS = 30;
// A window with an opening date but no deadline only counts as open for this long.
const OPEN_WITHOUT_END_DAYS = 90;

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// `w`: { start: Date|null, end: Date|null, kind: 'dated'|'rolling'|'unknown' }
export function windowStatus(w, today = startOfDay()) {
  const { start, end, kind } = w ?? {};
  if (start && start > today) {
    const days = Math.round((start - today) / 86_400_000);
    return { kind: days <= SOON_DAYS ? 'soon' : 'upcoming', label: `Opens ${fmt(start)}`, sortKey: start.getTime() };
  }
  if (end && end < today) return { kind: 'closed', label: `Closed ${fmt(end)}`, sortKey: Infinity };
  if (end) return { kind: 'open', label: `Open · closes ${fmt(end)}`, sortKey: end.getTime() };
  if (start) {
    const age = Math.round((today - start) / 86_400_000);
    if (age <= OPEN_WITHOUT_END_DAYS) return { kind: 'open', label: 'Open now', sortKey: start.getTime() };
    return { kind: 'unknown', label: `Last opened ${fmt(start)}`, sortKey: Number.MAX_SAFE_INTEGER };
  }
  if (kind === 'rolling') return { kind: 'rolling', label: 'Rolling', sortKey: Number.MAX_SAFE_INTEGER - 1 };
  return { kind: 'unknown', label: 'Not published', sortKey: Number.MAX_SAFE_INTEGER };
}

// A verified window (dated or rolling) counts as known for sorting and collections.
export function isKnown(status) {
  return status.kind !== 'unknown';
}

export const STATUS_FILTERS = [
  { value: 'open', label: 'Open now' },
  { value: 'soon', label: 'Opening soon' },
  { value: 'rolling', label: 'Rolling' },
  { value: 'closed', label: 'Closed' },
];
