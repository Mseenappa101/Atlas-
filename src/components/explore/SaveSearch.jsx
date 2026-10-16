import { useState } from 'react';
import { Drawer } from '../app/overlays';
import { Button, Input } from '../app/controls';
import { saveSearch } from '../../lib/savedSearches';
import useSession from '../../hooks/useSession';
import { chips } from './filters';

export default function SaveSearch({ filters, sort, onClose }) {
  const { session } = useSession();
  const suggested = chips(filters).map((c) => c.label).join(' · ') || 'All firms';
  const [name, setName] = useState(suggested.slice(0, 80));
  const [alerts, setAlerts] = useState(true);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    setStatus('saving');
    try {
      const where = await saveSearch(session.user.id, { name: name.trim() || suggested, filters: { ...filters, sort }, email_alerts: alerts });
      setMessage(where === 'account' ? 'Saved. You’ll find it in My List.' : 'Saved on this device. You’ll find it in My List.');
      setStatus('done');
    } catch (err) {
      setMessage(err.message);
      setStatus('error');
    }
  }

  return (
    <Drawer open onClose={onClose} title="Save this search">
      {status === 'done' ? (
        <div className="space-y-4">
          <p className="text-t14">{message}</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
          <label className="flex cursor-pointer items-start gap-2.5 text-t14">
            <input type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--app-brand)]" />
            <span>
              Email me when a new application window opens for this search
              <span className="block text-t12 text-fg-2">Sent to {session?.user.email}. At most once a week.</span>
            </span>
          </label>
          <Button type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save search'}
          </Button>
          {status === 'error' && (
            <p role="alert" className="text-t14 text-st-soon-text">
              {message}
            </p>
          )}
        </form>
      )}
    </Drawer>
  );
}
