import { SITE } from '../../../site.config';

const P = SITE.PRICES;

/**
 * The six sections of The Firmward Edition, cast as a legal record: § section
 * marks, docket numbers, a case-caption voice. Copy is original; prices and
 * routes come straight from site.config so the record never drifts from the
 * live offer ladder.
 *
 * `swash` is the first letter of the tagline, rendered as a dropped initial;
 * `tagline` is the remainder. `art` maps to public/art/<slug>/.
 */
export const CHAPTERS = [
  {
    id: 'ch-map',
    roman: 'I',
    label: 'The Map',
    kicker: '§ I',
    docket: 'No. 24-001',
    title: 'The Map',
    art: 'the-map',
    swash: 'E',
    tagline: 'very firm that hires sits in a jurisdiction — the only question is which dockets are open.',
    body:
      'Most candidates file into a void: a dozen marquee names, a careers-page form, silence on the record. The map begins elsewhere — with the firms actually hiring in the venues you can actually move to. Select a jurisdiction, read who is open, and build outward from there.',
    cta: { label: 'Open the map', href: '/explore' },
    tone: 'paper',
  },
  {
    id: 'ch-sprint',
    roman: 'II',
    label: 'The Sprint',
    kicker: '§ II',
    docket: 'No. 24-002',
    title: 'The Sprint',
    art: 'the-sprint',
    swash: 'T',
    tagline: 'wo weeks on the record: a shortlist, a letter that holds up, and applications filed.',
    body:
      'The Sprint is the on-ramp. A short, structured term that turns "I should really apply" into a finished shortlist and a batch of applications you are proud to put your name to — counseled, not guessed.',
    priceNote: `$${P.sprint} · one-time`,
    cta: { label: 'Start the Sprint', href: '/sprint' },
    tone: 'night',
  },
  {
    id: 'ch-membership',
    roman: 'III',
    label: 'Membership',
    kicker: '§ III',
    docket: 'No. 24-003',
    title: 'Membership',
    art: 'membership',
    swash: 'A',
    tagline: ' search is a term, not an afternoon — membership is the chambers you run it from.',
    body:
      'When the Sprint rests, the search continues. Membership keeps the record open: fresh firm leads, counsel on your materials, and a chambers of people doing the same work on the same calendar.',
    priceNote: `$${P.membershipMonthly}/mo · or $${P.membershipAnnual}/yr`,
    cta: { label: 'See membership', href: '/membership' },
    tone: 'paper',
  },
  {
    id: 'ch-placement',
    roman: 'IV',
    label: 'The 90-Day Placement',
    kicker: '§ IV',
    docket: 'No. 24-004',
    title: 'The 90-Day Placement',
    art: 'placement',
    swash: 'N',
    tagline: 'inety days, argued with you — targeting, outreach, and interviews until an offer is entered.',
    body:
      'The Placement is the done-with-you track. Over a 90-day term we build the target list, run the outreach, and prepare you through interviews — a concentrated effort aimed at a signed offer on the record.',
    priceNote: `$${P.placementTerm.toLocaleString()} · per 90-day term`,
    cta: { label: 'Explore the Placement', href: '/placement' },
    tone: 'night',
  },
  {
    id: 'ch-where',
    roman: 'V',
    label: 'Where Firms Hire',
    kicker: '§ V',
    docket: 'No. 24-005',
    title: 'Where Firms Hire',
    art: 'where-firms-hire',
    swash: 'E',
    tagline: 'ach jurisdiction is its own venue, with its own firms, calendars, and ways in.',
    body:
      'A filing from the venues where candidates actually land. Review a jurisdiction to read the texture of its market before you commit your term to it.',
    cta: { label: 'Review the jurisdictions', href: '/explore' },
    tone: 'paper',
  },
  {
    id: 'ch-about',
    roman: 'VI',
    label: 'Of Counsel',
    kicker: '§ VI',
    docket: 'No. 24-006',
    title: 'Of Counsel',
    art: 'about',
    swash: 'F',
    tagline: 'irmward exists because the hardest part of the search is knowing where to aim.',
    body:
      'Built by someone who ran this search and wished the map had already been entered into evidence. Firmward is the instrument and the counsel together — from the first shortlist to the offer on the record.',
    cta: { label: 'Read the record', href: '/about' },
    tone: 'night',
  },
];
