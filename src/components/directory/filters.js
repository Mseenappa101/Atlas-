import { FEATURED_MARKETS, isWindowOpen } from '../../lib/firms';

export const EMPTY = { markets: [], types: [], hires: 'all', open: false, q: '' };

export function readFilters(params) {
  return {
    markets: params.getAll('market'),
    types: params.getAll('type'),
    hires: params.get('hires') ?? 'all',
    open: params.get('open') === '1',
    q: params.get('q') ?? '',
  };
}

export function writeFilters(params, f) {
  const next = new URLSearchParams(params);
  for (const k of ['market', 'type', 'hires', 'open', 'q']) next.delete(k);
  f.markets.forEach((m) => next.append('market', m));
  f.types.forEach((t) => next.append('type', t));
  if (f.hires !== 'all') next.set('hires', f.hires);
  if (f.open) next.set('open', '1');
  if (f.q) next.set('q', f.q);
  return next;
}

export function activeCount(f) {
  return f.markets.length + f.types.length + (f.hires !== 'all') + f.open + (f.q ? 1 : 0);
}

export function applyFilters(firms, f) {
  const q = f.q.trim().toLowerCase();
  return firms.filter(
    (firm) =>
      (!f.markets.length || f.markets.includes(firm.city)) &&
      (!f.types.length || f.types.includes(firm.type)) &&
      (f.hires === 'all' || firm.hires === f.hires) &&
      (!f.open || isWindowOpen(firm)) &&
      (!q || firm.name.toLowerCase().includes(q))
  );
}

const SORTERS = {
  firm: (a, b) => a.name.localeCompare(b.name),
  city: (a, b) => a.place.localeCompare(b.place) || a.name.localeCompare(b.name),
  window: (a, b) => windowKey(a) - windowKey(b) || a.name.localeCompare(b.name),
};

function windowKey(f) {
  const d = f.windowStart ?? f.windowEnd;
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
}

export function sortFirms(firms, key, dir) {
  const sorted = [...firms].sort(SORTERS[key] ?? SORTERS.firm);
  // Firms without a window stay at the bottom either way.
  if (dir === 'desc') {
    if (key !== 'window') return sorted.reverse();
    const dated = sorted.filter((f) => f.windowStart || f.windowEnd).reverse();
    return dated.concat(sorted.filter((f) => !f.windowStart && !f.windowEnd));
  }
  return sorted;
}

// Markets with firms, featured ones first in launch order, then by size.
export function marketList(firms) {
  const counts = new Map();
  for (const f of firms) counts.set(f.city, (counts.get(f.city) ?? 0) + 1);
  const featured = FEATURED_MARKETS.filter((m) => counts.has(m)).map((m) => ({ city: m, count: counts.get(m) }));
  const rest = [...counts]
    .filter(([c]) => !FEATURED_MARKETS.includes(c))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([city, count]) => ({ city, count }));
  return { featured, rest };
}

export function groupByMarket(firms) {
  const order = [...FEATURED_MARKETS];
  const groups = new Map();
  for (const f of firms) {
    if (!groups.has(f.city)) groups.set(f.city, []);
    groups.get(f.city).push(f);
  }
  return [...groups]
    .sort(([a, fa], [b, fb]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return fb.length - fa.length || a.localeCompare(b);
    })
    .map(([city, list]) => ({ city, place: list[0].place, firms: list }));
}
