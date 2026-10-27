import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RequireProfile from '../components/RequireProfile';
import LetterView from '../components/letters/LetterView';
import CoachingNote from '../components/CoachingNote';
import useSession from '../hooks/useSession';
import { supabase } from '../lib/supabase';
import { Trash2 } from 'lucide-react';
import { ButtonLink } from '../components/app/controls';
import { Exhibits, Stamp, Docket } from '../components/marketing/judiciary';
import { Eyebrow } from '../components/marketing/kit';
import Reveal from '../components/motion/Reveal';

const longDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function useLetters(userId) {
  const [state, setState] = useState({ letters: [], loading: true, error: false });
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('documents')
      .select('id,title,content,firm_id,listing_id,created_at,updated_at')
      .eq('user_id', userId)
      .eq('type', 'cover_letter')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => setState({ letters: data ?? [], loading: false, error: Boolean(error) }));
  }, [userId]);
  return [state, setState];
}

const CLASS_LABELS = { '1L': '1L', '2L': '2L', '3L': '3L', transfer: 'Transferring', incoming: 'Starting in 2027' };

function DocumentsPage() {
  const { profile, session, signOut } = useSession();
  const navigate = useNavigate();
  const [{ letters, loading, error }, setState] = useLetters(session?.user.id);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    document.title = 'Your documents — Firmward';
  }, []);

  async function remove(id) {
    if (!window.confirm('Delete this letter? This can’t be undone.')) return;
    const { error: err } = await supabase.from('documents').delete().eq('id', id);
    if (!err) setState((s) => ({ ...s, letters: s.letters.filter((l) => l.id !== id) }));
  }

  async function out() {
    await signOut();
    navigate('/');
  }

  const caption = [profile?.full_name, profile?.school, CLASS_LABELS[profile?.class_year]].filter(Boolean).join(' · ') || session?.user.email;

  // The two existing sections, unchanged in behavior, moved into Exhibit panels.
  const resumeSection = (
    <section aria-labelledby="resume-h" className="rounded-app border border-line bg-card p-4">
      <h2 id="resume-h" className="text-t14 font-semibold">
        Resume
      </h2>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        {profile?.resume_data ? (
          <p className="text-t14">
            Your resume{' '}
            {profile.resume_updated_at && <span className="data text-t12 text-fg-2">updated {longDate(new Date(profile.resume_updated_at))}</span>}
          </p>
        ) : (
          <p className="text-t14 text-fg-2">No resume yet. Cover letters start from it.</p>
        )}
        <ButtonLink to="/resume" variant="secondary" size="sm">
          {profile?.resume_data ? 'View or edit' : 'Add your resume'}
        </ButtonLink>
      </div>
    </section>
  );

  const lettersSection = (
    <section aria-labelledby="letters-h" className="rounded-app border border-line bg-card">
      <h2 id="letters-h" className="border-b border-line px-4 py-3 text-t14 font-semibold">
        Cover letters <span className="data font-normal text-fg-2">{letters.length || ''}</span>
      </h2>
      {loading && <div className="h-14 animate-pulse bg-canvas" aria-busy="true" />}
      {error && <p className="px-4 py-3 text-t14">Couldn&rsquo;t load your letters. Reload the page to try again.</p>}
      {!loading && !error && letters.length === 0 && (
        <p className="px-4 py-3 text-t14 text-fg-2">
          None yet. Open any firm in{' '}
          <Link to="/explore" className="text-brand hover:underline">
            Explore
          </Link>{' '}
          and choose &ldquo;Write cover letter.&rdquo;
        </p>
      )}
      <ol className="divide-y divide-line">
        {letters.map((l) => (
          <li key={l.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
              <span className="min-w-0">
                <span className="block truncate text-t14 font-medium">{l.title}</span>
                <span className="data text-t12 text-fg-2">{longDate(new Date(l.created_at))}</span>
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  className="min-h-[44px] px-2 text-t14 font-medium text-brand hover:underline md:min-h-[32px]"
                  aria-expanded={open === l.id}
                  onClick={() => setOpen(open === l.id ? null : l.id)}
                >
                  {open === l.id ? 'Hide' : 'View'}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${l.title}`}
                  onClick={() => remove(l.id)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-app text-fg-2 hover:bg-brand-tint hover:text-fg md:h-9 md:w-9"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </span>
            </div>
            {open === l.id && (
              <div className="mt-4">
                <LetterView
                  document={l}
                  onChange={(d) => setState((s) => ({ ...s, letters: s.letters.map((x) => (x.id === d.id ? d : x)) }))}
                />
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 md:px-6 md:pb-12">
      <Reveal as="header" className="relative mb-8">
        {/* Filed stamp: floated to the top-right of the masthead on wide screens; static block on phones so it never overlaps. */}
        <div className="pointer-events-none absolute right-0 top-0 hidden md:block">
          <Stamp label="On File" sub="Firmward" />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3 md:pr-44">
          <div>
            <Eyebrow>Your documents</Eyebrow>
            <Docket>{caption}</Docket>
            <h1 className="mt-2 font-display text-[30px] font-semibold uppercase leading-[1.02] tracking-[0.01em] md:text-[46px]">Your Documents</h1>
          </div>
          <button type="button" onClick={out} className="min-h-[44px] text-t14 text-fg-2 hover:text-fg">
            Sign out
          </button>
        </div>
        <div className="mt-6 md:hidden">
          <Stamp label="On File" sub="Firmward" />
        </div>
        <div className="mt-5 h-px w-full bg-brass/40" aria-hidden="true" />
      </Reveal>

      <Exhibits
        label="Your documents"
        items={[
          { id: 'A', label: 'Resume', content: resumeSection },
          { id: 'B', label: 'Cover letters', content: lettersSection },
        ]}
      />

      <Reveal as="div" className="mt-4">
        <CoachingNote>Applying to more than a handful of firms? A coach can help you decide where your letters will land.</CoachingNote>
      </Reveal>
    </div>
  );
}

export default function Documents() {
  return (
    <RequireProfile>
      <div className="app min-h-screen">
        <DocumentsPage />
      </div>
    </RequireProfile>
  );
}
