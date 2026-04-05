import { Link } from 'react-router-dom';

export default function FirmCard({ firm }) {
  return (
    <div className="firm-card">
      <Link
        to={`/firm/${firm.id}`}
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 18,
          fontWeight: 700,
          color: '#1a1710',
          textDecoration: 'none',
          lineHeight: 1.3,
          display: 'block',
        }}
      >
        {firm.name}
      </Link>

      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          textTransform: 'uppercase',
          color: '#7a7260',
          letterSpacing: '0.05em',
          marginTop: 4,
        }}
      >
        {firm.city}, {firm.state}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {firm.has_1l_program && (
          <Badge>1L Program</Badge>
        )}
        {firm.has_fellowship && firm.fellowship_name && (
          <Badge>{firm.fellowship_name}</Badge>
        )}
      </div>

      {firm.practice_areas?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
          {firm.practice_areas.map((area) => (
            <span
              key={area}
              style={{
                backgroundColor: '#f0e6c8',
                color: '#8b6914',
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 2,
                whiteSpace: 'nowrap',
              }}
            >
              {area}
            </span>
          ))}
        </div>
      )}

      {firm.website && (
        <a
          href={firm.website}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 10,
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: '#8b6914',
            textDecoration: 'none',
          }}
        >
          Visit site &rarr;
        </a>
      )}

      <style>{`
        .firm-card {
          background: #ede8df;
          border: 1px solid #ddd6c8;
          padding: 16px;
          border-radius: 2px;
          transition: border-color 0.15s, background-color 0.15s;
        }
        .firm-card:hover {
          border-color: #c4a55a;
          background-color: #f0e6c8;
        }
      `}</style>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span
      style={{
        backgroundColor: '#f0e6c8',
        color: '#8b6914',
        fontFamily: "'DM Mono', monospace",
        fontSize: 9,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        padding: '3px 7px',
        borderRadius: 2,
        border: '1px solid #c4a55a',
      }}
    >
      {children}
    </span>
  );
}
