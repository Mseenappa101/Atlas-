import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, List, Printer } from 'lucide-react';
import { CYCLE, MILESTONES, PATHS } from '../content/calendar';
import { Button, IconButton, Segmented } from '../components/app/controls';
import useCatalog from '../hooks/useCatalog';
import useMyList from '../hooks/useMyList';
import useSession from '../hooks/useSession';
import useMediaQuery from '../hooks/useMediaQuery';
import { downloadIcs } from '../lib/ics';

// Categorical hues in fixed order (validated: CVD-separated; light ones always carry a text label).
const PATH_COLOR = {
  BigLaw: '#2a78d6',
  Boutique: '#eb6834',
  'Mid-size': '#1baf7a',
  Regional: '#eda100',
  Government: '#e87ba4',
  'Public interest': '#4a3aa7',
};

const d = ([y, m, day]) => new Date(y, m - 1, day);
const START = d(CYCLE.start);
const END = d(CYCLE.end);
const fmt = (x) => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const MONTHS = [];
for (let m = new Date(START); m <= END; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) MONTHS.push(m);

const PHASES = PATHS.flatMap(({ path, windows }) => windows.map((w) => ({ path, label: w.label, note: w.note, start: d(w.start), end: d(w.end) })));

function startOfToday() {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  return x;
}

// Firm application dates inside the cycle, as calendar events.
function firmEvents(firms) {
  const out = [];
  for (const f of firms) {
    for (const o of f.offices) {
      if (o.start && o.start >= START && o.start <= END) out.push({ kind: 'opens', date: o.start, firm: f, city: o.city });
      if (o.end && o.end >= START && o.end <= END) out.push({ kind: 'deadline', date: o.end, firm: f, city: o.city });
    }
  }
  return out.sort((a, b) => a.date - b.date);
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-t12 text-fg-2" aria-label="Recruiting phases by path">
      {Object.entries(PATH_COLOR).map(([path, color]) => (
        <li key={path} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5" style={{ background: color }} />
          {path}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2 w-2 rounded-pill bg-brand" />
        Firm window opens
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2 w-2 rounded-pill bg-fg" />
        Firm deadline
      </li>
    </ul>
  );
}

// Phases overlapping a month, drawn on a 1..N day strip.
function PhaseStrip({ month, today }) {
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const mStart = month;
  const mEnd = new Date(month.getFullYear(), month.getMonth(), days);
  const active = PHASES.filter((p) => p.start <= mEnd && p.end >= mStart);
  const pos = (x) => ((Math.min(Math.max(x, mStart), mEnd) - mStart) / 86_400_000 / days) * 100;
  const showToday = today >= mStart && today <= mEnd;
  if (!active.length) return <p className="text-t14 text-fg-2">No recruiting phase starts or runs this month.</p>;
  return (
    <div className="relative">
      <ul className="space-y-2">
        {active.map((p) => {
          const left = pos(p.start);
          const width = Math.max(pos(p.end) + 100 / days - left, 2);
          return (
            <li key={`${p.path}-${p.label}`} className="grid grid-cols-[minmax(0,180px)_1fr] items-center gap-3">
              <span className="truncate text-t12">
                <span className="font-medium">{p.path}</span> <span className="text-fg-2">· {p.label}</span>
              </span>
              <span className="relative block h-2 rounded-pill bg-canvas">
                <span className="absolute inset-y-0 rounded-pill" style={{ left: `${left}%`, width: `${width}%`, background: PATH_COLOR[p.path] }} />
              </span>
            </li>
          );
        })}
      </ul>
      {showToday && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 left-[calc(180px+0.75rem)]">
          <span className="absolute inset-y-[-4px] w-0.5 bg-brand" style={{ left: `${pos(today)}%` }} />
        </span>
      )}
    </div>
  );
}

function MonthGrid({ month, events, today }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const phaseMarks = (day) => PHASES.filter((p) => sameDay(p.start, day) || sameDay(p.end, day));
  return (
    <div className="overflow-hidden rounded-app border border-line bg-card">
      <div className="grid grid-cols-7 border-b border-line text-t12 text-fg-2" aria-hidden="true">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
          <span key={w} className="px-2 py-1.5">
            {w}
          </span>
        ))}
      </div>
      <ol className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <li key={`x${i}`} aria-hidden="true" className="min-h-[96px] border-b border-r border-line bg-canvas" />;
          const evs = events.filter((e) => sameDay(e.date, day));
          const marks = phaseMarks(day);
          const isToday = sameDay(day, today);
          return (
            <li key={day.getTime()} className={`min-h-[96px] border-b border-r border-line p-1.5 ${isToday ? 'bg-brand-tint' : ''}`}>
              <p className={`data text-t12 ${isToday ? 'font-semibold text-brand' : 'text-fg-2'}`}>
                {day.getDate()}
                {isToday && <span className="ml-1 font-app">Today</span>}
              </p>
              <ul className="mt-1 space-y-0.5">
                {marks.map((p) => (
                  <li key={`${p.path}${p.label}`} className="flex items-center gap-1 text-t12 leading-tight">
                    <span aria-hidden="true" className="h-2 w-2 shrink-0" style={{ background: PATH_COLOR[p.path] }} />
                    <span className="truncate">
                      {p.path}: {sameDay(p.start, day) ? 'opens' : 'closes'}
                    </span>
                  </li>
                ))}
                {evs.slice(0, 3).map((e) => (
                  <li key={`${e.kind}${e.firm.id}${e.city}`} className="text-t12 leading-tight">
                    <Link to={`/firms/${e.firm.slug}`} className="flex items-center gap-1 hover:underline">
                      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-pill ${e.kind === 'opens' ? 'bg-brand' : 'bg-fg'}`} />
                      <span className="truncate">
                        {e.kind === 'opens' ? 'Opens' : 'Due'}: {e.firm.name}
                      </span>
                    </Link>
                  </li>
                ))}
                {evs.length > 3 && <li className="text-t12 text-fg-2">+{evs.length - 3} more</li>}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function MonthList({ events }) {
  return (
    <ol className="space-y-4">
      {MONTHS.map((m) => {
        const inMonth = (x) => x.getFullYear() === m.getFullYear() && x.getMonth() === m.getMonth();
        const rows = [
          ...PHASES.flatMap((p) => [
            inMonth(p.start) && { date: p.start, key: `ps${p.path}${p.label}`, color: PATH_COLOR[p.path], text: `${p.path}: ${p.label} opens`, sub: `Through ${fmt(p.end)}. ${p.note}` },
            inMonth(p.end) && { date: p.end, key: `pe${p.path}${p.label}`, color: PATH_COLOR[p.path], text: `${p.path}: ${p.label} closes` },
          ]),
          ...MILESTONES.filter((x) => inMonth(d(x.date))).map((x) => ({ date: d(x.date), key: `m${x.text}`, text: x.text })),
          ...events.filter((e) => inMonth(e.date)).map((e) => ({ date: e.date, key: `${e.kind}${e.firm.id}${e.city}`, event: e })),
        ]
          .filter(Boolean)
          .sort((a, b) => a.date - b.date);
        return (
          <li key={m.getTime()} className="rounded-app border border-line bg-card">
            <h2 className="border-b border-line px-4 py-2.5 text-t16 font-semibold">{m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            {rows.length ? (
              <ul className="divide-y divide-line">
                {rows.map((r) => (
                  <li key={r.key} className="grid grid-cols-[56px_1fr_auto] items-start gap-3 px-4 py-2.5">
                    <span className="data pt-0.5 text-t12 text-fg-2">{fmt(r.date)}</span>
                    {r.event ? (
                      <span className="text-t14">
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden="true" className={`h-2 w-2 rounded-pill ${r.event.kind === 'opens' ? 'bg-brand' : 'bg-fg'}`} />
                          {r.event.kind === 'opens' ? 'Window opens' : 'Deadline'}:
                        </span>{' '}
                        <Link to={`/firms/${r.event.firm.slug}`} className="font-medium text-brand hover:underline">
                          {r.event.firm.name}
                        </Link>
                        <span className="text-fg-2"> · {r.event.city}</span>
                      </span>
                    ) : (
                      <span className="text-t14">
                        <span className="inline-flex items-center gap-1.5">
                          {r.color && <span aria-hidden="true" className="h-2.5 w-2.5" style={{ background: r.color }} />}
                          {r.text}
                        </span>
                        {r.sub && <span className="block text-fg-2">{r.sub}</span>}
                      </span>
                    )}
                    {r.event?.kind === 'deadline' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={CalendarPlus}
                        className="no-print"
                        onClick={() => downloadIcs({ title: `${r.event.firm.name}: 1L application deadline`, date: r.date, url: r.event.firm.applyUrl ?? r.event.firm.careersUrl ?? '' })}
                      >
                        <span className="sr-only md:not-sr-only">Add to calendar</span>
                      </Button>
                    ) : (
                      <span />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-3 text-t14 text-fg-2">Nothing opens or closes. Follow up on what you&rsquo;ve sent.</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function Calendar() {
  const { firms } = useCatalog();
  const { ids } = useMyList();
  const { session, profile } = useSession();
  const wide = useMediaQuery('(min-width: 768px)');
  const today = startOfToday();
  const [view, setView] = useState(null);
  const [scope, setScope] = useState('all');
  const [monthIndex, setMonthIndex] = useState(() => Math.max(0, MONTHS.findIndex((m) => m.getMonth() === today.getMonth() && m.getFullYear() === today.getFullYear())));
  const shownView = view ?? (wide ? 'month' : 'list');

  useEffect(() => {
    document.title = '1L recruiting calendar — Atlas';
  }, []);

  const markets = useMemo(() => (profile?.target_market ?? '').split(',').map((s) => s.trim()).filter(Boolean), [profile]);
  const events = useMemo(() => {
    const pool = scope === 'mine' ? firms.filter((f) => ids.has(f.id)) : scope === 'markets' ? firms.filter((f) => f.cities.some((c) => markets.includes(c))) : firms;
    return firmEvents(pool);
  }, [firms, ids, markets, scope]);

  function savePdf() {
    setView('list');
    setTimeout(() => window.print(), 50);
  }

  const month = MONTHS[monthIndex];

  return (
    <div className="app min-h-screen">
      <div className="mx-auto max-w-app px-4 pb-24 pt-6 md:px-6 md:pb-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-t24 font-bold tracking-tight md:text-t32">1L recruiting calendar</h1>
            <p className="mt-1 max-w-2xl text-t16 text-fg-2">
              October 2026 to June 2027. Phases are typical windows from past cycles; firm dates come from each firm&rsquo;s page. Always confirm on the
              employer&rsquo;s site.
            </p>
          </div>
          <Button variant="secondary" icon={Printer} onClick={savePdf} className="no-print">
            Download PDF
          </Button>
        </header>

        <div className="no-print mt-5 flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label="View"
            value={shownView}
            onChange={setView}
            options={[
              { value: 'month', label: 'Month', icon: CalendarDays },
              { value: 'list', label: 'List', icon: List },
            ]}
          />
          {session && (
            <Segmented
              label="Show firm dates for"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'mine', label: 'My List' },
                { value: 'markets', label: 'My markets' },
                { value: 'all', label: 'All' },
              ]}
            />
          )}
        </div>
        {scope === 'markets' && !markets.length && (
          <p className="mt-2 text-t14 text-fg-2">Add target markets to your profile to use this filter.</p>
        )}

        <div className="mt-4">
          <Legend />
        </div>

        {shownView === 'month' ? (
          <section aria-labelledby="month-h" className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <IconButton label="Previous month" icon={ChevronLeft} onClick={() => setMonthIndex((i) => Math.max(0, i - 1))} disabled={monthIndex === 0} />
              <h2 id="month-h" className="min-w-[160px] text-center text-t20 font-semibold">
                {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <IconButton label="Next month" icon={ChevronRight} onClick={() => setMonthIndex((i) => Math.min(MONTHS.length - 1, i + 1))} disabled={monthIndex === MONTHS.length - 1} />
            </div>
            <div className="mb-4 rounded-app border border-line bg-card p-4">
              <h3 className="mb-3 text-t14 font-semibold">Recruiting phases this month</h3>
              <PhaseStrip month={month} today={today} />
            </div>
            <MonthGrid month={month} events={events} today={today} />
            <p className="mt-2 text-t12 text-fg-2">Switch to List for &ldquo;Add to calendar&rdquo; on each deadline.</p>
          </section>
        ) : (
          <section aria-label="Month by month" className="mt-5">
            <MonthList events={events} />
          </section>
        )}
        <p className="data mt-4 text-t12 text-fg-2">Phases reviewed {CYCLE.reviewed}.</p>
      </div>
    </div>
  );
}
