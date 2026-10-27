import { SITE, nextSprint } from '../../site.config';
import usePageMeta from '../hooks/usePageMeta';
import { Checks, Cta, Eyebrow, Figure, H1, Lead, Page } from '../components/marketing/kit';
import { Docket, Stamp } from '../components/marketing/judiciary';
import Reveal from '../components/motion/Reveal';
import { money } from '../lib/money';

const P = SITE.PRICES;
const longDate = (ymd) => new Date(`${ymd}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// Thank-you pages: one next step each, never indexed.

export function ThanksSignup() {
  usePageMeta({ title: 'Check your inbox', noindex: true });
  const sprint = nextSprint();
  return (
    <Page narrow>
      <div className="relative">
        <div className="pointer-events-none mt-4 flex justify-center md:absolute md:right-0 md:top-0 md:mt-0 md:justify-end">
          <Stamp label="On Record" sub="Firmward · admitted" />
        </div>
        <Reveal>
          <Eyebrow>You’re in</Eyebrow>
          <Docket>Signup — confirmed</Docket>
          <H1>Check your inbox for the calendar.</H1>
          <Lead>The Law Student Recruiting Calendar is on its way, and the full firm data is unlocked on this browser. If it’s not in your inbox in a few minutes, check spam or promotions.</Lead>
        </Reveal>
      </div>
      <Reveal>
        <Figure slug="the-map" alt="Library of Congress reading room" />
      </Reveal>
      <Reveal>
        <div className="mt-8 rounded-app border border-line bg-card p-5">
          <p className="text-t20 font-semibold">Next: turn the map into 20 sent emails.</p>
          <p className="mt-1 text-t16 text-fg-2">
            The 20-Firm Sprint ({money(P.sprint)}) takes you from a target list to 20 outreach emails sent in 5 days.{sprint ? ` Next cohort starts ${longDate(sprint.start)}.` : ''}
          </p>
          <div className="mt-4">
            <Cta to="/sprint">See the Sprint</Cta>
          </div>
        </div>
      </Reveal>
    </Page>
  );
}

export function ThanksCall() {
  usePageMeta({ title: 'Your strategy call is booked', noindex: true });
  return (
    <Page narrow>
      <div className="relative">
        <div className="pointer-events-none mt-4 flex justify-center md:absolute md:right-0 md:top-0 md:mt-0 md:justify-end">
          <Stamp label="Booked" sub="Strategy call" />
        </div>
        <Reveal>
          <Eyebrow>Call booked</Eyebrow>
          <Docket>Strategy call — scheduled</Docket>
          <H1>Here’s how to get the most out of the call.</H1>
          <Lead>It’s about your search, not a pitch. Come with:</Lead>
        </Reveal>
      </div>
      <Reveal>
        <Figure slug="placement" alt="U.S. Supreme Court courtroom" />
      </Reveal>
      <Reveal>
        <div className="mt-6">
          <Checks
            items={[
              'Your current resume (and a cover letter if you have one)',
              'The markets and firm types you want, even if it’s a rough list',
              'Where you stand: applications sent, interviews, offers, deadlines coming up',
              'The one thing that’s stuck: not hearing back, not knowing where to apply, or interviews not converting',
            ]}
          />
        </div>
        <p className="mt-6 text-t16 text-fg-2">The confirmation and calendar invite come from the scheduler. Need to move it? Use the link in that email.</p>
        <div className="mt-8">
          <Cta to="/explore" variant="secondary">Look through the map before the call</Cta>
        </div>
      </Reveal>
    </Page>
  );
}
