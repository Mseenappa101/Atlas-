import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import RequireProfile from '../components/RequireProfile';
import { Button } from '../components/app/controls';
import useUsage from '../hooks/useUsage';
import { api } from '../lib/api';
import { site } from '../lib/site';

const FREE = [
  'Every firm, state and open position, with filters and alerts',
  'My List: save firms and track every application',
  'Upload your resume or fill in the resume form',
  'Template cover letters filled in for each firm',
  'The 1L recruiting calendar and templates library',
  'One cover letter written for you, to try it',
];
const PRO = [
  'Everything in Free',
  'Your uploaded resume read into an editable resume',
  'Job descriptions rewritten into strong resume bullets',
  'A cover letter written for every firm you apply to',
  'Up to 100 documents a month',
];

function Plan({ name, price, items, current, children }) {
  return (
    <section aria-label={name} className={`flex flex-col rounded-app border bg-card p-5 ${current ? 'border-brand' : 'border-line'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-t20 font-semibold">{name}</h2>
        {current && <span className="rounded-pill bg-brand-tint px-2 text-t12 font-medium text-brand">Your plan</span>}
      </div>
      <p className="mt-1 text-t14 text-fg-2">
        <span className="data text-t24 font-semibold text-fg">{price}</span>
        {price !== '$0' && ' a month, cancel anytime'}
      </p>
      <ul className="mt-4 flex-1 space-y-2">
        {items.map((i) => (
          <li key={i} className="flex gap-2 text-t14">
            <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
            {i}
          </li>
        ))}
      </ul>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

function ProPage() {
  const [usage, , refresh] = useUsage();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const synced = useRef(false);
  const pro = Boolean(usage?.pro);
  const coaching = usage?.plan === 'member' || usage?.plan === 'retainer';

  useEffect(() => {
    document.title = 'Pro — Atlas';
  }, []);

  // Back from Stripe checkout: switch Pro on now rather than waiting for the webhook.
  useEffect(() => {
    const id = params.get('session_id');
    if (params.get('status') !== 'success' || !id || synced.current) return;
    synced.current = true;
    api('/billing/sync', { method: 'POST', body: { session_id: id } })
      .then(() => {
        setMessage('You’re on Pro. AI resume tools and cover letters are on.');
        refresh();
      })
      .catch((err) => setMessage(err.message))
      .finally(() => setParams({}, { replace: true }));
  }, [params, setParams, refresh]);

  async function go(path) {
    setStatus('working');
    try {
      const { url } = await api(path, { method: 'POST' });
      window.location.assign(url);
    } catch (err) {
      setMessage(err.message);
      setStatus('idle');
    }
  }

  const canceled = params.get('status') === 'canceled';

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 md:px-6 md:pb-12">
      <h1 className="text-t24 font-bold tracking-tight md:text-t32">Free or Pro</h1>
      <p className="mt-1 max-w-2xl text-t16 text-fg-2">
        Everything you need to find firms and track applications is free. Pro adds the AI that writes for you.
      </p>

      {usage?.failed && !message && (
        <p role="status" className="mt-4 rounded-app border border-line bg-card px-4 py-3 text-t14">
          We couldn&rsquo;t load your plan just now. Reload the page in a minute.
        </p>
      )}
      {(message || canceled) && (
        <p role="status" className="mt-4 rounded-app border border-line bg-card px-4 py-3 text-t14">
          {message || 'Checkout canceled. Nothing was charged.'}
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Plan name="Free" price="$0" items={FREE} current={usage && !usage.failed && !pro} />
        <Plan name="Pro" price="$4.99" items={PRO} current={pro}>
          {!usage ? null : coaching ? (
            <p className="text-t14 text-fg-2">Pro is included with your coaching plan.</p>
          ) : pro ? (
            <Button variant="secondary" onClick={() => go('/billing/portal')} disabled={status === 'working'}>
              Manage billing
            </Button>
          ) : (
            <Button onClick={() => go('/billing/checkout')} disabled={status === 'working'} className="w-full sm:w-auto">
              {status === 'working' ? 'Opening checkout…' : 'Upgrade to Pro'}
            </Button>
          )}
        </Plan>
      </div>

      <p className="mt-6 text-t14 text-fg-2">
        Want a person, not just a tool? The Recruit&rsquo;s membership and one-on-one coaching include Pro.{' '}
        {site.strategyCallUrl ? (
          <a href={site.strategyCallUrl} className="font-medium text-brand hover:underline">
            Book a free 20-minute strategy call
          </a>
        ) : (
          <span className="font-medium text-fg">Book a free 20-minute strategy call</span>
        )}
        .
      </p>
      <p className="mt-2 text-t12 text-fg-2">
        Payments are handled by Stripe. <Link to="/documents" className="text-brand hover:underline">Your documents</Link> stay yours if you cancel.
      </p>
    </div>
  );
}

export default function Pro() {
  return (
    <RequireProfile>
      <div className="app min-h-screen">
        <ProPage />
      </div>
    </RequireProfile>
  );
}
