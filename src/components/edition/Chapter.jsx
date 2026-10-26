import ArtPlate from './ArtPlate';

/**
 * One section of the record: a portico-framed opening (brass register rule, the
 * § mark and docket number, then a carved Cinzel title), the figure + an EB
 * Garamond tagline with a dropped initial, and body/CTA. Paper-tone sections lay
 * the body on a marble panel bitten in with torn-document edges; the CTA/price
 * reuse the real routes and prices from site.config via chapters.js.
 *
 * `children` lets a section graft in a live app component (the map, a postcard).
 */
export default function Chapter({ chapter, eager = false, children }) {
  const paper = chapter.tone === 'paper';
  return (
    <section id={chapter.id} className="ed-chapter" aria-labelledby={`${chapter.id}-h`}>
      <header className="ed-chapter__head ed-reveal">
        <div className="ed-chapter__meta">
          <span className="ed-chapter__sec ed-roman">{chapter.kicker}</span>
          <span className="ed-chapter__rule" aria-hidden="true" />
          <span className="ed-chapter__docket">{chapter.docket}</span>
        </div>
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
