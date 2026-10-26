import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { saveSearch } from '../../../lib/savedSearches';
import { chips } from '../filters';

/**
 * "Docket this search" — the legacy Save-search feature, re-themed as a sealed order inside the
 * immersive docket. Signed-in only (the caller routes guests to sign-up first). Persists the current
 * filter set via the shared saveSearch util; falls back to this device if the table isn't there.
 */
export default function SaveSearch({ session, filters, sort, onClose }) {
  const suggested = chips(filters).map((c) => c.label).join(' · ') || 'The full docket';
  const [name, setName] = useState(suggested.slice(0, 80));
  const [alerts, setAlerts] = useState(true);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setStatus('saving');
    try {
      const where = await saveSearch(session.user.id, { name: name.trim() || suggested, filters: { ...filters, sort }, email_alerts: alerts });
      setMessage(where === 'account' ? 'Entered on the docket. Find it in My List.' : 'Saved on this device. Find it in My List.');
      setStatus('done');
    } catch (err) {
      setMessage(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="imm-save" role="dialog" aria-modal="true" aria-label="Docket this search" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="imm-save__card">
        <div className="imm-save__bar">
          <p className="imm-save__ex ed-smallcaps">Standing order</p>
          <button type="button" className="imm-save__x" aria-label="Close" onClick={onClose}><X size={16} aria-hidden="true" /></button>
        </div>
        {status === 'done' ? (
          <div className="imm-save__body">
            <p className="imm-save__done">{message}</p>
            <button type="button" className="imm-save__submit" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form className="imm-save__body" onSubmit={submit}>
            <h2 className="imm-save__h">Docket this search</h2>
            <label className="imm-save__label" htmlFor="imm-save-name">Name</label>
            <input id="imm-save-name" ref={ref} className="imm-save__input" value={name} maxLength={80} required onChange={(e) => setName(e.target.value)} />
            <label className="imm-save__check">
              <input type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} />
              <span>Notify me when a new window opens for this search
                <span className="imm-save__fine">Sent to {session?.user?.email}. At most once a week.</span>
              </span>
            </label>
            <button type="submit" className="imm-save__submit" disabled={status === 'saving'}>{status === 'saving' ? 'Entering…' : 'Enter on the docket'}</button>
            {status === 'error' && <p role="alert" className="imm-save__err">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
