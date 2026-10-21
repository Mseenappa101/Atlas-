import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

// Counts from 0 to `value` once, the first time it scrolls into view. Reduced motion → final value
// immediately. rAF with an ease-out; only updates text, no layout churn.
export default function CountUp({ value = 0, duration = 1100, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduced || !value) { setN(value); return undefined; }
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setN(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduced, duration]);

  return <span ref={ref} className={className}>{n.toLocaleString()}</span>;
}
