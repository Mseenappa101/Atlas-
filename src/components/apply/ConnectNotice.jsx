import { useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';

// The result of connecting Gmail or Outlook, from ?email=… on the page the student returns to.
const MESSAGES = {
  'connected-gmail': { ok: true, text: 'Gmail connected. Applications can now go out from your Gmail address, and they’ll appear in your Sent folder.' },
  'connected-outlook': { ok: true, text: 'Outlook connected. Applications can now go out from your Outlook address, and they’ll appear in your Sent folder.' },
  permission: { text: 'Firmward didn’t get permission to send. Try again and leave “Send email on your behalf” checked. Firmward can’t read your inbox.' },
  canceled: { text: 'Connection canceled. You can still send from Firmward.' },
  expired: { text: 'That link expired. Start connecting again.' },
  failed: { text: 'We couldn’t connect your email. Try again in a minute.' },
};

export default function ConnectNotice() {
  const [params, setParams] = useSearchParams();
  const m = MESSAGES[params.get('email')];
  if (!m) return null;
  const dismiss = () => {
    const next = new URLSearchParams(params);
    next.delete('email');
    setParams(next, { replace: true });
  };
  return (
    <div role="status" className={`mb-4 flex items-start justify-between gap-3 rounded-app border px-4 py-3 text-t14 ${m.ok ? 'border-brand bg-brand-tint' : 'border-line bg-card'}`}>
      <p>{m.text}</p>
      <button type="button" aria-label="Dismiss" onClick={dismiss} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-app text-fg-2 hover:text-fg md:h-7 md:w-7">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
