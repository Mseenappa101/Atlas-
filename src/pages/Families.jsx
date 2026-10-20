import { SITE } from '../../site.config';
import usePageMeta from '../hooks/usePageMeta';
import { Checks, Cta, Eyebrow, H1, Lead, Page, ResponsiveTable, Section } from '../components/marketing/kit';
import { money } from '../lib/money';

const P = SITE.PRICES;

export default function Families() {
  usePageMeta({
    title: 'For families: how the 90-Day Placement works',
    description: 'For parents of law students and new grads without a job offer: what the 90-Day Placement does, the timeline, the price, and how to book a call.',
  });
  return (
    <Page narrow>
      <Eyebrow>For families</Eyebrow>
      <H1>If your law student doesn’t have a job lined up yet.</H1>
      <Lead>
        Most law students don’t land BigLaw through on-campus recruiting. The jobs that remain, at boutiques, mid-size, plaintiff, government and regional firms, are real and good, but they’re found by writing to dozens of firms directly. That takes time and know-how a busy student often doesn’t have.
      </Lead>

      <Section id="what" title="What the 90-Day Placement does">
        <Checks
          items={[
            'Michael builds a list of 75–100 firms that hire for your student’s role, in the markets they want',
            'He overhauls their resume and cover letter',
            'He drafts 15–20 personalized emails or cover letters every week, plus follow-ups',
            'He preps them 1:1 before every interview and helps evaluate and negotiate offers',
            'Your student reviews every draft and sends it from their own email, so firms hear from them',
          ]}
        />
      </Section>

      <Section id="timeline" title="The timeline">
        <ResponsiveTable
          caption="Placement timeline"
          head={['Phase', 'When', 'What happens']}
          rows={[
            ['Build', 'Weeks 1–2', 'Target list, resume and cover letter, outreach plan'],
            ['Launch', 'Weeks 3–12', '15–20 tailored emails or letters a week, follow-ups, replies triaged'],
            ['Convert', 'As interviews come', 'A mock before every interview; offer evaluation and negotiation'],
          ]}
        />
        <p className="mt-3 text-t16">A 30-minute call with your student every week throughout.</p>
      </Section>

      <Section id="price" title="Price and what’s guaranteed">
        <p className="max-w-2xl text-t16 leading-relaxed">
          {money(P.placementTerm)} per 90-day term, billed {money(P.placementMonthly)} a month, continuing monthly until your student accepts an offer or you cancel. The guarantee is on effort, not outcome: at least 75 firms contacted in 90 days, or the work continues free. No one can honestly guarantee a job offer, and we don’t.
        </p>
        <p className="mt-3 max-w-2xl text-t16 leading-relaxed text-fg-2">Firmward provides career coaching and application support, not legal advice.</p>
      </Section>

      <Section id="book" title="Book a call">
        <p className="max-w-2xl text-t16 text-fg-2">The call is with your student, since it’s their search. You’re welcome to join. It’s 20–30 minutes on where things stand and whether the Placement fits.</p>
        <div className="mt-5">
          <Cta to="/placement#book">Book a strategy call</Cta>
        </div>
      </Section>
    </Page>
  );
}
