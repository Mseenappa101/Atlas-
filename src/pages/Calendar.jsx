import { useEffect } from 'react';
import { CYCLE, MILESTONES, PATHS } from '../content/calendar';

const d = ([y, m, day]) => new Date(y, m - 1, day);
const START = d(CYCLE.start);
const END = d(CYCLE.end);
const SPAN = END - START;
const pct = (date) => Math.min(100, Math.max(0, ((date - START) / SPAN) * 100));
const fmt = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const MONTHS = [];
for (let m = new Date(START); m <= END; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) MONTHS.push(m);

function Timeline({ today }) {
  const showNow = today >= START && today <= END;
  return (
    <figure className="hidden md:block" aria-labelledby="timeline-caption">
      <figcaption id="timeline-caption" className="sr-only">
        Timeline of typical 1L application windows by career path, October to June. The same information is listed by month below.
      </figcaption>
      <div className="grid grid-cols-[9rem_1fr]" aria-hidden="true">
        <div />
        <div className="relative flex border-b border-ink">
          {MONTHS.map((m) => (
            <span key={m.getTime()} className="caps flex-1 border-l border-rule pb-1 pl-1.5 text-xs text-muted first:border-l-0 first:pl-0">
              {m.toLocaleDateString('en-US', { month: 'short' })}
            </span>
          ))}
        </div>

        {PATHS.map(({ path, windows }) => (
          <div key={path} className="contents">
            <div className="border-b border-rule py-3 pr-3 font-serif text-base">{path}</div>
            <div className="relative border-b border-rule py-2">
              <MonthLines />
              {windows.map((w) => {
                const left = pct(d(w.start));
                const width = pct(d(w.end)) - left;
                return (
                  <div key={w.label} className="relative h-8">
                    <div className="absolute top-0 truncate text-xs" style={{ left: `${left}%`, maxWidth: `${100 - left}%` }}>
                      {w.label} <span className="nums font-mono text-muted">{fmt(d(w.start))}–{fmt(d(w.end))}</span>
                    </div>
                    <div className="absolute bottom-1.5 h-1 bg-ink" style={{ left: `${left}%`, width: `${width}%` }} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div />
        <div className="relative h-6">
          {showNow && (
            <span className="nums absolute top-1 -translate-x-1/2 font-mono text-xs text-accent" style={{ left: `${pct(today)}%` }}>
              Now · {fmt(today)}
            </span>
          )}
        </div>
      </div>
    </figure>
  );
}

function MonthLines() {
  return (
    <div className="pointer-events-none absolute inset-0 flex" aria-hidden="true">
      {MONTHS.map((m) => (
        <span key={m.getTime()} className="flex-1 border-l border-dotted border-rule first:border-l-0" />
      ))}
    </div>
  );
}

function byMonth() {
  const items = MONTHS.map((m) => ({ month: m, entries: [] }));
  const slot = (date) => items.find((i) => i.month.getFullYear() === date.getFullYear() && i.month.getMonth() === date.getMonth());
  for (const { path, windows } of PATHS) {
    for (const w of windows) {
      const s = d(w.start);
      const e = d(w.end);
      slot(s)?.entries.push({ date: s, kind: 'Opens', text: `${path}: ${w.label}`, detail: `Through ${fmt(e)}. ${w.note}` });
      slot(e)?.entries.push({ date: e, kind: 'Closes', text: `${path}: ${w.label}`, detail: null });
    }
  }
  for (const m of MILESTONES) {
    const date = d(m.date);
    slot(date)?.entries.push({ date, kind: 'Note', text: m.text, detail: null });
  }
  for (const i of items) i.entries.sort((a, b) => a.date - b.date);
  return items;
}

export default function Calendar() {
  const today = new Date();
  const months = byMonth();

  useEffect(() => {
    document.title = '1L Recruiting Calendar — Atlas';
  }, []);

  return (
    <main className="page pt-8 md:pt-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl">1L Recruiting Calendar</h1>
          <p className="mt-2 max-w-2xl text-base text-muted">
            When each kind of employer usually takes 1L applications, October 2026 through June 2027. These are typical windows from past
            cycles. Always check the employer&rsquo;s own page for its deadline.
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className="link no-print min-h-[44px] text-sm">
          Save as PDF
        </button>
      </header>

      <div className="relative">
        <Timeline today={today} />
        <NowLine today={today} />
      </div>

      <section aria-labelledby="by-month" className="mt-12">
        <h2 id="by-month" className="caps border-b border-ink pb-1 text-xs text-muted">
          Month by month
        </h2>
        <ol>
          {months.map(({ month, entries }) => (
            <li key={month.getTime()} className="grid gap-x-6 border-b border-rule py-4 md:grid-cols-[9rem_1fr]">
              <h3 className="font-serif text-lg">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
              {entries.length ? (
                <ul className="mt-1 space-y-2 md:mt-0">
                  {entries.map((e, i) => (
                    <li key={i} className="grid grid-cols-[4.5rem_1fr] gap-3 text-sm">
                      <span className="nums font-mono text-xs leading-6 text-muted">{fmt(e.date)}</span>
                      <span>
                        <span className="caps mr-2 text-xs text-muted">{e.kind}</span>
                        {e.text}
                        {e.detail && <span className="block text-muted">{e.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-muted md:mt-0">Nothing new opens or closes. Follow up on what you&rsquo;ve sent.</p>
              )}
            </li>
          ))}
        </ol>
        <p className="nums mt-4 font-mono text-xs text-muted">Reviewed {CYCLE.reviewed}.</p>
      </section>
    </main>
  );
}

// Vertical "now" rule across the timeline rows (desktop only).
function NowLine({ today }) {
  if (today < START || today > END) return null;
  return (
    <div className="pointer-events-none absolute inset-y-0 left-[9rem] right-0 hidden md:block" aria-hidden="true">
      <div className="absolute bottom-6 top-0 w-px bg-accent" style={{ left: `${pct(today)}%` }} />
    </div>
  );
}
