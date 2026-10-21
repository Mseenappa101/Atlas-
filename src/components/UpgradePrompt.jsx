import { Link } from 'react-router-dom';

export default function UpgradePrompt() {
  return (
    <div
      style={{
        borderLeft: '2px solid #E3E6E8',
        paddingLeft: '1rem',
        margin: '16px 0',
      }}
    >
      <h3
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 22,
          fontWeight: 600,
          color: '#14181F',
          margin: '0 0 8px',
        }}
      >
        Document generation is part of Pro
      </h3>
      <p
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: 15,
          color: '#5B6470',
          lineHeight: 1.6,
          margin: '0 0 16px',
        }}
      >
        Generate tailored cover letters, cold outreach emails, and interview prep sheets
        for every firm on your list.
      </p>
      <Link
        to="/pricing"
        style={{
          display: 'inline-block',
          padding: '10px 24px',
          backgroundColor: '#14181F',
          color: '#1F5C45',
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          textDecoration: 'none',
          borderRadius: 2,
        }}
      >
        Upgrade to Pro — $20 per month
      </Link>
    </div>
  );
}
