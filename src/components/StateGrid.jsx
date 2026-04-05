import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { US_STATES } from '../constants/states';
import { getFirmsByState } from '../lib/db';

export default function StateGrid({ statesWithCounts = [], loading }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statesWithPrograms, setStatesWithPrograms] = useState({});

  const countMap = {};
  statesWithCounts.forEach(({ state, count }) => {
    countMap[state] = count;
  });

  useEffect(() => {
    async function check1LPrograms() {
      const programMap = {};
      for (const { state } of statesWithCounts) {
        const { data } = await getFirmsByState(state);
        if (data?.some((f) => f.has_1l_program)) {
          programMap[state] = true;
        }
      }
      setStatesWithPrograms(programMap);
    }
    if (statesWithCounts.length > 0) check1LPrograms();
  }, [statesWithCounts]);

  const merged = US_STATES.map((s) => ({
    ...s,
    count: countMap[s.abbr] || 0,
    has1L: !!statesWithPrograms[s.abbr],
  }));

  const filtered = merged.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  function toSlug(name) {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search states..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '10px 14px',
          marginBottom: 24,
          border: '1px solid #c8bfae',
          borderRadius: 4,
          backgroundColor: '#fff',
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: 15,
          color: '#1a1710',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12,
        }}
        className="state-grid"
      >
        {filtered.map((s) => {
          const active = s.count > 0;
          return (
            <div
              key={s.abbr}
              onClick={active ? () => navigate(`/browse/${toSlug(s.name)}`) : undefined}
              className={active ? 'state-card active' : 'state-card'}
              style={{
                background: '#ede8df',
                border: '1px solid #ddd6c8',
                padding: '14px 12px',
                cursor: active ? 'pointer' : 'default',
                opacity: active ? 1 : 0.4,
                transition: 'border-color 0.15s, background-color 0.15s',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#1a1710',
                  lineHeight: 1,
                }}
              >
                {s.abbr}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#4a4639',
                  marginTop: 4,
                }}
              >
                {s.name}
              </div>
              <div
                style={{
                  fontFamily: "'EB Garamond', Georgia, serif",
                  fontSize: 12,
                  fontStyle: active ? 'italic' : 'normal',
                  color: active ? '#4a4639' : '#b0a898',
                  marginTop: 6,
                }}
              >
                {active ? `${s.count} firm${s.count !== 1 ? 's' : ''}` : 'Coming soon'}
              </div>
              {active && s.has1L && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#f0e6c8',
                    color: '#8b6914',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 7,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 5px',
                    borderRadius: 2,
                  }}
                >
                  1L Programs
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .state-grid {
          grid-template-columns: repeat(5, 1fr);
        }
        @media (max-width: 1024px) {
          .state-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .state-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        .state-card.active:hover {
          border-color: #c4a55a !important;
          background-color: #f0e6c8 !important;
        }
      `}</style>
    </div>
  );
}
