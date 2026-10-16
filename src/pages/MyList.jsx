import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, LayoutGrid, Table2, Trash2 } from 'lucide-react';
import RequireProfile from '../components/RequireProfile';
import { ButtonLink, Segmented } from '../components/app/controls';
import { MonogramTile, StatusPill } from '../components/app/firm';
import { EmptyState, FirmRowSkeleton } from '../components/app/feedback';
import useCatalog from '../hooks/useCatalog';
import useMyList from '../hooks/useMyList';
import useSession from '../hooks/useSession';
import { supabase } from '../lib/supabase';
import { loadSavedSearches } from '../lib/savedSearches';
import { applyFilters, writeFilters } from '../components/explore/filters';

const STAGES = [
  { value: 'saved', label: 'Saved' },
  { value: 'researching', label: 'Researching' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'not-pursuing', label: 'Not pursuing' },
];
const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.value, s.label]));
// Old tracker values from before migration 004.
const LEGACY = { Researching: 'researching', Applied: 'applied', 'Heard Back': 'interviewing', Callback: 'interviewing', Offer: 'offer', Rejected: 'not-pursuing' };
const stageOf = (row) => LEGACY[row.status] ?? (STAGE_LABEL[row.status] ? row.status : 'saved');

const DAY = 86_400_000;
const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// The next date that matters for this firm: its earliest future deadline, else its next opening.
function nextDate(firm) {
  const t = today();
  const ends = firm.offices.map((o) => o.end).filter((d) => d && d >= t).sort((a, b) => a - b);
  if (ends.length) return { kind: 'deadline', date: ends[0] };
  const starts = firm.offices.map((o) => o.start).filter((d) => d && d >= t).sort((a, b) => a - b);
  if (starts.length) return { kind: 'opens', date: starts[0] };
  const past = firm.offices.map((o) => o.end).filter(Boolean).sort((a, b) => b - a);
  return past.length ? { kind: 'passed', date: past[0] } : null;
}

function Flag({ row }) {
  const n = row.next;
  if (!n) return null;
  const days = Math.round((n.date - today()) / DAY);
  if (n.kind === 'passed' && (row.stage === 'saved' || row.stage === 'researching')) {
    return <span className="rounded-pill bg-st-closed-bg px-2 py-0.5 text-t12 font-medium text-st-closed-text">Deadline passed</span>;
  }
  if (n.kind === 'deadline' && days <= 7 && row.stage !== 'applied' && row.stage !== 'not-pursuing') {
    return (
      <span className="rounded-pill bg-st-soon-bg px-2 py-0.5 text-t12 font-medium text-st-soon-text">
        {days === 0 ? 'Due today' : `Due in ${days} day${days === 1 ? '' : 's'}`}
      </span>
    );
  }
  return null;
}

function StageSelect({ row, onChange, label }) {
  return (
    <select
      aria-label={label ?? `Stage for ${row.firm.name}`}
      value={row.stage}
      onChange={(e) => onChange(row, e.target.value)}
      className="min-h-[44px] rounded-app border border-line bg-card px-2 text-t14 hover:border-fg-2 md:min-h-[32px]"
    >
      {STAGES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

function Notes({ row, onSave }) {
  const [value, setValue] = useState(row.notes ?? '');
  return (
    <input
      aria-label={`Notes for ${row.firm.name}`}
      value={value}
      placeholder="Add a note"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== (row.notes ?? '') && onSave(row, value)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="min-h-[44px] w-full min-w-[160px] rounded-app border border-transparent bg-transparent px-2 py-1.5 text-t14 placeholder:text-fg-2 hover:border-line focus:border-line focus:bg-card lg:min-h-0"
    />
  );
}

function ThisWeek({ rows, alerts }) {
  const t = today();
  const due = rows.filter((r) => r.next?.kind === 'deadline' && r.next.date - t <= 7 * DAY && r.stage !== 'not-pursuing');
  const opened = rows.filter((r) => r.firm.offices.some((o) => o.start && o.start <= t && t - o.start <= 7 * DAY));
  if (!due.length && !opened.length && !alerts.length) return null;
  return (
    <section aria-labelledby="week-h" className="mb-6 rounded-app border border-line bg-card p-4">
      <h2 id="week-h" className="text-t14 font-semibold">This week</h2>
      <ul className="mt-2 space-y-1.5 text-t14">
        {due.map((r) => (
          <li key={`d-${r.id}`}>
            <span className="data text-t12 text-st-soon-text">{fmt(r.next.date)}</span> · Deadline: <Link to={`/firms/${r.firm.slug}`} className="font-medium text-brand hover:underline">{r.firm.name}</Link>
          </li>
        ))}
        {opened.map((r) => (
          <li key={`o-${r.id}`}>
            Window just opened: <Link to={`/firms/${r.firm.slug}`} className="font-medium text-brand hover:underline">{r.firm.name}</Link>
          </li>
        ))}
        {alerts.map((a) => (
          <li key={`s-${a.search.id}`}>
            <Link to={a.href} className="font-medium text-brand hover:underline">{a.search.name}</Link>: {a.count} window{a.count === 1 ? '' : 's'} opened in the last 7 days
          </li>
        ))}
      </ul>
    </section>
  );
}

function TableView({ rows, onStage, onNotes, onRemove }) {
  return (
    <>
      <div className="relative hidden overflow-x-auto rounded-app border border-line bg-card lg:block">
        <table className="w-full text-left text-t14">
          <caption className="sr-only">Saved firms, sorted by deadline</caption>
          <thead className="border-b border-line text-t12 text-fg-2">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Firm</th>
              <th scope="col" className="px-3 py-2 font-medium">Stage</th>
              <th scope="col" className="px-3 py-2 font-medium">Window</th>
              <th scope="col" className="px-3 py-2 font-medium">Applied</th>
              <th scope="col" className="w-full px-3 py-2 font-medium">Notes</th>
              <th scope="col" className="px-3 py-2"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="align-middle">
                <th scope="row" className="px-3 py-2 font-normal">
                  <Link to={`/firms/${r.firm.slug}`} className="flex items-center gap-2.5 hover:underline">
                    <MonogramTile name={r.firm.name} size="sm" />
                    <span className="whitespace-nowrap font-medium">{r.firm.name}</span>
                  </Link>
                </th>
                <td className="px-3 py-2"><StageSelect row={r} onChange={onStage} /></td>
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex flex-col items-start gap-1">
                    <StatusPill status={r.firm.status} />
                    <Flag row={r} />
                  </div>
                </td>
                <td className="data whitespace-nowrap px-3 py-2 text-t12 text-fg-2">{r.applied_at ? fmt(new Date(r.applied_at)) : 'Not yet'}</td>
                <td className="px-3 py-2"><Notes row={r} onSave={onNotes} /></td>
                <td className="px-3 py-2">
                  <button type="button" aria-label={`Remove ${r.firm.name}`} onClick={() => onRemove(r)} className="inline-flex h-9 w-9 items-center justify-center rounded-app text-fg-2 hover:bg-brand-tint hover:text-fg">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 lg:hidden">
        {rows.map((r) => (
          <li key={r.id} className="rounded-app border border-line bg-card p-3">
            <Link to={`/firms/${r.firm.slug}`} className="flex min-h-[44px] items-center gap-2.5">
              <MonogramTile name={r.firm.name} size="sm" />
              <span className="text-t16 font-semibold">{r.firm.name}</span>
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill status={r.firm.status} />
              <Flag row={r} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <StageSelect row={r} onChange={onStage} />
              {r.applied_at && <span className="data text-t12 text-fg-2">Applied {fmt(new Date(r.applied_at))}</span>}
            </div>
            <div className="mt-1"><Notes row={r} onSave={onNotes} /></div>
          </li>
        ))}
      </ul>
    </>
  );
}

function BoardView({ rows, onStage }) {
  const [over, setOver] = useState(null);
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {STAGES.map((s) => {
        const cards = rows.filter((r) => r.stage === s.value);
        return (
          <section
            key={s.value}
            aria-label={`${s.label}: ${cards.length}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(s.value);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const row = rows.find((r) => r.id === e.dataTransfer.getData('text/plain'));
              if (row && row.stage !== s.value) onStage(row, s.value);
            }}
            className={`min-h-[120px] rounded-app border bg-canvas p-2 transition-colors duration-150 ${over === s.value ? 'border-brand bg-brand-tint' : 'border-line'}`}
          >
            <h2 className="mb-2 flex items-center justify-between px-1 text-t12 font-semibold uppercase tracking-wide text-fg-2">
              {s.label}
              <span className="data font-normal">{cards.length}</span>
            </h2>
            <ul className="space-y-2">
              {cards.map((r) => (
                <li
                  key={r.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', r.id)}
                  className="cursor-grab rounded-app border border-line bg-card p-2.5 active:cursor-grabbing"
                >
                  <Link to={`/firms/${r.firm.slug}`} className="flex min-h-[44px] items-center truncate text-t14 font-semibold hover:underline md:min-h-0">{r.firm.name}</Link>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <StatusPill status={r.firm.status} />
                    <Flag row={r} />
                  </div>
                  {/* Keyboard and touch: move stages without dragging. */}
                  <div className="mt-2">
                    <StageSelect row={r} onChange={onStage} label={`Move ${r.firm.name} to`} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function SavedSearches({ searches, firms, onToggle, onDelete }) {
  if (!searches.length) return null;
  return (
    <section aria-labelledby="ss-h" className="mt-8">
      <h2 id="ss-h" className="mb-2 text-t16 font-semibold">Saved searches</h2>
      <ul className="divide-y divide-line rounded-app border border-line bg-card">
        {searches.map((s) => {
          const { sort, ...filters } = s.filters ?? {};
          const params = writeFilters(new URLSearchParams(sort && sort !== 'recommended' ? { sort } : {}), filters);
          const count = applyFilters(firms, { ...filters, type: filters.type ?? [], city: filters.city ?? [], status: filters.status ?? [], size: filters.size ?? [], practice: filters.practice ?? [] }).length;
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <Link to={`/explore?${params}`} className="min-w-0 truncate text-t14 font-medium text-brand hover:underline">
                {s.name}
              </Link>
              <span className="flex items-center gap-2">
                <span className="data text-t12 text-fg-2">{count} firms</span>
                <button
                  type="button"
                  aria-pressed={s.email_alerts}
                  aria-label={s.email_alerts ? `Turn off email alerts for ${s.name}` : `Email me about ${s.name}`}
                  onClick={() => onToggle(s)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-app hover:bg-brand-tint ${s.email_alerts ? 'text-brand' : 'text-fg-2'}`}
                >
                  {s.email_alerts ? <Bell size={16} aria-hidden="true" /> : <BellOff size={16} aria-hidden="true" />}
                </button>
                <button type="button" aria-label={`Delete ${s.name}`} onClick={() => onDelete(s)} className="inline-flex h-9 w-9 items-center justify-center rounded-app text-fg-2 hover:bg-brand-tint hover:text-fg">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {searches.some((s) => String(s.id).startsWith('local-')) && (
        <p className="mt-2 text-t12 text-fg-2">Some saved searches are stored on this device only.</p>
      )}
    </section>
  );
}

function MyListPage() {
  const { firms, idMap, loading } = useCatalog();
  const { rows: raw, toggle, update } = useMyList();
  const { session } = useSession();
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem('atlas.mylist-view') ?? 'table';
    } catch {
      return 'table';
    }
  });
  const [searches, setSearches] = useState([]);

  useEffect(() => {
    document.title = 'My List — Atlas';
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('atlas.mylist-view', view);
    } catch {
      // ignore
    }
  }, [view]);
  useEffect(() => {
    if (session) loadSavedSearches(session.user.id).then(setSearches);
  }, [session]);

  const byId = useMemo(() => new Map(firms.map((f) => [f.id, f])), [firms]);
  const rows = useMemo(
    () =>
      raw
        .map((r) => {
          const firm = byId.get(idMap?.get(r.firm_id) ?? r.firm_id);
          return firm ? { ...r, firm, stage: stageOf(r), next: nextDate(firm) } : null;
        })
        .filter(Boolean)
        .sort((a, b) => {
          const key = (r) => (r.next && r.next.kind !== 'passed' ? r.next.date.getTime() : Number.MAX_SAFE_INTEGER);
          return key(a) - key(b) || a.firm.name.localeCompare(b.firm.name);
        }),
    [raw, byId, idMap]
  );

  const alerts = useMemo(() => {
    const t = today();
    return searches
      .map((s) => {
        const { sort: _sort, ...f } = s.filters ?? {};
        const norm = { ...f, type: f.type ?? [], city: f.city ?? [], status: f.status ?? [], size: f.size ?? [], practice: f.practice ?? [] };
        const count = applyFilters(firms, norm).filter((firm) => firm.offices.some((o) => o.start && o.start <= t && t - o.start <= 7 * DAY)).length;
        return { search: s, count, href: `/explore?${writeFilters(new URLSearchParams(), norm)}` };
      })
      .filter((a) => a.count > 0);
  }, [searches, firms]);

  const onStage = (row, stage) => {
    const patch = { status: stage };
    if (stage === 'applied' && !row.applied_at) patch.applied_at = new Date().toISOString();
    update(row.id, patch);
  };
  const onNotes = (row, notes) => update(row.id, { notes });
  const onRemove = (row) => toggle(row.firm_id);

  async function toggleAlert(s) {
    setSearches((list) => list.map((x) => (x.id === s.id ? { ...x, email_alerts: !x.email_alerts } : x)));
    if (!String(s.id).startsWith('local-')) await supabase.from('saved_searches').update({ email_alerts: !s.email_alerts }).eq('id', s.id);
  }
  async function deleteSearch(s) {
    setSearches((list) => list.filter((x) => x.id !== s.id));
    if (String(s.id).startsWith('local-')) {
      try {
        const key = `atlas.saved-searches.${session.user.id}`;
        localStorage.setItem(key, JSON.stringify(JSON.parse(localStorage.getItem(key) ?? '[]').filter((x) => x.id !== s.id)));
      } catch {
        // ignore
      }
    } else await supabase.from('saved_searches').delete().eq('id', s.id);
  }

  return (
    <div className="mx-auto max-w-app px-4 pb-24 pt-6 md:px-6 md:pb-12">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-t24 font-bold tracking-tight md:text-t32">My List</h1>
          <p className="mt-1 text-t16 text-fg-2">
            <span className="data">{rows.length}</span> saved firm{rows.length === 1 ? '' : 's'}, sorted by the next deadline.
          </p>
        </div>
        {rows.length > 0 && (
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'table', label: 'Table', icon: Table2 },
              { value: 'board', label: 'Board', icon: LayoutGrid },
            ]}
          />
        )}
      </header>

      {loading && <div className="overflow-hidden rounded-app border border-line bg-card"><FirmRowSkeleton rows={4} /></div>}

      {!loading && (
        <>
          <ThisWeek rows={rows} alerts={alerts} />
          {rows.length === 0 ? (
            <EmptyState title="Nothing saved yet" action={<ButtonLink to="/explore">Explore firms</ButtonLink>}>
              Save firms from Explore with the bookmark, then track each one from saved to applied to offer here.
            </EmptyState>
          ) : view === 'board' ? (
            <BoardView rows={rows} onStage={onStage} />
          ) : (
            <TableView rows={rows} onStage={onStage} onNotes={onNotes} onRemove={onRemove} />
          )}
          <SavedSearches searches={searches} firms={firms} onToggle={toggleAlert} onDelete={deleteSearch} />
        </>
      )}
      {!loading && rows.length > 0 && (
        <p className="mt-6 text-t12 text-fg-2">
          Your list is saved to your profile, so it&rsquo;s there on any device you sign in on.
        </p>
      )}
    </div>
  );
}

export default function MyList() {
  return (
    <RequireProfile>
      <div className="app min-h-screen">
        <MyListPage />
      </div>
    </RequireProfile>
  );
}
