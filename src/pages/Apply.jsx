import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Mail, MousePointerClick } from 'lucide-react';
import RequireProfile from '../components/RequireProfile';
import { Segmented } from '../components/app/controls';
import { MonogramTile, StatusPill } from '../components/app/firm';
import { EmptyState } from '../components/app/feedback';
import Materials from '../components/apply/Materials';
import Compose from '../components/apply/Compose';
import Portal from '../components/apply/Portal';
import ConnectNotice from '../components/apply/ConnectNotice';
import { Activity, Checklist, Deadline, Notes } from '../components/apply/Side';
import useCatalog from '../hooks/useCatalog';
import useMyList from '../hooks/useMyList';
import useSession from '../hooks/useSession';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { officesLabel } from '../lib/format';
import { STAGES, stageOf, stagePatch } from '../lib/stages';
import { portalUrl, resumeOptions } from '../lib/application';

const fileSafe = (s) => String(s ?? '').replace(/[\\/:*?"<>|]+/g, ' ').trim();

// Loads everything this application needs besides the row itself.
async function loadWorkspace(userId, rowId) {
  const [letters, files, messages, events, conn] = await Promise.all([
    supabase.from('documents').select('id,title,firm_id,created_at').eq('user_id', userId).eq('type', 'cover_letter').order('created_at', { ascending: false }),
    supabase.from('user_files').select('id,kind,name,size,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('sent_messages').select('id,via,from_email,to_email,cc,subject,body,attachments,status,error,created_at').eq('user_firm_id', rowId).order('created_at', { ascending: false }),
    supabase.from('application_events').select('id,kind,detail,created_at').eq('user_firm_id', rowId).order('created_at', { ascending: false }),
    api('/email/connections').catch(() => ({ connections: [], available: { gmail: false, outlook: false, firmward: false } })),
  ]);
  return { letters: letters.data ?? [], files: files.data ?? [], messages: messages.data ?? [], events: events.data ?? [], conn, loaded: true };
}

const EMPTY = { letters: [], files: [], messages: [], events: [], conn: null, loaded: false };

function useWorkspaceData(userId, rowId) {
  const [data, setData] = useState(EMPTY);
  const reload = useCallback(() => (userId && rowId ? loadWorkspace(userId, rowId).then(setData) : Promise.resolve()), [userId, rowId]);
  useEffect(() => {
    if (!userId || !rowId) return;
    let live = true;
    loadWorkspace(userId, rowId).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [userId, rowId]);
  return [data, setData, reload];
}

function Workspace({ firm }) {
  const { session, profile } = useSession();
  const { rows, ensure, update, replace } = useMyList();
  const [params, setParams] = useSearchParams();
  const row = rows.find((r) => r.firm_id === firm.id && !String(r.id).startsWith('tmp-'));
  const [data, setData, reload] = useWorkspaceData(session?.user.id, row?.id);
  const asked = useRef(null);

  // Opening a firm's application adds it to My List.
  useEffect(() => {
    if (row || !session || asked.current === firm.id) return;
    asked.current = firm.id;
    ensure(firm.id);
  }, [row, session, firm.id, ensure]);

  // Defaults for a new application: their resume, and the newest letter written for this firm.
  const materials = useMemo(() => {
    const m = row?.materials ?? {};
    const resumes = resumeOptions(profile);
    const firmLetter = data.letters.find((l) => l.firm_id === firm.id);
    return {
      resume: m.resume ?? resumes[0]?.value ?? 'none',
      letter_id: m.letter_id !== undefined ? m.letter_id : firmLetter?.id ?? null,
      file_ids: (m.file_ids ?? []).filter((id) => data.files.some((f) => f.id === id)),
    };
  }, [row?.materials, profile, data.letters, data.files, firm.id]);

  // Coming back from writing a letter: attach it.
  const newLetter = params.get('letter');
  useEffect(() => {
    if (!row || !newLetter || !data.loaded) return;
    if (data.letters.some((l) => l.id === newLetter)) update(row.id, { materials: { ...materials, letter_id: newLetter } });
    const next = new URLSearchParams(params);
    next.delete('letter');
    setParams(next, { replace: true });
  }, [row, newLetter, data.loaded, data.letters, materials, params, setParams, update]);

  if (!row) {
    return <div className="h-64 animate-pulse rounded-app bg-line" aria-busy="true" aria-label="Loading your application" />;
  }

  const method = row.method ?? (firm.recruitingEmail || row.contact_email ? 'email' : 'portal');
  const stage = stageOf(row);
  const name = fileSafe(profile?.full_name) || 'Resume';
  const letter = data.letters.find((l) => l.id === materials.letter_id);
  const attachmentNames = [
    materials.resume === 'file' && profile?.resume_file_path && `${name} - Resume.${profile.resume_file_path.endsWith('.docx') ? 'docx' : 'pdf'}`,
    materials.resume === 'builder' && `${name} - Resume.pdf`,
    letter && `${name} - Cover Letter - ${fileSafe(firm.name)}.pdf`,
    ...data.files.filter((f) => materials.file_ids.includes(f.id)).map((f) => f.name),
  ].filter(Boolean);

  const sent = data.messages.some((m) => m.status === 'sent');
  const progress = [
    { label: 'Resume chosen', done: materials.resume !== 'none' },
    { label: 'Cover letter chosen', done: Boolean(letter) },
    method === 'email'
      ? { label: 'Application emailed', done: sent }
      : { label: 'Submitted on the firm’s site', done: data.events.some((e) => e.kind === 'submitted') || Boolean(row.applied_at) },
  ];

  const save = (patch) => update(row.id, patch);

  return (
    <>
      <ConnectNotice />
      <header className="mb-6 flex flex-wrap items-start gap-4">
        <MonogramTile name={firm.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-t12 font-medium uppercase tracking-wide text-fg-2">Application</p>
          <h1 className="text-t24 font-bold leading-tight tracking-tight md:text-t32">{firm.name}</h1>
          <p className="mt-0.5 text-t14 text-fg-2">
            {[firm.typeLabel, officesLabel(firm.offices, 3)].filter(Boolean).join(' · ')} ·{' '}
            <Link to={`/firms/${firm.slug}`} state={{ from: `/apply/${firm.slug}` }} className="text-brand hover:underline">Firm details</Link>
          </p>
          <div className="mt-2"><StatusPill status={firm.status} /></div>
        </div>
        <div className="w-full sm:w-auto">
          <label htmlFor="stage" className="mb-1.5 block text-t14 font-medium">Stage</label>
          <select
            id="stage"
            value={stage}
            onChange={(e) => save(stagePatch(row, e.target.value)).then(reload)}
            className="min-h-[44px] w-full rounded-app border border-line bg-card px-3 text-t14 font-medium hover:border-fg-2 sm:w-48 md:min-h-[40px]"
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <section aria-labelledby="how-h" className="rounded-app border border-line bg-card p-4 md:p-5">
            <h2 id="how-h" className="text-t16 font-semibold">How you&rsquo;ll apply</h2>
            <p className="mb-3 mt-0.5 text-t14 text-fg-2">
              {firm.recruitingEmail
                ? `${firm.name} accepts applications by email at ${firm.recruitingEmail}.`
                : portalUrl(firm)
                  ? `${firm.name} takes applications on its website. If the posting gives an email address, you can email it from here instead.`
                  : `We don’t know yet how ${firm.name} takes applications. Check the posting.`}
            </p>
            <Segmented
              label="Application method"
              value={method}
              onChange={(v) => save({ method: v })}
              options={[
                { value: 'email', label: 'Email the firm', icon: Mail },
                { value: 'portal', label: 'Firm’s website', icon: MousePointerClick },
              ]}
            />
          </section>

          <Materials
            firm={firm}
            slug={firm.slug}
            profile={profile}
            materials={materials}
            onChange={(m) => save({ materials: m })}
            letters={data.letters}
            files={data.files}
            onFilesChange={(files) => setData((d) => ({ ...d, files }))}
          />

          {method === 'email' ? (
            data.conn ? (
              <Compose
                key={row.id}
                row={row}
                firm={firm}
                slug={firm.slug}
                profile={profile}
                accountEmail={session.user.email}
                conn={data.conn}
                materials={materials}
                attachmentNames={attachmentNames}
                onSaveDraft={(draft) => save({ draft })}
                onSent={(out) => {
                  if (out) replace(out.user_firm);
                  reload();
                }}
              />
            ) : (
              <div className="h-64 animate-pulse rounded-app bg-line" aria-busy="true" />
            )
          ) : (
            <Portal
              firm={firm}
              row={row}
              attachmentNames={attachmentNames}
              onSubmitted={async () => {
                await save({ ...stagePatch(row, ['interviewing', 'offer'].includes(stage) ? stage : 'applied'), method: 'portal' });
                await supabase.from('application_events').insert({ user_id: session.user.id, user_firm_id: row.id, kind: 'submitted' });
                reload();
              }}
            />
          )}
        </div>

        <aside className="space-y-4" aria-label="Deadline, checklist and activity">
          <Deadline firm={firm} row={row} onChange={(deadline) => save({ deadline })} />
          <Checklist progress={progress} items={row.checklist ?? []} onChange={(checklist) => save({ checklist })} />
          <Notes key={row.id} row={row} onSave={(notes) => save({ notes })} />
          <Activity events={data.events} messages={data.messages} />
          {portalUrl(firm) && method === 'email' && (
            <p className="text-t12 text-fg-2">
              Prefer the firm&rsquo;s form?{' '}
              <a href={portalUrl(firm)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
                Open it <ExternalLink size={12} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

function Page() {
  const { slug } = useParams();
  const { firms, loading } = useCatalog();
  const firm = firms.find((f) => f.slug === slug);

  useEffect(() => {
    if (firm) document.title = `${firm.name} application — Firmward`;
  }, [firm]);

  return (
    <div className="mx-auto max-w-app px-4 pb-24 pt-4 md:px-6 md:pb-12">
      <Link to="/my-list" className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-t14 text-fg-2 hover:text-fg">
        <ArrowLeft size={18} aria-hidden="true" />
        My List
      </Link>
      {loading && <div className="h-40 animate-pulse rounded-app bg-line" aria-busy="true" />}
      {!loading && !firm && (
        <EmptyState title="We couldn’t find that firm" action={<Link to="/my-list" className="text-brand hover:underline">Go to My List</Link>}>
          The link may be out of date.
        </EmptyState>
      )}
      {firm && <Workspace key={firm.id} firm={firm} />}
    </div>
  );
}

export default function Apply() {
  return (
    <RequireProfile>
      <div className="app min-h-screen">
        <Page />
      </div>
    </RequireProfile>
  );
}
