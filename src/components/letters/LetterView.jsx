import { useId, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { downloadDoc, letterToHtml, printDocument, slug } from '../../lib/documents';
import { Button, FieldLabel as Label } from '../app/controls';

// Shows a saved letter as a page, with editing, download and print.
export default function LetterView({ document: doc, onChange }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(doc.content);
  const [status, setStatus] = useState('idle');

  async function save() {
    setStatus('saving');
    const { error } = await supabase
      .from('documents')
      .update({ content: text, updated_at: new Date().toISOString() })
      .eq('id', doc.id);
    if (error) {
      setStatus('error');
      return;
    }
    setStatus('idle');
    setEditing(false);
    onChange?.({ ...doc, content: text });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(doc.content);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('idle');
    }
  }

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap gap-x-5 gap-y-2 text-t14">
        {!editing && (
          <button type="button" className="min-h-[44px] font-medium text-brand hover:underline md:min-h-0" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
        <button
          type="button"
          className="min-h-[44px] font-medium text-brand hover:underline md:min-h-0"
          onClick={() => downloadDoc(`${slug(doc.title)}.doc`, doc.title, letterToHtml(doc.content))}
        >
          Download <span className="data text-t12">(.doc)</span>
        </button>
        <button type="button" className="min-h-[44px] font-medium text-brand hover:underline md:min-h-0" onClick={printDocument}>
          Save as PDF
        </button>
        <button type="button" className="min-h-[44px] font-medium text-brand hover:underline md:min-h-0" onClick={copy}>
          {status === 'copied' ? 'Copied' : 'Copy text'}
        </button>
      </div>

      {editing ? (
        <div>
          <Label htmlFor={id}>Letter</Label>
          <textarea
            id={id}
            rows={22}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="block w-full rounded-app border border-line bg-white px-4 py-3 font-doc text-t16 leading-relaxed"
          />
          <div className="mt-3 flex items-center gap-4">
            <Button onClick={save} disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setText(doc.content);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            {status === 'error' && (
              <p role="alert" className="text-t14 text-st-soon-text">
                Couldn&rsquo;t save. Check your connection and try again.
              </p>
            )}
          </div>
        </div>
      ) : (
        <article
          data-printable
          aria-label={doc.title}
          className="doc-sheet mx-auto max-w-[680px] rounded-app border border-line bg-white px-6 py-8 md:px-14 md:py-12"
          dangerouslySetInnerHTML={{ __html: letterToHtml(doc.content) }}
        />
      )}
    </div>
  );
}
