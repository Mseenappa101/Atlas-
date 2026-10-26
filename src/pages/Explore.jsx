import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button, FilterChip, Select } from '../components/app/controls';
import { Drawer, FilterMenu } from '../components/app/overlays';
import { EmptyState } from '../components/app/feedback';
import Positions from '../components/explore/Positions';
import CaseFile from '../components/explore/immersive/CaseFile';
import CaseList from '../components/explore/immersive/CaseList';
import '../components/explore/immersive/immersive.css';
import '../components/explore/explore-docket.css';
import {
  EMPTY, SIZE_BUCKETS, applyFilters, chips, isFiltered, readFilters, removeChip, writeFilters,
} from '../components/explore/filters';
import UnlockForm from '../components/UnlockForm';
import { toast } from 'sonner';
import MapCtaBar from '../components/MapCtaBar';
import useAccess from '../hooks/useAccess';
import { ROLES } from '../lib/roles';
import useCatalog from '../hooks/useCatalog';
import useListings from '../hooks/useListings';
import useMyList from '../hooks/useMyList';
import useSession from '../hooks/useSession';
import { FIRM_TYPES, STATE_NAMES, byDeadline, byName, countsByState, recommended } from '../lib/catalog';
import { STATUS_FILTERS } from '../lib/status';

const PhaseMap = lazy(() => import('../components/map3d/PhaseMap'));

const SORTS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'deadline', label: 'Deadline soonest' },
  { value: 'az', label: 'A–Z' },
];

function countBy(firms, fn) {
  const m = new Map();
  for (const f of firms) for (const k of [].concat(fn(f)).filter(Boolean)) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}

function useFilterOptions(firms, filters) {
  return useMemo(() => {
    const scope = (key) => applyFilters(firms, { ...filters, [key]: Array.isArray(filters[key]) ? [] : '' });
    const states = countBy(scope('state'), (f) => f.states);
    const cities = countBy(scope('city'), (f) => (filters.state ? f.offices.filter((o) => o.state === filters.state).map((o) => o.city) : f.cities));
    const types = countBy(scope('type'), (f) => f.type);
    const statuses = countBy(scope('status'), (f) => (f.status.kind === 'upcoming' ? 'soon' : f.status.kind));
    const roles = countBy(scope('role'), (f) => f.hiresFor);
    const practices = [...countBy(scope('practice'), (f) => f.practice)].sort((a, b) => b[1] - a[1]).slice(0, 24);
    return {
      state: Object.keys(STATE_NAMES).filter((s) => states.get(s)).map((s) => ({ value: s, label: STATE_NAMES[s], count: states.get(s) })),
      city: [...cities].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([c, n]) => ({ value: c, label: c, count: n })),
      type: FIRM_TYPES.map((t) => ({ value: t.value, label: t.label, count: types.get(t.value) ?? 0 })),
      status: STATUS_FILTERS.map((s) => ({ ...s, count: statuses.get(s.value) ?? 0 })),
      role: ROLES.map((r) => ({ value: r.value, label: r.label, count: roles.get(r.value) ?? 0 })),
      practice: practices.map(([p, n]) => ({ value: p, label: p, count: n })),
    };
  }, [firms, filters]);
}

const single = (fn) => (vals) => fn(vals[vals.length - 1] ?? '');

function AllFilters({ options, filters, set, sort, setSort }) {
  const box = (key, value, label, count) => (
    <label key={value} className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-t14">
      <input type="checkbox" className="h-4 w-4 accent-[var(--app-brand)]" checked={filters[key].includes(value)}
        onChange={() => set({ [key]: filters[key].includes(value) ? filters[key].filter((x) => x !== value) : [...filters[key], value] })} />
      <span className="flex-1">{label}</span>
      {count != null && <span className="data text-t12 text-fg-2">{count}</span>}
    </label>
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <FilterMenu label="State" options={options.state} value={filters.state ? [filters.state] : []} onChange={single((v) => set({ state: v, city: [] }))} />
        <FilterMenu label="Market" options={options.city} value={filters.city} onChange={(v) => set({ city: v })} />
        <FilterMenu label="Firm type" options={options.type} value={filters.type} onChange={(v) => set({ type: v })} />
        <FilterMenu label="Window status" options={options.status} value={filters.status} onChange={(v) => set({ status: v })} />
        <FilterChip selected={Boolean(filters.nobiglaw)} onClick={() => set({ nobiglaw: filters.nobiglaw ? '' : '1' })}>Hide BigLaw</FilterChip>
      </div>
      <fieldset><legend className="mb-1 text-t14 font-semibold">Firm size</legend>{SIZE_BUCKETS.map((s) => box('size', s.value, s.label))}</fieldset>
      <fieldset><legend className="mb-1 text-t14 font-semibold">Practice focus</legend>{options.practice.map((p) => box('practice', p.value, p.label, p.count))}</fieldset>
      <Select label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} options={SORTS} />
    </div>
  );
}

function ExplorePage() {
  const { firms, idMap, loading, error } = useCatalog();
  const { listings } = useListings();
  const { ids: savedIds, toggle } = useMyList();
  const { session } = useSession();
  const { canSeeDetails } = useAccess();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [q, setQ] = useState(() => params.get('q') ?? '');

  // Toast when the record unlocks.
  const wasUnlocked = useState(canSeeDetails)[0];
  useEffect(() => {
    if (canSeeDetails && !wasUnlocked) toast.success('The record is unlocked.', { description: 'Hiring details, windows and how to apply are now on the record.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeDetails]);

  const filters = readFilters(params);
  const sort = params.get('sort') ?? 'recommended';
  const options = useFilterOptions(firms, filters);

  const results = useMemo(() => {
    const list = applyFilters(firms, filters);
    if (sort === 'deadline') return byDeadline(list);
    if (sort === 'az') return byName(list);
    return recommended(list, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firms, params]);

  const selectedSlug = params.get('firm');
  const selected = selectedSlug ? (results.find((f) => f.slug === selectedSlug) ?? firms.find((f) => f.slug === selectedSlug) ?? null) : null;
  const firmListings = useMemo(
    () => (selected ? listings.filter((l) => (idMap?.get(l.firmId) ?? l.firmId) === selected.id) : []),
    [selected, listings, idMap]
  );

  // The map lights by every active filter except the state (so the national view isn't collapsed to one).
  const mapCounts = useMemo(() => countsByState(applyFilters(firms, { ...filters, state: '' })), [firms, filters]);
  const total = useMemo(() => Object.values(mapCounts).reduce((a, b) => a + b, 0), [mapCounts]);

  const positionsOpen = params.get('tab') === 'positions';
  const firmOpen = Boolean(selectedSlug && selected);
  const drill = Boolean(filters.state || filters.q || filters.city?.length || filters.type?.length || filters.size?.length || filters.practice?.length);
  const goToAbbr = filters.state || (firmOpen ? selected.states?.[0] : null) || null;
  const goTo = useMemo(() => ({ abbr: goToAbbr }), [goToAbbr]);

  const setFilters = (f) => { const next = writeFilters(params, f); next.delete('firm'); setParams(next, { replace: true }); };
  const set = (patch) => setFilters({ ...filters, ...patch });
  const setSort = (v) => { const next = new URLSearchParams(params); if (v === 'recommended') next.delete('sort'); else next.set('sort', v); setParams(next, { replace: true }); };
  const openFirm = (f) => { const next = new URLSearchParams(params); next.set('firm', f.slug); setParams(next); };
  const closeFirm = () => { const next = new URLSearchParams(params); next.delete('firm'); setParams(next, { replace: true }); };
  const setStateParam = (abbr) => set({ state: abbr || '' });
  const openCity = (abbr, cityName) => setFilters({ ...filters, state: abbr, city: [cityName] });
  const showTab = (t) => { const next = new URLSearchParams(params); if (t === 'positions') next.set('tab', 'positions'); else next.delete('tab'); setParams(next); };
  const submitSearch = (text) => set({ q: text });
  const activeRoles = useMemo(() => filters.role || [], [filters.role]);
  const toggleRole = (r) => set({ role: activeRoles.includes(r) ? activeRoles.filter((x) => x !== r) : [...activeRoles, r] });
  const toggleSave = (f) => { if (!session) return navigate(`/signup?next=${encodeURIComponent(location.pathname + location.search)}`); toggle(f.id); };

  useEffect(() => { document.title = filters.state ? `${STATE_NAMES[filters.state]} firms — Firmward` : 'Explore — Firmward'; }, [filters.state]);
  useEffect(() => { setQ(params.get('q') ?? ''); }, [params]);

  if (error) {
    return (
      <div className="explore-docket" style={{ minHeight: '60vh' }}>
        <div className="mx-auto max-w-app px-4 py-16" style={{ color: '#f4f1ea' }}>
          <EmptyState title="Couldn’t load the docket">Check your connection and reload. If it keeps happening, the database may be restarting; try again in a few minutes.</EmptyState>
        </div>
      </div>
    );
  }

  const appliedChips = chips(filters);
  const drawerTitle = firmOpen ? 'Case file' : filters.city?.length ? filters.city[0] : filters.state ? STATE_NAMES[filters.state] : filters.q ? `Case lookup` : 'Docket';

  return (
    <div className="explore-docket">
      {/* Docket strip */}
      <div className="explore-docket__bar">
        <p className="explore-docket__caption">
          <span className="ed-smallcaps">In re</span> <strong>The National Docket</strong>
          <span className="explore-docket__count" aria-live="polite">{loading ? '…' : total} firms{isFiltered(filters) ? ' · filtered' : ''}</span>
        </p>
        <div className="explore-docket__tabs" role="group" aria-label="Hiring for">
          {ROLES.map((r) => (
            <button key={r.value} type="button" className={`explore-docket__tab${activeRoles.includes(r.value) ? ' is-on' : ''}`} aria-pressed={activeRoles.includes(r.value)} onClick={() => toggleRole(r.value)}>{r.label}</button>
          ))}
          <button type="button" className={`explore-docket__tab${positionsOpen ? ' is-on' : ''}`} aria-pressed={positionsOpen} onClick={() => showTab(positionsOpen ? 'firms' : 'positions')}>Open positions</button>
          <button type="button" className="explore-docket__tab" onClick={() => setFiltersOpen(true)}>More filters{appliedChips.length ? ` (${appliedChips.length})` : ''}</button>
        </div>
        <form className="explore-docket__search" role="search" onSubmit={(e) => { e.preventDefault(); submitSearch(q.trim()); }}>
          <input aria-label="Case lookup — search firms by name, city or practice" placeholder="Case lookup — firm, city, practice" value={q} onChange={(e) => { setQ(e.target.value); submitSearch(e.target.value.trim()); }} />
        </form>
        <a href="/sprint" className="explore-docket__cta">File 20 in the Sprint →</a>
      </div>

      {appliedChips.length > 0 && (
        <div className="explore-docket__chips">
          {appliedChips.map((c) => (
            <FilterChip key={`${c.key}:${c.value ?? ''}`} onRemove={() => setFilters(removeChip(filters, c))}>{c.label}</FilterChip>
          ))}
          <button type="button" className="explore-docket__clear" onClick={() => { setFilters(EMPTY); setQ(''); }}>Clear all</button>
        </div>
      )}

      {/* The immersive stage — map backdrop + themed drawers */}
      <div className="explore-stage">
        <Suspense fallback={<div className="explore-docket__skel" aria-hidden="true" />}>
          <PhaseMap counts={mapCounts} goTo={goTo} onState={setStateParam} onCityPick={({ name, abbr }) => openCity(abbr, name)} height="min(78vh, 820px)" />
        </Suspense>

        {(firmOpen || drill || positionsOpen) && (
          <aside className="imm-drawer" aria-label={drawerTitle}>
            <div className="imm-drawer__bar">
              {firmOpen ? (
                <button type="button" className="imm-drawer__back" onClick={closeFirm}>← Docket</button>
              ) : (filters.state || filters.city?.length) ? (
                <button type="button" className="imm-drawer__back" onClick={() => setFilters(EMPTY)}>← National</button>
              ) : null}
              <span className="imm-drawer__title">{drawerTitle}</span>
              {!firmOpen && !positionsOpen && <span className="imm-drawer__count">{results.length}</span>}
              <button type="button" className="imm-drawer__x" aria-label="Close" onClick={() => { closeFirm(); showTab('firms'); if (!firmOpen) setFilters(EMPTY); }}><X size={16} aria-hidden="true" /></button>
            </div>
            <div className="imm-drawer__body">
              {loading ? (
                <p className="cl__empty">Loading the docket…</p>
              ) : positionsOpen ? (
                <Positions params={params} setParams={setParams} firmById={(id) => firms.find((f) => f.id === (idMap?.get(id) ?? id))} onOpenFirm={openFirm} />
              ) : firmOpen ? (
                <CaseFile firm={selected} listings={firmListings} saved={savedIds.has(selected.id)} onToggleSave={toggleSave} />
              ) : (
                <CaseList firms={results} onOpen={openFirm} savedIds={savedIds} onToggleSave={toggleSave} emptyLabel="No firms match this docket. Clear a filter above." />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* The unlock, as a sealed case file (national view only) */}
      {!canSeeDetails && !firmOpen && !drill && !positionsOpen && (
        <div className="explore-seal__band">
          <div className="explore-seal">
            <p className="explore-seal__ex">Exhibit · Under seal</p>
            <h2 className="explore-seal__h">The full record is sealed</h2>
            <p className="explore-seal__p">Firm names, who each hires (1L, 2L, post-grad), windows and recruiting contacts are held under seal. Enter your email to break the seal — free, one message.</p>
            <UnlockForm source="/explore" />
          </div>
        </div>
      )}

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="More filters" footer={<Button className="w-full" onClick={() => setFiltersOpen(false)}>Show {results.length} firms</Button>}>
        <AllFilters options={options} filters={filters} set={set} sort={sort} setSort={setSort} />
      </Drawer>

      <MapCtaBar />
    </div>
  );
}

export default function Explore() {
  return <ExplorePage />;
}
