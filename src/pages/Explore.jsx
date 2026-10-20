import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BookmarkPlus, Map as MapIcon, Search, SlidersHorizontal } from 'lucide-react';
import { Button, FilterChip, Input, Segmented, Select } from '../components/app/controls';
import { FirmCard, FirmList } from '../components/app/firm';
import { BottomSheet, Drawer, FilterMenu } from '../components/app/overlays';
import { EmptyState, FirmRowSkeleton } from '../components/app/feedback';
import FirmDetail from '../components/explore/FirmDetail';
import SaveSearch from '../components/explore/SaveSearch';
import Positions from '../components/explore/Positions';
import {
  EMPTY, SIZE_BUCKETS, applyFilters, chipLabelFor, chips, gatedInUse, isFiltered, mostRestrictive, readFilters, removeChip, writeFilters,
} from '../components/explore/filters';
import UnlockForm from '../components/UnlockForm';
import MapCtaBar from '../components/MapCtaBar';
import useAccess from '../hooks/useAccess';
import { ROLES, ROLE_LABEL } from '../lib/roles';
import useCatalog from '../hooks/useCatalog';
import useListings from '../hooks/useListings';
import useMyList from '../hooks/useMyList';
import useSession from '../hooks/useSession';
import useMediaQuery from '../hooks/useMediaQuery';
import { FIRM_TYPES, STATE_NAMES, byDeadline, byName, countsByState, groupByType, recommended } from '../lib/catalog';
import { STATUS_FILTERS } from '../lib/status';

const StateMap = lazy(() => import('../components/explore/StateMap'));

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

// ─── COLLECTIONS ─────────────────────────────────────────────────────────────
// Each is a plain Explore filter, so "See all" is just that filter in the URL.

function collectionsFor(profile) {
  const markets = (profile?.target_market ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const types = (profile?.target_firm_type ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return [
    { title: 'Open now', filters: { status: ['open', 'rolling'] } },
    markets.length
      ? { title: 'Hiring in your markets', filters: { city: markets, nobiglaw: '1' } }
      : { title: 'Houston firms', filters: { city: ['Houston'], nobiglaw: '1' } },
    types.length ? { title: 'Your firm types', filters: { type: types } } : null,
    { title: 'Texas litigation boutiques', filters: { state: 'TX', type: ['litigation-boutique'] } },
    { title: 'Hiring for 2L summer', filters: { role: ['2l-summer'], nobiglaw: '1' } },
    { title: 'Opening soon', filters: { status: ['soon'] } },
    { title: 'Plaintiff and public interest', filters: { type: ['plaintiff', 'public-interest'] } },
    { title: 'Mid-size firms hiring for 1L summer', filters: { type: ['mid-size'], role: ['1l-summer'] } },
  ].filter(Boolean);
}

function Collections({ firms, profile, onOpen, unlocked }) {
  const rows = useMemo(
    () =>
      collectionsFor(profile)
        .filter((c) => unlocked || !gatedInUse({ ...EMPTY, ...c.filters }))
        .map((c) => ({ ...c, firms: recommended(applyFilters(firms, { ...EMPTY, ...c.filters }), profile) }))
        .filter((c) => c.firms.length >= 2),
    [firms, profile, unlocked]
  );
  if (!rows.length) return null;
  return (
    <section aria-label="Collections" className="mt-10 space-y-8">
      {rows.map((c) => (
        <div key={c.title}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-t20 font-semibold">{c.title}</h2>
            <button type="button" onClick={() => onOpen(c, null)} className="inline-flex min-h-[44px] items-center text-t14 font-medium text-brand hover:underline md:min-h-0">
              See all <span className="data">{c.firms.length}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {c.firms.slice(0, 6).map((f) => (
              <FirmCard key={f.id} firm={f} onOpen={(firm) => onOpen(c, firm)} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

// ─── MAP HOME ────────────────────────────────────────────────────────────────

function MapHome({ firms, onPickState, onSearch, onPositions, onRole, profile, onCollection, unlocked }) {
  const counts = useMemo(() => countsByState(firms), [firms]);
  const breakdown = useMemo(() => {
    const out = {};
    for (const f of firms) for (const s of f.states) ((out[s] ??= {})[f.group] = (out[s][f.group] ?? 0) + 1);
    return Object.fromEntries(Object.entries(out).map(([s, g]) => [s, Object.entries(g).sort((a, b) => b[1] - a[1])]));
  }, [firms]);
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const [q, setQ] = useState('');

  return (
    <div className="mx-auto max-w-app px-4 pb-24 pt-6 md:px-6 md:pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-t24 font-bold tracking-tight md:text-t32">Where do you want to work?</h1>
          <p className="mt-1 text-t16 text-fg-2">Pick a state to see its firms, sorted by type. Boutiques and mid-size firms come first.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Hiring for">
            <span className="text-t14 text-fg-2">Hiring for:</span>
            {ROLES.map((r) => (
              <FilterChip key={r.value} onClick={() => onRole(r.value)}>
                {r.label}
              </FilterChip>
            ))}
            <button type="button" onClick={onPositions} className="inline-flex min-h-[44px] items-center px-1 text-t14 font-medium text-brand hover:underline md:min-h-0">
              Open positions
            </button>
          </div>
        </div>
        <form
          className="w-full md:w-80"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) onSearch(q.trim());
          }}
          role="search"
        >
          <Input icon={Search} aria-label="Search all firms" placeholder="Or search all firms by name, city, practice" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>

      {!unlocked && (
        <div className="mt-5">
          <UnlockForm source="/explore" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-app border border-line bg-card p-3 md:p-5">
          <Suspense fallback={<div className="aspect-[975/610] w-full animate-pulse rounded-app bg-line" />}>
            <StateMap counts={counts} breakdown={breakdown} onSelect={onPickState} />
          </Suspense>
        </div>
        <nav aria-label="States" className="rounded-app border border-line bg-card">
          <h2 className="border-b border-line px-4 py-3 text-t14 font-semibold">States with firms</h2>
          <ul className="max-h-[520px] overflow-y-auto">
            {ranked.map(([abbr, n]) => (
              <li key={abbr}>
                <button
                  type="button"
                  onClick={() => onPickState(abbr)}
                  className="flex min-h-[44px] w-full items-center justify-between gap-3 border-b border-line px-4 text-left text-t14 hover:bg-canvas"
                >
                  <span>{STATE_NAMES[abbr] ?? abbr}</span>
                  <span className="data text-t12 text-fg-2">{n}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <Collections firms={firms} profile={profile} onOpen={onCollection} unlocked={unlocked} />
    </div>
  );
}

// ─── FILTERS ─────────────────────────────────────────────────────────────────

function useFilterOptions(firms, filters) {
  return useMemo(() => {
    // Counts reflect every other active filter, so numbers match what you'd get.
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

function PrimaryFilters({ options, filters, set }) {
  return (
    <>
      <FilterMenu label="State" options={options.state} value={filters.state ? [filters.state] : []} onChange={single((v) => set({ state: v, city: [] }))} />
      <FilterMenu label="Market" options={options.city} value={filters.city} onChange={(v) => set({ city: v })} />
      <FilterMenu label="Firm type" options={options.type} value={filters.type} onChange={(v) => set({ type: v })} />
      <FilterMenu label="Hires for" options={options.role} value={filters.role} onChange={(v) => set({ role: v })} />
      <FilterMenu label="Window status" options={options.status} value={filters.status} onChange={(v) => set({ status: v })} />
    </>
  );
}

function MoreFilters({ options, filters, set }) {
  const box = (key, value, label, count) => (
    <label key={value} className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-t14">
      <input
        type="checkbox"
        className="h-4 w-4 accent-[var(--app-brand)]"
        checked={filters[key].includes(value)}
        onChange={() => set({ [key]: filters[key].includes(value) ? filters[key].filter((x) => x !== value) : [...filters[key], value] })}
      />
      <span className="flex-1">{label}</span>
      {count != null && <span className="data text-t12 text-fg-2">{count}</span>}
    </label>
  );
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-1 text-t14 font-semibold">Firm size</legend>
        {SIZE_BUCKETS.map((s) => box('size', s.value, s.label))}
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-t14 font-semibold">Practice focus</legend>
        {options.practice.map((p) => box('practice', p.value, p.label, p.count))}
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-t14 font-semibold">Program</legend>
        <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-t14">
          <input type="checkbox" className="h-4 w-4 accent-[var(--app-brand)]" checked={Boolean(filters.split)} onChange={() => set({ split: filters.split ? '' : '1' })} />
          Split summers allowed
        </label>
        <p className="text-t12 text-fg-2">Few firms publish this yet, so this filter is narrow.</p>
      </fieldset>
      <Select
        label="Last verified"
        value={filters.verified}
        onChange={(e) => set({ verified: e.target.value })}
        options={[
          { value: '', label: 'Any time' },
          { value: '7', label: 'Within 7 days' },
          { value: '30', label: 'Within 30 days' },
          { value: '90', label: 'Within 90 days' },
        ]}
      />
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

function ExplorePage() {
  const { firms, idMap, loading, error } = useCatalog();
  const { listings } = useListings();
  const { ids: savedIds, toggle } = useMyList();
  const { session, profile } = useSession();
  const { canSeeDetails } = useAccess();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [more, setMore] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const barRef = useRef(null);
  const wide = useMediaQuery('(min-width: 1024px)');

  const filters = readFilters(params);
  const sort = params.get('sort') ?? 'recommended';
  const filtered = isFiltered(filters);
  const options = useFilterOptions(firms, filters);

  const results = useMemo(() => {
    const list = applyFilters(firms, filters);
    if (sort === 'deadline') return byDeadline(list);
    if (sort === 'az') return byName(list);
    return recommended(list, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firms, params]);
  const groups = useMemo(() => (filters.state && sort === 'recommended' ? groupByType(results) : [{ group: null, firms: results }]), [results, filters.state, sort]);

  const selectedSlug = params.get('firm');
  const selected = results.find((f) => f.slug === selectedSlug) ?? (selectedSlug ? firms.find((f) => f.slug === selectedSlug) : null) ?? results[0] ?? null;
  const firmListings = useMemo(
    () => (selected ? listings.filter((l) => (idMap?.get(l.firmId) ?? l.firmId) === selected.id) : []),
    [selected, listings, idMap]
  );
  const similar = useMemo(() => {
    if (!selected) return [];
    return recommended(firms.filter((f) => f.id !== selected.id && f.group === selected.group && f.states.some((s) => selected.states.includes(s))), null).slice(0, 4);
  }, [firms, selected]);

  const setFilters = (f) => {
    const next = writeFilters(params, f);
    next.delete('firm');
    next.delete('collection'); // edited filters no longer match the collection's title
    setParams(next, { replace: true });
  };
  const set = (patch) => setFilters({ ...filters, ...patch });
  const setSort = (v) => {
    const next = new URLSearchParams(params);
    if (v === 'recommended') next.delete('sort');
    else next.set('sort', v);
    setParams(next, { replace: true });
  };

  // Desktop: select in place. Mobile (list-only): open the firm page, remembering scroll.
  const select = (f) => {
    if (!wide) return open(f);
    const next = new URLSearchParams(params);
    next.set('firm', f.slug);
    setParams(next, { replace: true });
  };
  const open = (f) => {
    try {
      sessionStorage.setItem(`explore-scroll:${location.search}`, String(window.scrollY));
    } catch {
      // Scroll memory is a convenience.
    }
    navigate(`/firms/${f.slug}`, { state: { from: location.pathname + location.search } });
  };

  // Coming back from a firm page on mobile: return to the same spot in the list.
  useLayoutEffect(() => {
    if (loading) return;
    try {
      const y = sessionStorage.getItem(`explore-scroll:${location.search}`);
      if (y) {
        window.scrollTo(0, Number(y));
        sessionStorage.removeItem(`explore-scroll:${location.search}`);
      }
    } catch {
      // ignore
    }
  }, [loading, location.search]);

  // The list and detail panes scroll on their own; they need the filter bar's live height.
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--filterbar', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  });

  useEffect(() => {
    document.title = filters.state ? `${STATE_NAMES[filters.state]} firms — Firmward` : 'Explore — Firmward';
  }, [filters.state]);

  // Saving needs a profile; visitors get sent to sign up and come back here.
  const toggleSave = (f) => {
    if (!session) return navigate(`/signup?next=${encodeURIComponent(location.pathname + location.search)}`);
    toggle(f.id);
  };

  if (error) {
    return (
      <div className="mx-auto max-w-app px-4 py-10">
        <EmptyState title="Couldn’t load firms">Check your connection and reload the page. If it keeps happening, the database may be restarting; try again in a few minutes.</EmptyState>
      </div>
    );
  }

  const showTab = (t) => {
    const next = new URLSearchParams(params);
    if (t === 'positions') next.set('tab', 'positions');
    else next.delete('tab');
    setParams(next);
  };

  if (params.get('tab') === 'positions') {
    return (
      <div className="pb-20 md:pb-0">
        <div className="sticky top-14 z-20 border-b border-line bg-card">
          <div className="mx-auto flex max-w-app flex-wrap items-center gap-3 px-4 py-3 md:px-6">
            <Button variant="ghost" size="sm" icon={MapIcon} onClick={() => setParams(new URLSearchParams())}>
              Map
            </Button>
            <Segmented label="Show" value="positions" onChange={showTab} options={[{ value: 'firms', label: 'Firms' }, { value: 'positions', label: 'Open positions' }]} />
          </div>
        </div>
        <div className="mx-auto max-w-app lg:border-x lg:border-line">
          <Positions
            params={params}
            setParams={setParams}
            firmById={(id) => firms.find((f) => f.id === (idMap?.get(id) ?? id))}
            onOpenFirm={(f) => navigate(`/firms/${f.slug}`, { state: { from: location.pathname + location.search } })}
          />
        </div>
      </div>
    );
  }

  if (!filtered && !loading) {
    const openCollection = (c, firm) => {
      const next = writeFilters(new URLSearchParams(), { ...EMPTY, ...c.filters });
      next.set('collection', c.title);
      if (firm) {
        if (!wide) return navigate(`/firms/${firm.slug}`, { state: { from: `/explore?${next}` } });
        next.set('firm', firm.slug);
      }
      setParams(next);
    };
    return (
      <MapHome
        firms={firms}
        profile={profile}
        onPickState={(s) => set({ state: s })}
        onSearch={(q) => set({ q })}
        onPositions={() => showTab('positions')}
        onRole={(r) => set({ role: [r] })}
        onCollection={openCollection}
        unlocked={canSeeDetails}
      />
    );
  }

  const appliedChips = chips(filters);
  const restrictive = results.length === 0 && filtered ? mostRestrictive(firms, filters) : null;

  return (
    <div className="pb-20 md:pb-0">
      {/* Filter bar */}
      <div ref={barRef} className="sticky top-14 z-20 border-b border-line bg-card">
        <div className="mx-auto max-w-app px-4 py-3 md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" icon={MapIcon} onClick={() => setParams(new URLSearchParams(), { replace: false })} className="shrink-0">
              Map
            </Button>
            <Segmented label="Show" value="firms" onChange={showTab} options={[{ value: 'firms', label: 'Firms' }, { value: 'positions', label: 'Open positions' }]} />
            <form role="search" className="min-w-[200px] flex-1" onSubmit={(e) => e.preventDefault()}>
              <Input icon={Search} aria-label="Search firms" placeholder="Firm name, city or practice" value={filters.q} onChange={(e) => set({ q: e.target.value })} />
            </form>
            <Button variant="secondary" size="sm" icon={SlidersHorizontal} onClick={() => setSheet(true)} className="lg:hidden">
              Filters{appliedChips.length > 0 && <span className="data text-t12">({appliedChips.length})</span>}
            </Button>
          </div>
          <div className="mt-2 hidden flex-wrap items-center gap-2 lg:flex">
            <PrimaryFilters options={options} filters={filters} set={set} />
            <Button variant="secondary" size="sm" icon={SlidersHorizontal} onClick={() => setMore(true)}>
              More filters
            </Button>
            <FilterChip selected={Boolean(filters.nobiglaw)} onClick={() => set({ nobiglaw: filters.nobiglaw ? '' : '1' })}>
              Hide BigLaw
            </FilterChip>
          </div>
          {appliedChips.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {appliedChips.map((c) => (
                <FilterChip key={`${c.key}:${c.value ?? ''}`} onRemove={() => setFilters(removeChip(filters, c))}>
                  {c.label}
                </FilterChip>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY)}>
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-app lg:grid-cols-[420px_minmax(0,1fr)] lg:border-x lg:border-line">
        {/* Results */}
        <section aria-label="Results" className="min-w-0 border-line lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
            <p className="text-t14" aria-live="polite">
              {params.get('collection') && <span className="mr-1.5 font-semibold">{params.get('collection')} ·</span>}
              <span className="data font-medium">{loading ? '…' : results.length}</span> {results.length === 1 ? 'firm' : 'firms'}
            </p>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="sort">
                Sort
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="min-h-[44px] rounded-app border border-line bg-card px-2 text-t14 md:min-h-[32px]"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {session && (
                <Button variant="secondary" size="sm" icon={BookmarkPlus} onClick={() => setSaving(true)}>
                  Save search
                </Button>
              )}
            </div>
          </div>

          <div className="lg:h-[calc(100vh-56px-var(--filterbar,132px))] lg:overflow-y-auto">
            {!loading && !canSeeDetails && gatedInUse(filters) && (
              <div className="border-b border-line p-4">
                <UnlockForm
                  title={filters.role.length ? `See which firms hire for ${filters.role.map((r) => ROLE_LABEL[r]).join(' or ')}` : 'Unlock to use this filter'}
                  blurb="Showing every firm for now. Enter your email to filter by who’s hiring, see application windows and how to apply."
                  source="/explore"
                />
              </div>
            )}
            {!loading && canSeeDetails && filters.role.some((r) => r === 'post-grad' || r === 'entry-lateral') && results.length < 15 && (
              <p className="border-b border-line bg-canvas px-4 py-3 text-t14 text-fg-2">
                Post-grad and entry-level hiring data is new: {results.length} firm{results.length === 1 ? '' : 's'} confirmed so far, with more added as we check each firm.{' '}
                <button type="button" className="font-medium text-brand hover:underline" onClick={() => set({ role: [] })}>
                  Show all firms
                </button>
              </p>
            )}
            {loading && <FirmRowSkeleton rows={8} />}
            {!loading && results.length === 0 && (
              <div className="p-4">
                <EmptyState
                  title="No firms match these filters"
                  action={
                    restrictive && (
                      <Button variant="secondary" onClick={() => setFilters({ ...filters, [restrictive.key]: Array.isArray(filters[restrictive.key]) ? [] : '' })}>
                        Remove “{chipLabelFor(filters, restrictive.key)}”
                      </Button>
                    )
                  }
                >
                  {restrictive
                    ? `“${chipLabelFor(filters, restrictive.key)}” is ruling out the most firms. Removing it shows ${restrictive.n}.`
                    : 'Try a broader search.'}
                </EmptyState>
              </div>
            )}
            {!loading &&
              groups.map((g) => (
                <div key={g.group ?? 'all'}>
                  {g.group && (
                    <h2 className="sticky top-0 z-10 flex items-baseline justify-between border-b border-line bg-canvas px-4 py-2 text-t12 font-semibold uppercase tracking-wide text-fg-2">
                      {g.group}
                      <span className="data font-normal">{g.firms.length}</span>
                    </h2>
                  )}
                  <FirmList
                    firms={g.firms}
                    selectedId={wide ? selected?.id : null}
                    onSelect={select}
                    onOpen={open}
                    savedIds={savedIds}
                    onToggleSave={toggleSave}
                    label={g.group ? `${g.group} in ${STATE_NAMES[filters.state]}` : 'Firms'}
                  />
                </div>
              ))}
          </div>
        </section>

        {/* Detail (desktop) */}
        <section aria-label="Firm detail" className="hidden min-w-0 lg:block lg:h-[calc(100vh-56px-var(--filterbar,132px))] lg:overflow-y-auto">
          <div className="px-6 pt-6">
            {selected ? (
              <FirmDetail
                firm={selected}
                listings={firmListings}
                similar={similar}
                saved={savedIds.has(selected.id)}
                onToggleSave={toggleSave}
                onOpenFirm={select}
              />
            ) : (
              !loading && <p className="text-t14 text-fg-2">Select a firm to see its details.</p>
            )}
          </div>
        </section>
      </div>

      <Drawer open={more} onClose={() => setMore(false)} title="More filters" footer={<Button className="w-full" onClick={() => setMore(false)}>Show {results.length} firms</Button>}>
        <MoreFilters options={options} filters={filters} set={set} />
      </Drawer>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Filters" footer={<Button className="w-full" onClick={() => setSheet(false)}>Show {results.length} firms</Button>}>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <PrimaryFilters options={options} filters={filters} set={set} />
            <FilterChip selected={Boolean(filters.nobiglaw)} onClick={() => set({ nobiglaw: filters.nobiglaw ? '' : '1' })}>
              Hide BigLaw
            </FilterChip>
          </div>
          <MoreFilters options={options} filters={filters} set={set} />
          <Select label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} options={SORTS} />
        </div>
      </BottomSheet>

      {saving && <SaveSearch filters={filters} sort={sort} onClose={() => setSaving(false)} />}
    </div>
  );
}

export default function Explore() {
  return (
    <div className="app min-h-screen pb-16">
      <ExplorePage />
      <MapCtaBar />
    </div>
  );
}

