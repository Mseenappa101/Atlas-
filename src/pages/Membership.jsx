import { SITE, foundingOpen } from '../../site.config';
import usePageMeta from '../hooks/usePageMeta';
import Countdown from '../components/Countdown';
import { Checks, Cta, Eyebrow, Faq, Figure, H1, Lead, Page, ResponsiveTable, Section } from '../components/marketing/kit';
import LadderCrossSell from '../components/offers/LadderCrossSell';
import OfferCta from '../components/offers/OfferCta';
import { money } from '../lib/money';

const P = SITE.PRICES;
const F = SITE.FOUNDING;

const RHYTHM = [
  ['Every week', 'Live call', 'A 15-minute lesson, then live critique of members’ outreach drafts. Bring yours.'],
  ['Every month', 'Outreach Sprint', '20 sends in the month, tracked on a leaderboard so you actually do it.'],
  ['Every month', 'Group mock interview', 'Practice summer and post-grad interview questions with feedback.'],
  ['Anytime', 'Library and database', 'The full Firmward database, templates and the interview library (summer and post-grad), plus the AI drafting tool.'],
];

const FAQ = [
  ['Where does Membership happen?', 'On Skool: the calls, lessons, leaderboard and library are all there. The Firmward map and AI drafting tool are on firmward.org.'],
  ['Can I cancel?', 'Anytime, from Skool. You keep access until the end of the period you paid for.'],
  ['I just did the Sprint. Do I get credit?', `Yes. Join within ${F.sprintCreditHours} hours of the Sprint and your ${money(P.sprint)} is credited.`],
  ['Is it only for 1Ls?', 'No. Members are 1Ls through recent grads, looking for summer jobs and post-grad jobs. The weekly critique works the same either way.'],
];

export default function Membership() {
  usePageMeta({
    title: 'Firmward Membership: weekly outreach critique and a monthly sprint',
    description: `For law students and new grads: a weekly live call with draft critique, a monthly Outreach Sprint, mock interviews and the full Firmward database. ${money(P.membershipMonthly)}/month, cancel anytime.`,
  });
  const founding = foundingOpen();

  return (
    <Page narrow>
      <Eyebrow>Firmward Membership</Eyebrow>
      <H1>Keep sending, every week, with someone reading your drafts.</H1>
      <Lead>Most searches stall after the first burst of applications. Membership keeps you sending all season, with live feedback on what you send, for summer and post-grad roles.</Lead>

      <Figure slug="membership" alt="A grand law-library reading room" caption="The chambers: a grand law library." />

      <div className="mt-6 rounded-app border border-line bg-card p-5">
        <p className="text-t16">
          <span className="text-t24 font-bold">{money(P.membershipMonthly)}</span>/month, or <span className="font-semibold">{money(P.membershipAnnual)}/year</span> (two months free). Cancel anytime.
        </p>
        {founding && (
          <p className="mt-3 rounded-app bg-brand-tint p-3 text-t16">
            <span className="font-semibold">Founding terms:</span> the first {F.memberSpots} members lock {money(P.membershipMonthly)}/month for life, plus a free 20-minute kickoff call. Closes Dec 21 · <Countdown to={SITE.FOUNDING_DEADLINE} /> left.
          </p>
        )}
        <div className="mt-4">
          <OfferCta link={SITE.SKOOL_MEMBERSHIP_URL} offer="membership" waitlistLabel="Reserve your seat" event="skool_join_click" props={{ area: 'membership' }}>
            Join on Skool
          </OfferCta>
        </div>
      </div>

      <Section id="included" title="What’s included">
        <ResponsiveTable caption="Membership, week to week" head={['How often', 'What', 'Details']} rows={RHYTHM} />
      </Section>

      <Section id="schedule" title="The weekly call">
        <Checks items={['One live call a week, recorded for anyone who can’t make it', 'First 15 minutes: one lesson you can use that week', 'The rest: live critique of members’ drafts, so you learn from everyone’s', 'Exact day and time are posted in Skool each month']} />
      </Section>

      <Section id="faq" title="Questions">
        <Faq items={FAQ} />
      </Section>

      <LadderCrossSell />
    </Page>
  );
}
