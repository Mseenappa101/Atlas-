import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { FilterChip, Input } from '../app/controls';
import { FilterMenu } from '../app/overlays';
import { MonogramTile } from '../app/firm';
import { EmptyState, FirmRowSkeleton } from '../app/feedback';
import useListings from '../../hooks/useListings';
import useAccess from '../../hooks/useAccess';
import UnlockForm from '../UnlockForm';
import { POSTING_TYPES } from '../../lib/listings';
import { STATE_NAMES } from '../../lib/catalog';

const YEARS = ['1L', '2L', '3L'];
const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// Open postings the scraper found, filterable by class year, type, state and text.
// Filter state lives in the URL (p-prefixed keys) next to Explore's own.
export default function Positions({ params, setParams, firmById, onOpenFirm }) {
  const { listings, loading, error } = useListings();
  const { canSeeDetails } = useAccess();
  const f = {
    years: params.getAll('pyear'),
    types: params.getAll('ptype'),
    state: params.get('pstate') ?? '',
    q: params.get('pq') ?? '',
  };
  const set = (patch) => {
    const n = { ...f, ...patch };
    const next = new URLSearchParams(params);
    for (const k of ['pyear', 'ptype', 'pstate', 'pq']) next.delete(k);
    n.years.forEach((y) => next.append('pyear', y));
    n.types.forEach((t) => next.append('ptype', t));
    if (n.state) next.set('pstate', n.state);
    if (n.q) next.set('pq', n.q);
    setParams(next, { replace: true });
  };
  const toggle = (k, v) => set({ [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });

  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return listings
      .filter(
        (l) =>
          // Postings that don't name a class year could be open to anyone, so they stay in.
          (!f.years.length || !l.years.length || f.years.some((y) => l.years.includes(y))) &&
          (!f.types.length || f.types.includes(l.type)) &&
          (!f.state || l.state === f.state) &&
          (!q || l.title.toLowerCase().includes(q) || l.employer.toLowerCase().includes(q))
      )
      .sort((a, b) => (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity) || a.employer.localeCompare(b.employer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, params]);

  const stateOptions = useMemo(() => {
    const c = new Map();
    for (const l of listings) if (l.state) c.set(l.state, (c.get(l.state) ?? 0) + 1);
    return [...c].sort().map(([s, n]) => ({ value: s, label: STATE_NAMES[s] ?? s, count: n }));
  }, [listings]);

  if (!canSeeDetails) {
    return (
      <div className="p-4 md:p-6">
        <UnlockForm title="See every open position" blurb="Summer associate, law clerk and fellowship postings from firm careers pages, with deadlines and apply links. Free with your email." source="/explore?tab=positions" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <div className="min-w-[200px] flex-1">
          <Input icon={Search} aria-label="Search positions" placeholder="Position or employer" value={f.q} onChange={(e) => set({ q: e.target.value })} />
        </div>
        {YEARS.map((y) => (
          <FilterChip key={y} selected={f.years.includes(y)} onClick={() => toggle('years', y)}>
            {y}
          </FilterChip>
        ))}
        <FilterMenu label="Position type" options={POSTING_TYPES.filter((t) => t.value !== 'other')} value={f.types} onChange={(v) => set({ types: v })} />
        <FilterMenu label="State" options={stateOptions} value={f.state ? [f.state] : []} onChange={(v) => set({ state: v[v.length - 1] ?? '' })} />
      </div>
      <p className="px-4 py-2.5 text-t14" aria-live="polite">
        <span className="data font-medium">{loading ? '…' : rows.length}</span> open positions
        {f.years.length > 0 && <span className="text-fg-2"> · includes postings that don&rsquo;t name a class year</span>}
      </p>
      {loading && <FirmRowSkeleton rows={6} />}
      {error && <p className="px-4 py-3 text-t14">Couldn&rsquo;t load open positions. Check your connection and reload.</p>}
      {!loading && !error && !rows.length && (
        <div className="p-4">
          <EmptyState title="No positions match">Try removing a filter.</EmptyState>
        </div>
      )}
      <ul className="divide-y divide-line border-t border-line">
        {rows.map((l) => {
          const firm = firmById(l.firmId);
          return (
            <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <MonogramTile name={l.employer} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-t16 font-semibold">{l.title}</p>
                <p className="truncate text-t14 text-fg-2">
                  {firm ? (
                    <button type="button" onClick={() => onOpenFirm(firm)} className="inline-flex min-h-[44px] items-center text-fg hover:underline md:min-h-0">
                      {l.employer}
                    </button>
                  ) : (
                    l.employer
                  )}
                  {[l.place, l.yearsLabel, l.typeLabel].filter(Boolean).map((x) => ` · ${x}`)}
                </p>
                {l.deadline && <p className="data mt-0.5 text-t12 text-st-soon-text">Due {fmt(l.deadline)}</p>}
              </div>
              <span className="flex items-center gap-3 text-t14">
                <Link to={`/letters/new?listing=${l.id}`} className="font-medium text-brand hover:underline">
                  Write letter
                </Link>
                {l.applyUrl && (
                  <a href={l.applyUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
                    Apply<span className="sr-only"> (opens in a new tab)</span> ↗
                  </a>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
