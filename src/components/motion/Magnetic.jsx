import { useRef } from 'react';
import { m, useMotionValue, useSpring, useReducedMotion } from 'motion/react';
import { SPRING_SOFT } from '../../lib/motion';

// Wraps an interactive element. On desktop (fine pointer) it drifts up to `max` px toward the cursor on
// a spring; on tap (any device) it presses in slightly. Reduced motion / coarse pointer → no drift.
export default function Magnetic({ children, max = 6, className = '' }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING_SOFT);
  const sy = useSpring(y, SPRING_SOFT);

  const fine = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;

  function onMove(e) {
    if (reduced || !fine || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    x.set(Math.max(-max, Math.min(max, dx * 0.35)));
    y.set(Math.max(-max, Math.min(max, dy * 0.35)));
  }
  const reset = () => { x.set(0); y.set(0); };

  return (
    <m.span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      whileTap={{ scale: 0.97 }}
      style={{ x: sx, y: sy, display: 'inline-flex' }}
      className={className}
    >
      {children}
    </m.span>
  );
}
