import ArtPlate from './ArtPlate';

/**
 * One chapter: giant grotesk headline on the night ground, then the figure +
 * an editorial serif tagline (oversized swash initial) and body/CTA. Paper-tone
 * chapters lay the body on a cream panel bitten in with torn-paper edges; the
 * CTA/price reuse the real routes and prices from site.config via chapters.js.
 *
 * `children` lets a chapter graft in a live app component (the state map, the
 * postcard) beneath the standard body.
 */
export default function Chapter({ chapter, eager = false, children }) {
  const paper = chapter.tone === 'paper';
  return (
    <section id={chapter.id} className="ed-chapter" aria-labelledby={`${chapter.id}-h`}>
      <header className="ed-chapter__head ed-reveal">
        <div className="ed-chapter__num ed-roman">{chapter.kicker}</div>
        <h2 id={`${chapter.id}-h`} className="ed-display">{chapter.title}</h2>
      </header>

      {paper && <div className="ed-torn" aria-hidden="true" />}
      <div className={paper ? 'ed-paper-section ed-panel' : 'ed-panel'}>
        <div className="ed-chapter__body">
          <div className="ed-reveal" data-d="1">
            <ArtPlate slug={chapter.art} alt={chapter.title} eager={eager} />
          </div>
          <div className="ed-chapter__text">
            <p className="ed-tagline ed-reveal" data-d="1">
              <span className="ed-swash">{chapter.swash}</span>
              {chapter.tagline}
            </p>
            <p className="ed-body ed-reveal" data-d="2">{chapter.body}</p>
            {chapter.priceNote && (
              <div className="ed-price ed-reveal" data-d="2">{chapter.priceNote}</div>
            )}
            <a className="ed-cta ed-reveal" data-d="3" href={chapter.cta.href}>
              {chapter.cta.label}
            </a>
          </div>
        </div>
        {children}
      </div>
      {paper && <div className="ed-torn ed-torn--up" aria-hidden="true" />}
    </section>
  );
}
