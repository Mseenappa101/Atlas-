import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { m, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import { SPRING_SOFT } from '../../lib/motion';

// A small perforated postage stamp carrying the price — ties the ladder to the state postcards.
function StampBadge({ price }) {
  const w = 60;
  const h = 46;
  const dots = [];
  for (let x = 7; x < w; x += 8) dots.push([x, 0], [x, h]);
  for (let y = 7; y < h; y += 8) dots.push([0, y], [w, y]);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="-rotate-[6deg] shrink-0" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' }} aria-hidden="true">
      <rect x="1" y="1" width={w - 2} height={h - 2} rx="2.5" fill="var(--app-brand-tint)" />
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill="var(--app-bg)" />)}
      <rect x="5" y="5" width={w - 10} height={h - 10} fill="none" stroke="var(--app-brand)" strokeOpacity="0.4" strokeDasharray="2 2" />
      <text x={w / 2} y={h / 2 + 4.5} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--app-brand)">{price}</text>
    </svg>
  );
}

// A ticket-style offer card: perforation between the header stub and the body, a stamp price badge, and a
// 3D tilt + lift on hover (desktop only, max 4°). Reduced motion / coarse pointer → no tilt.
export default function TicketCard({ offer }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [4, -4]), SPRING_SOFT);
  const ry = useSpring(useTransform(px, [0, 1], [-4, 4]), SPRING_SOFT);
  const fine = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;

  function onMove(e) {
    if (reduced || !fine || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }
  const reset = () => { px.set(0.5); py.set(0.5); };

  return (
    <m.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      whileHover={reduced ? undefined : { y: -6 }}
      style={reduced ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className="ticket relative flex h-full flex-col rounded-app border border-line bg-card transition-shadow duration-200 hover:shadow-pop"
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div>
          <p className="data text-t12 text-fg-2">{offer.step}</p>
          <h3 className="mt-1 text-t20 font-bold leading-tight">{offer.name}</h3>
        </div>
        <StampBadge price={offer.badge} />
      </div>

      <div className="perf" aria-hidden="true" />

      <div className="flex flex-1 flex-col p-5 pt-4">
        <p className="text-t16">{offer.promise}</p>
        <ul className="mt-4 flex-1 space-y-2">
          {offer.bullets.map((b) => (
            <li key={b} className="flex gap-2 text-t14 leading-snug">
              <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Link to={offer.to} className="mt-5 inline-flex min-h-[44px] items-center gap-1 text-t16 font-semibold text-brand hover:underline">
          {offer.cta} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </m.div>
  );
}
