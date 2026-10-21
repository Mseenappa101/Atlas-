import { useEffect } from 'react';
import Lenis from 'lenis';

// Lenis smooth scroll, desktop only (≥1024px, not reduced motion). Mobile keeps native scroll so the
// Vaul drawers and touch behavior stay untouched. Renders nothing.
export default function SmoothScroll() {
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lenis = null;
    let raf = 0;

    const start = () => {
      if (lenis || !desktop.matches || reduce.matches) return;
      lenis = new Lenis({ duration: 1.05, smoothWheel: true });
      const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      lenis?.destroy();
      lenis = null;
      raf = 0;
    };
    const sync = () => { if (desktop.matches && !reduce.matches) start(); else stop(); };

    sync();
    desktop.addEventListener('change', sync);
    reduce.addEventListener('change', sync);
    return () => {
      desktop.removeEventListener('change', sync);
      reduce.removeEventListener('change', sync);
      stop();
    };
  }, []);

  return null;
}
