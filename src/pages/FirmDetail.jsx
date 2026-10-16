import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getFirmById, updateFirmAiBrief, addFirmToList } from '../lib/db';
import { generateFirmBrief } from '../lib/ai';
import useAuth from '../hooks/useAuth';
import LoadingSkeleton from '../components/LoadingSkeleton';

function stateSlug(state) {
  const stateNames = {
    AL: 'alabama', AK: 'alaska', AZ: 'arizona', AR: 'arkansas', CA: 'california',
    CO: 'colorado', CT: 'connecticut', DE: 'delaware', FL: 'florida', GA: 'georgia',
    HI: 'hawaii', ID: 'idaho', IL: 'illinois', IN: 'indiana', IA: 'iowa',
    KS: 'kansas', KY: 'kentucky', LA: 'louisiana', ME: 'maine', MD: 'maryland',
    MA: 'massachusetts', MI: 'michigan', MN: 'minnesota', MS: 'mississippi', MO: 'missouri',
    MT: 'montana', NE: 'nebraska', NV: 'nevada', NH: 'new-hampshire', NJ: 'new-jersey',
    NM: 'new-mexico', NY: 'new-york', NC: 'north-carolina', ND: 'north-dakota', OH: 'ohio',
    OK: 'oklahoma', OR: 'oregon', PA: 'pennsylvania', RI: 'rhode-island', SC: 'south-carolina',
    SD: 'south-dakota', TN: 'tennessee', TX: 'texas', UT: 'utah', VT: 'vermont',
    VA: 'virginia', WA: 'washington', WV: 'west-virginia', WI: 'wisconsin', WY: 'wyoming',
  };
  return stateNames[state] || state.toLowerCase();
}

function daysRemaining(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

function cleanBrief(text) {
  return text
    .split(/\n\n+/)
    .map((p) => p.replace(/^\*\*.*\*\*\s*$/gm, '').replace(/\*\*/g, '').trim())
    .filter((p) => p.length > 0);
}

function isBriefFresh(updatedAt) {
  if (!updatedAt) return false;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return new Date() - new Date(updatedAt) < thirtyDays;
}

export default function FirmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [firm, setFirm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState(null);
  const briefAttempted = useRef(false);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await getFirmById(id);
      if (err || !data) {
        setError(true);
      } else {
        console.log('[FirmDetail] Raw firm data:', data);
        setFirm(data);
        document.title = `${data.name} — 1L Recruiting | Firmward`;
      }
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!firm || briefAttempted.current) return;
    if (firm.ai_brief && isBriefFresh(firm.ai_brief_updated_at)) {
      console.log('[FirmDetail] Using cached brief | length:', firm.ai_brief.length);
      setBrief(firm.ai_brief);
      return;
    }
    briefAttempted.current = true;

    async function generate() {
      setBriefLoading(true);

      // First attempt
      let result = await generateFirmBrief(firm);
      console.log('[FirmDetail] AI brief attempt 1 | length:', result.content?.length, '| error:', result.error);

      // Retry once on rate limit (429)
      if (result.error && result.error.includes('rate')) {
        console.log('[FirmDetail] Rate limited — retrying in 5s...');
        await new Promise((r) => setTimeout(r, 5000));
        result = await generateFirmBrief(firm);
        console.log('[FirmDetail] AI brief attempt 2 | length:', result.content?.length, '| error:', result.error);
      }

      if (result.error || !result.content) {
        console.error('[FirmDetail] Brief generation failed:', result.error);
        const isRateLimit = result.error?.includes('rate');
        setBriefError(
          isRateLimit
            ? 'Intelligence brief temporarily unavailable — please refresh in a moment.'
            : 'Unable to generate brief at this time.'
        );
      } else {
        setBrief(result.content);
        await updateFirmAiBrief(firm.id, result.content);
      }
      setBriefLoading(false);
    }
    generate();
  }, [firm]);

  if (loading) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2.5rem 2rem' }}>
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  if (error || !firm) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 18, color: '#4a4639' }}>
          Firm not found.
        </p>
        <Link
          to="/browse"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            textTransform: 'uppercase',
            color: '#8b6914',
            textDecoration: 'none',
          }}
        >
          &larr; Back to Browse
        </Link>
      </div>
    );
  }

  const days = daysRemaining(firm.app_window_end);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2.5rem 2rem' }}>
      <div className="firm-detail-layout">
        {/* LEFT COLUMN */}
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          {/* Breadcrumb */}
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              textTransform: 'uppercase',
              color: '#b0a898',
              letterSpacing: '0.05em',
              marginBottom: 16,
            }}
          >
            <Link to="/browse" style={{ color: '#b0a898', textDecoration: 'none' }}>Browse</Link>
            {' > '}
            <Link to={`/browse/${stateSlug(firm.state)}`} style={{ color: '#b0a898', textDecoration: 'none' }}>
              {firm.state}
            </Link>
            {' > '}
            <span>{firm.city}</span>
            {' > '}
            <span style={{ color: '#7a7260' }}>{firm.name}</span>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {firm.has_1l_program && (
              <span style={badgeStyle('#e6f4e6', '#2d6a2d', '#6aae6a')}>1L Summer Program</span>
            )}
            {firm.has_fellowship && firm.fellowship_name && (
              <span style={badgeStyle('#f0e6c8', '#8b6914', '#c4a55a')}>{firm.fellowship_name}</span>
            )}
            {firm.size && (
              <span style={badgeStyle('#ede8df', '#4a4639', '#c8bfae')}>{firm.size}</span>
            )}
          </div>

          {/* Name */}
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 38,
              fontWeight: 300,
              color: '#1a1710',
              margin: '0 0 6px',
              lineHeight: 1.15,
            }}
          >
            {firm.name}
          </h1>

          {/* City, State */}
          <p
            style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: 16,
              fontStyle: 'italic',
              color: '#7a7260',
              margin: '0 0 20px',
            }}
          >
            {firm.city}, {firm.state}
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #c8bfae', margin: '0 0 20px' }} />

          {/* Key Information */}
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              textTransform: 'uppercase',
              color: '#b0a898',
              letterSpacing: '0.08em',
              marginBottom: 14,
            }}
          >
            Key Information
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px 24px',
              marginBottom: 24,
            }}
          >
            <StatItem label="Practice Areas" value={firm.practice_areas?.join(', ') || '—'} />
            <StatItem
              label="Application Window"
              value={
                firm.app_window_start && firm.app_window_end
                  ? `${fmt(firm.app_window_start)} – ${fmt(firm.app_window_end)}`
                  : firm.app_window_start
                  ? `Opens ${fmt(firm.app_window_start)}`
                  : '—'
              }
            />
            <StatItem label="Offices Hiring" value={firm.address || firm.city || '—'} />
            <StatItem label="Firm Size" value={firm.size || '—'} />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #c8bfae', margin: '0 0 20px' }} />

          {/* Intelligence Brief */}
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              textTransform: 'uppercase',
              color: '#b0a898',
              letterSpacing: '0.08em',
              marginBottom: 14,
            }}
          >
            Intelligence Brief
          </div>

          {briefLoading && (
            <p className="brief-loading" style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: 15,
              fontStyle: 'italic',
              color: '#7a7260',
            }}>
              Consulting our intelligence files...
            </p>
          )}

          {briefError && (
            <p style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: 15,
              fontStyle: 'italic',
              color: '#7a7260',
            }}>
              {briefError}
            </p>
          )}

          {brief && (
            <div
              style={{
                borderLeft: '2px solid #c8bfae',
                paddingLeft: '1rem',
              }}
            >
              {cleanBrief(brief).map((para, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: "'EB Garamond', Georgia, serif",
                    fontSize: 15,
                    fontStyle: 'italic',
                    color: '#4a4639',
                    lineHeight: 1.75,
                    margin: '0 0 1rem',
                  }}
                >
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ width: 300, flexShrink: 0 }}>
          {/* Dark action box */}
          <div
            style={{
              backgroundColor: '#1a1710',
              padding: '1.5rem',
              borderRadius: 2,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 18,
                color: '#c4a55a',
                marginBottom: 4,
              }}
            >
              Add to Your List
            </div>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                textTransform: 'uppercase',
                color: '#5a5445',
                marginBottom: 16,
              }}
            >
              Track, generate documents, manage correspondence
            </div>

            <button
              onClick={async () => {
                if (!user) {
                  navigate('/login', { state: { from: `/firm/${id}` } });
                  return;
                }
                setAdding(true);
                const { error: err } = await addFirmToList(user.id, firm.id);
                setAdding(false);
                if (err) {
                  alert(err);
                } else {
                  alert('Added to your list');
                }
              }}
              disabled={adding}
              style={{
                width: '100%',
                border: '1px solid #8b6914',
                color: '#c4a55a',
                backgroundColor: 'transparent',
                padding: 10,
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: adding ? 'default' : 'pointer',
                opacity: adding ? 0.6 : 1,
                marginBottom: 8,
              }}
            >
              {adding ? 'Adding...' : 'Add to My List'}
            </button>

            {firm.careers_url && (
              <a
                href={firm.careers_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  width: '100%',
                  border: '1px solid #5a5445',
                  color: '#7a7260',
                  backgroundColor: 'transparent',
                  padding: 10,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'center',
                  textDecoration: 'none',
                  boxSizing: 'border-box',
                }}
              >
                View Careers Page
              </a>
            )}
          </div>

          {/* Application Window box */}
          {(firm.app_window_start || firm.app_window_end) && (
            <div
              style={{
                backgroundColor: '#ede8df',
                border: '1px solid #ddd6c8',
                padding: '1.25rem',
                borderRadius: 2,
              }}
            >
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  textTransform: 'uppercase',
                  color: '#8b6914',
                  letterSpacing: '0.05em',
                  marginBottom: 8,
                }}
              >
                Application Window
              </div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 20,
                  color: '#1a1710',
                  marginBottom: 4,
                }}
              >
                {firm.app_window_start && fmt(firm.app_window_start)}
                {firm.app_window_start && firm.app_window_end && ' – '}
                {firm.app_window_end && fmt(firm.app_window_end)}
              </div>
              {days && (
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    color: '#b0a898',
                  }}
                >
                  {days} day{days !== 1 ? 's' : ''} remaining
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .firm-detail-layout {
          display: flex;
          gap: 2.5rem;
        }
        @media (max-width: 768px) {
          .firm-detail-layout {
            flex-direction: column;
          }
          .firm-detail-layout > div:last-child {
            width: 100% !important;
          }
        }
        .brief-loading {
          animation: briefPulse 1.5s ease-in-out infinite;
        }
        @keyframes briefPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          textTransform: 'uppercase',
          color: '#b0a898',
          letterSpacing: '0.05em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: 15,
          color: '#4a4639',
          lineHeight: 1.4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function badgeStyle(bg, text, border) {
  return {
    backgroundColor: bg,
    color: text,
    border: `1px solid ${border}`,
    fontFamily: "'DM Mono', monospace",
    fontSize: 9,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    padding: '3px 8px',
    borderRadius: 2,
  };
}

function fmt(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
