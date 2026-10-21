import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const card = {
  maxWidth: 420,
  margin: '4rem auto',
  background: '#FFFFFF',
  border: '1px solid #E3E6E8',
  borderRadius: 2,
  padding: '2.5rem',
};

const labelStyle = {
  display: 'block',
  fontFamily: "'DM Mono', monospace",
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#5B6470',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #E3E6E8',
  borderRadius: 2,
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: 15,
  color: '#14181F',
  backgroundColor: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error: err } = await signUp(email, password);
    if (err) {
      setError(err.message);
      setSubmitting(false);
    } else {
      navigate('/onboarding', { replace: true });
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
            color: '#1F5C45',
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
            backgroundColor: '#1F5C45',
            margin: '12px auto 0',
          }}
        />
      </div>

      <h1
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 24,
          fontWeight: 600,
          color: '#14181F',
          textAlign: 'center',
          margin: '0 0 24px',
        }}
      >
        Create Account
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

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: 12,
            backgroundColor: '#14181F',
            color: '#1F5C45',
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
          {submitting ? 'Creating account...' : 'Create Account'}
        </button>

        {error && (
          <p
            style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: 14,
              fontStyle: 'italic',
              color: '#8A5A12',
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
          color: '#5B6470',
          textAlign: 'center',
          marginTop: 20,
        }}
      >
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#1F5C45', textDecoration: 'none' }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
