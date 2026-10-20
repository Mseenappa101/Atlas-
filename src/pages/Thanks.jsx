import { useEffect } from 'react';
import { SITE, foundingOpen, nextSprint } from '../../site.config';
import usePageMeta from '../hooks/usePageMeta';
import { Checks, Cta, Eyebrow, H1, Lead, Page } from '../components/marketing/kit';
import { money } from '../lib/money';
import { track } from '../lib/tracking';

const P = SITE.PRICES;
const longDate = (ymd) => new Date(`${ymd}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// Thank-you pages: one next step each, never indexed.

export function ThanksSignup() {
  usePageMeta({ title: 'Check your inbox', noindex: true });
  const sprint = nextSprint();
  return (
    <Page narrow>
      <Eyebrow>You’re in</Eyebrow>
      <H1>Check your inbox for the calendar.</H1>
      <Lead>The Law Student Recruiting Calendar is on its way, and the full firm data is unlocked on this browser. If it’s not in your inbox in a few minutes, check spam or promotions.</Lead>
      <div className="mt-8 rounded-app border border-line bg-card p-5">
        <p className="text-t20 font-semibold">Next: turn the map into 20 sent emails.</p>
        <p className="mt-1 text-t16 text-fg-2">
          The 20-Firm Sprint ({money(P.sprint)}) takes you from a target list to 20 outreach emails sent in 5 days.{sprint ? ` Next cohort starts ${longDate(sprint.start)}.` : ''}
        </p>
        <div className="mt-4">
          <Cta to="/sprint">See the Sprint</Cta>
        </div>
      </div>
    </Page>
  );
}

// Set as the Stripe Payment Link's success URL: https://www.firmward.org/thanks/sprint
export function ThanksSprint() {
  usePageMeta({ title: 'You’re in the Sprint', noindex: true });
  useEffect(() => {
    track('sprint_purchase');
  }, []);
  return (
    <Page narrow>
      <Eyebrow>Payment received</Eyebrow>
      <H1>You’re in the Sprint.</H1>
      <Lead>Join the Sprint area in Skool now. Monday’s lesson and your cohort are waiting there, and that’s where the Friday call link goes out.</Lead>
      <div className="mt-6">
        <Cta href={SITE.SKOOL_SPRINT_URL} event="skool_join_click" props={{ area: 'sprint' }}>
          Join the Sprint area in Skool
        </Cta>
      </div>
      <div className="mt-8 rounded-app border border-line bg-card p-5 text-t16">
        <p className="font-semibold">Your {money(P.sprint)} counts toward Membership.</p>
        <p className="mt-1 text-fg-2">
          Join Membership within {SITE.FOUNDING.sprintCreditHours} hours and your Sprint payment is credited.{foundingOpen() ? ` Founding members lock ${money(P.membershipMonthly)}/month for life until Dec 21.` : ''}
        </p>
      </div>
    </Page>
  );
}

export function ThanksCall() {
  usePageMeta({ title: 'Your strategy call is booked', noindex: true });
  return (
    <Page narrow>
      <Eyebrow>Call booked</Eyebrow>
      <H1>Here’s how to get the most out of the call.</H1>
      <Lead>It’s about your search, not a pitch. Come with:</Lead>
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
    </Page>
  );
}
