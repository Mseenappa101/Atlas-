import { useEffect, useState } from 'react';

/**
 * Minimal dark takeover nav for the Edition homepage: wordmark, two plain links,
 * one action. No bar chrome while over the cover; a thin ink veil fades in once
 * the reader scrolls, so links stay legible over the lit chapters. Light text
 * throughout (the whole page is dark/cream on a near-black ground).
 */
export default function EditionNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`ed-nav${scrolled ? ' is-scrolled' : ''}`}>
      <a href="/" className="ed-nav__mark" aria-label="Firmward — The Edition">
        Firmward
      </a>
      <nav className="ed-nav__links" aria-label="Primary">
        <a href="/explore">Explore firms</a>
        <a href="/classic">Classic site</a>
        <a href="/sprint" className="ed-nav__cta">Start the Sprint</a>
      </nav>
    </header>
  );
}
