import { useEffect, useId, useRef, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { Button, FieldLabel, Input } from '../app/controls';
import { Modal } from '../app/overlays';
import { api } from '../../lib/api';
import { connectInbox, defaultDraft, sendOptions } from '../../lib/application';
import { Card } from './Card';

export function ConnectButtons({ conn, returnTo, onError }) {
  const [busy, setBusy] = useState(null);
  if (!conn) return null;
  const missing = ['gmail', 'outlook'].filter((p) => conn.available[p] && !conn.connections.some((c) => c.provider === p));
  if (!missing.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {missing.map((p) => (
        <Button
          key={p}
          variant="secondary"
          size="sm"
          disabled={Boolean(busy)}
          onClick={async () => {
            setBusy(p);
            try {
              await connectInbox(p, returnTo);
            } catch (e) {
              onError?.(e.message);
              setBusy(null);
            }
          }}
        >
          {busy === p ? 'Opening…' : `Connect ${p === 'gmail' ? 'Gmail' : 'Outlook'}`}
        </Button>
      ))}
    </div>
  );
}

export default function Compose({ row, firm, slug, profile, accountEmail, conn, materials, attachmentNames, onSaveDraft, onSent }) {
  const start = { ...defaultDraft({ firm, profile, accountEmail, hasLetter: Boolean(materials.letter_id) }), ...row.draft };
  const options = sendOptions(conn, accountEmail);
  const [draft, setDraft] = useState({
    to: row.draft?.to ?? row.contact_email ?? firm.recruitingEmail ?? '',
    cc: start.cc ?? '',
    subject: start.subject,
    body: start.body,
    via: row.draft?.via ?? null,
  });
  const via = options.some((o) => o.value === draft.via) ? draft.via : options[0]?.value ?? null;
  const [confirm, setConfirm] = useState(null); // null | 'send' | 'resend'
  const [status, setStatus] = useState({ kind: 'idle', message: '' });
  const timer = useRef(null);
  const bodyId = useId();
  const fromId = useId();

  // Save what they type, a moment after they stop.
  const change = (patch) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSaveDraft(next), 700);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const fromLabel = options.find((o) => o.value === via)?.label ?? '';
  const ready = via && draft.to.trim() && draft.subject.trim() && draft.body.trim();

  async function send(resend = false) {
    setStatus({ kind: 'sending', message: 'Sending…' });
    clearTimeout(timer.current);
    onSaveDraft({ ...draft, via });
    try {
      const out = await api('/applications/send', {
        method: 'POST',
        body: { user_firm_id: row.id, via, to: draft.to.trim(), cc: draft.cc, subject: draft.subject, body: draft.body, attachments: materials, confirm_resend: resend },
      });
      setConfirm(null);
      setStatus({ kind: 'sent', message: `Sent to ${out.message.to_email}. ${firm.name} is now marked as Applied.` });
      onSent(out);
    } catch (e) {
      if (e.code === 'just_sent') {
        setConfirm('resend');
        setStatus({ kind: 'idle', message: '' });
        return;
      }
      setConfirm(null);
      setStatus({ kind: 'error', message: e.message });
      if (e.code === 'reconnect' || e.code === 'not_connected') onSent(null); // refresh connections
    }
  }

  return (
    <Card title={`Email ${firm.name}`} description="Your application goes straight to the firm from Firmward. Replies come to your inbox.">
      <div className="space-y-4">
        <div>
          <FieldLabel htmlFor={fromId}>Send from</FieldLabel>
          {options.length ? (
            <select
              id={fromId}
              value={via ?? ''}
              onChange={(e) => change({ via: e.target.value })}
              className="block min-h-[44px] w-full rounded-app border border-line bg-card px-3 text-t14 hover:border-fg-2 md:min-h-[40px]"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <p className="text-t14 text-fg-2">{conn?.available.gmail || conn?.available.outlook
                ? 'Connect your email to send from your own address.'
                : 'Sending from Firmward is being set up. For now, apply on the firm’s website and mark it submitted here.'}</p>
          )}
          <div className="mt-2">
            <ConnectButtons conn={conn} returnTo={`/apply/${slug}`} onError={(m) => setStatus({ kind: 'error', message: m })} />
          </div>
          {via === 'firmward' && (
            <p className="mt-1.5 text-t12 text-fg-2">
              The firm sees &ldquo;{profile?.full_name || 'You'} via Firmward&rdquo;. You&rsquo;re copied, and replies go to {accountEmail}. To send from your own address, connect Gmail or Outlook.
            </p>
          )}
        </div>

        <Input
          label="To"
          type="email"
          value={draft.to}
          onChange={(e) => change({ to: e.target.value })}
          placeholder="recruiting@firm.com"
          autoComplete="off"
        />
        {!firm.recruitingEmail && !row.contact_email && (
          <p className="-mt-2 text-t12 text-fg-2">
            We don&rsquo;t have {firm.name}&rsquo;s application email. Check the job posting{firm.careersUrl && (
              <>
                {' or '}
                <a href={firm.careersUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">careers page<span className="sr-only"> (opens in a new tab)</span> ↗</a>
              </>
            )}{' '}for the address, or apply on the firm&rsquo;s site instead.
          </p>
        )}
        <Input label="Cc" optional value={draft.cc} onChange={(e) => change({ cc: e.target.value })} placeholder="Up to two addresses" autoComplete="off" />
        <Input label="Subject" value={draft.subject} onChange={(e) => change({ subject: e.target.value })} maxLength={200} />
        <div>
          <FieldLabel htmlFor={bodyId}>Message</FieldLabel>
          <textarea
            id={bodyId}
            value={draft.body}
            onChange={(e) => change({ body: e.target.value })}
            rows={11}
            maxLength={10000}
            className="block w-full rounded-app border border-line bg-card px-3 py-2 text-t14 leading-relaxed text-fg hover:border-fg-2"
          />
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-t14 font-medium">
            <Paperclip size={16} aria-hidden="true" /> Attachments
          </p>
          {attachmentNames.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {attachmentNames.map((n) => (
                <li key={n} className="rounded-pill border border-line bg-canvas px-2.5 py-1 text-t12">{n}</li>
              ))}
            </ul>
          ) : (
            <p className="text-t14 text-st-soon-text">Nothing attached. Choose your resume and cover letter under Materials.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button icon={Send} disabled={!ready || status.kind === 'sending'} onClick={() => setConfirm('send')}>
            Review and send
          </Button>
          <p role="status" className={`text-t14 ${status.kind === 'error' ? 'text-st-closed-text' : status.kind === 'sent' ? 'font-medium text-brand' : 'text-fg-2'}`}>
            {status.message || 'Your draft saves as you type.'}
          </p>
        </div>
      </div>

      <Modal
        open={Boolean(confirm)}
        onClose={() => status.kind !== 'sending' && setConfirm(null)}
        title={confirm === 'resend' ? 'Send this again?' : 'Send your application?'}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" disabled={status.kind === 'sending'} onClick={() => setConfirm(null)}>
              Keep editing
            </Button>
            <Button icon={Send} disabled={status.kind === 'sending'} onClick={() => send(confirm === 'resend')}>
              {status.kind === 'sending' ? 'Sending…' : confirm === 'resend' ? 'Send again' : 'Send now'}
            </Button>
          </div>
        }
      >
        {confirm === 'resend' && (
          <p className="mb-4 rounded-app border border-line bg-st-soon-bg px-3 py-2 text-t14 text-st-soon-text">
            You emailed {firm.name} a few minutes ago. Firms notice duplicates, so only resend if something was missing.
          </p>
        )}
        <dl className="space-y-2 text-t14">
          <div className="flex gap-2"><dt className="w-24 shrink-0 text-fg-2">From</dt><dd className="min-w-0 break-words">{fromLabel}</dd></div>
          <div className="flex gap-2"><dt className="w-24 shrink-0 text-fg-2">To</dt><dd className="min-w-0 break-words font-medium">{draft.to}</dd></div>
          {draft.cc.trim() && <div className="flex gap-2"><dt className="w-24 shrink-0 text-fg-2">Cc</dt><dd className="min-w-0 break-words">{draft.cc}</dd></div>}
          <div className="flex gap-2"><dt className="w-24 shrink-0 text-fg-2">Subject</dt><dd className="min-w-0 break-words">{draft.subject}</dd></div>
          <div className="flex gap-2"><dt className="w-24 shrink-0 text-fg-2">Attached</dt><dd className="min-w-0">{attachmentNames.join(', ') || 'Nothing'}</dd></div>
        </dl>
        <div className="mt-4 whitespace-pre-wrap rounded-app border border-line bg-card p-4 text-t14 leading-relaxed">{draft.body}</div>
        {status.kind === 'error' && <p className="mt-3 text-t14 text-st-closed-text">{status.message}</p>}
      </Modal>
    </Card>
  );
}
