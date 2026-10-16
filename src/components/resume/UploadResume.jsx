import { useId, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../app/controls';

const TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
const MAX = 5 * 1024 * 1024;

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('Couldn’t read that file.'));
    r.readAsDataURL(file);
  });
}

export default function UploadResume({ pro, onDone, onStored }) {
  const id = useId();
  const input = useRef(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);

  async function handle(file) {
    if (!file) return;
    const type = TYPES[file.type] ?? (/\.(pdf|docx)$/i.test(file.name) ? file.name.split('.').pop().toLowerCase() : null);
    if (!type) return fail('Upload a PDF or a Word (.docx) file.');
    if (file.size > MAX) return fail('That file is over 5 MB. Export a smaller PDF and try again.');
    setStatus('working');
    try {
      const body = {
        file_base64: await toBase64(file),
        file_name: file.name,
        mime_type: type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      if (pro) {
        const { resume } = await api('/resume/parse', { method: 'POST', body });
        onDone(resume);
      } else {
        const saved = await api('/resume/file', { method: 'POST', body });
        setStatus('idle');
        onStored(saved);
      }
    } catch (err) {
      fail(err.message);
    }
  }

  function fail(msg) {
    setMessage(msg);
    setStatus('error');
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-app border border-dashed bg-card px-5 py-8 text-center transition-colors duration-150 ${dragging ? 'border-brand bg-brand-tint' : 'border-line'}`}
      >
        {status === 'working' ? (
          <p role="status" className="text-t14">
            {pro ? 'Reading your resume into the editor. This takes about 20 seconds.' : 'Uploading…'}
          </p>
        ) : (
          <>
            <p className="text-t14 text-fg-2">Drop a PDF or Word file here, or</p>
            <input
              ref={input}
              id={id}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(e) => handle(e.target.files?.[0])}
            />
            <Button type="button" variant="secondary" className="mt-3" onClick={() => input.current?.click()}>
              Choose a file
            </Button>
          </>
        )}
      </div>
      {status === 'error' && (
        <p role="alert" className="mt-2 text-t14 text-st-soon-text">
          {message}
        </p>
      )}
      <p className="mt-2 text-t12 text-fg-2">Your file stays private to your profile. PDF or Word, up to 5 MB.</p>
    </div>
  );
}
