import { useEffect, useRef, useState } from 'react';

// Fires once when the element first scrolls into view. No Framer Motion — plain IntersectionObserver so
// it stays off the critical-path bundle. Falls back to visible if IO is unavailable.
export default function useInViewOnce({ amount = 0.2, rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null);
  // No IntersectionObserver (old browser / SSR) → start visible so content never sticks hidden.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setInView(true); io.disconnect(); }
    }, { threshold: amount, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [amount, rootMargin, inView]);
  return [ref, inView];
}
