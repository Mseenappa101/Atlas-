import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFirmsByState } from '../lib/db';
import FirmCard from '../components/FirmCard';
import FirmFilters from '../components/FirmFilters';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { US_STATES } from '../constants/states';

function slugToName(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function nameToAbbr(name) {
  const found = US_STATES.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
  return found?.abbr || name;
}

export default function BrowseState() {
  const { state: stateSlug } = useParams();
  const stateName = slugToName(stateSlug);
  const stateAbbr = nameToAbbr(stateName);

  const [firms, setFirms] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `Law Firms in ${stateName} | Atlas`;
    async function load() {
      const { data } = await getFirmsByState(stateAbbr);
      if (data) {
        setFirms(data);
        setFiltered(data);
      }
      setLoading(false);
    }
    load();
  }, [stateAbbr, stateName]);

  const onFilter = useCallback((result) => {
    setFiltered(result);
  }, []);

  const cityGroups = filtered.reduce((acc, firm) => {
    const city = firm.city || 'Other';
    if (!acc[city]) acc[city] = [];
    acc[city].push(firm);
    return acc;
  }, {});

  const sortedCities = Object.keys(cityGroups).sort();

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2.5rem 2rem' }}>
      <Link
        to="/browse"
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#7a7260',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: 16,
        }}
      >
        &larr; All States
      </Link>

      <h1
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 34,
          fontWeight: 600,
          color: '#1a1710',
          margin: '0 0 24px',
        }}
      >
        {stateName}
      </h1>

      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      ) : (
        <>
          <FirmFilters firms={firms} onFilter={onFilter} />

          {sortedCities.length === 0 && (
            <p
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: 16,
                fontStyle: 'italic',
                color: '#7a7260',
                textAlign: 'center',
                padding: '2rem 0',
              }}
            >
              No firms match your filters.
            </p>
          )}

          {sortedCities.map((city) => (
            <section key={city} id={`city-${city.toLowerCase().replace(/\s+/g, '-')}`} style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 22,
                    fontWeight: 600,
                    color: '#1a1710',
                    margin: 0,
                  }}
                >
                  {city}
                </h2>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    backgroundColor: '#f0e6c8',
                    color: '#8b6914',
                    padding: '2px 8px',
                    borderRadius: 2,
                  }}
                >
                  {cityGroups[city].length}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 14,
                }}
              >
                {cityGroups[city].map((firm) => (
                  <FirmCard key={firm.id} firm={firm} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
