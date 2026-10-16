import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RequireProfile from '../components/RequireProfile';
import LetterView from '../components/letters/LetterView';
import CoachingNote from '../components/CoachingNote';
import useSession from '../hooks/useSession';
import { supabase } from '../lib/supabase';
import { longDate } from '../lib/firms';

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
    document.title = 'Your documents — Atlas';
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

  return (
    <main className="page pt-8 md:pt-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl">Your documents</h1>
          <p className="mt-1 text-muted">
            {[profile?.full_name, profile?.school, CLASS_LABELS[profile?.class_year]].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button type="button" onClick={out} className="link min-h-[44px] text-sm">
          Sign out
        </button>
      </header>

      <section aria-labelledby="resume-h" className="border-t border-ink py-4">
        <h2 id="resume-h" className="caps text-xs text-muted">
          Resume
        </h2>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
          {profile?.resume_data ? (
            <p>
              <span className="font-serif text-lg">Your resume</span>{' '}
              {profile.resume_updated_at && (
                <span className="nums font-mono text-xs text-muted">updated {longDate(new Date(profile.resume_updated_at))}</span>
              )}
            </p>
          ) : (
            <p className="text-muted">No resume yet. Letters are written from it.</p>
          )}
          <Link to="/resume" className="link text-sm">
            {profile?.resume_data ? 'View or edit' : 'Add your resume'}
          </Link>
        </div>
      </section>

      <section aria-labelledby="letters-h" className="border-t border-ink py-4">
        <h2 id="letters-h" className="caps text-xs text-muted">
          Cover letters
        </h2>
        {loading && <div className="mt-2 h-11 border-b border-rule" aria-busy="true" />}
        {error && <p className="mt-2">Couldn&rsquo;t load your letters. Reload the page to try again.</p>}
        {!loading && !error && letters.length === 0 && (
          <p className="mt-2 text-muted">
            None yet. Open any firm in the{' '}
            <Link to="/directory" className="link">
              directory
            </Link>{' '}
            and choose &ldquo;Write a cover letter.&rdquo;
          </p>
        )}
        <ol>
          {letters.map((l) => (
            <li key={l.id} className="border-b border-rule py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <span>
                  <span className="font-serif text-base">{l.title}</span>{' '}
                  <span className="nums font-mono text-xs text-muted">{longDate(new Date(l.created_at))}</span>
                </span>
                <span className="flex gap-6 text-sm">
                  <button
                    type="button"
                    className="link min-h-[44px] md:min-h-0"
                    aria-expanded={open === l.id}
                    onClick={() => setOpen(open === l.id ? null : l.id)}
                  >
                    {open === l.id ? 'Hide' : 'View'}
                  </button>
                  <button type="button" className="link min-h-[44px] text-muted md:min-h-0" onClick={() => remove(l.id)}>
                    Delete
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

      <CoachingNote>Applying to more than a handful of firms? A coach can help you decide where your letters will land.</CoachingNote>
    </main>
  );
}

export default function Documents() {
  return (
    <RequireProfile>
      <DocumentsPage />
    </RequireProfile>
  );
}
