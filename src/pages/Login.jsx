import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const card = {
  maxWidth: 420,
  margin: '4rem auto',
  background: '#faf7f2',
  border: '1px solid #c8bfae',
  borderRadius: 2,
  padding: '2.5rem',
};

const labelStyle = {
  display: 'block',
  fontFamily: "'DM Mono', monospace",
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#b0a898',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #c8bfae',
  borderRadius: 2,
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: 15,
  color: '#1a1710',
  backgroundColor: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from || '/dashboard';

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err.message);
      setSubmitting(false);
    } else {
      navigate(redirectTo, { replace: true });
    }
  }

  return (
    <div style={card}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Link
          to="/"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 28,
            fontWeight: 700,
            color: '#c4a55a',
            textDecoration: 'none',
            letterSpacing: '0.12em',
          }}
        >
          Firmward
        </Link>
        <div
          style={{
            width: 40,
            height: 1,
            backgroundColor: '#c4a55a',
            margin: '12px auto 0',
          }}
        />
      </div>

      <h1
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 24,
          fontWeight: 600,
          color: '#1a1710',
          textAlign: 'center',
          margin: '0 0 24px',
        }}
      >
        Sign In
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: 12,
            backgroundColor: '#1a1710',
            color: '#c4a55a',
            border: 'none',
            borderRadius: 2,
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>

        {error && (
          <p
            style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: 14,
              fontStyle: 'italic',
              color: '#8b1a1a',
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            {error}
          </p>
        )}
      </form>

      <p
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: 14,
          color: '#7a7260',
          textAlign: 'center',
          marginTop: 20,
        }}
      >
        Don&apos;t have an account?{' '}
        <Link to="/signup" style={{ color: '#8b6914', textDecoration: 'none' }}>
          Create one
        </Link>
      </p>
    </div>
  );
}
