import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SITE, foundingOpen, isPlaceholder } from '../../site.config';
import usePageMeta from '../hooks/usePageMeta';
import { Button } from '../components/app/controls';
import { Checks, Cta, Eyebrow, Faq, H1, Lead, Page, ResponsiveTable, Section } from '../components/marketing/kit';
// Lazy so Framer Motion (scroll-pinned phases) loads only when Placement renders, not in the initial chunk.
const ScrollPhases = lazy(() => import('../components/motion/ScrollPhases'));
import { toast } from 'sonner';
import { api } from '../lib/api';
import { money } from '../lib/money';
import { getUtm, track } from '../lib/tracking';

const P = SITE.PRICES;
const F = SITE.FOUNDING;

const PHASES = [
  ['Build', 'Weeks 1–2', 'A 75–100 firm target list for your markets and role, a resume and cover letter overhaul, and your outreach plan.'],
  ['Launch', 'Weeks 3–12', '15–20 personalized emails or cover letters drafted for you every week, follow-ups drafted, and replies triaged.'],
  ['Convert', 'As interviews come in', 'A 1:1 mock before every interview, then help evaluating and negotiating your offer.'],
];

const FAQ = [
  ['Is there a job guarantee?', 'No, and be wary of anyone who offers one. The guarantee is on activity: at least 75 firms contacted in your 90 days, or the work continues free until they are.'],
  ['Who sends the emails?', 'You do, from your own email. Michael drafts everything; you review, adjust and send. Firms hear from you, not a service.'],
  ['What happens after 90 days?', `If you haven’t accepted an offer, it continues at ${money(P.placementMonthly)}/month until you do or you cancel.`],
  ['Is it only for post-grad?', 'No. It works for a 1L or 2L summer job too. It’s built first for 3Ls and recent grads without an offer and 2Ls without a summer job, because that’s where a targeted, high-volume search matters most.'],
  ['Is this legal advice?', 'No. It’s career coaching and application support.'],
];

const CLASS_OPTIONS = [['1L', '1L'], ['2L', '2L'], ['3L', '3L'], ['recent-grad', 'Recent grad'], ['other', 'Other']];
const ROLE_OPTIONS = [['1l-summer', '1L summer'], ['2l-summer', '2L summer'], ['post-grad', 'Post-grad associate'], ['other', 'Other']];

const FIELD = 'block w-full min-h-[44px] rounded-app border border-line bg-card px-3 text-t16 text-fg placeholder:text-fg-2 hover:border-fg-2 md:text-t14';

function Field({ label, optional, children, id }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-t14 font-medium">
        {label}
        {optional && <span className="font-normal text-fg-2"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

function ApplyForm({ onDone }) {
  const ids = { name: useId(), email: useId(), school: useId(), year: useId(), grad: useId(), role: useId(), markets: useId(), types: useId(), situation: useId(), blocker: useId() };
  const [f, setF] = useState({ name: '', email: '', school: '', class_year: '', grad_year: '', role_sought: '', markets: '', firm_types: '', situation: '', blocker: '', company: '' });
  const [status, setStatus] = useState({ kind: 'idle', message: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setStatus({ kind: 'working', message: '' });
    try {
      await api('/placement-apply', { method: 'POST', body: { ...f, source_page: '/placement', referrer: document.referrer || null, utm: getUtm() } });
      track('placement_form_submit', { class_year: f.class_year, role: f.role_sought });
      toast.success('Thanks — your answers are in.', { description: 'Pick a time for your strategy call next.' });
      setStatus({ kind: 'done', message: '' });
      onDone(f);
    } catch (err) {
      toast.error('That didn’t go through.', { description: err.message });
      setStatus({ kind: 'error', message: err.message });
    }
  }

  return (
    <form onSubmit={submit} className="rounded-app border border-line bg-card p-5 md:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" id={ids.name}><input id={ids.name} required autoComplete="name" value={f.name} onChange={set('name')} className={FIELD} /></Field>
        <Field label="Email" id={ids.email}><input id={ids.email} type="email" required autoComplete="email" value={f.email} onChange={set('email')} className={FIELD} /></Field>
        <Field label="Law school" id={ids.school}><input id={ids.school} required value={f.school} onChange={set('school')} className={FIELD} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Class year" id={ids.year}>
            <select id={ids.year} required value={f.class_year} onChange={set('class_year')} className={FIELD}>
              <option value="">Choose</option>
              {CLASS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Grad year" optional id={ids.grad}><input id={ids.grad} inputMode="numeric" placeholder="2027" value={f.grad_year} onChange={set('grad_year')} className={FIELD} /></Field>
        </div>
        <Field label="Role you’re looking for" id={ids.role}>
          <select id={ids.role} required value={f.role_sought} onChange={set('role_sought')} className={FIELD}>
            <option value="">Choose</option>
            {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Target markets" optional id={ids.markets}><input id={ids.markets} placeholder="Dallas, Houston, NYC boutiques" value={f.markets} onChange={set('markets')} className={FIELD} /></Field>
        <Field label="Firm types" optional id={ids.types}><input id={ids.types} placeholder="Litigation boutiques, mid-size, government" value={f.firm_types} onChange={set('firm_types')} className={FIELD} /></Field>
        <div className="sm:col-span-2">
          <Field label="Where things stand" optional id={ids.situation}>
            <textarea id={ids.situation} rows={3} placeholder="Applications sent, interviews, offers, deadlines coming up" value={f.situation} onChange={set('situation')} className={`${FIELD} py-2`} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Biggest blocker right now" optional id={ids.blocker}>
            <textarea id={ids.blocker} rows={2} placeholder="Not hearing back, not sure where to apply, interviews not converting…" value={f.blocker} onChange={set('blocker')} className={`${FIELD} py-2`} />
          </Field>
        </div>
      </div>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.company} onChange={set('company')} className="absolute left-[-9999px] h-0 w-0 opacity-0" />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={status.kind === 'working'} className="min-h-[48px] px-5 text-t16">
          {status.kind === 'working' ? 'Sending…' : 'Continue to book a call'}
        </Button>
        {status.kind === 'error' && <p role="alert" className="text-t14 text-st-closed-text">{status.message}</p>}
      </div>
      <p className="mt-2 text-t12 text-fg-2">Michael reads every application before the call. Next you’ll pick a time.</p>
    </form>
  );
}

function schedulerSrc(url, person) {
  try {
    const u = new URL(url);
    if (person?.name) u.searchParams.set('name', person.name);
    if (person?.email) u.searchParams.set('email', person.email);
    if (/calendly\.com/.test(u.hostname)) u.searchParams.set('hide_gdpr_banner', '1');
    if (/cal\.com/.test(u.hostname)) u.searchParams.set('embed', 'true');
    return u.toString();
  } catch {
    return url;
  }
}

function Scheduler({ person }) {
  const navigate = useNavigate();
  // Calendly and Cal.com announce a booking to the page that embeds them.
  useEffect(() => {
    const onMessage = (e) => {
      const kind = e.data?.event ?? e.data?.type ?? '';
      if (kind === 'calendly.event_scheduled' || /bookingSuccessful|booking_successful/i.test(String(kind))) {
        track('call_booked_click', { via: 'embed' });
        navigate('/thanks/call');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigate]);

  if (isPlaceholder(SITE.SCHEDULER_URL)) {
    return (
      <div className="rounded-app border-2 border-dashed border-st-soon-text bg-st-soon-bg p-6 text-t16 text-st-soon-text">
        Scheduler goes here. Fill in SCHEDULER_URL (Cal.com or Calendly) in site.config.js.
      </div>
    );
  }
  return (
    <div>
      <iframe title="Book a strategy call" src={schedulerSrc(SITE.SCHEDULER_URL, person)} className="h-[720px] w-full rounded-app border border-line bg-card" loading="lazy" />
      <p className="mt-2 text-t14">
        Trouble with the calendar?{' '}
        <a href={schedulerSrc(SITE.SCHEDULER_URL, person)} target="_blank" rel="noopener noreferrer" onClick={() => track('call_booked_click', { via: 'new-tab' })} className="font-medium text-brand hover:underline">
          Open it in a new tab
        </a>
        .
      </p>
    </div>
  );
}

export default function Placement() {
  usePageMeta({
    title: 'The 90-Day Placement: a done-for-you law job search',
    description: 'For 3Ls and recent grads without an offer, 2Ls without a summer job, transfers and 1Ls: Michael builds your target list, drafts your outreach and preps every interview. Book a strategy call.',
  });
  const [person, setPerson] = useState(null);
  const bookRef = useRef(null);
  const founding = foundingOpen();

  return (
    <Page narrow>
      <Eyebrow>The 90-Day Placement</Eyebrow>
      <H1>A done-for-you search for your summer or post-grad job.</H1>
      <Lead>
        For 3Ls and recent grads without a post-grad offer, and 2Ls without a summer job. Also transfers, and 1Ls targeting non-BigLaw summers. Michael runs the search with you until you accept an offer.
      </Lead>
      <div className="mt-6">
        <Cta to="#book">Book a strategy call</Cta>
      </div>

      <Section id="phases" title="How the 90 days run" reveal={false}>
        <Suspense fallback={<div className="min-h-[200px]" />}><ScrollPhases phases={PHASES} /></Suspense>
        <p className="mt-3 text-t16">Plus a 30-minute 1:1 call every week, the whole way through.</p>
      </Section>

      <Section id="who-does-what" title="Who does what">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-app border border-line bg-card p-5">
            <h3 className="text-t16 font-semibold">Michael</h3>
            <div className="mt-3">
              <Checks items={['Builds your 75–100 firm target list', 'Overhauls your resume and cover letter', 'Drafts 15–20 personalized emails or cover letters a week', 'Drafts follow-ups and triages replies', 'Runs a 1:1 mock before every interview', 'Helps you evaluate and negotiate offers']} />
            </div>
          </div>
          <div className="rounded-app border border-line bg-card p-5">
            <h3 className="text-t16 font-semibold">You</h3>
            <div className="mt-3">
              <Checks items={['Review each week’s drafts', 'Send them from your own email', 'Show up to the weekly call and your interviews', 'Tell Michael what you hear back']} />
            </div>
          </div>
        </div>
      </Section>

      <Section id="guarantee" title="The activity guarantee">
        <p className="max-w-2xl text-t16 leading-relaxed">
          At least 75 firms contacted in your 90 days, or the work continues free until they are. There’s no job guarantee: nobody honest can promise an offer. What you get is the volume and quality of outreach that produces interviews.
        </p>
      </Section>

      <Section id="price" title="Price">
        <div className="rounded-app border border-line bg-card p-5 text-t16">
          <p>
            <span className="text-t24 font-bold">{money(P.placementTerm)}</span> per 90-day term, billed {money(P.placementMonthly)}/month.
          </p>
          <p className="mt-2 text-fg-2">After the term it continues monthly until you accept an offer or cancel. Sold only after a strategy call, so it’s the right fit before you pay anything.</p>
          {founding && (
            <p className="mt-3 rounded-app bg-brand-tint p-3">
              <span className="font-semibold">Founding terms until Dec 21:</span> the first {F.placementSpots} Placement clients lock the {money(P.placementMonthly)}/month continuation rate for life, plus {F.placementExtraFirms} extra firms on their list.
            </p>
          )}
        </div>
      </Section>

      <Section id="faq" title="Questions">
        <Faq items={FAQ} />
      </Section>

      <section id="book" ref={bookRef} aria-labelledby="book-h" className="mt-14 scroll-mt-20 md:mt-20">
        <h2 id="book-h" className="text-t24 font-bold tracking-tight md:text-t32">Book a strategy call</h2>
        <p className="mt-2 max-w-2xl text-t16 text-fg-2">
          {person ? 'Thanks. Pick a time that works.' : 'A few questions first, so the call is about your search. Takes two minutes.'}
        </p>
        <div className="mt-6">
          {person ? (
            <Scheduler person={person} />
          ) : (
            <ApplyForm
              onDone={(p) => {
                setPerson(p);
                setTimeout(() => bookRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}
            />
          )}
        </div>
      </section>
    </Page>
  );
}
