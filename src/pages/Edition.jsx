import { useEffect, useRef } from 'react';
import '../styles/edition.css';
import { CHAPTERS } from '../components/edition/chapters';
import EditionNav from '../components/edition/EditionNav';
import EditionCover from '../components/edition/EditionCover';
import ChapterIndex from '../components/edition/ChapterIndex';
import Chapter from '../components/edition/Chapter';
import EditionPostcards from '../components/edition/EditionPostcards';
import ExhibitCards from '../components/edition/ExhibitCards';
import { useScrollReveals } from '../components/edition/hooks';

/**
 * The Firmward Edition — the homepage. An editorial, chaptered take on the job
 * search that recreates the *techniques* of a classical magazine "editions" page:
 * a full-colour painting cover with a parchment index panel, a push-through into
 * a night starfield where the painting etches into line-art, a sticky
 * Roman-numeral chapter index, giant grotesk headlines over serif taglines with
 * swash initials, line-art→colour plate reveals, and torn-paper transitions into
 * cream pages.
 *
 * All artwork is public-domain (see public/art/CREDITS.md); prices and routes
 * come from site.config via chapters.js. Lazy-loaded in App with its own dark
 * chrome, so none of this — CSS, fonts, Framer Motion — touches the main bundle.
 */
export default function Edition() {
  const rootRef = useRef(null);
  const introWrapRef = useRef(null);

  useScrollReveals(rootRef);

  // Push-through: as the tall cover wrap scrolls past, drive `--push` (0→1) so the
  // painting etches into line-art, the starfield blooms, and the frame + panel zoom
  // through. Once the push finishes, fade in the pinned Edition label (`--pin`).
  // rAF-throttled; skipped under reduced motion.
  useEffect(() => {
    const wrap = introWrapRef.current;
    const root = rootRef.current;
    if (!wrap || !root) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      root.style.setProperty('--pin', '1');
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const travel = wrap.offsetHeight - vh; // scroll distance over which the cover is pinned
      const scrolled = -wrap.getBoundingClientRect().top;
      const p = Math.max(0, Math.min(1, travel > 0 ? scrolled / travel : 0));
      wrap.style.setProperty('--push', String(p));   // inherits to cover plates / stage / scroll hint
      root.style.setProperty('--pin', String(Math.max(0, (p - 0.75) * 4))); // pinned label as the push completes
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
      <EditionNav />
      <div className="ed-pin" aria-hidden="true">The Firmward<br />Edition</div>
      <ChapterIndex chapters={CHAPTERS} variant="bar" />

      <div className="ed-intro-wrap" ref={introWrapRef}>
        <EditionCover chapters={CHAPTERS} />
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

              <ExhibitCards />

              <footer className="ed-coda ed-reveal">
                <p className="ed-coda__fin">So ordered.</p>
                <p className="ed-coda__note">
                  <sup>†</sup> Artwork from the public domain (Art Institute of Chicago, CC0); see the
                  record of credits. Firmward, {new Date().getFullYear()}. No part of this constitutes legal advice.
                </p>
                <a className="ed-cta" href="/sprint">Start the Sprint</a>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
