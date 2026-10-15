import { useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useListings from '../../hooks/useListings';
import { POSTING_TYPES } from '../../lib/listings';
import { shortDate } from '../../lib/firms';
import { Button, CloseButton, ExternalLink, Label, Sheet, Tag } from '../ui';
import { TablePlaceholder } from './FirmTable';

const YEARS = ['1L', '2L', '3L'];
const DASH = <span className="text-muted">—</span>;

function readFilters(p) {
  return { years: p.getAll('pyear'), types: p.getAll('ptype'), state: p.get('pstate') ?? '', q: p.get('pq') ?? '' };
}

function writeFilters(params, f) {
  const next = new URLSearchParams(params);
  for (const k of ['pyear', 'ptype', 'pstate', 'pq']) next.delete(k);
  f.years.forEach((y) => next.append('pyear', y));
  f.types.forEach((t) => next.append('ptype', t));
  if (f.state) next.set('pstate', f.state);
  if (f.q) next.set('pq', f.q);
  return next;
}

const EMPTY = { years: [], types: [], state: '', q: '' };
const count = (f) => f.years.length + f.types.length + (f.state ? 1 : 0) + (f.q ? 1 : 0);
const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function applyFilters(listings, f) {
  const q = f.q.trim().toLowerCase();
  return listings.filter(
    (l) =>
      // A listing that doesn't name a class year could be open to anyone, so it stays in.
      (!f.years.length || !l.years.length || f.years.some((y) => l.years.includes(y))) &&
      (!f.types.length || f.types.includes(l.type)) &&
      (!f.state || l.state === f.state) &&
      (!q || l.title.toLowerCase().includes(q) || l.employer.toLowerCase().includes(q))
  );
}

const SORTERS = {
  employer: (a, b) => a.employer.localeCompare(b.employer) || a.title.localeCompare(b.title),
  location: (a, b) => (a.place ?? '~').localeCompare(b.place ?? '~') || a.employer.localeCompare(b.employer),
  deadline: (a, b) => (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity) || a.employer.localeCompare(b.employer),
};

function Filters({ filters, onChange, states }) {
  const searchId = useId();
  const stateId = useId();
  const set = (patch) => onChange({ ...filters, ...patch });
  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
      <fieldset>
        <legend className="caps mb-1.5 text-xs text-muted">Class year</legend>
        <div className="flex flex-wrap gap-1.5">
          {YEARS.map((y) => (
            <Tag key={y} pressed={filters.years.includes(y)} onClick={() => set({ years: toggle(filters.years, y) })}>
              {y}
            </Tag>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="caps mb-1.5 text-xs text-muted">Position type</legend>
        <div className="flex flex-wrap gap-1.5">
          {POSTING_TYPES.filter((t) => t.value !== 'other').map(({ value, label }) => (
            <Tag key={value} pressed={filters.types.includes(value)} onClick={() => set({ types: toggle(filters.types, value) })}>
              {label}
            </Tag>
          ))}
        </div>
      </fieldset>
      <div>
        <Label htmlFor={stateId}>State</Label>
        <select
          id={stateId}
          value={filters.state}
          onChange={(e) => set({ state: e.target.value })}
          className="block min-h-[44px] rounded-sm border border-muted bg-surface px-3 text-sm md:min-h-[36px]"
        >
          <option value="">All states</option>
          {states.map(({ state, n }) => (
            <option key={state} value={state}>
              {state} ({n})
            </option>
          ))}
        </select>
      </div>
      <div className="w-full md:w-64">
        <Label htmlFor={searchId}>Search position or employer</Label>
        <input
          id={searchId}
          type="search"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="e.g. summer associate"
          className="block min-h-[44px] w-full rounded-sm border border-muted bg-surface px-3 text-sm placeholder:text-muted md:min-h-[36px]"
        />
      </div>
    </div>
  );
}

const COLUMNS = [
  { key: 'title', label: 'Position', w: 'w-[24%]' },
  { key: 'employer', label: 'Employer', sortable: true, w: 'w-[20%]' },
  { key: 'location', label: 'Location', sortable: true, w: 'w-[14%]' },
  { key: 'years', label: 'Class year', w: 'w-[11%]' },
  { key: 'type', label: 'Type', w: 'w-[13%]' },
  { key: 'deadline', label: 'Deadline', sortable: true, w: 'w-[10%]' },
  { key: 'apply', label: 'Apply', w: 'w-[8%]', align: 'text-right' },
];

function Header({ col, sort, onSort }) {
  const active = col.sortable && sort.key === col.key;
  return (
    <th
      scope="col"
      aria-sort={col.sortable ? (active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
      className={`caps sticky top-0 z-10 border-b border-ink bg-paper px-3 py-2 text-left text-xs font-medium text-muted first:pl-0 last:pr-0 ${col.w} ${col.align ?? ''}`}
    >
      {col.sortable ? (
        <button type="button" onClick={() => onSort(col.key)} className={`caps inline-flex gap-1 whitespace-nowrap hover:text-ink ${active ? 'text-ink' : ''}`}>
          {col.label}
          <span aria-hidden="true" className="w-2 font-sans">
            {active ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
          </span>
        </button>
      ) : (
        col.label
      )}
    </th>
  );
}

function Apply({ l, className }) {
  return l.applyUrl ? (
    <ExternalLink href={l.applyUrl} className={className}>
      Apply
    </ExternalLink>
  ) : (
    DASH
  );
}

function Table({ rows, sort, onSort, onOpenFirm }) {
  const cell = 'border-b border-rule px-3 py-2.5 align-baseline first:pl-0 last:pr-0';
  return (
    <table className="hidden w-full table-fixed border-separate border-spacing-0 text-sm md:table">
      <caption className="sr-only">Open positions for law students</caption>
      <thead>
        <tr>
          {COLUMNS.map((c) => (
            <Header key={c.key} col={c} sort={sort} onSort={onSort} />
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((l) => (
          <tr
            key={l.id}
            onClick={l.firmId ? () => onOpenFirm(l.firmId) : undefined}
            className={l.firmId ? 'cursor-pointer transition-colors hover:bg-surface' : ''}
          >
            <th scope="row" className={`${cell} text-left font-normal`}>
              <span className="font-serif text-base leading-snug">{l.title}</span>
            </th>
            <td className={cell}>
              {l.firmId ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFirm(l.firmId);
                  }}
                  className="text-left hover:text-accent"
                >
                  {l.employer}
                </button>
              ) : (
                l.employer
              )}
            </td>
            <td className={cell}>{l.place ?? DASH}</td>
            <td className={`${cell} nums whitespace-nowrap font-mono text-xs`}>{l.yearsLabel}</td>
            <td className={`${cell} text-muted`}>{l.typeLabel}</td>
            <td className={`${cell} nums font-mono text-xs`}>{l.deadline ? shortDate(l.deadline) : DASH}</td>
            <td className={`${cell} text-right`} onClick={(e) => e.stopPropagation()}>
              <Apply l={l} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MobileList({ rows, onOpenFirm }) {
  return (
    <ul className="md:hidden">
      {rows.map((l) => (
        <li key={l.id} className="border-b border-rule py-3">
          <span className="block font-serif text-base leading-snug">{l.title}</span>
          {l.firmId ? (
            <button type="button" onClick={() => onOpenFirm(l.firmId)} className="block min-h-[44px] text-left text-sm">
              {l.employer}
              {l.place && <span className="text-muted"> · {l.place}</span>}
            </button>
          ) : (
            <span className="block text-sm">
              {l.employer}
              {l.place && <span className="text-muted"> · {l.place}</span>}
            </span>
          )}
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="nums font-mono">
              {l.yearsLabel} · <span className="font-sans text-muted">{l.typeLabel}</span>
              {l.deadline && <> · Due {shortDate(l.deadline)}</>}
            </span>
            <Apply l={l} className="inline-flex min-h-[44px] items-center" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function PositionsView({ onOpenFirm }) {
  const { listings, loading, error } = useListings();
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState(false);
  const filters = readFilters(params);
  const sort = { key: params.get('psort') ?? 'employer', dir: params.get('pdir') ?? 'asc' };

  const states = useMemo(() => {
    const c = new Map();
    for (const l of listings) if (l.state) c.set(l.state, (c.get(l.state) ?? 0) + 1);
    return [...c].map(([state, n]) => ({ state, n })).sort((a, b) => a.state.localeCompare(b.state));
  }, [listings]);

  const rows = useMemo(() => {
    const out = applyFilters(listings, filters).sort(SORTERS[sort.key] ?? SORTERS.employer);
    // Undated listings stay last when sorting by deadline in either direction.
    if (sort.dir !== 'desc') return out;
    if (sort.key !== 'deadline') return out.reverse();
    return out.filter((l) => l.deadline).reverse().concat(out.filter((l) => !l.deadline));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, params]);

  const setFilters = (f) => setParams(writeFilters(params, f), { replace: true });
  const clear = () => setFilters(EMPTY);
  const onSort = (key) => {
    const next = new URLSearchParams(params);
    next.set('psort', key);
    next.set('pdir', sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc');
    setParams(next, { replace: true });
  };
  const n = count(filters);

  return (
    <>
      <section aria-label="Position filters" className="no-print hidden border-b border-rule pb-5 pt-1 md:block">
        <Filters filters={filters} onChange={setFilters} states={states} />
      </section>
      <div className="md:hidden">
        <Button variant="secondary" className="w-full" onClick={() => setSheet(true)}>
          Filter{n > 0 && <span className="nums ml-2 font-mono text-xs">({n})</span>}
        </Button>
      </div>

      <p className="nums py-4 font-mono text-xs" aria-live="polite">
        {loading ? 'Loading positions…' : error ? '' : `Showing ${rows.length} of ${listings.length} open positions`}
        {n > 0 && (
          <button type="button" onClick={clear} className="link ml-4 font-sans">
            Clear filters
          </button>
        )}
        {filters.years.length > 0 && (
          <span className="mt-1 block font-sans text-muted">Includes positions that don&rsquo;t name a class year.</span>
        )}
      </p>

      {loading && <TablePlaceholder />}
      {error && <p className="border-t border-rule py-6">Couldn&rsquo;t load open positions. Check your connection and reload the page.</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="border-t border-rule py-6">
          {listings.length ? 'No positions match these filters. ' : 'No open positions yet. Check back soon. '}
          {n > 0 && (
            <button type="button" onClick={clear} className="link">
              Clear filters
            </button>
          )}
        </p>
      )}
      {!loading && !error && rows.length > 0 && (
        <>
          <Table rows={rows} sort={sort} onSort={onSort} onOpenFirm={onOpenFirm} />
          <MobileList rows={rows} onOpenFirm={onOpenFirm} />
          <p className="mt-4 text-xs text-muted">
            Positions are read from each employer&rsquo;s own careers page. When a position comes down there, it comes down here.
          </p>
        </>
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} label="Filters" variant="bottom">
        <div className="px-4 pb-4 pt-2">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <h2 className="caps text-sm">Filters</h2>
            <CloseButton onClick={() => setSheet(false)} label="Done" />
          </div>
          <div className="py-4">
            <Filters filters={filters} onChange={setFilters} states={states} />
          </div>
          <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-rule bg-surface pt-3">
            {n > 0 ? (
              <button type="button" onClick={clear} className="link min-h-[44px] text-sm">
                Clear filters
              </button>
            ) : (
              <span />
            )}
            <Button onClick={() => setSheet(false)}>
              Show <span className="nums mx-1 font-mono">{rows.length}</span> positions
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
