import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KANBAN_STATUSES } from '../constants/statuses';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, isPro as checkIsPro } from '../lib/db';
import DocumentGenerator from './DocumentGenerator';

export default function KanbanDrawer({ userFirm, onClose, onStatusChange, onNotesChange, onRemove }) {
  const { user } = useAuth();
  const firm = userFirm?.firms;
  const [notes, setNotes] = useState(userFirm?.firm_notes || '');
  const [userProfile, setUserProfile] = useState(null);
  const [proStatus, setProStatus] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await getUserProfile(user.id);
      if (data) setUserProfile(data);
      const pro = await checkIsPro(user.id);
      setProStatus(pro);
    }
    load();
  }, [user]);

  useEffect(() => {
    setNotes(userFirm?.firm_notes || '');
  }, [userFirm]);

  if (!userFirm) return null;

  function handleRemove() {
    if (window.confirm(`Remove ${firm?.name} from your list?`)) {
      onRemove(userFirm.id);
      onClose();
    }
  }

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        borderLeft: '1px solid #E3E6E8',
        background: '#FFFFFF',
        padding: '1.25rem',
        position: 'relative',
        overflowY: 'auto',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'none',
          border: 'none',
          fontFamily: "'DM Mono', monospace",
          fontSize: 14,
          color: '#5B6470',
          cursor: 'pointer',
        }}
      >
        &times;
      </button>

      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 22,
          fontWeight: 600,
          color: '#14181F',
          marginBottom: 4,
          paddingRight: 24,
        }}
      >
        {firm?.name}
      </div>

      <div
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: 14,
          fontStyle: 'italic',
          color: '#5B6470',
          marginBottom: 16,
        }}
      >
        {firm?.city}, {firm?.state}
      </div>

      {/* Status select */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: 'block',
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#5B6470',
            marginBottom: 6,
          }}
        >
          Status
        </label>
        <select
          value={userFirm.status}
          onChange={(e) => onStatusChange(userFirm.id, e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #E3E6E8',
            borderRadius: 2,
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: 14,
            color: '#14181F',
            backgroundColor: '#fff',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        >
          {KANBAN_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: 'block',
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#5B6470',
            marginBottom: 6,
          }}
        >
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => onNotesChange(userFirm.id, notes)}
          style={{
            width: '100%',
            minHeight: 100,
            padding: '8px 10px',
            border: '1px solid #E3E6E8',
            borderRadius: 2,
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: 14,
            color: '#14181F',
            backgroundColor: '#fff',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* View Profile link */}
      <Link
        to={`/firm/${firm?.id}`}
        style={{
          display: 'block',
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#1F5C45',
          textDecoration: 'none',
          marginBottom: 12,
        }}
      >
        View Full Profile &rarr;
      </Link>

      {/* Document Generator */}
      <DocumentGenerator
        userProfile={userProfile}
        firm={firm}
        userFirmId={userFirm.id}
        isPro={proStatus}
      />

      {/* Remove button */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={handleRemove}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid #8A5A12',
            borderRadius: 2,
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#8A5A12',
            cursor: 'pointer',
          }}
        >
          Remove from List
        </button>
      </div>
    </div>
  );
}
