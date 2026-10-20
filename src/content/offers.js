import { SITE } from '../../site.config';
import { money } from '../lib/money';

const P = SITE.PRICES;

// The offer ladder, in order. Used by the home page cards and the sales pages.
export const OFFERS = [
  {
    key: 'sprint',
    name: '20-Firm Sprint',
    price: `${money(P.sprint)} one-time`,
    promise: 'In 5 days you’ll have a target list, a fixed resume, and 20 outreach emails sent to firms that are actually hiring for your role.',
    bullets: [
      'A 20-firm target list from the Firmward database, filtered to your class year and role',
      'The top third of your resume, fixed',
      'An outreach email that gets answered, then 20 of them sent',
      'A live 45-minute call with Michael on Friday',
    ],
    cta: 'Join the next Sprint',
    to: '/sprint',
  },
  {
    key: 'membership',
    name: 'Firmward Membership',
    price: `${money(P.membershipMonthly)}/month or ${money(P.membershipAnnual)}/year`,
    promise: 'Keep sending, every week, with someone reading your drafts.',
    bullets: [
      'Weekly live call: a 15-minute lesson and live critique of members’ outreach',
      'Monthly Outreach Sprint with a leaderboard (20 sends a month)',
      'Monthly group mock interview',
      'The full Firmward database, templates and interview library, plus the AI drafting tool',
    ],
    cta: 'See Membership',
    to: '/membership',
  },
  {
    key: 'placement',
    name: 'The 90-Day Placement',
    price: `${money(P.placementTerm)} per 90-day term, billed ${money(P.placementMonthly)}/month`,
    promise: 'A done-for-you search for your summer or post-grad job: Michael runs it with you until you accept an offer.',
    bullets: [
      'A 75–100 firm target list and a resume and cover letter overhaul',
      '15–20 personalized emails or cover letters drafted for you every week',
      'Follow-ups, reply triage, a mock before every interview and offer negotiation',
      'At least 75 firms contacted in 90 days, or the work continues free',
    ],
    cta: 'Apply for the Placement',
    to: '/placement',
  },
];
