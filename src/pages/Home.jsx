import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import useSession from '../hooks/useSession';
import useCatalog from '../hooks/useCatalog';
import { createAccount, saveProfileDetails } from '../lib/access';
import { FIRM_TYPES, recommended } from '../lib/catalog';
import { Button, FilterChip, Input, Select } from '../components/app/controls';
import { FirmButtonRow } from '../components/app/firm';
import { FirmRowSkeleton } from '../components/app/feedback';

const MARKETS = ['Dallas', 'Houston', 'Austin', 'San Antonio', 'New Orleans', 'Atlanta', 'Nashville', 'Birmingham', 'Miami', 'Charlotte', 'New York'];
const CLASS_YEARS = [
  { value: '1L', label: '1L (Class of 2029)' },
  { value: '2L', label: '2L (Class of 2028)' },
  { value: '3L', label: '3L (Class of 2027)' },
  { value: 'transfer', label: 'Transferring' },
  { value: 'incoming', label: 'Starting law school in 2027' },
];
const NON_BIGLAW = FIRM_TYPES.filter((t) => t.value !== 'biglaw');

const FAQ = [
  ['Is Atlas free?', 'Yes. The firm directory, the state map, My List tracking, the recruiting calendar, templates and template cover letters are free. Pro ($4.99 a month) adds AI that reads your resume, rewrites your bullets and writes a cover letter for each firm.'],
  ['Where does the information come from?', 'From each firm’s own careers page, checked on a schedule. Every firm shows when it was last verified and links to the source, so you can confirm before you apply.'],
  ['Which firms are included?', 'Litigation and specialty boutiques, plaintiff firms, mid-size and regional firms, government offices and public interest employers. BigLaw is included, but it isn’t the focus, and it always sorts last.'],
  ['Does Atlas apply for me?', 'No. Every firm links to its own application. Atlas helps you find the right firms, prepare your materials and keep track of where you stand with each one.'],
  ['Is this legal advice? Is Atlas affiliated with my school?', 'No to both. Atlas is career information, and it isn’t affiliated with or endorsed by any law school or law firm.'],
];

const STEPS = [
  { title: 'Pick a state', body: 'See every firm we track there, sorted by type, with boutiques and mid-size firms first.', img: '/how/map.png' },
  { title: 'Check the details', body: 'Who hires 1Ls, when applications open, each office’s link, and the open positions.', img: '/how/detail.png' },
  { title: 'Track every application', body: 'Save firms and move each one from saved to applied to offer. It’s there on any device.', img: '/how/list.png' },
];

function Stats({ firms }) {
  const markets = new Set(firms.flatMap((f) => f.cities)).size;
  const hiring = firms.filter((f) => f.hires === 'yes').length;
  const items = [
    [firms.length, 'firms'],
    [markets, 'markets'],
    [hiring, 'confirmed hiring 1Ls'],
  ];
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1 text-t14 text-fg-2">
      {items.map(([n, label]) => (
        <span key={label}>
          <span className="data font-medium text-fg">{n || '…'}</span> {label}
        </span>
      ))}
    </p>
  );
}

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
        <p className="mt-1 text-t14 text-fg-2">All optional. It puts the firms that fit you first.</p>
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
        Get free access
      </h2>
      <p className="mt-1 text-t14 text-fg-2">Your profile saves the firms you track, on any device.</p>
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

function MiniSearch({ firms, loading, onPick }) {
  const [market, setMarket] = useState('Houston');
  const [type, setType] = useState('');
  const markets = useMemo(() => MARKETS.filter((m) => firms.some((f) => f.cities.includes(m))), [firms]);
  const results = useMemo(() => {
    // Only firms with a known, non-BigLaw type, so an unclassified big firm can't slip into the preview.
    const pool = firms.filter((f) => f.type && f.type !== 'biglaw' && (!market || f.cities.includes(market)) && (!type || f.type === type));
    // Lead with windows that are open or coming up, then firms confirmed to hire 1Ls, then everything else.
    const rank = (f) => (['open', 'rolling', 'soon', 'upcoming'].includes(f.status.kind) ? 0 : f.hires === 'yes' ? 1 : 2);
    return recommended(pool, null).sort((a, b) => rank(a) - rank(b)).slice(0, 5);
  }, [firms, market, type]);

  return (
    <section aria-labelledby="try-h" className="self-start rounded-app border border-line bg-card">
      <div className="border-b border-line p-4">
        <h2 id="try-h" className="text-t14 font-semibold">
          Try it
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Select aria-label="Market" options={markets.map((m) => ({ value: m, label: m }))} placeholder="Any market" value={market} onChange={(e) => setMarket(e.target.value)} />
          <Select aria-label="Firm type" options={NON_BIGLAW} placeholder="Any type but BigLaw" value={type} onChange={(e) => setType(e.target.value)} />
        </div>
      </div>
      {loading ? (
        <FirmRowSkeleton rows={5} />
      ) : results.length ? (
        <div>
          {results.map((f) => (
            <FirmButtonRow key={f.id} firm={f} onClick={onPick} />
          ))}
        </div>
      ) : (
        <p className="p-4 text-t14 text-fg-2">No firms of that type in this market yet. Try another type.</p>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-line p-3">
        <span className="text-t12 text-fg-2">Real firms from the directory</span>
        <Button variant="secondary" size="sm" onClick={onPick}>
          See all
        </Button>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <div className="divide-y divide-line rounded-app border border-line bg-card">
      {FAQ.map(([q, a]) => (
        <details key={q} className="group">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 px-4 text-t16 font-medium [&::-webkit-details-marker]:hidden">
            {q}
            <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-fg-2 transition-transform duration-150 group-open:rotate-180" />
          </summary>
          <p className="px-4 pb-4 text-t14 text-fg-2">{a}</p>
        </details>
      ))}
    </div>
  );
}

export default function Home() {
  const { session, loading: sessionLoading } = useSession();
  const { firms, loading } = useCatalog();
  const formRef = useRef(null);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    document.title = 'Atlas — Firms that hire 1Ls, beyond BigLaw';
  }, []);

  const toForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('signup-email')?.focus({ preventScroll: true });
  };

  // Signed-in students start on the map, except while finishing sign-up.
  if (!sessionLoading && session && !onboarding) return <Navigate to="/explore" replace />;

  return (
    <div className="app">
      <main>
        <section className="mx-auto grid max-w-app gap-10 px-4 pb-16 pt-10 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-14 lg:pt-16">
          <div className="min-w-0">
            <h1 className="max-w-xl text-t32 font-bold leading-tight tracking-tight">Find the firms that hire 1Ls, beyond BigLaw.</h1>
            <p className="mt-3 max-w-xl text-t16 text-fg-2">
              Boutique, plaintiff, mid-size, regional and public interest employers, with who&rsquo;s hiring, when windows open and where to apply.
            </p>
            <div className="mt-4">
              <Stats firms={firms} />
            </div>
            <div className="mt-8 max-w-md">
              <SignUp formRef={formRef} onOnboarding={setOnboarding} />
            </div>
          </div>
          <MiniSearch firms={firms} loading={loading} onPick={toForm} />
        </section>

        <section aria-labelledby="how-h" className="border-t border-line bg-card">
          <div className="mx-auto max-w-app px-4 py-14 md:px-6">
            <h2 id="how-h" className="text-t24 font-bold tracking-tight">
              How it works
            </h2>
            <ol className="mt-6 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <img src={s.img} alt="" loading="lazy" width="800" height="500" className="aspect-[8/5] w-full rounded-app border border-line bg-canvas object-cover object-top" />
                  <h3 className="mt-3 text-t16 font-semibold">
                    <span className="data mr-2 text-fg-2">{i + 1}</span>
                    {s.title}
                  </h3>
                  <p className="mt-1 text-t14 text-fg-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="faq-h" className="mx-auto max-w-3xl px-4 py-14 md:px-6">
          <h2 id="faq-h" className="text-t24 font-bold tracking-tight">
            Questions
          </h2>
          <div className="mt-5">
            <Faq />
          </div>
          <p className="mt-10 text-t14 text-fg-2">Built by a 3L who transferred from Brooklyn Law and spent a summer at a Dallas litigation boutique.</p>
        </section>
      </main>
    </div>
  );
}
