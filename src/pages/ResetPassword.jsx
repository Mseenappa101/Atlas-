import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '../components/app/controls';
import { supabase } from '../lib/supabase';

// Two steps on one page: ask for the reset email, then (arriving from that email's link)
// choose a new password. Supabase signs the student in from the link and reports PASSWORD_RECOVERY.
export default function ResetPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(() => (/type=recovery/.test(window.location.hash) ? 'set' : 'ask'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ kind: 'idle', message: '' });

  useEffect(() => {
    document.title = 'Reset your password — Firmward';
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('set');
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function ask(e) {
    e.preventDefault();
    setStatus({ kind: 'working', message: '' });
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    // Same message either way, so this form can't be used to find out who has a profile.
    if (error && /rate|seconds/i.test(error.message)) {
      setStatus({ kind: 'error', message: 'Please wait a minute before asking for another email.' });
    } else {
      setStatus({ kind: 'sent', message: `If ${email.trim()} has a Firmward profile, a reset link is on its way. Check your inbox and spam folder.` });
    }
  }

  async function save(e) {
    e.preventDefault();
    if (password.length < 8) return setStatus({ kind: 'error', message: 'Use at least 8 characters.' });
    setStatus({ kind: 'working', message: '' });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus({ kind: 'error', message: /session|expired|jwt/i.test(error.message) ? 'This reset link has expired. Ask for a new one.' : error.message });
      if (/session|expired|jwt/i.test(error.message)) setMode('ask');
      return;
    }
    navigate('/explore', { replace: true });
  }

  return (
    <div className="app min-h-screen">
      <div className="mx-auto max-w-app px-4 pb-24 pt-10 md:px-6 md:pt-16">
        {mode === 'ask' ? (
          <form onSubmit={ask} className="mx-auto max-w-sm rounded-app border border-line bg-card p-6" aria-labelledby="reset-h">
            <h1 id="reset-h" className="text-t24 font-bold tracking-tight">Reset your password</h1>
            <p className="mt-1 text-t14 text-fg-2">We&rsquo;ll email you a link to choose a new one.</p>
            <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-5" />
            <Button type="submit" disabled={status.kind === 'working' || status.kind === 'sent'} className="mt-5 w-full">
              {status.kind === 'working' ? 'Sending…' : 'Email me a reset link'}
            </Button>
            {status.message && (
              <p role="status" className={`mt-3 text-t14 ${status.kind === 'error' ? 'text-st-soon-text' : 'text-fg'}`}>{status.message}</p>
            )}
            <p className="mt-5 text-t14 text-fg-2">
              Remembered it? <Link to="/signin" className="font-medium text-brand hover:underline">Sign in</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={save} className="mx-auto max-w-sm rounded-app border border-line bg-card p-6" aria-labelledby="newpw-h">
            <h1 id="newpw-h" className="text-t24 font-bold tracking-tight">Choose a new password</h1>
            <Input label="New password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-5" />
            <Button type="submit" disabled={status.kind === 'working'} className="mt-5 w-full">
              {status.kind === 'working' ? 'Saving…' : 'Save and sign in'}
            </Button>
            {status.kind === 'error' && <p role="alert" className="mt-3 text-t14 text-st-soon-text">{status.message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
