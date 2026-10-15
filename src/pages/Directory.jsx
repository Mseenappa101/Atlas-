import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { hasAccess } from '../lib/access';
import useFirms from '../hooks/useFirms';
import { latestVerified, longDate } from '../lib/firms';
import { site } from '../lib/site';
import FilterControls from '../components/directory/FilterControls';
import FirmTable, { TablePlaceholder } from '../components/directory/FirmTable';
import FirmPanel from '../components/directory/FirmPanel';
import PositionsView from '../components/directory/PositionsView';
import useListings from '../hooks/useListings';
import { EMPTY, activeCount, applyFilters, groupByMarket, marketList, readFilters, sortFirms, writeFilters } from '../components/directory/filters';
import { Sheet, CloseButton, Button } from '../components/ui';

export default function Directory() {
  const location = useLocation();
  if (!hasAccess()) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?next=${next}`} replace />;
  }
  return <DirectoryPage />;
}

function DirectoryPage() {
  const { firms, loading, error } = useFirms();
  const [params, setParams] = useSearchParams();
  const { firmId } = useParams();
  const navigate = useNavigate();
  const [filterSheet, setFilterSheet] = useState(false);

  const filters = readFilters(params);
  const sort = { key: params.get('sort') ?? 'firm', dir: params.get('dir') ?? 'asc' };
  const view = params.get('view') === 'market' ? 'market' : 'list';
  const tab = params.get('tab') === 'positions' ? 'positions' : 'firms';
  const { listings } = useListings();

  const markets = useMemo(() => marketList(firms), [firms]);
  const shown = useMemo(
    () => sortFirms(applyFilters(firms, filters), sort.key, sort.dir),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firms, params]
  );
  const updated = useMemo(() => latestVerified(firms), [firms]);
  const openFirm = firmId ? firms.find((f) => f.id === firmId) : null;

  useEffect(() => {
    document.title = 'Directory — Atlas';
  }, []);

  const setFilters = (f) => setParams(writeFilters(params, f), { replace: true });
  const clear = () => setFilters(EMPTY);

  function setSort(key) {
    const next = new URLSearchParams(params);
    const dir = sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc';
    next.set('sort', key);
    next.set('dir', dir);
    setParams(next, { replace: true });
  }

  function setView(v) {
    const next = new URLSearchParams(params);
    if (v === 'market') next.set('view', 'market');
    else next.delete('view');
    setParams(next, { replace: true });
  }

  function setTab(t) {
    const next = new URLSearchParams(params);
    if (t === 'positions') next.set('tab', 'positions');
    else next.delete('tab');
    setParams(next, { replace: true });
  }

  const search = params.toString() ? `?${params}` : '';
  const open = (firm) => navigate(`/directory/${firm.id}${search}`);
  const close = useCallback(() => navigate(`/directory${search}`), [navigate, search]);
  const n = activeCount(filters);

  return (
    <main className="page pt-8 md:pt-12">
      <header className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl">The 1L Directory</h1>
        <p className="mt-2 max-w-2xl text-base text-muted">
          Boutique, mid-size and regional firms, with whether they hire 1Ls, when they take applications and where to apply.
        </p>
        {!loading && !error && (
          <p className="nums mt-3 font-mono text-xs text-muted">
            <span className="whitespace-nowrap">{site.edition}</span> · <span className="whitespace-nowrap">{firms.length} firms</span>
            {updated && (
              <>
                {' '}· <span className="whitespace-nowrap">Updated {longDate(updated)}</span>
              </>
            )}
          </p>
        )}
      </header>

      <div role="group" aria-label="Show" className="no-print mb-4 flex gap-6 border-b border-rule">
        {[
          ['firms', 'Firms', firms.length],
          ['positions', 'Open positions', listings.length],
        ].map(([t, label, num]) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px min-h-[44px] border-b-2 pb-2 font-serif text-lg transition-colors ${
              tab === t ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
            {num > 0 && <span className="nums ml-2 font-mono text-xs text-muted">{num}</span>}
          </button>
        ))}
      </div>

      {tab === 'positions' && <PositionsView onOpenFirm={(id) => navigate(`/directory/${id}${search}`)} />}

      {tab === 'firms' && (
        <>
      <section aria-label="Filters" className="no-print hidden border-b border-rule pb-5 pt-1 md:block">
        <FilterControls filters={filters} onChange={setFilters} markets={markets} />
      </section>

      <div className="md:hidden">
        <Button variant="secondary" className="w-full" onClick={() => setFilterSheet(true)}>
          Filter{n > 0 && <span className="nums ml-2 font-mono text-xs">({n})</span>}
        </Button>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-4">
        <p className="nums font-mono text-xs" aria-live="polite">
          {loading ? 'Loading firms…' : error ? '' : `Showing ${shown.length} of ${firms.length} firms`}
          {n > 0 && (
            <button type="button" onClick={clear} className="link ml-4 font-sans">
              Clear filters
            </button>
          )}
        </p>
        <div className="flex items-baseline gap-3 text-xs" role="group" aria-label="View">
          <span className="caps text-muted">View</span>
          {[
            ['list', 'List'],
            ['market', 'By market'],
          ].map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`min-h-[44px] decoration-accent decoration-2 underline-offset-[5px] md:min-h-0 ${view === v ? 'text-ink underline' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <TablePlaceholder />}

      {error && (
        <p className="border-t border-rule py-6">
          Couldn&rsquo;t load the firm list. Check your connection and reload the page. If it keeps failing, the database may be
          down for maintenance — try again in a few minutes.
        </p>
      )}

      {!loading && !error && shown.length === 0 && (
        <p className="border-t border-rule py-6">
          No firms match these filters.{' '}
          <button type="button" onClick={clear} className="link">
            Clear filters
          </button>
        </p>
      )}

      {!loading && !error && shown.length > 0 && (
        <FirmTable
          firms={shown}
          groups={view === 'market' ? groupByMarket(shown) : null}
          sort={sort}
          onSort={setSort}
          onOpen={open}
        />
      )}

        </>
      )}

      {openFirm && <FirmPanel key={openFirm.id} firm={openFirm} onClose={close} />}

      <Sheet open={filterSheet} onClose={() => setFilterSheet(false)} label="Filters" variant="bottom">
        <div className="px-4 pb-4 pt-2">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <h2 className="caps text-sm">Filters</h2>
            <CloseButton onClick={() => setFilterSheet(false)} label="Done" />
          </div>
          <div className="py-4">
            <FilterControls filters={filters} onChange={setFilters} markets={markets} />
          </div>
          <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-rule bg-surface pt-3">
            {n > 0 ? (
              <button type="button" onClick={clear} className="link min-h-[44px] text-sm">
                Clear filters
              </button>
            ) : (
              <span />
            )}
            <Button onClick={() => setFilterSheet(false)}>
              Show <span className="nums mx-1 font-mono">{shown.length}</span> firms
            </Button>
          </div>
        </div>
      </Sheet>
    </main>
  );
}
