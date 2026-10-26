import { SITE } from '../../../site.config';
import InkStamp from './InkStamp';

const P = SITE.PRICES;

// The three offers, entered as exhibits. Prices/links from site.config.
const EXHIBITS = [
  {
    tab: 'Exhibit A',
    name: 'The Sprint',
    price: `$${P.sprint}`,
    term: 'one-time',
    summary: 'The on-ramp — a shortlist, a letter that holds up, and applications filed in two weeks.',
    stipulations: ['A targeted firm shortlist', 'A resume that is fixed, not fussed', 'Your applications filed'],
    cta: { label: 'Start the Sprint', href: '/sprint' },
    stamp: 'Filed',
  },
  {
    tab: 'Exhibit B',
    name: 'Membership',
    price: `$${P.membershipMonthly}`,
    term: `/mo · or $${P.membershipAnnual}/yr`,
    summary: 'The chambers — fresh leads, counsel on your materials, and a cohort on the same calendar.',
    stipulations: ['Fresh firm leads, continually', 'Counsel on every draft', 'A working cohort'],
    cta: { label: 'See membership', href: '/membership' },
    stamp: 'Retained',
    featured: true,
  },
  {
    tab: 'Exhibit C',
    name: 'The 90-Day Placement',
    price: `$${P.placementTerm.toLocaleString()}`,
    term: 'per 90-day term',
    summary: 'Done-with-you — targeting, outreach, and interview prep argued through to a signed offer.',
    stipulations: ['Your target list, built', 'Outreach, run with you', 'Interview prep to an offer'],
    cta: { label: 'Explore the Placement', href: '/placement' },
    stamp: 'Hired',
  },
];

/**
 * The offer ladder, entered into the record as Exhibits A–C: file-folder tab
 * cards with price, stipulations and CTA. On hover/focus an ink stamp thumps
 * across the card — the reward micro-animation. Reuses real prices/links.
 */
export default function ExhibitCards() {
  return (
    <section id="exhibits" className="ed-exhibits" aria-labelledby="exhibits-h">
      <header className="ed-chapter__head ed-reveal">
        <div className="ed-chapter__meta">
          <span className="ed-chapter__sec ed-roman">§ VII</span>
          <span className="ed-chapter__rule" aria-hidden="true" />
          <span className="ed-chapter__docket">Schedule of Relief</span>
        </div>
        <h2 id="exhibits-h" className="ed-display">The Exhibits</h2>
      </header>

      <div className="ed-exhibits__grid">
        {EXHIBITS.map((x) => (
          <article key={x.tab} className={`ed-exhibit ed-reveal${x.featured ? ' ed-exhibit--featured' : ''}`}>
            <span className="ed-exhibit__tab ed-smallcaps">{x.tab}</span>
            <InkStamp label={x.stamp} sub="Firmward · entered" className="ed-exhibit__stamp" />
            <h3 className="ed-exhibit__name">{x.name}</h3>
            <p className="ed-exhibit__price">
              {x.price} <span>{x.term}</span>
            </p>
            <p className="ed-exhibit__summary">{x.summary}</p>
            <ul className="ed-exhibit__stips">
              {x.stipulations.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <a className="ed-cta ed-exhibit__cta" href={x.cta.href}>{x.cta.label}</a>
          </article>
        ))}
      </div>
    </section>
  );
}
