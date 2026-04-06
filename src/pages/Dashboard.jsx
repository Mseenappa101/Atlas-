import { useState } from 'react';
import { Link } from 'react-router-dom';
import useUserFirms from '../hooks/useUserFirms';
import KanbanBoard from '../components/KanbanBoard';
import KanbanDrawer from '../components/KanbanDrawer';

export default function Dashboard() {
  const { userFirms, loading, updateStatus, updateNotes, removeFirm } = useUserFirms();
  const [selected, setSelected] = useState(null);

  const applied = userFirms.filter((uf) => uf.status === 'Applied').length;
  const callbacks = userFirms.filter((uf) => uf.status === 'Callback').length;
  const offers = userFirms.filter((uf) => uf.status === 'Offer').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: '3px solid #c8bfae',
            borderTopColor: '#8b6914',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  if (userFirms.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <p
          style={{
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: 18,
            fontStyle: 'italic',
            color: '#7a7260',
            marginBottom: 16,
          }}
        >
          Your list is empty. Browse firms by state and add those you wish to pursue.
        </p>
        <Link
          to="/browse"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#8b6914',
            textDecoration: 'none',
          }}
        >
          Browse Firms &rarr;
        </Link>
      </div>
    );
  }

  function handleStatusChange(userFirmId, status) {
    updateStatus(userFirmId, status);
    if (selected?.id === userFirmId) {
      setSelected((prev) => ({ ...prev, status }));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 57px)' }}>
      {/* Stats bar */}
      <div
        style={{
          display: 'flex',
          gap: '3rem',
          padding: '1rem 2.5rem',
          borderBottom: '1px solid #ddd6c8',
        }}
      >
        <Stat label="Firms Saved" value={userFirms.length} />
        <Stat label="Applied" value={applied} />
        <Stat label="Callbacks" value={callbacks} />
        <Stat label="Offers" value={offers} />
      </div>

      {/* Kanban + Drawer */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <KanbanBoard
          userFirms={userFirms}
          onStatusChange={handleStatusChange}
          onCardClick={(uf) => setSelected(uf)}
        />
        {selected && (
          <KanbanDrawer
            userFirm={selected}
            onClose={() => setSelected(null)}
            onStatusChange={handleStatusChange}
            onNotesChange={(id, notes) => updateNotes(id, notes)}
            onRemove={(id) => {
              removeFirm(id);
              setSelected(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 28,
          fontWeight: 600,
          color: '#1a1710',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#b0a898',
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}
