import { useEffect, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Sparkles } from 'lucide-react';
import RequireProfile from '../components/RequireProfile';
import CoachingNote from '../components/CoachingNote';
import LetterView from '../components/letters/LetterView';
import { Button, ButtonLink, FieldLabel } from '../components/app/controls';
import { MonogramTile } from '../components/app/firm';
import useSession from '../hooks/useSession';
import useCatalog from '../hooks/useCatalog';
import useListings from '../hooks/useListings';
import useUsage from '../hooks/useUsage';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { templateLetter } from '../lib/templateLetter';

const titleFor = (firm, listing, kind) => `${firm.name} — ${listing?.title ?? 'Summer position'}${kind === 'template' ? ' (template)' : ''}`;

function NewLetter() {
  const [params] = useSearchParams();
  const { profile, session } = useSession();
  const { firms, idMap } = useCatalog();
  const { listings } = useListings();
  const [usage, setUsage] = useUsage();
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [doc, setDoc] = useState(null);
  const notesId = useId();

  const listing = listings.find((l) => l.id === params.get('listing')) ?? null;
  const rawFirmId = params.get('firm') ?? listing?.firmId;
  const firmId = rawFirmId ? (idMap?.get(rawFirmId) ?? rawFirmId) : null;
  const firm = firms.find((f) => f.id === firmId) ?? null;

  useEffect(() => {
    if (firm) document.title = `Cover letter for ${firm.name} — Atlas`;
  }, [firm]);

  const resume = profile?.resume_data ?? null;
  const pro = Boolean(usage?.pro);
  const freeAiLeft = usage && !pro ? Math.max(0, (usage.letters_limit ?? 0) - usage.letters_used) : 0;
  const canAi = pro || freeAiLeft > 0;

  async function useTemplate() {
    setStatus('saving');
    setError(null);
    const content = templateLetter({ profile, resume, firm, listing });
    const row = { user_id: session.user.id, firm_id: firm.id, type: 'cover_letter', content, title: titleFor(firm, listing, 'template') };
    if (listing) row.listing_id = listing.id;
    const { data, error: err } = await supabase.from('documents').insert(row).select('id,title,content,firm_id,listing_id,created_at').single();
    if (err) {
      // Still show the letter even if saving failed; they can copy or download it.
      setDoc({ id: 'unsaved', title: row.title, content, firm_id: firm.id, created_at: new Date().toISOString(), unsaved: true });
    } else setDoc(data);
    setStatus('done');
  }

  async function useAi(e) {
    e.preventDefault();
    setStatus('working');
    setError(null);
    try {
      const out = await api('/letters', {
        method: 'POST',
        body: { firm_id: firm.id, listing_id: listing?.id ?? undefined, notes: notes.trim() || undefined },
      });
      setDoc(out.document);
      setUsage(out.usage);
      setStatus('done');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  if (!firm) {
    return (
      <p className="text-t14">
        Pick a firm first.{' '}
        <Link to="/explore" className="text-brand hover:underline">
          Open Explore
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      <header className="mb-6 flex items-start gap-4">
        <MonogramTile name={firm.name} size="lg" />
        <div className="min-w-0">
          <p className="text-t12 font-semibold uppercase tracking-wide text-fg-2">Cover letter</p>
          <h1 className="text-t24 font-bold tracking-tight">{firm.name}</h1>
          <p className="text-t14 text-fg-2">{[listing?.title, firm.typeLabel, firm.cities.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}</p>
        </div>
      </header>

      {!doc && (
        <div className="grid gap-4 md:grid-cols-2">
          <section aria-labelledby="tpl-h" className="flex flex-col rounded-app border border-line bg-card p-5">
            <h2 id="tpl-h" className="flex items-center gap-2 text-t16 font-semibold">
              <FileText size={18} aria-hidden="true" className="text-brand" />
              Template letter
              <span className="rounded-pill bg-canvas px-2 text-t12 font-medium text-fg-2">Free</span>
            </h2>
            <p className="mt-1 flex-1 text-t14 text-fg-2">
              A ready-to-edit letter with {firm.name}&rsquo;s name, city and practice areas filled in
              {resume ? ', plus your school and first job' : ''}. Brackets mark the two or three lines only you can write.
            </p>
            <div className="mt-4">
              <Button variant="secondary" onClick={useTemplate} disabled={status === 'saving' || status === 'working'}>
                {status === 'saving' ? 'Preparing…' : 'Use the template'}
              </Button>
            </div>
          </section>

          <section aria-labelledby="ai-h" className="flex flex-col rounded-app border border-line bg-card p-5">
            <h2 id="ai-h" className="flex items-center gap-2 text-t16 font-semibold">
              <Sparkles size={18} aria-hidden="true" className="text-brand" />
              Written for {firm.name}
              <span className="rounded-pill bg-brand-tint px-2 text-t12 font-medium text-brand">{pro ? 'Pro' : freeAiLeft ? '1 free' : 'Pro'}</span>
            </h2>
            {!resume ? (
              <>
                <p className="mt-1 flex-1 text-t14 text-fg-2">Written from your resume, so add it first. It takes a few minutes and only needs doing once.</p>
                <div className="mt-4">
                  <ButtonLink to="/resume" variant="secondary">
                    Add your resume
                  </ButtonLink>
                </div>
              </>
            ) : canAi ? (
              <form onSubmit={useAi} className="mt-1 flex flex-1 flex-col">
                <p className="text-t14 text-fg-2">
                  A full letter from your resume and what we know about the firm.{' '}
                  {!pro && 'Your free account includes one.'}
                </p>
                <div className="mt-3">
                  <FieldLabel htmlFor={notesId} optional>
                    Anything it should mention?
                  </FieldLabel>
                  <textarea
                    id={notesId}
                    rows={3}
                    maxLength={1000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. I grew up in Houston and want to do energy litigation."
                    className="block w-full rounded-app border border-line bg-card px-3 py-2 text-t14 placeholder:text-fg-2 hover:border-fg-2"
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={status === 'working' || status === 'saving'}>
                    {status === 'working' ? 'Writing…' : 'Write it for me'}
                  </Button>
                  {status === 'working' && <span role="status" className="text-t14 text-fg-2">About 20 seconds.</span>}
                  {pro && usage?.ai_limit_month && status !== 'working' && (
                    <span className="data text-t12 text-fg-2">
                      {usage.ai_used_month}/{usage.ai_limit_month} this month
                    </span>
                  )}
                </div>
              </form>
            ) : (
              <>
                <p className="mt-1 flex-1 text-t14 text-fg-2">
                  You&rsquo;ve used your free AI letter. Pro writes one for every firm you apply to, and rewrites your resume bullets. $4.99 a month, cancel anytime.
                </p>
                <div className="mt-4">
                  <ButtonLink to="/pro">See Pro</ButtonLink>
                </div>
              </>
            )}
            {status === 'error' && (
              <p role="alert" className="mt-3 text-t14 text-st-soon-text">
                {error?.code === 'limit_reached' ? (
                  <>
                    {error.message} <Link to="/pro" className="text-brand hover:underline">See Pro</Link>.
                  </>
                ) : (
                  error?.message
                )}
              </p>
            )}
          </section>
        </div>
      )}

      {doc && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-app border border-line bg-card px-4 py-3 text-t14">
            <p>
              {doc.unsaved ? (
                'Couldn’t save this to your documents. Copy or download it below.'
              ) : (
                <>
                  Saved to <Link to="/documents" className="text-brand hover:underline">your documents</Link>. Read it closely and fill in anything in brackets.
                </>
              )}
            </p>
            <button type="button" className="text-brand hover:underline" onClick={() => { setDoc(null); setStatus('idle'); }}>
              Write another version
            </button>
          </div>
          <LetterView document={doc} onChange={setDoc} />
          <CoachingNote>Sending this to {firm.name}? Have a coach read it with you first.</CoachingNote>
        </>
      )}
    </>
  );
}

export default function LetterNewPage() {
  return (
    <RequireProfile>
      <div className="app min-h-screen">
        <div className="mx-auto max-w-4xl px-4 pb-24 pt-4 md:px-6 md:pb-12">
          <Link to="/explore" className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-t14 text-fg-2 hover:text-fg">
            <ArrowLeft size={18} aria-hidden="true" />
            Back to Explore
          </Link>
          <NewLetter />
        </div>
      </div>
    </RequireProfile>
  );
}
