import { useEffect, useRef } from 'react';
import '../styles/edition.css';
import { CHAPTERS } from '../components/edition/chapters';
import ConstructionIntro from '../components/edition/ConstructionIntro';
import ChapterIndex from '../components/edition/ChapterIndex';
import Chapter from '../components/edition/Chapter';
import EditionPostcards from '../components/edition/EditionPostcards';
import { useScrollReveals } from '../components/edition/hooks';

/**
 * The Firmward Edition — an editorial, chaptered take on the job search that
 * recreates the *techniques* of a classical magazine "editions" page:
 * construction-line cover, push-through into a night starfield, a sticky
 * Roman-numeral chapter index, giant grotesk headlines over serif taglines,
 * line-art→colour plate reveals, and torn-paper transitions into cream pages.
 *
 * All artwork is public-domain (see public/art/CREDITS.md); prices and routes
 * come from site.config via chapters.js. Lazy-loaded in App, so none of this —
 * CSS, fonts, or Framer Motion — touches the main bundle.
 */
export default function Edition() {
  const rootRef = useRef(null);
  const introWrapRef = useRef(null);

  useScrollReveals(rootRef);

  // Push-through: as the tall intro wrap scrolls past, drive `--push` (0→1) on
  // the pinned cover so the construction frame zooms toward the viewer and the
  // starfield blooms behind it. rAF-throttled; skipped under reduced motion.
  useEffect(() => {
    const wrap = introWrapRef.current;
    if (!wrap) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const hint = wrap.querySelector('.ed-intro__scroll');
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const travel = wrap.offsetHeight - vh; // scroll distance over which the cover is pinned
      const scrolled = -wrap.getBoundingClientRect().top;
      const p = Math.max(0, Math.min(1, travel > 0 ? scrolled / travel : 0));
      wrap.style.setProperty('--push', String(p)); // inherits to .ed-intro__stage / __space
      // fade the scroll hint out as soon as the push begins (animation-fill pins its opacity,
      // so set it directly rather than via a CSS var)
      if (hint) hint.style.opacity = String(Math.max(0, 1 - p * 5));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="edition edition-root" ref={rootRef}>
      <ChapterIndex chapters={CHAPTERS} variant="bar" />

      <div className="ed-intro-wrap" ref={introWrapRef}>
        <ConstructionIntro />
      </div>

      <div className="ed-night">
        <div className="ed-stars" aria-hidden="true" />
        <div className="ed-wrap" style={{ position: 'relative' }}>
          <div className="ed-grid-rail">
            <ChapterIndex chapters={CHAPTERS} variant="rail" />
            <div>
              {CHAPTERS.map((c, i) => (
                <Chapter key={c.id} chapter={c} eager={i === 0}>
                  {c.id === 'ch-where' && <EditionPostcards />}
                </Chapter>
              ))}

              <footer className="ed-reveal" style={{ padding: '4rem 0 6rem', color: 'var(--ed-gold-soft)', fontFamily: 'var(--ed-serif)', fontStyle: 'italic', fontSize: '1.05rem' }}>
                Fin. — Artwork from the public domain (Art Institute of Chicago, CC0);
                see credits. Firmward, {new Date().getFullYear()}.
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
