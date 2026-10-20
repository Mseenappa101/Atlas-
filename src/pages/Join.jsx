import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import useSession from '../hooks/useSession';
import { createAccount, saveProfileDetails } from '../lib/access';
import { FIRM_TYPES } from '../lib/catalog';
import { Button, FilterChip, Input, Select } from '../components/app/controls';
import { CLASS_YEARS } from '../lib/profileOptions';

const MARKETS = ['Dallas', 'Houston', 'Austin', 'San Antonio', 'New Orleans', 'Atlanta', 'Nashville', 'Birmingham', 'Miami', 'Charlotte', 'New York'];

// Step 1 creates the account (which signs the student in); step 2 collects optional details.
// `onOnboarding` tells the page not to redirect away mid-way.
function SignUp({ formRef, onOnboarding }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const [step, setStep] = useState(1);
  const [account, setAccount] = useState({ email: '', password: '' });
  const [details, setDetails] = useState({ name: '', school: '', classYear: '', markets: [], types: [] });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const next = params.get('next');
  const dest = next?.startsWith('/') && !next.startsWith('//') ? next : '/explore';

  async function submitAccount(e) {
    e.preventDefault();
    setStatus('saving');
    onOnboarding(true);
    try {
      const { needsConfirmation } = await createAccount(account.email, account.password);
      if (needsConfirmation) {
        onOnboarding(false);
        setStatus('confirm');
        return;
      }
      setStep(2);
      setStatus('idle');
    } catch (err) {
      onOnboarding(false);
      setMessage(err.message);
      setStatus('error');
    }
  }

  async function submitDetails(e) {
    e.preventDefault();
    setStatus('saving');
    try {
      if (session) await saveProfileDetails(session.user.id, details);
    } catch {
      // Details are optional; carry on even if saving them failed.
    }
    navigate(dest, { replace: true });
  }

  const toggle = (k, v) => setDetails((d) => ({ ...d, [k]: d[k].includes(v) ? d[k].filter((x) => x !== v) : [...d[k], v] }));

  if (step === 2) {
    return (
      <form ref={formRef} onSubmit={submitDetails} className="rounded-app border border-line bg-card p-5" aria-labelledby="step2-h">
        <p className="data text-t12 text-fg-2">Step 2 of 2</p>
        <h2 id="step2-h" className="mt-1 text-t20 font-semibold">
          What are you looking for?
        </h2>
        <p className="mt-1 text-t14 text-fg-2">All optional. It puts the firms that fit you first, for summer or post-grad.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Your name" optional autoComplete="name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
          <Input label="Law school" optional autoComplete="organization" value={details.school} onChange={(e) => setDetails({ ...details, school: e.target.value })} />
          <Select
            label="Class year"
            optional
            placeholder="Select"
            options={CLASS_YEARS}
            value={details.classYear}
            onChange={(e) => setDetails({ ...details, classYear: e.target.value })}
            className="sm:col-span-2"
          />
        </div>
        <fieldset className="mt-4">
          <legend className="mb-1.5 text-t14 font-medium">
            Target markets <span className="font-normal text-fg-2">(optional)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {MARKETS.map((m) => (
              <FilterChip key={m} selected={details.markets.includes(m)} onClick={() => toggle('markets', m)}>
                {m}
              </FilterChip>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="mb-1.5 text-t14 font-medium">
            Firm types <span className="font-normal text-fg-2">(optional)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {FIRM_TYPES.map((t) => (
              <FilterChip key={t.value} selected={details.types.includes(t.value)} onClick={() => toggle('types', t.value)}>
                {t.label}
              </FilterChip>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save and see firms'}
          </Button>
          <Button variant="ghost" onClick={() => navigate(dest, { replace: true })}>
            Skip for now
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form ref={formRef} onSubmit={submitAccount} className="rounded-app border border-line bg-card p-5" aria-labelledby="step1-h">
      <h2 id="step1-h" className="text-t20 font-semibold">
        Email and password
      </h2>
      <p className="mt-1 text-t14 text-fg-2">Your profile saves the firms you track and your application progress, on any device. It also unlocks the full firm data.</p>
      <div className="mt-4 space-y-3">
        <Input id="signup-email" label="Email" type="email" required autoComplete="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
        <Input
          label="Password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={account.password}
          onChange={(e) => setAccount({ ...account, password: e.target.value })}
        />
      </div>
      <Button type="submit" className="mt-4 w-full" disabled={status === 'saving'}>
        {status === 'saving' ? 'Creating your profile…' : 'Get free access'}
      </Button>
      {status === 'error' && (
        <p role="alert" className="mt-2 text-t14 text-st-soon-text">
          {message}
        </p>
      )}
      {status === 'confirm' && (
        <p role="status" className="mt-2 text-t14">
          Check your email for a confirmation link. It opens your profile.
        </p>
      )}
      <p className="mt-3 text-t12 text-fg-2">
        Free. No spam. Already have a profile?{' '}
        <Link to={`/signin${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default function Join() {
  const { session, loading } = useSession();
  const [params] = useSearchParams();
  const [onboarding, setOnboarding] = useState(false);
  const formRef = useRef(null);
  const next = params.get('next');
  const dest = next?.startsWith('/') && !next.startsWith('//') ? next : '/explore';

  useEffect(() => {
    document.title = 'Create your free profile — Firmward';
  }, []);

  if (!loading && session && !onboarding) return <Navigate to={dest} replace />;

  return (
    <div className="app min-h-screen">
      <div className="mx-auto max-w-lg px-4 pb-24 pt-8 md:pt-14">
        <h1 className="mb-4 text-t24 font-bold tracking-tight md:text-t32">Create your free profile</h1>
        <SignUp formRef={formRef} onOnboarding={setOnboarding} />
      </div>
    </div>
  );
}
