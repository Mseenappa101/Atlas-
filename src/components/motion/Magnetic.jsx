import { useRef } from 'react';

// Magnetic hover (desktop, fine pointer): the element drifts up to `max` px toward the cursor, smoothed by
// a CSS transition. Tactile press (any device): scales in slightly on pointer-down. No Framer Motion —
// direct transform writes keep it off the critical-path bundle. Reduced motion / coarse pointer → no drift.
export default function Magnetic({ children, max = 6, className = '' }) {
  const ref = useRef(null);
  const press = useRef(false);
  const pos = useRef({ x: 0, y: 0 });
  const fine = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const apply = () => {
    if (ref.current) ref.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) scale(${press.current ? 0.97 : 1})`;
  };
  function onMove(e) {
    if (!fine || reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    pos.current = {
      x: Math.max(-max, Math.min(max, (e.clientX - (r.left + r.width / 2)) * 0.35)),
      y: Math.max(-max, Math.min(max, (e.clientY - (r.top + r.height / 2)) * 0.35)),
    };
    apply();
  }
  const reset = () => { pos.current = { x: 0, y: 0 }; press.current = false; apply(); };
  const down = () => { press.current = true; apply(); };
  const up = () => { press.current = false; apply(); };

  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onPointerDown={down}
      onPointerUp={up}
      className={className}
      style={{ display: 'inline-flex', transition: 'transform 150ms cubic-bezier(0.2,0,0,1)', willChange: 'transform' }}
    >
      {children}
    </span>
  );
}
