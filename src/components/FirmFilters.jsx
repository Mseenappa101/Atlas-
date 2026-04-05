import { useState, useEffect, useMemo } from 'react';

const inputStyle = {
  padding: '8px 12px',
  border: '1px solid #c8bfae',
  borderRadius: 4,
  backgroundColor: '#fff',
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: 14,
  color: '#1a1710',
  outline: 'none',
};

export default function FirmFilters({ firms = [], onFilter }) {
  const [search, setSearch] = useState('');
  const [only1L, setOnly1L] = useState(false);
  const [hasFellowship, setHasFellowship] = useState(false);
  const [city, setCity] = useState('');

  const cities = useMemo(() => {
    const unique = [...new Set(firms.map((f) => f.city))].sort();
    return unique;
  }, [firms]);

  useEffect(() => {
    let result = firms;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (only1L) {
      result = result.filter((f) => f.has_1l_program);
    }
    if (hasFellowship) {
      result = result.filter((f) => f.has_fellowship);
    }
    if (city) {
      result = result.filter((f) => f.city === city);
    }
    onFilter(result);
  }, [search, only1L, hasFellowship, city, firms, onFilter]);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
      }}
    >
      <input
        type="text"
        placeholder="Search firms..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputStyle, flex: '1 1 200px', minWidth: 180 }}
      />

      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        style={{ ...inputStyle, cursor: 'pointer' }}
      >
        <option value="">All Cities</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: '#4a4639',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <input
          type="checkbox"
          checked={only1L}
          onChange={(e) => setOnly1L(e.target.checked)}
          style={{ accentColor: '#8b6914' }}
        />
        1L Programs Only
      </label>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: '#4a4639',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <input
          type="checkbox"
          checked={hasFellowship}
          onChange={(e) => setHasFellowship(e.target.checked)}
          style={{ accentColor: '#8b6914' }}
        />
        Has Fellowship
      </label>
    </div>
  );
}
