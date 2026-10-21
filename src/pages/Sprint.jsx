import { SITE, nextSprint } from '../../site.config';
import usePageMeta from '../hooks/usePageMeta';
import Countdown from '../components/Countdown';
import { Checks, Cta, Eyebrow, Faq, H1, Lead, Page, ResponsiveTable, Section, TextLink } from '../components/marketing/kit';
import { money } from '../lib/money';

const P = SITE.PRICES;
const longDate = (ymd) => new Date(`${ymd}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const closeLabel = (iso) => `${new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })} ET`;

const DAYS = [
  ['Monday', 'Build your list', 'Build a 20-firm target list from the Firmward database, filtered to your class year and the role you’re after.'],
  ['Tuesday', 'Fix your resume', 'Fix the top third of your resume: the part a recruiter reads in the first ten seconds.'],
  ['Wednesday', 'Write the email', 'Write the outreach email that gets answered: short, specific to the firm, with a clear ask.'],
  ['Thursday', 'Send day', '20 emails sent, each personalized to the firm.'],
  ['Friday', 'Live call', 'A live 45-minute call with Michael: draft critique and Q&A.'],
];

const FAQ = [
  ['Does it work for post-grad, not just summer?', 'Yes. You filter the list to the role you’re targeting: 1L summer, 2L summer, post-grad associate or an entry-level move. The email and the list change; the method doesn’t.'],
  ['How much time does it take?', 'About 30–45 minutes a day, Monday to Thursday, plus the 45-minute live call on Friday. The lessons are short recorded videos you watch here on the site, on your phone or laptop.'],
  ['What if I can’t make the Friday call?', 'Send your drafts ahead and watch the recording. Your drafts still get reviewed.'],
  ['Can I get a refund?', 'The Sprint isn’t refundable once Day 1 has started. Before then, email and we’ll sort it out.'],
  ['What happens after?', `If you join Membership within ${SITE.FOUNDING.sprintCreditHours} hours, your ${money(P.sprint)} is credited toward it. Membership keeps you sending every month with live critique.`],
];

export default function Sprint() {
  usePageMeta({
    title: '20-Firm Sprint: 20 emails to hiring firms in 5 days',
    description: `A 5-day challenge for law students and new grads: a target list, a fixed resume, and 20 outreach emails sent to firms hiring for your role. ${money(P.sprint)}.`,
  });
  const sprint = nextSprint();
  const upcoming = SITE.NEXT_SPRINTS.filter((s) => new Date(s.registrationCloses) > new Date());

  return (
    <Page narrow>
      <Eyebrow>20-Firm Sprint · {money(P.sprint)}</Eyebrow>
      <H1>20 emails to firms that are hiring, in 5 days.</H1>
      <Lead>In 5 days you’ll have a target list, a fixed resume, and 20 outreach emails sent to firms that are actually hiring for your role.</Lead>

      <div className="mt-6 rounded-app border border-line bg-card p-5">
        {sprint ? (
          <>
            <p className="text-t16">
              Next cohort starts <span className="font-semibold">{longDate(sprint.start)}</span>.
            </p>
            <p className="mt-1 text-t14 text-fg-2">
              Registration closes {closeLabel(sprint.registrationCloses)} · <Countdown to={sprint.registrationCloses} className="font-medium text-fg" /> left
            </p>
          </>
        ) : (
          <p className="text-t16">The next cohort dates are coming soon. Join the free workshop in the meantime.</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Cta href={SITE.STRIPE_SPRINT_LINK} stripe event="sprint_checkout_click" props={{ cohort: sprint?.start ?? 'none' }}>
            Join the Sprint · {money(P.sprint)}
          </Cta>
        </div>
        <p className="mt-3 text-t12 text-fg-2">
          One-time payment. Your {money(P.sprint)} counts toward Membership if you join within {SITE.FOUNDING.sprintCreditHours} hours.
        </p>
      </div>

      <Section id="days" title="The five days">
        <ResponsiveTable caption="The Sprint, day by day" head={['Day', 'Focus', 'What you do']} rows={DAYS} />
        <p className="mt-3 text-t14 text-fg-2">Daily lessons are short recorded videos you watch on-site in the course. It runs in cohorts, so you’re sending alongside other students.</p>
        <div className="mt-4"><TextLink to="/sprint/course">Preview the course</TextLink></div>
      </Section>

      <Section id="friday" title="What you’ll have by Friday">
        <Checks
          items={[
            'A list of 20 firms that hire for your class year and role, with who to write to',
            'A resume whose top third makes the case in ten seconds',
            'An outreach email you can reuse for every firm after this',
            '20 emails sent, not drafted',
            'Feedback on your drafts from Michael, live',
          ]}
        />
        <p className="mt-4 text-t16">Works for summer and post-grad searches: 1L summer, 2L summer, a post-grad associate job or an early-career move.</p>
      </Section>

      {upcoming.length > 1 && (
        <Section id="cohorts" title="Upcoming cohorts">
          <ul className="divide-y divide-line rounded-app border border-line bg-card">
            {upcoming.map((s) => (
              <li key={s.start} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-t16">
                <span className="font-medium">Starts {longDate(s.start)}</span>
                <span className="text-t14 text-fg-2">Registration closes {closeLabel(s.registrationCloses)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="faq" title="Questions">
        <Faq items={FAQ} />
      </Section>

      <div className="mt-12 rounded-app border border-brand bg-brand-tint p-5">
        <p className="text-t20 font-semibold">Ready to send 20?</p>
        <p className="mt-1 text-t16 text-fg-2">{sprint ? `Next cohort starts ${longDate(sprint.start)}.` : 'New cohorts are added regularly.'}</p>
        <div className="mt-4">
          <Cta href={SITE.STRIPE_SPRINT_LINK} stripe event="sprint_checkout_click" props={{ cohort: sprint?.start ?? 'none', position: 'bottom' }}>
            Join the Sprint · {money(P.sprint)}
          </Cta>
        </div>
      </div>
    </Page>
  );
}
