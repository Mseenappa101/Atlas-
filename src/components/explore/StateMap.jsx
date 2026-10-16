import { useEffect, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import { geoPath } from 'd3-geo';
import { STATE_BY_NAME, STATE_NAMES } from '../../lib/catalog';

// One-hue ordinal ramp (validated: monotone lightness, light end 2.07:1 on white). Zero is neutral, not part of the ramp.
const BINS = [
  { min: 20, color: '#1A4A37', label: '20+' },
  { min: 10, color: '#357556', label: '10–19' },
  { min: 5, color: '#5E9C7E', label: '5–9' },
  { min: 1, color: '#8FBFA5', label: '1–4' },
];
const EMPTY = '#ECEEEC';
const fill = (n) => (n ? BINS.find((b) => n >= b.min).color : EMPTY);

const path = geoPath(); // the us-atlas "albers" file is pre-projected to a 975×610 frame

export default function StateMap({ counts, breakdown, selected, onSelect }) {
  const [states, setStates] = useState(null);
  const [hover, setHover] = useState(null);
  const box = useRef(null);

  useEffect(() => {
    let live = true;
    import('us-atlas/states-albers-10m.json').then((m) => {
      const topo = m.default ?? m;
      if (live) setStates(feature(topo, topo.objects.states).features);
    });
    return () => {
      live = false;
    };
  }, []);

  const shapes = useMemo(
    () => (states ?? []).map((f) => ({ abbr: STATE_BY_NAME[f.properties.name], d: path(f), centroid: path.centroid(f) })),
    [states]
  );

  function show(e, abbr) {
    const r = box.current.getBoundingClientRect();
    const p = e.type === 'focus' ? (() => { const b = e.target.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y }; })() : { x: e.clientX, y: e.clientY };
    setHover({ abbr, x: p.x - r.left, y: p.y - r.top });
  }

  return (
    <figure className="m-0">
      <div ref={box} className="relative" onMouseLeave={() => setHover(null)}>
        {!states && <div className="aspect-[975/610] w-full animate-pulse rounded-app bg-line" aria-hidden="true" />}
        {states && (
          <svg viewBox="0 0 975 610" className="h-auto w-full" role="group" aria-label="Map of firms by state. Use the list of states for the same choices.">
            {shapes.map(({ abbr, d }) => {
              const n = counts[abbr] ?? 0;
              const isSel = selected === abbr;
              const interactive = n > 0;
              return (
                <path
                  key={abbr}
                  d={d}
                  fill={fill(n)}
                  stroke={isSel ? '#14181F' : '#FFFFFF'}
                  strokeWidth={isSel ? 2.5 : 1}
                  strokeLinejoin="round"
                  className={interactive ? 'cursor-pointer outline-none transition-[filter] duration-150 hover:brightness-110 focus-visible:brightness-110' : ''}
                  role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? 0 : -1}
                  aria-label={interactive ? `${STATE_NAMES[abbr]}: ${n} firm${n === 1 ? '' : 's'}` : undefined}
                  aria-hidden={interactive ? undefined : true}
                  aria-pressed={interactive ? isSel : undefined}
                  onMouseMove={(e) => show(e, abbr)}
                  onFocus={(e) => interactive && show(e, abbr)}
                  onBlur={() => setHover(null)}
                  onClick={() => interactive && onSelect(abbr)}
                  onKeyDown={(e) => {
                    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelect(abbr);
                    }
                  }}
                />
              );
            })}
          </svg>
        )}
        {hover && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-app border border-line bg-card p-3 shadow-pop"
            style={{ left: hover.x, top: hover.y }}
          >
            <p className="text-t14 font-semibold">{STATE_NAMES[hover.abbr]}</p>
            {counts[hover.abbr] ? (
              <>
                <p className="data text-t12 text-fg-2">{counts[hover.abbr]} firms</p>
                <ul className="mt-2 space-y-0.5">
                  {(breakdown[hover.abbr] ?? []).slice(0, 5).map(([group, n]) => (
                    <li key={group} className="flex justify-between gap-3 text-t12 text-fg-2">
                      <span>{group}</span>
                      <span className="data text-fg">{n}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-t12 text-fg-2">No firms yet. We&rsquo;re adding states every week.</p>
            )}
          </div>
        )}
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-t12 text-fg-2">
        <span>Firms per state</span>
        {[...BINS].reverse().map((b) => (
          <span key={b.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-3" style={{ background: b.color }} />
            <span className="data">{b.label}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 border border-line" style={{ background: EMPTY }} />
          No firms yet
        </span>
      </figcaption>
    </figure>
  );
}
