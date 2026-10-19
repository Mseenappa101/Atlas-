import { useId, useState } from 'react';
import { Check, Circle, Plus, X } from 'lucide-react';
import { STAGE_LABEL } from '../../lib/stages';
import { Card } from './Card';
import { firmDeadline, startOfToday } from '../../lib/application';

const DAY = 86_400_000;
const shortDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const stamp = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function Deadline({ firm, row, onChange }) {
  const id = useId();
  const published = firmDeadline(firm);
  const own = row.deadline ? new Date(`${row.deadline}T00:00:00`) : null;
  const days = own ? Math.round((own - startOfToday()) / DAY) : null;
  return (
    <Card title="Deadline">
      <p className="text-t14">
        {published ? (
          <>
            {published.label}: <span className="data font-medium">{shortDate(published.date)}</span>
          </>
        ) : (
          <span className="text-fg-2">{firm.status.kind === 'rolling' ? 'Rolling: the firm reviews applications as they arrive.' : 'The firm hasn’t published a date.'}</span>
        )}
      </p>
      <label htmlFor={id} className="mt-3 block text-t14 font-medium">Your deadline</label>
      <input
        id={id}
        type="date"
        value={row.deadline ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-1.5 block min-h-[44px] w-full rounded-app border border-line bg-card px-3 text-t14 hover:border-fg-2 md:min-h-[40px]"
      />
      {own && (
        <p className={`mt-1.5 text-t12 ${days < 0 ? 'text-st-closed-text' : days <= 7 ? 'text-st-soon-text' : 'text-fg-2'}`}>
          {days < 0 ? 'Passed' : days === 0 ? 'Due today' : `${days} day${days === 1 ? '' : 's'} left`}. Shown on My List.
        </p>
      )}
    </Card>
  );
}

export function Checklist({ progress, items, onChange }) {
  const [text, setText] = useState('');
  const inputId = useId();
  const add = () => {
    const label = text.trim();
    if (!label) return;
    onChange([...items, { id: crypto.randomUUID(), label: label.slice(0, 140), done: false }]);
    setText('');
  };
  return (
    <Card title="Checklist">
      <ul className="space-y-1.5 text-t14">
        {progress.map((p) => (
          <li key={p.label} className="flex min-h-[32px] items-center gap-2.5">
            {p.done ? <Check size={18} aria-hidden="true" className="shrink-0 text-brand" /> : <Circle size={18} aria-hidden="true" className="shrink-0 text-line" />}
            <span className={p.done ? 'text-fg-2' : ''}>{p.label}</span>
            <span className="sr-only">{p.done ? '(done)' : '(not done)'}</span>
          </li>
        ))}
        {items.map((it) => (
          <li key={it.id} className="group flex min-h-[32px] items-center gap-2.5">
            <input
              type="checkbox"
              checked={it.done}
              onChange={() => onChange(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))}
              aria-label={it.label}
              className="h-[18px] w-[18px] shrink-0 accent-brand"
            />
            <span className={`flex-1 ${it.done ? 'text-fg-2 line-through' : ''}`}>{it.label}</span>
            <button
              type="button"
              aria-label={`Remove “${it.label}”`}
              onClick={() => onChange(items.filter((x) => x.id !== it.id))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-app text-fg-2 hover:bg-brand-tint hover:text-fg md:h-8 md:w-8"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <label htmlFor={inputId} className="sr-only">Add a to-do</label>
        <input
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a to-do, e.g. Ask for a reference"
          className="min-h-[44px] min-w-0 flex-1 rounded-app border border-line bg-card px-3 text-t14 placeholder:text-fg-2 hover:border-fg-2 md:min-h-[36px]"
        />
        <button type="button" aria-label="Add to-do" onClick={add} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-app border border-line bg-card text-fg hover:border-fg-2 md:h-9 md:w-9">
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </Card>
  );
}

export function Notes({ row, onSave }) {
  const id = useId();
  const [value, setValue] = useState(row.notes ?? '');
  const [saved, setSaved] = useState(false);
  return (
    <Card title="Notes">
      <label htmlFor={id} className="sr-only">Notes about this firm</label>
      <textarea
        id={id}
        value={value}
        rows={5}
        maxLength={5000}
        placeholder="People you’ve met, why this firm, questions for the interview…"
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        onBlur={async () => {
          if (value === (row.notes ?? '')) return;
          if (await onSave(value)) setSaved(true);
        }}
        className="block w-full rounded-app border border-line bg-card px-3 py-2 text-t14 leading-relaxed placeholder:text-fg-2 hover:border-fg-2"
      />
      <p role="status" className="mt-1 text-t12 text-fg-2">{saved ? 'Saved.' : 'Saves when you click away.'}</p>
    </Card>
  );
}

const VIA = { gmail: 'Gmail', outlook: 'Outlook', firmward: 'Firmward' };

function describe(item) {
  if (item.type === 'message') {
    const m = item.data;
    if (m.status === 'failed') return { title: `Couldn’t send to ${m.to_email}`, tone: 'error' };
    const n = m.attachments?.length ?? 0;
    return { title: `Emailed ${m.to_email}`, detail: `From ${m.from_email} via ${VIA[m.via]}${n ? ` · ${n} attachment${n === 1 ? '' : 's'}` : ''}`, message: m };
  }
  const e = item.data;
  if (e.kind === 'submitted') return { title: 'Submitted on the firm’s site' };
  if (!e.detail?.from) return { title: e.detail?.to === 'saved' ? 'Added to My List' : `Added as ${STAGE_LABEL[e.detail?.to] ?? e.detail?.to}` };
  return { title: `Moved to ${STAGE_LABEL[e.detail.to] ?? e.detail.to}` };
}

export function Activity({ events, messages }) {
  // Sends appear once, from sent_messages (it has the details); skip their 'sent' events.
  const items = [
    ...messages.map((m) => ({ type: 'message', at: m.created_at, data: m, key: `m-${m.id}` })),
    ...events.filter((e) => e.kind !== 'sent').map((e) => ({ type: 'event', at: e.created_at, data: e, key: `e-${e.id}` })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Card title="Activity">
      {items.length === 0 ? (
        <p className="text-t14 text-fg-2">Sends, submissions and stage changes will show here.</p>
      ) : (
        <ol className="space-y-3">
          {items.map((it) => {
            const d = describe(it);
            return (
              <li key={it.key} className="border-l-2 border-line pl-3 text-t14">
                <p className={`font-medium ${d.tone === 'error' ? 'text-st-closed-text' : ''}`}>{d.title}</p>
                <p className="data text-t12 text-fg-2">{stamp(it.at)}</p>
                {d.detail && <p className="text-t12 text-fg-2">{d.detail}</p>}
                {d.message && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-t12 text-brand hover:underline">Show email</summary>
                    <div className="mt-1.5 rounded-app border border-line bg-canvas p-3 text-t12">
                      <p className="font-medium">{d.message.subject}</p>
                      <p className="mt-2 whitespace-pre-wrap leading-relaxed">{d.message.body}</p>
                      {d.message.attachments?.length > 0 && <p className="mt-2 text-fg-2">Attached: {d.message.attachments.map((a) => a.name).join(', ')}</p>}
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
