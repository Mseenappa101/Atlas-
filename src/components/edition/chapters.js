import { SITE } from '../../../site.config';

const P = SITE.PRICES;

/**
 * The six chapters of The Firmward Edition. Copy is original (no third-party
 * brand text); prices and routes come straight from site.config / the existing
 * app so the Edition never drifts from the live offer ladder.
 *
 * `swash` is the first letter of the tagline, rendered oversized; `tagline` is
 * the remainder. `art` maps to public/art/<slug>/.
 */
export const CHAPTERS = [
  {
    id: 'ch-map',
    roman: 'I',
    label: 'The Map',
    kicker: 'Chapter I',
    title: 'The Map',
    art: 'the-map',
    swash: 'E',
    tagline: 'very firm that hires is a place on a map — the trick is knowing which pins are lit.',
    body:
      'Most students apply into a void: a dozen big names, a careers-page form, silence. The map starts somewhere else — with the firms that are actually hiring in the markets you can actually move to. Pick a state, see who is open, and work outward from there.',
    cta: { label: 'Open the map', href: '/explore' },
    tone: 'paper',
  },
  {
    id: 'ch-sprint',
    roman: 'II',
    label: 'The Sprint',
    kicker: 'Chapter II',
    title: 'The Sprint',
    art: 'the-sprint',
    swash: 'T',
    tagline: 'wo weeks, one disciplined push: a shortlist, a letter that lands, and applications out the door.',
    body:
      'The Sprint is the on-ramp. A short, structured program that turns "I should really apply" into a finished shortlist and a batch of applications you are proud of — guided, not guessed.',
    priceNote: `$${P.sprint} · one-time`,
    cta: { label: 'Start the Sprint', href: '/sprint' },
    tone: 'night',
  },
  {
    id: 'ch-membership',
    roman: 'III',
    label: 'Membership',
    kicker: 'Chapter III',
    title: 'Membership',
    art: 'membership',
    swash: 'A',
    tagline: ' search is a season, not an afternoon — membership is the room you run it from.',
    body:
      'When the Sprint ends, the search continues. Membership keeps the structure going: fresh firm leads, feedback on your materials, and a community of people doing the same work at the same time.',
    priceNote: `$${P.membershipMonthly}/mo · or $${P.membershipAnnual}/yr`,
    cta: { label: 'See membership', href: '/membership' },
    tone: 'paper',
  },
  {
    id: 'ch-placement',
    roman: 'IV',
    label: 'The 90-Day Placement',
    kicker: 'Chapter IV',
    title: 'The 90-Day Placement',
    art: 'placement',
    swash: 'N',
    tagline: 'inety days, run with you — targeting, outreach, and interviews until an offer is on the table.',
    body:
      'The Placement is the done-with-you track. Over a 90-day term we build the target list, run the outreach, and prepare you through interviews — a concentrated effort aimed at a signed offer.',
    priceNote: `$${P.placementTerm.toLocaleString()} · per 90-day term`,
    cta: { label: 'Explore the Placement', href: '/placement' },
    tone: 'night',
  },
  {
    id: 'ch-where',
    roman: 'V',
    label: 'Where Firms Hire',
    kicker: 'Chapter V',
    title: 'Where Firms Hire',
    art: 'where-firms-hire',
    swash: 'E',
    tagline: 'ach state is its own market, with its own firms, deadlines, and ways in.',
    body:
      'A postcard from the places law students actually land. Browse by state to see the texture of each market before you commit your time to it.',
    cta: { label: 'Browse by state', href: '/explore' },
    tone: 'paper',
  },
  {
    id: 'ch-about',
    roman: 'VI',
    label: 'About',
    kicker: 'Chapter VI',
    title: 'About',
    art: 'about',
    swash: 'F',
    tagline: 'irmward exists because the hardest part of the job search is knowing where to aim.',
    body:
      'Built by someone who went through this search and wished the map had existed. Firmward is the tool and the guidance together — from the first shortlist to the signed offer.',
    cta: { label: 'Read more', href: '/about' },
    tone: 'night',
  },
];
