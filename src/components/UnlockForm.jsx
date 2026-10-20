import { useId, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from './app/controls';
import useAccess from '../hooks/useAccess';
import { api } from '../lib/api';
import { STAGES } from '../lib/roles';
import { getUtm, track } from '../lib/tracking';

/**
 * Email capture that unlocks the full firm data and sends the recruiting calendar.
 * `variant`: 'card' (boxed, with a heading) or 'inline' (just the form).
 */
export default function UnlockForm({ title = 'Unlock the full firm data', blurb, variant = 'card', cta = 'Unlock free', source, defaultStage = '', onDone }) {
  const { unlock } = useAccess();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', stage: defaultStage, company: '' });
  const [status, setStatus] = useState({ kind: 'idle', message: '' });
  const emailId = useId();
  const stageId = useId();

  async function submit(e) {
    e.preventDefault();
    setStatus({ kind: 'working', message: '' });
    const stage = STAGES.find((s) => s.value === form.stage);
    try {
      const out = await api('/subscribe', {
        method: 'POST',
        body: {
          email: form.email,
          class_year: stage?.value ?? null,
          role_sought: stage?.roles[0] ?? null,
          source_page: source ?? location.pathname,
          referrer: document.referrer || null,
          utm: getUtm(),
          company: form.company,
        },
      });
      if (out.unlock_token) unlock(out.unlock_token);
      track('map_unlock', { source: source ?? location.pathname, stage: stage?.value ?? 'unknown' });
      setStatus({ kind: 'done', message: 'Unlocked. The recruiting calendar is on its way to your inbox.' });
      onDone?.(out);
    } catch (err) {
      setStatus({ kind: 'error', message: err.message });
    }
  }

  const fields = (
    <form onSubmit={submit} className="space-y-3" noValidate={false}>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
        <div>
          <label htmlFor={emailId} className="sr-only">Email</label>
          <input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            placeholder="you@school.edu"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="block min-h-[44px] w-full rounded-app border border-line bg-card px-3 text-t16 placeholder:text-fg-2 hover:border-fg-2 md:text-t14"
          />
        </div>
        <div>
          <label htmlFor={stageId} className="sr-only">I’m a</label>
          <select
            id={stageId}
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value })}
            className="block min-h-[44px] w-full rounded-app border border-line bg-card px-3 text-t16 hover:border-fg-2 md:text-t14"
          >
            <option value="">I’m a…</option>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
      {/* Honeypot: hidden from people, filled by bots. */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="absolute left-[-9999px] h-0 w-0 opacity-0" />
      <Button type="submit" disabled={status.kind === 'working' || status.kind === 'done'} className="w-full sm:w-auto">
        {status.kind === 'working' ? 'Unlocking…' : cta}
      </Button>
      <p role="status" className={`text-t12 ${status.kind === 'error' ? 'text-st-closed-text' : status.kind === 'done' ? 'font-medium text-brand' : 'text-fg-2'}`}>
        {status.message || 'Free. One email with the calendar and data access; unsubscribe anytime.'}
      </p>
    </form>
  );

  if (variant === 'inline') return fields;
  return (
    <section className="rounded-app border border-brand bg-brand-tint p-4 md:p-5">
      <h2 className="flex items-center gap-2 text-t16 font-semibold">
        <Lock size={16} aria-hidden="true" className="text-brand" />
        {title}
      </h2>
      <p className="mb-3 mt-1 text-t14 text-fg-2">
        {blurb ?? 'See who each firm hires for (1L summer, 2L summer, post-grad), application windows, how to apply and recruiting contacts. Plus the Law Student Recruiting Calendar by email.'}
      </p>
      {fields}
    </section>
  );
}
