import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BookmarkPlus, Map as MapIcon, Search, SlidersHorizontal } from 'lucide-react';
import { Button, FilterChip, Input, Segmented, Select } from '../components/app/controls';
import { FirmCard, FirmList } from '../components/app/firm';
import { BottomSheet, Drawer, FilterMenu } from '../components/app/overlays';
import { EmptyState, FirmRowSkeleton } from '../components/app/feedback';
import FirmDetail from '../components/explore/FirmDetail';
import StatePostcardHeader from '../components/postcard/StatePostcardHeader';
import { Drawer as Vaul } from 'vaul';
import SaveSearch from '../components/explore/SaveSearch';
import Positions from '../components/explore/Positions';
import {
  EMPTY, SIZE_BUCKETS, applyFilters, chipLabelFor, chips, gatedInUse, isFiltered, mostRestrictive, readFilters, removeChip, writeFilters,
} from '../components/explore/filters';
import UnlockForm from '../components/UnlockForm';
import { toast } from 'sonner';
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
const PhaseMap = lazy(() => import('../components/map3d/PhaseMap'));
import '../components/explore/explore-docket.css';

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

// ─── MAP HOME (the immersive national docket) ────────────────────────────────

function MapHome({ firms, filters, set, onPickState, onSearch, onPositions, unlocked }) {
  const activeRoles = useMemo(() => filters.role || [], [filters.role]);
  // Role tabs re-filter the live map: counts (and the docket total) recompute by role, with no page swap.
  const counts = useMemo(() => countsByState(applyFilters(firms, { ...EMPTY, role: activeRoles })), [firms, activeRoles]);
  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);
  const [q, setQ] = useState('');
  const toggleRole = (r) => set({ role: activeRoles.includes(r) ? activeRoles.filter((x) => x !== r) : [...activeRoles, r] });

  return (
    <div className="explore-docket">
      {/* Docket strip: role tabs (live filter) + case lookup + Sprint CTA */}
      <div className="explore-docket__bar">
        <p className="explore-docket__caption">
          <span className="ed-smallcaps">In re</span> <strong>The National Docket</strong>
          <span className="explore-docket__count" aria-live="polite">{total} firms{activeRoles.length ? ' · filtered' : ''}</span>
        </p>
        <div className="explore-docket__tabs" role="group" aria-label="Hiring for">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`explore-docket__tab${activeRoles.includes(r.value) ? ' is-on' : ''}`}
              aria-pressed={activeRoles.includes(r.value)}
              onClick={() => toggleRole(r.value)}
            >{r.label}</button>
          ))}
          <button type="button" className="explore-docket__tab" onClick={onPositions}>Open positions</button>
        </div>
        <form className="explore-docket__search" role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) onSearch(q.trim()); }}>
          <input aria-label="Case lookup — search firms by name, city or practice" placeholder="Case lookup — firm, city, practice" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <a href="/sprint" className="explore-docket__cta">File 20 in the Sprint →</a>
      </div>

      {/* The immersive jurisdiction map IS the page — re-lights live as the docket tabs filter */}
      <Suspense fallback={<div className="explore-docket__skel" aria-hidden="true" />}>
        <PhaseMap counts={counts} onOpenDocket={onPickState} height="min(74vh, 760px)" />
      </Suspense>

      {/* The unlock, entered as a sealed case file */}
      {!unlocked && (
        <div className="explore-seal__band">
          <div className="explore-seal">
            <p className="explore-seal__ex">Exhibit · Under seal</p>
            <h2 className="explore-seal__h">The full record is sealed</h2>
            <p className="explore-seal__p">Firm names, who each hires (1L, 2L, post-grad), application windows and recruiting contacts are held under seal. Enter your email to break the seal — free, one message.</p>
            <UnlockForm source="/explore" />
          </div>
        </div>
      )}
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
  const { session } = useSession();
  const { canSeeDetails } = useAccess();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [more, setMore] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firmDrawer, setFirmDrawer] = useState(false);
  const barRef = useRef(null);
  const wide = useMediaQuery('(min-width: 1024px)');

  // Toast when the gated data unlocks (email unlock or sign-in).
  const wasUnlocked = useRef(canSeeDetails);
  useEffect(() => {
    if (canSeeDetails && !wasUnlocked.current) {
      toast.success('Full data unlocked.', { description: 'Hiring details, windows and how to apply are now visible.' });
    }
    wasUnlocked.current = canSeeDetails;
  }, [canSeeDetails]);

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
  // Total firms in the selected state (for the postcard stamp — not the filtered count).
  const stateCount = useMemo(() => (filters.state ? firms.filter((f) => f.states.includes(filters.state)).length : 0), [firms, filters.state]);

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

  // Desktop: select in place (side panel). Mobile: open a Vaul bottom drawer with the firm detail.
  const select = (f) => {
    const next = new URLSearchParams(params);
    next.set('firm', f.slug);
    setParams(next, { replace: true });
    if (!wide) setFirmDrawer(true);
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

  // Map mode: the immersive docket stays up for map-level filters (role / status / hide-BigLaw) so the
  // docket tabs re-light the 3D map live. Drilling into a state, market, type, practice, search or a
  // specific firm hands off to the detailed record below.
  const drill = filters.state || filters.q || filters.city?.length || filters.type?.length || filters.size?.length || filters.practice?.length || params.get('firm');
  if (!drill && !loading) {
    return (
      <MapHome
        firms={firms}
        filters={filters}
        set={set}
        onPickState={(s) => set({ state: s })}
        onSearch={(q) => set({ q })}
        onPositions={() => showTab('positions')}
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
            {filters.state && !loading && <StatePostcardHeader code={filters.state} firmCount={stateCount} />}
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
                    key={`${filters.state}|${(filters.role || []).join()}|${(filters.type || []).join()}|${(filters.status || []).join()}|${(filters.size || []).join()}|${(filters.city || []).join()}|${filters.nobiglaw}|${sort}`}
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

      {/* Mobile firm detail: Vaul bottom drawer */}
      <Vaul.Root
        open={firmDrawer && !wide}
        onOpenChange={(o) => {
          setFirmDrawer(o);
          if (!o) {
            const next = new URLSearchParams(params);
            next.delete('firm');
            setParams(next, { replace: true });
          }
        }}
      >
        <Vaul.Portal>
          <Vaul.Overlay className="fixed inset-0 z-40 bg-black/30" />
          <Vaul.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-[16px] border-t border-line bg-canvas outline-none lg:hidden">
            <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-pill bg-line" aria-hidden="true" />
            <Vaul.Title className="sr-only">{selected ? selected.name : 'Firm detail'}</Vaul.Title>
            <div className="overflow-y-auto px-4 pb-10 pt-2">
              {selected && (
                <FirmDetail
                  firm={selected}
                  listings={firmListings}
                  similar={similar}
                  saved={savedIds.has(selected.id)}
                  onToggleSave={toggleSave}
                  onOpenFirm={select}
                />
              )}
            </div>
          </Vaul.Content>
        </Vaul.Portal>
      </Vaul.Root>
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

