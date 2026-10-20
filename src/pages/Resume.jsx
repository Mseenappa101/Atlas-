import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileUp, ListChecks, Pencil, Printer, Sparkles } from 'lucide-react';
import useSession from '../hooks/useSession';
import useUsage from '../hooks/useUsage';
import RequireProfile from '../components/RequireProfile';
import UploadResume from '../components/resume/UploadResume';
import ResumeBuilder from '../components/resume/ResumeBuilder';
import ResumeEditor from '../components/resume/ResumeEditor';
import CoachingNote from '../components/CoachingNote';
import { Button, ButtonLink } from '../components/app/controls';
import { api } from '../lib/api';
import { downloadDoc, printDocument, resumeToHtml, slug } from '../lib/documents';

function Sheet({ resume }) {
  return (
    <article
      data-printable
      aria-label="Your resume"
      className="doc-sheet mx-auto max-w-[680px] rounded-app border border-line bg-white px-6 py-8 md:px-14 md:py-12"
      dangerouslySetInnerHTML={{ __html: resumeToHtml(resume) }}
    />
  );
}

function StoredFile({ name }) {
  const [status, setStatus] = useState('idle');
  async function download() {
    setStatus('working');
    try {
      const { url } = await api('/resume/file');
      window.location.assign(url);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-app border border-line bg-card px-4 py-3">
      <p className="min-w-0 truncate text-t14">
        <span className="font-medium">Your file:</span> <span className="text-fg-2">{name}</span>
      </p>
      <Button variant="secondary" size="sm" icon={Download} onClick={download} disabled={status === 'working'}>
        Download
      </Button>
      {status === 'error' && <p className="w-full text-t12 text-st-soon-text">Couldn’t get the file. Try again in a minute.</p>}
    </div>
  );
}

function Choose({ profile, pro, onResume, onStored }) {
  const [mode, setMode] = useState(null);
  if (mode === 'build') return <ResumeBuilder profile={profile} pro={pro} onDone={onResume} onCancel={() => setMode(null)} />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section aria-labelledby="upload-h" className="rounded-app border border-line bg-card p-5">
        <h2 id="upload-h" className="flex items-center gap-2 text-t16 font-semibold">
          <FileUp size={18} aria-hidden="true" className="text-brand" />
          Upload the resume you have
        </h2>
        <p className="mb-4 mt-1 text-t14 text-fg-2">
          {pro
            ? 'We read it into the editor so you can fix any line and reuse it for every cover letter.'
            : 'Keep your file here, ready to download for any application.'}
        </p>
        <UploadResume pro={pro} onDone={onResume} onStored={onStored} />
        {!pro && (
          <p className="mt-3 text-t12 text-fg-2">
            With <Link to="/pro" className="text-brand hover:underline">Pro</Link>, we read your file into an editable resume.
          </p>
        )}
      </section>
      <section aria-labelledby="build-h" className="rounded-app border border-line bg-card p-5">
        <h2 id="build-h" className="flex items-center gap-2 text-t16 font-semibold">
          <ListChecks size={18} aria-hidden="true" className="text-brand" />
          Fill in the resume form
        </h2>
        <p className="mb-4 mt-1 text-t14 text-fg-2">
          Five short steps: contact, law school, college, jobs, interests. You get a clean one-page law student resume
          {pro ? ', and AI can rewrite your job descriptions into strong bullets.' : ' in your own words.'}
        </p>
        <Button variant="secondary" onClick={() => setMode('build')}>
          Start the form
        </Button>
      </section>
    </div>
  );
}

function ResumePage() {
  const { profile, refreshProfile } = useSession();
  const [usage] = useUsage();
  const pro = Boolean(usage?.pro);
  const [resume, setResume] = useState(profile?.resume_data ?? null);
  const [fileName, setFileName] = useState(profile?.resume_file_path?.split('/').pop()?.replace(/^\d+-/, '') ?? null);
  const [mode, setMode] = useState('view');

  useEffect(() => {
    document.title = 'Your resume — Firmward';
  }, []);

  function got(r) {
    setResume(r);
    setMode('view');
    refreshProfile();
  }

  const name = resume?.name || profile?.full_name || 'resume';

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 md:px-6 md:pb-12">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-t24 font-bold tracking-tight md:text-t32">Your resume</h1>
          <p className="mt-1 text-t16 text-fg-2">
            {resume ? 'Check every line, then pick firms and write a cover letter for each.' : 'Every cover letter starts from this, so it only needs doing once.'}
          </p>
        </div>
        {usage && (
          <span className="rounded-pill border border-line bg-card px-2.5 py-0.5 text-t12 text-fg-2">
            {pro ? 'Pro' : 'Free plan'}
          </span>
        )}
      </header>

      {fileName && mode !== 'edit' && (
        <div className="mb-4">
          <StoredFile name={fileName} />
        </div>
      )}

      {!resume && mode !== 'replace' && (
        <Choose profile={profile} pro={pro} onResume={got} onStored={(f) => { setFileName(f.file_name); refreshProfile(); }} />
      )}

      {resume && mode === 'view' && (
        <>
          <div className="no-print mb-4 flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setMode('edit')}>
              Edit
            </Button>
            <Button variant="secondary" size="sm" icon={Download} onClick={() => downloadDoc(`${slug(name)}-resume.doc`, `${name} — Resume`, resumeToHtml(resume))}>
              Download .doc
            </Button>
            <Button variant="secondary" size="sm" icon={Printer} onClick={printDocument}>
              Save as PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode('replace')}>
              Start over
            </Button>
            <ButtonLink to="/explore" size="sm" className="ml-auto">
              Pick firms
            </ButtonLink>
          </div>
          <Sheet resume={resume} />
          {!pro && (
            <p className="no-print mt-4 flex items-center gap-2 text-t14 text-fg-2">
              <Sparkles size={16} aria-hidden="true" className="text-brand" />
              <span>
                <Link to="/pro" className="text-brand hover:underline">Pro</Link> rewrites your job descriptions into strong bullets and writes a cover letter for every firm.
              </span>
            </p>
          )}
          <CoachingNote>Most law student resumes get one look. Have a coach go through yours line by line before January.</CoachingNote>
        </>
      )}

      {resume && mode === 'edit' && <ResumeEditor resume={resume} onSaved={got} onCancel={() => setMode('view')} />}

      {mode === 'replace' && (
        <>
          <p className="mb-4 text-t14">
            Replacing your resume doesn’t touch the cover letters you’ve already written.{' '}
            <button type="button" className="text-brand hover:underline" onClick={() => setMode('view')}>
              Keep the current one
            </button>
            .
          </p>
          <Choose profile={profile} pro={pro} onResume={got} onStored={(f) => { setFileName(f.file_name); refreshProfile(); }} />
        </>
      )}
    </div>
  );
}

export default function Resume() {
  return (
    <RequireProfile>
      <div className="app min-h-screen">
        <ResumePage />
      </div>
    </RequireProfile>
  );
}
