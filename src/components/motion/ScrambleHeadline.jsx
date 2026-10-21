import { useLayoutEffect, useRef } from 'react';

// Headline resolves from a left-to-right character scramble into place (~600ms), once per session.
// Uses text content + rAF (no filter blur), so it stays within the transform/opacity motion budget and
// writes directly to the DOM node (no per-frame React re-render). SSR/prerender renders the final text.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const SESSION_KEY = 'firmward.hero-played';
const DURATION = 600;
const SPREAD = 0.55; // fraction of the run over which the lock-in staggers across characters

export default function ScrambleHeadline({ text, as: Tag = 'h1', className }) {
  const ref = useRef(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let played = false;
    try { played = Boolean(sessionStorage.getItem(SESSION_KEY)); } catch { /* no storage */ }
    if (reduced || played) { el.textContent = text; return undefined; }
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }

    // Lock the real rendered height so random-width scramble chars can't re-wrap and shift content below
    // (this was the main CLS source). Cleared when the real text is restored (same height → no shift).
    const lockedHeight = el.offsetHeight;
    el.style.height = `${lockedHeight}px`;
    el.style.overflow = 'hidden';

    const chars = [...text];
    const start = performance.now();
    let raf = 0;
    const finish = () => { el.textContent = text; el.style.height = ''; el.style.overflow = ''; };
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION);
      el.textContent = chars.map((ch, i) => {
        if (ch.trim() === '') return ch;
        const lock = (i / chars.length) * SPREAD;
        const p = (t - lock) / (1 - SPREAD);
        return p >= 1 ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }).join('');
      if (t < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    el.textContent = chars.map((ch) => (ch.trim() === '' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, reduced]);

  return <Tag ref={ref} className={className}>{text}</Tag>;
}
