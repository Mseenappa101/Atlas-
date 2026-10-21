import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE_OUT, STAGGER } from '../../lib/motion';

// The state postcard reveal. One component, driven entirely by per-state data (src/data/states/<code>.js).
// Sequence (~1.2s, then interactive): outline draws → fill → landmark rises behind → city pins drop →
// postage-stamp badge stamps in → ambient loop → onReveal() fires (parent slides the firm list up).
// Reduced motion or a tap shows the final card instantly; nothing here blocks the firm list.

const T = { outline: 0, fill: 0.5, landmark: 0.72, pins: 0.92, stamp: 1.08, total: 1.4 };

function starPath(cx, cy, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    d += `${i === 0 ? 'M' : 'L'}${(cx + rr * Math.cos(rad)).toFixed(2)},${(cy + rr * Math.sin(rad)).toFixed(2)}`;
  }
  return `${d}Z`;
}

// White perforation bites around a w×h stamp.
function perfDots(w, h, step = 10, r = 2.6) {
  const dots = [];
  for (let x = step / 2; x < w; x += step) dots.push([x, 0], [x, h]);
  for (let y = step / 2; y < h; y += step) dots.push([0, y], [w, y]);
  return dots.map(([x, y], i) => ({ x, y, r, i }));
}

// In-SVG postage stamp so it scales with the card (viewBox units) at every width. Stamps in with a spring.
function StampSvg({ x, y, w, h, title, detail, c, done, speed = 1 }) {
  const dots = useMemo(() => perfDots(w, h, 10, 2.4), [w, h]);
  return (
    <motion.g
      initial={{ opacity: 0, scale: 1.3, rotate: -14 }}
      animate={{ opacity: 1, scale: 1, rotate: -5 }}
      transition={done ? { duration: 0 } : { delay: T.stamp * speed, type: 'spring', stiffness: 420, damping: 15 }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      <g transform={`translate(${x},${y})`}>
        <rect x="2.5" y="3.5" width={w - 2} height={h - 2} rx="3" fill={c.ink} opacity="0.1" />
        <rect x="1" y="1" width={w - 2} height={h - 2} rx="3" fill={c.fill} />
        {dots.map((d) => <circle key={d.i} cx={d.x} cy={d.y} r={d.r} fill={c.paper} />)}
        <rect x="6" y="6" width={w - 12} height={h - 12} fill="none" stroke={c.ink} strokeWidth="0.8" strokeDasharray="2 2.5" opacity="0.5" />
        <path d={starPath(w / 2, 25, 10)} fill={c.star} />
        <text x={w / 2} y={h - 21} textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="0.06em" fill={c.ink}>{title}</text>
        <text x={w / 2} y={h - 9} textAnchor="middle" fontSize="8.5" fontWeight="600" letterSpacing="0.06em" fill={c.ink} opacity="0.8">{detail}</text>
      </g>
    </motion.g>
  );
}

export default function StatePostcard({ data, firmCount = 0, label = 'firms', onReveal, className = '', speed = 1 }) {
  const reduced = useReducedMotion();
  const [skipped, setSkipped] = useState(false);
  const done = Boolean(reduced) || skipped;
  const [vw, vh] = data.viewBox;
  const c = data.colors;
  const L = data.landmark;

  const firedRef = useRef(false);
  const fire = () => { if (!firedRef.current) { firedRef.current = true; onReveal?.(); } };
  useEffect(() => {
    if (done) { fire(); return undefined; }
    const timer = setTimeout(fire, T.total * 1000 * speed);
    return () => clearTimeout(timer);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const tr = (base) => (done ? { duration: 0 } : { ...base, delay: (base.delay ?? 0) * speed, duration: (base.duration ?? 0) * speed });
  const spring = (delay) => (done ? { duration: 0 } : { delay: delay * speed, type: 'spring', stiffness: 520, damping: 18 });

  const belowTen = firmCount < 10;
  const title = data.name.toUpperCase();
  const detail = belowTen ? 'COMING SOON' : `${firmCount} ${label.toUpperCase()}`;

  // Landmark local box → centred motif sitting on the fill, under the outline/pins.
  const [lbw, lbh] = L.box;
  const lScale = (vw * (L.scale ?? 0.4)) / lbw;
  const lx = data.centroid[0] - (lbw * lScale) / 2 + (L.dx ?? 0);
  const ly = data.centroid[1] - lbh * lScale * (L.anchorY ?? 0.62) + (L.dy ?? 0);
  // Generic art schema (art/accent), backward-compatible with TX's dome/finialStar.
  const artPaths = L.art ?? L.dome ?? [];
  const accent = L.accent ?? (L.finialStar ? { d: L.finialStar, color: 'star' } : null);
  const clipId = `pc-clip-${data.code}`;

  return (
    <div className={`relative overflow-hidden rounded-app border border-line shadow-pop ${className}`} style={{ background: c.paper }}>
      <svg viewBox={`0 0 ${vw} ${vh}`} className="block w-full" role="img" aria-label={`${data.name}: ${belowTen ? 'coming soon' : `${firmCount} ${label}`}`}>
        {/* state fill */}
        <motion.path d={data.outline} fill={c.fill} stroke="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tr({ delay: T.fill, duration: 0.3, ease: EASE_OUT })} />

        {/* landmark motif rises on the fill, under the outline + pins; clipped to the state outline */}
        <clipPath id={clipId}><path d={data.outline} /></clipPath>
        <g clipPath={`url(#${clipId})`}>
          <g transform={`translate(${lx}, ${ly}) scale(${lScale})`}>
            <motion.g initial={{ opacity: 0, y: 16 }} animate={{ opacity: 0.52, y: 0 }} transition={tr({ delay: T.landmark, duration: 0.4, ease: EASE_OUT })}>
              {artPaths.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={c.ink} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {accent && <path d={accent.d} fill={c[accent.color] ?? c.star} stroke="none" />}
            </motion.g>
          </g>
        </g>

        {/* state outline draws itself */}
        <motion.path d={data.outline} fill="none" stroke={c.ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={tr({ delay: T.outline, duration: 0.55, ease: EASE_OUT })} />

        {/* city pins drop with a small bounce; labels carry a paper halo for legibility */}
        {data.cities.filter((ct) => ct.pin).map((ct, i) => {
          const lb = ct.label ?? {};
          const dx = lb.dx ?? 8;
          const dy = lb.dy ?? 4;
          const anchor = lb.anchor ?? 'start';
          return (
            <motion.g key={ct.name} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={spring(T.pins + i * STAGGER.base)}>
              <circle cx={ct.pin[0]} cy={ct.pin[1] + 1} r={5.5} fill={c.ink} opacity={0.14} />
              <circle cx={ct.pin[0]} cy={ct.pin[1]} r={4.5} fill={c.accent} stroke={c.paper} strokeWidth={1.5} />
              {ct.capital && <path d={starPath(ct.pin[0], ct.pin[1] - 0.2, 2.4)} fill={c.paper} />}
              <text
                x={ct.pin[0] + dx}
                y={ct.pin[1] + dy}
                textAnchor={anchor}
                fontSize="11.5"
                fontWeight="600"
                fill={c.ink}
                stroke={c.paper}
                strokeWidth={3}
                strokeLinejoin="round"
                style={{ paintOrder: 'stroke' }}
              >
                {ct.name}
              </text>
            </motion.g>
          );
        })}

        {/* ambient lone star twinkle */}
        {data.ambient === 'star' && (
          <motion.path
            d={starPath(26, 28, 10)}
            fill={c.star}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={reduced ? { opacity: 0.9, scale: 1 } : { opacity: [0.9, 0.45, 0.9], scale: [1, 1.12, 1] }}
            transition={reduced ? { duration: 0 } : { delay: T.total * speed, duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '26px 28px' }}
          />
        )}

        {/* generic ambient: a soft pulsing mark for non-star states */}
        {data.ambient === 'glow' && (
          <motion.circle
            cx={26}
            cy={28}
            r={6}
            fill={c.star}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={reduced ? { opacity: 0.7, scale: 1 } : { opacity: [0.7, 0.3, 0.7], scale: [1, 1.15, 1] }}
            transition={reduced ? { duration: 0 } : { delay: T.total * speed, duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '26px 28px' }}
          />
        )}

        {/* postage-stamp badge stamps in (in-SVG so it scales with the card) */}
        <StampSvg x={vw - 122} y={10} w={112} h={80} title={title} detail={detail} c={c} done={done} speed={speed} />
      </svg>

      {/* nickname + copy */}
      <div className="px-4 pb-4 pt-2">
        <p className="text-t12 font-semibold uppercase tracking-[0.12em]" style={{ color: c.ink }}>{data.nickname}</p>
        <p className="mt-1 max-w-md text-t14 text-fg-2">{data.copy}</p>
      </div>

      {/* tap to skip (removed once revealed) */}
      {!done && (
        <button type="button" onClick={() => setSkipped(true)} aria-label="Skip animation" className="absolute inset-0 cursor-default bg-transparent" />
      )}
    </div>
  );
}
