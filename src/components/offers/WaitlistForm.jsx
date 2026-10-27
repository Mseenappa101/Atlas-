import { useId, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { getUtm, track } from '../../lib/tracking';
import { Stamp } from '../marketing/judiciary';

// Themed waitlist / consultation capture shown in place of an offer CTA whose payment or scheduling link
// isn't live yet. Posts to the existing Resend signup route (/subscribe), tagged by offer via source_page,
// so leads land in waitlist_subscribers + Resend. No dead buttons — a real email capture instead.
const COPY = {
  sprint: {
    note: 'Checkout opens shortly. Leave your email and we’ll send your seat link the moment the next cohort opens — nothing charged now.',
    done: 'You’re on the list. We’ll email your seat link the moment the next Sprint opens.',
    label: 'Reserve your seat',
    working: 'Reserving…',
  },
  membership: {
    note: 'Founding Membership opens shortly. Leave your email and we’ll send your invitation the moment doors open.',
    done: 'You’re on the list. We’ll email your invitation when Membership opens.',
    label: 'Reserve your seat',
    working: 'Reserving…',
  },
  placement: {
    note: 'A few Placement spots open each term. Leave your email and we’ll reach out to schedule your strategy call.',
    done: 'Request received. We’ll email you to schedule your strategy call.',
    label: 'Request a consultation',
    working: 'Sending…',
  },
};

export default function WaitlistForm({ offer, label, stamp = 'Waitlisted', className = '' }) {
  const copy = COPY[offer] ?? COPY.sprint;
  const location = useLocation();
  const [form, setForm] = useState({ email: '', company: '' });
  const [status, setStatus] = useState({ kind: 'idle', message: '' });
  const emailId = useId();

  async function submit(e) {
    e.preventDefault();
    if (form.company) return; // honeypot
    setStatus({ kind: 'working', message: '' });
    try {
      await api('/subscribe', {
        method: 'POST',
        body: {
          email: form.email,
          source_page: `waitlist:${offer}`,
          referrer: typeof document !== 'undefined' ? document.referrer || null : null,
          utm: getUtm(),
          company: form.company,
        },
      });
      track('waitlist_join', { offer, source: location.pathname });
      setStatus({ kind: 'done', message: copy.done });
    } catch (err) {
      setStatus({ kind: 'error', message: err.message });
    }
  }

  if (status.kind === 'done') {
    return (
      <div className={`relative rounded-app border border-brand bg-brand-tint p-4 md:p-5 ${className}`} role="status">
        <div className="pointer-events-none absolute right-3 top-2 hidden sm:block"><Stamp label={stamp} sub="Firmward" /></div>
        <p className="font-serif text-t16 font-medium text-brand sm:pr-28">{copy.done}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`rounded-app border border-line bg-card p-4 md:p-5 ${className}`}>
      <p className="mb-3 font-serif text-t16 text-fg-2">{copy.note}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={emailId} className="sr-only">Email</label>
        <input
          id={emailId}
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.edu"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="block min-h-[48px] w-full rounded-app border border-line bg-canvas px-3 text-t16 placeholder:text-fg-2 hover:border-fg-2 focus:border-brand sm:min-w-0 sm:flex-1"
        />
        {/* Honeypot: hidden from people, filled by bots. */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="absolute left-[-9999px] h-0 w-0 opacity-0" />
        <button
          type="submit"
          disabled={status.kind === 'working'}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-app bg-brand px-5 text-t16 font-semibold text-white transition-colors duration-150 hover:bg-brand-hover disabled:opacity-60"
        >
          {status.kind === 'working' ? copy.working : label || copy.label}
        </button>
      </div>
      <p role="status" className={`mt-2 text-t12 ${status.kind === 'error' ? 'text-st-closed-text' : 'text-fg-2'}`}>
        {status.message || 'Free to join. One email when it opens; unsubscribe anytime.'}
      </p>
    </form>
  );
}
