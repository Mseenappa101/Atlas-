import { useEffect, useRef, useState } from 'react';

// Fires once when the element first scrolls into view. No Framer Motion — plain IntersectionObserver so
// it stays off the critical-path bundle.
//
// Hydration-safe: the initial render is NOT in view on both the server (prerender) and the first client
// render, so the markup matches. After mount the observer reveals elements already on screen (its first
// callback fires for the current state) and the rest as they scroll in. setInView is only ever called
// from an async callback (observer / rAF), never synchronously in the effect body.
export default function useInViewOnce({ amount = 0.2, rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      const id = requestAnimationFrame(() => setInView(true)); // no IO (very old browser): just reveal
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setInView(true); io.disconnect(); }
    }, { threshold: amount, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [amount, rootMargin]);
  return [ref, inView];
}
