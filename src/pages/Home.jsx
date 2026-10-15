import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useFirms from '../hooks/useFirms';
import { FEATURED_MARKETS, FIRM_TYPES, isWindowPast, latestVerified, longDate } from '../lib/firms';
import { hasAccess, signUp } from '../lib/access';
import { site } from '../lib/site';
import FirmTable, { TablePlaceholder } from '../components/directory/FirmTable';
import { Button, SelectField, TextField } from '../components/ui';

const CLASS_YEARS = [
  { value: '1L', label: '1L (Class of 2029)' },
  { value: '2L', label: '2L (Class of 2028)' },
  { value: '3L', label: '3L (Class of 2027)' },
  { value: 'transfer', label: 'Transferring' },
  { value: 'incoming', label: 'Starting law school in 2027' },
];

const MARKETS = [...FEATURED_MARKETS.map((m) => (m === 'New York' ? 'New York (boutiques)' : m)), 'Somewhere else'];
const TYPES = [...FIRM_TYPES.filter((t) => t.value !== 'biglaw').map((t) => t.label), 'Not sure yet'];

const VISIBLE = 5;
const TEASER = 5;

// Lead with firms that say yes to 1Ls in launch markets, upcoming windows first.
function previewFirms(firms) {
  const rank = (f) =>
    (f.hires === 'yes' ? 0 : 4) +
    (FEATURED_MARKETS.includes(f.city) ? 0 : 2) +
    ((f.windowStart || f.windowEnd) && !isWindowPast(f) ? 0 : 1);
  return [...firms].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)).slice(0, VISIBLE + TEASER);
}

function SignupForm({ firmCount }) {
  const [form, setForm] = useState({ name: '', email: '', school: '', classYear: '', market: '', firmType: '' });
  const [status, setStatus] = useState('idle');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setStatus('saving');
    try {
      await signUp(form);
      const next = params.get('next');
      navigate(next?.startsWith('/directory') ? next : '/directory');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" aria-describedby="signup-note">
      <TextField label="Name" required autoComplete="name" value={form.name} onChange={set('name')} />
      <TextField label="Email" id="signup-email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
      <TextField label="Law school" required autoComplete="organization" value={form.school} onChange={set('school')} />
      <SelectField label="Class year" required placeholder="Select" options={CLASS_YEARS} value={form.classYear} onChange={set('classYear')} />
      <SelectField label="Target market" placeholder="Select" options={MARKETS} value={form.market} onChange={set('market')} />
      <SelectField label="Target firm type" placeholder="Select" options={TYPES} value={form.firmType} onChange={set('firmType')} />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={status === 'saving'} className="w-full sm:w-auto">
          {status === 'saving' ? 'Saving…' : 'Get free access'}
        </Button>
        <p id="signup-note" className="mt-2 text-xs text-muted">
          Free. No spam. Unsubscribe anytime.
        </p>
        {status === 'error' && (
          <p role="alert" className="mt-2 text-sm text-accent">
            Couldn&rsquo;t save your signup. Check your connection and try again.
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          {status === 'idle' && firmCount ? `Signing up opens all ${firmCount} firms.` : ''}
        </p>
      </div>
    </form>
  );
}

export default function Home() {
  const { firms, loading, error } = useFirms();
  const [unlocked] = useState(hasAccess);
  const formRef = useRef(null);
  const navigate = useNavigate();
  const preview = useMemo(() => previewFirms(firms), [firms]);
  const updated = useMemo(() => latestVerified(firms), [firms]);
  const marketCount = useMemo(() => new Set(firms.map((f) => f.city)).size, [firms]);
  const count = firms.length;

  useEffect(() => {
    document.title = 'Atlas — Which firms hire 1Ls, beyond BigLaw';
  }, []);

  // Clicking a preview row sends people to the form instead of a locked panel.
  const toForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('signup-email')?.focus({ preventScroll: true });
  };

  return (
    <main className="page">
      <header className="pt-6 md:pt-8">
        <p className="caps font-serif text-2xl font-semibold leading-none tracking-[0.14em]">Atlas</p>
        <div className="mt-3 border-t border-ink" />
        <p className="nums mt-2 font-mono text-xs text-muted">
          <span className="whitespace-nowrap">{site.edition}</span>
          {count > 0 && (
            <>
              {' '}· <span className="whitespace-nowrap">{count} firms</span>
            </>
          )}
          {updated && (
            <>
              {' '}· <span className="whitespace-nowrap">Updated {longDate(updated)}</span>
            </>
          )}
        </p>
      </header>

      <div className="mt-10 grid gap-12 md:mt-14 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-16">
        <section aria-labelledby="pitch">
          <h1 id="pitch" className="text-xl md:text-2xl">
            Which firms hire 1Ls — beyond BigLaw.
          </h1>
          <p className="mt-4 text-base text-muted">
            Boutique, mid-size and regional firms, with their 1L hiring windows and direct application links.
          </p>
          <ul className="mt-6 space-y-2 border-t border-rule pt-4 text-sm">
            <li>
              The directory: {count || 'hundreds of'} firms across {marketCount || 'dozens of'} markets, each checked against the firm&rsquo;s own
              careers page.
            </li>
            <li>A 1L recruiting calendar, October through June.</li>
            <li>Templates: a 1L resume, a boutique cover letter and networking emails.</li>
          </ul>

          <div ref={formRef} className="mt-8 border-t border-ink pt-6">
            {unlocked ? (
              <p className="text-base">
                You already have access.{' '}
                <Link to="/directory" className="link">
                  Open the directory
                </Link>
                .
              </p>
            ) : (
              <SignupForm firmCount={count} />
            )}
          </div>
        </section>

        <section aria-labelledby="preview-label" className="min-w-0">
          <h2 id="preview-label" className="caps mb-2 text-xs text-muted">
            From the directory
          </h2>
          {loading && <TablePlaceholder rows={VISIBLE} />}
          {error && <p className="border-t border-rule py-4 text-sm">Couldn&rsquo;t load the preview. The full directory is still available once you sign up.</p>}
          {!loading && !error && (
            <>
              <FirmTable
                firms={preview}
                variant="preview"
                inertFrom={unlocked ? Infinity : VISIBLE}
                onOpen={unlocked ? (f) => navigate(`/directory/${f.id}`) : toForm}
                caption={`Preview: ${VISIBLE} of ${count} firms`}
              />
              {!unlocked && (
                <p className="mt-4 text-sm">
                  <button type="button" onClick={toForm} className="link">
                    Enter your email to see all {count} firms.
                  </button>
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <p className="mt-16 border-t border-rule pt-4 text-sm text-muted">
        Built by a 3L who transferred from Brooklyn Law and spent a summer at a Dallas litigation boutique.
      </p>
    </main>
  );
}
