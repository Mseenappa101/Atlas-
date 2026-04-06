import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, session, signOut } = useAuth();

  return (
    <nav
      style={{
        backgroundColor: '#1a1710',
        borderBottom: '1px solid #c8bfae',
        height: 56,
        padding: '0 2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Link
        to="/"
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          color: '#c4a55a',
          letterSpacing: '0.15em',
          fontSize: 22,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Atlas
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {session ? (
          <>
            <Link
              to="/dashboard"
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                color: '#c4a55a',
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Dashboard
            </Link>
            <NavLink to="/browse">Browse</NavLink>
            <NavLink to="/pricing">Pricing</NavLink>

            <Divider />

            <span
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                color: '#7a7060',
                fontSize: 14,
              }}
            >
              {user?.email}
            </span>
            <button
              onClick={signOut}
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                color: '#7a7060',
                fontSize: 14,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/browse">Browse</NavLink>
            <NavLink to="/pricing">Pricing</NavLink>
            <Divider />
            <NavLink to="/login">Sign In</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

function Divider() {
  return (
    <span
      style={{
        width: 1,
        height: 20,
        backgroundColor: '#c8bfae',
        opacity: 0.4,
      }}
    />
  );
}

function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{
        fontFamily: "'EB Garamond', Georgia, serif",
        color: '#7a7060',
        fontSize: 14,
        textDecoration: 'none',
      }}
    >
      {children}
    </Link>
  );
}
