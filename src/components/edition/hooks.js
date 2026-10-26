import { useEffect, useRef, useState } from 'react';

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * One-shot enter reveal: adds `.is-in` to every `.ed-reveal` under `rootRef`
 * when it scrolls into view. Keeps Framer Motion off this route entirely.
 */
export function useScrollReveals(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll('.ed-reveal');
    if (prefersReduced()) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

/**
 * Returns a ref + sets a `--reveal` CSS var (0→1) on it as the element travels
 * through the viewport, driving the line-art→colour crossfade. Progress is 0
 * while the plate is in the lower third, reaching 1 as it passes centre, so the
 * colour has fully bloomed by the time the chapter is read. rAF-throttled;
 * listens to window scroll (Lenis drives window scroll on desktop).
 */
export function useViewProgress() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) {
      el.style.setProperty('--reveal', '1');
      return;
    }
    let raf = 0;
    let active = false; // only read layout while the plate is near the viewport
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // --reveal: 0 when the plate top is at 85% of viewport, 1 when it reaches 35% (crossfade).
      const start = vh * 0.85;
      const end = vh * 0.35;
      const p = (start - r.top) / (start - end);
      el.style.setProperty('--reveal', String(Math.max(0, Math.min(1, p))));
      // --par: continuous -1..1 as the plate centre travels the viewport (parallax depth).
      const center = r.top + r.height / 2;
      el.style.setProperty('--par', String(Math.max(-1, Math.min(1, (vh / 2 - center) / vh))));
    };
    const onScroll = () => {
      if (active && !raf) raf = requestAnimationFrame(update);
    };
    // Gate the scroll work: run getBoundingClientRect only for plates in/near view.
    const io = new IntersectionObserver(
      (entries) => {
        active = entries[0].isIntersecting;
        if (active) update();
      },
      { rootMargin: '40% 0px 40% 0px' }
    );
    io.observe(el);
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

/**
 * Tracks which chapter section is currently active for the sticky index.
 * Returns the active chapter id. Uses an IntersectionObserver keyed on each
 * section crossing the vertical centre band of the viewport.
 */
export function useActiveChapter(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [ids]);
  return active;
}
