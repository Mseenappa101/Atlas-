import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, PenLine, Trash2, Upload } from 'lucide-react';
import { Button, ButtonLink, FieldLabel } from '../app/controls';
import { api } from '../../lib/api';
import { MAX_UPLOAD, fileSize, saveBase64, toBase64, uploadType } from '../../lib/files';
import { resumeOptions } from '../../lib/application';
import { Card } from './Card';

const KINDS = [
  { value: 'transcript', label: 'Transcript' },
  { value: 'writing-sample', label: 'Writing sample' },
  { value: 'other', label: 'Other' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label]));

const RADIO = 'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-app border px-3 py-2 text-t14 transition-colors duration-150 md:min-h-[40px]';
const radioClass = (on) => `${RADIO} ${on ? 'border-brand bg-brand-tint' : 'border-line bg-card hover:border-fg-2'}`;


async function download(kind, id) {
  if (kind === 'file') {
    const { url } = await api('/resume/file');
    window.location.assign(url);
  } else if (kind === 'builder') {
    const out = await api('/documents/pdf', { method: 'POST', body: { resume: true } });
    saveBase64(out.file_name, out.file_base64);
  } else if (kind === 'letter') {
    const out = await api('/documents/pdf', { method: 'POST', body: { document_id: id } });
    saveBase64(out.file_name, out.file_base64);
  } else if (kind === 'upload') {
    const { url } = await api('/files/url', { method: 'POST', body: { id } });
    window.location.assign(url);
  }
}

function DownloadButton({ kind, id, label }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        setBusy(true);
        setFailed(false);
        try {
          await download(kind, id);
        } catch {
          setFailed(true);
        }
        setBusy(false);
      }}
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-app px-2 text-t14 text-brand hover:bg-brand-tint md:h-9"
    >
      <Download size={16} aria-hidden="true" />
      {busy ? 'Preparing…' : failed ? 'Try again' : 'Download'}
      <span className="sr-only"> {label}</span>
    </button>
  );
}

export default function Materials({ firm, slug, profile, materials, onChange, letters, files, onFilesChange }) {
  const resumes = resumeOptions(profile);
  const firmLetters = letters.filter((l) => l.firm_id === firm.id);
  const otherLetters = letters.filter((l) => l.firm_id !== firm.id);
  const letterId = useId();
  const kindId = useId();
  const input = useRef(null);
  const [kind, setKind] = useState('transcript');
  const [upload, setUpload] = useState({ status: 'idle', message: '' });
  const attached = new Set(materials.file_ids ?? []);
  const set = (patch) => onChange({ ...materials, ...patch });

  async function addFile(file) {
    if (!file) return;
    if (!uploadType(file)) return setUpload({ status: 'error', message: 'Upload a PDF or a Word (.docx) file.' });
    if (file.size > MAX_UPLOAD) return setUpload({ status: 'error', message: 'That file is over 5 MB.' });
    setUpload({ status: 'working', message: `Uploading ${file.name}…` });
    try {
      const out = await api('/files', { method: 'POST', body: { kind, file_name: file.name, file_base64: await toBase64(file) } });
      onFilesChange([out.file, ...files]);
      set({ file_ids: [...attached, out.file.id] });
      setUpload({ status: 'idle', message: `${out.file.name} added and attached.` });
    } catch (e) {
      setUpload({ status: 'error', message: e.message });
    }
    if (input.current) input.current.value = '';
  }

  async function removeFile(f) {
    if (!window.confirm(`Delete ${f.name}? It will be removed from every application.`)) return;
    try {
      await api('/files/delete', { method: 'POST', body: { id: f.id } });
      onFilesChange(files.filter((x) => x.id !== f.id));
      set({ file_ids: [...attached].filter((id) => id !== f.id) });
    } catch (e) {
      setUpload({ status: 'error', message: e.message });
    }
  }

  return (
    <Card title="Materials" description="Choose what goes with this application. Your choices are saved.">
      <fieldset>
        <legend className="mb-1.5 text-t14 font-medium">Resume</legend>
        {resumes.length === 0 ? (
          <p className="text-t14 text-fg-2">
            You haven&rsquo;t added a resume yet. <Link to="/resume" className="font-medium text-brand hover:underline">Add your resume</Link>, then come back.
          </p>
        ) : (
          <div className="space-y-2">
            {[...resumes, { value: 'none', label: 'Don’t include a resume' }].map((o) => (
              <label key={o.value} className={radioClass((materials.resume ?? 'none') === o.value)}>
                <input type="radio" name="resume" value={o.value} checked={(materials.resume ?? 'none') === o.value} onChange={() => set({ resume: o.value })} className="h-4 w-4 accent-brand" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{o.label}</span>
                  {o.hint && <span className="block truncate text-t12 text-fg-2">{o.hint}</span>}
                </span>
                {o.value !== 'none' && <DownloadButton kind={o.value} label={o.label} />}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="mt-5">
        <FieldLabel htmlFor={letterId}>Cover letter</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <select
            id={letterId}
            value={materials.letter_id ?? ''}
            onChange={(e) => set({ letter_id: e.target.value || null })}
            className="min-h-[44px] min-w-0 flex-1 rounded-app border border-line bg-card px-3 text-t14 hover:border-fg-2 md:min-h-[40px]"
          >
            <option value="">No cover letter</option>
            {firmLetters.length > 0 && (
              <optgroup label={`For ${firm.name}`}>
                {firmLetters.map((l) => (
                  <option key={l.id} value={l.id}>{l.title || 'Cover letter'}</option>
                ))}
              </optgroup>
            )}
            {otherLetters.length > 0 && (
              <optgroup label="Other letters">
                {otherLetters.map((l) => (
                  <option key={l.id} value={l.id}>{l.title || 'Cover letter'}</option>
                ))}
              </optgroup>
            )}
          </select>
          {materials.letter_id && <DownloadButton kind="letter" id={materials.letter_id} label="cover letter" />}
        </div>
        {materials.letter_id && otherLetters.some((l) => l.id === materials.letter_id) && (
          <p className="mt-1.5 text-t12 text-st-soon-text">This letter was written for a different firm. Check the name and address before sending.</p>
        )}
        <div className="mt-2">
          <ButtonLink to={`/letters/new?firm=${firm.id}&return=/apply/${slug}`} variant="secondary" size="sm" icon={PenLine}>
            Write a letter for {firm.name}
          </ButtonLink>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-1.5 text-t14 font-medium">Other files</p>
        {files.length > 0 && (
          <ul className="mb-3 space-y-2">
            {files.map((f) => (
              <li key={f.id} className={radioClass(attached.has(f.id))}>
                <input
                  type="checkbox"
                  aria-label={`Attach ${f.name}`}
                  checked={attached.has(f.id)}
                  onChange={(e) => set({ file_ids: e.target.checked ? [...attached, f.id] : [...attached].filter((id) => id !== f.id) })}
                  className="h-4 w-4 accent-brand"
                />
                <FileText size={16} aria-hidden="true" className="shrink-0 text-fg-2" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{f.name}</span>
                  <span className="block text-t12 text-fg-2">{KIND_LABEL[f.kind]} · {fileSize(f.size)}</span>
                </span>
                <DownloadButton kind="upload" id={f.id} label={f.name} />
                <button type="button" aria-label={`Delete ${f.name}`} onClick={() => removeFile(f)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-app text-fg-2 hover:bg-brand-tint hover:text-fg md:h-9 md:w-9">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={kindId} className="sr-only">Type of file</label>
          <select id={kindId} value={kind} onChange={(e) => setKind(e.target.value)} className="min-h-[44px] rounded-app border border-line bg-card px-3 text-t14 hover:border-fg-2 md:min-h-[32px]">
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <input ref={input} type="file" accept=".pdf,.docx,application/pdf" className="sr-only" tabIndex={-1} onChange={(e) => addFile(e.target.files?.[0])} />
          <Button variant="secondary" size="sm" icon={Upload} disabled={upload.status === 'working'} onClick={() => input.current?.click()}>
            Upload a file
          </Button>
        </div>
        <p role="status" className={`mt-1.5 text-t12 ${upload.status === 'error' ? 'text-st-closed-text' : 'text-fg-2'}`}>
          {upload.message || 'PDF or Word, up to 5 MB. Transcripts and writing samples are kept for your other applications too.'}
        </p>
      </div>
    </Card>
  );
}
