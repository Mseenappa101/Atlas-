import { useEffect, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import { geoPath } from 'd3-geo';
import { STATE_BY_NAME } from '../../lib/catalog';

// Representative firm counts for the showcase map (the live, filterable map lives on /explore).
// Values mirror the markets Firmward covers most deeply; everything else reads as "docket pending".
const COUNTS = {
  TX: 24, NY: 30, FL: 29, CA: 23, GA: 12, PA: 17, OH: 16, DC: 17, IL: 19, NC: 14,
  LA: 11, TN: 10, AL: 7, VA: 13, MA: 15, WA: 12, CO: 9, AZ: 8, MO: 8, MN: 7,
  NJ: 11, MD: 9, SC: 6, IN: 6, WI: 5, OR: 5, NV: 4, KY: 4, OK: 4, CT: 6,
};
const BINS = [
  { min: 20, color: '#2E7D57' },
  { min: 10, color: '#3F6D52' },
  { min: 5, color: '#4A5E4E' },
  { min: 1, color: '#50594F' },
];
const EMPTY = '#2A3345'; // unlit navy — docket pending
const fillFor = (n) => (n ? BINS.find((b) => n >= b.min).color : EMPTY);

const path = geoPath(); // us-atlas "albers" file is pre-projected to a 975×610 frame

/**
 * The immersive jurisdiction map — the docket laid out on a war-room table.
 * Reuses the us-atlas albers geometry, rendered on a CSS-3D tilted slab (a dark
 * marble top over a walnut edge) under a cursor-tracked banker's-lamp glow. The
 * whole plane parallaxes a few degrees toward the pointer; hovering a lit
 * jurisdiction raises a brass "case file" with its firm count. Transform/opacity
 * only; reduced-motion flattens the tilt and parallax and keeps it fully usable.
 */
export default function ImmersiveMap() {
  const [states, setStates] = useState(null);
  const [hover, setHover] = useState(null);
  const stageRef = useRef(null);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let live = true;
    import('us-atlas/states-albers-10m.json').then((m) => {
      const topo = m.default ?? m;
      if (live) setStates(feature(topo, topo.objects.states).features);
    });
    return () => { live = false; };
  }, []);

  const shapes = useMemo(
    () => (states ?? []).map((f) => ({
      abbr: STATE_BY_NAME[f.properties.name],
      name: f.properties.name,
      d: path(f),
      c: path.centroid(f),
    })),
    [states]
  );

  // Pointer → lamp position (--mx/--my, %) + a few degrees of parallax (--px/--py).
  const onMove = (e) => {
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    stage.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    stage.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    if (!reduce.current) {
      stage.style.setProperty('--px', (x - 0.5).toFixed(3));
      stage.style.setProperty('--py', (y - 0.5).toFixed(3));
    }
  };
  const onLeave = () => {
    const stage = stageRef.current;
    if (stage) { stage.style.setProperty('--px', '0'); stage.style.setProperty('--py', '0'); }
    setHover(null);
  };

  return (
    <figure className="ed-map3d-wrap" aria-label="Jurisdiction map of firms hiring, by state">
      <div
        ref={stageRef}
        className="ed-map3d-stage"
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <div className="ed-map3d">
          {/* walnut edge (the slab's thickness) */}
          <svg className="ed-map3d__slab" viewBox="0 0 975 610" aria-hidden="true">
            {shapes.map((s) => <path key={s.abbr} d={s.d} />)}
          </svg>
          {/* marble top with the lit jurisdictions */}
          <svg className="ed-map3d__top" viewBox="0 0 975 610" role="group" aria-label="States. The same choices are in the list below.">
            {shapes.map((s) => {
              const n = COUNTS[s.abbr] ?? 0;
              const lit = n > 0;
              return (
                <path
                  key={s.abbr}
                  d={s.d}
                  className={`ed-map3d__state${lit ? ' is-lit' : ''}${hover?.abbr === s.abbr ? ' is-hover' : ''}`}
                  style={{ fill: fillFor(n) }}
                  tabIndex={lit ? 0 : -1}
                  role={lit ? 'button' : undefined}
                  aria-label={lit ? `${s.name}: ${n} firms` : undefined}
                  onMouseEnter={lit ? () => setHover({ abbr: s.abbr, name: s.name, n, c: s.c }) : undefined}
                  onFocus={lit ? () => setHover({ abbr: s.abbr, name: s.name, n, c: s.c }) : undefined}
                  onClick={lit ? () => { window.location.href = '/explore'; } : undefined}
                  onKeyDown={lit ? (e) => { if (e.key === 'Enter') window.location.href = '/explore'; } : undefined}
                />
              );
            })}
          </svg>

          {/* case file raised over the hovered jurisdiction */}
          {hover && (
            <div
              className="ed-map3d__file"
              style={{ left: `${(hover.c[0] / 975) * 100}%`, top: `${(hover.c[1] / 610) * 100}%` }}
            >
              <span className="ed-map3d__file-no">{hover.abbr} · No. 24</span>
              <span className="ed-map3d__file-name">{hover.name}</span>
              <span className="ed-map3d__file-ct">{hover.n} firms on the docket</span>
            </div>
          )}
        </div>

        {/* banker's-lamp pool of light following the cursor */}
        <div className="ed-map3d__lamp" aria-hidden="true" />
        <div className="ed-map3d__frame" aria-hidden="true" />
      </div>
      <figcaption className="ed-map3d__cap">
        The jurisdiction docket — hover a state to open its file, or
        {' '}<a href="/explore">review the full map</a>.
      </figcaption>
    </figure>
  );
}
