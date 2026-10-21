import { useId, useState } from 'react';
import { nextWorkshop } from '../../site.config';
import usePageMeta from '../hooks/usePageMeta';
import { Button } from '../components/app/controls';
import { Checks, Eyebrow, H1, Lead, Page, Section } from '../components/marketing/kit';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { STAGES } from '../lib/roles';
import { getUtm, track } from '../lib/tracking';

const when = (d) => `${d.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' })} at ${d.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })} ET`;
const FIELD = 'block w-full min-h-[44px] rounded-app border border-line bg-card px-3 text-t16 text-fg placeholder:text-fg-2 hover:border-fg-2 md:text-t14';

export default function Workshop() {
  const ws = nextWorkshop();
  usePageMeta({
    title: ws ? `Free workshop: ${ws.title}` : 'Free weekly workshop',
    description: 'A free live workshop for law students and new grads, Wednesdays at 8:00 pm ET: how to find the firms that are hiring for your role and write to them.',
  });
  const ids = { name: useId(), email: useId(), stage: useId() };
  const [f, setF] = useState({ name: '', email: '', stage: '', company: '' });
  const [status, setStatus] = useState({ kind: 'idle', message: '' });

  async function submit(e) {
    e.preventDefault();
    setStatus({ kind: 'working', message: '' });
    const stage = STAGES.find((s) => s.value === f.stage);
    try {
      const out = await api('/workshop', {
        method: 'POST',
        body: { name: f.name, email: f.email, class_year: stage?.value ?? null, role_sought: stage?.roles[0] ?? null, source_page: '/workshop', referrer: document.referrer || null, utm: getUtm(), company: f.company },
      });
      track('workshop_register', { stage: f.stage || 'unknown' });
      toast.success('You’re registered.', { description: 'Check your email for the Zoom link and calendar invite.' });
      setStatus({ kind: 'done', message: out.email_sent === false ? 'You’re registered. The confirmation email is delayed; we’ll send the Zoom link before it starts.' : 'You’re registered. Check your email for the Zoom link and calendar invite.' });
    } catch (err) {
      toast.error('That didn’t go through.', { description: err.message });
      setStatus({ kind: 'error', message: err.message });
    }
  }

  return (
    <Page narrow>
      <Eyebrow>Free live workshop · Wednesdays, 8:00 pm ET</Eyebrow>
      <H1>{ws ? ws.title : 'Free weekly workshop'}</H1>
      <Lead>{ws ? `Next session: ${when(ws.start)}. About ${ws.durationMinutes} minutes, with time for your questions.` : 'The next date is coming soon.'}</Lead>

      {ws && (
        <form onSubmit={submit} className="mt-6 rounded-app border border-line bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor={ids.name} className="mb-1.5 block text-t14 font-medium">First name</label>
              <input id={ids.name} autoComplete="given-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label htmlFor={ids.email} className="mb-1.5 block text-t14 font-medium">Email</label>
              <input id={ids.email} type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label htmlFor={ids.stage} className="mb-1.5 block text-t14 font-medium">I’m a</label>
              <select id={ids.stage} value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })} className={FIELD}>
                <option value="">Choose</option>
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} className="absolute left-[-9999px] h-0 w-0 opacity-0" />
          <Button type="submit" disabled={status.kind === 'working' || status.kind === 'done'} className="mt-4 min-h-[48px] w-full px-5 text-t16 sm:w-auto">
            {status.kind === 'working' ? 'Registering…' : 'Save my spot'}
          </Button>
          {status.message && (
            <p role={status.kind === 'error' ? 'alert' : 'status'} className={`mt-3 text-t14 ${status.kind === 'error' ? 'text-st-closed-text' : 'font-medium text-brand'}`}>
              {status.message}
            </p>
          )}
        </form>
      )}

      <Section id="cover" title="What we’ll cover">
        <Checks items={['Where the firms that hire outside BigLaw actually post (and where they don’t)', 'How to build a target list for your class year: 1L summer, 2L summer or post-grad', 'The outreach email that gets answered, with real examples', 'Live Q&A on your search']} />
      </Section>
    </Page>
  );
}
