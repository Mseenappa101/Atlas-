import { useState, useEffect } from 'react';
import { getStatesWithFirmCounts } from '../lib/db';
import StateGrid from '../components/StateGrid';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Browse() {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = '1L Law Firm Opportunities by State | Atlas';
    async function load() {
      const { data } = await getStatesWithFirmCounts();
      if (data) setStates(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2.5rem 2rem' }}>
      <h1
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 36,
          fontWeight: 600,
          color: '#1a1710',
          margin: '0 0 8px',
          lineHeight: 1.2,
        }}
      >
        Find 1L Opportunities by Market
      </h1>
      <p
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: 16,
          fontStyle: 'italic',
          color: '#7a7260',
          margin: '0 0 24px',
        }}
      >
        Every firm that recruits first-year law students, organised by state and city.
      </p>

      {/* Ornamental divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <div style={{ flex: 1, height: 1, backgroundColor: '#c8bfae' }} />
        <div
          style={{
            width: 8,
            height: 8,
            backgroundColor: '#c4a55a',
            transform: 'rotate(45deg)',
          }}
        />
        <div style={{ flex: 1, height: 1, backgroundColor: '#c8bfae' }} />
      </div>

      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 12,
          }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      ) : (
        <StateGrid statesWithCounts={states} loading={loading} />
      )}
    </div>
  );
}
