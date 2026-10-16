import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { signIn } from '../lib/access';
import useSession from '../hooks/useSession';
import { Button, TextField } from '../components/ui';

export default function SignIn() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const next = params.get('next');
  const dest = next?.startsWith('/') && !next.startsWith('//') ? next : '/directory';

  useEffect(() => {
    document.title = 'Sign in — Atlas';
  }, []);

  if (!loading && session && status !== 'saving') return <Navigate to={dest} replace />;

  async function submit(e) {
    e.preventDefault();
    setStatus('saving');
    try {
      await signIn(form.email, form.password);
      navigate(dest, { replace: true });
    } catch (err) {
      setMessage(err.message);
      setStatus('error');
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <main className="page pt-10 md:pt-16">
      <div className="max-w-sm">
        <h1 className="text-xl">Sign in</h1>
        <p className="mt-2 text-muted">To your directory, resume and cover letters.</p>
        <form onSubmit={submit} className="mt-6 space-y-4 border-t border-ink pt-6">
          <TextField label="Email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
          <TextField label="Password" type="password" required autoComplete="current-password" value={form.password} onChange={set('password')} />
          <Button type="submit" disabled={status === 'saving'} className="w-full">
            {status === 'saving' ? 'Signing in…' : 'Sign in'}
          </Button>
          {status === 'error' && (
            <p role="alert" className="text-sm text-accent">
              {message}
            </p>
          )}
        </form>
        <p className="mt-6 text-sm text-muted">
          No profile yet?{' '}
          <Link to={next ? `/?next=${encodeURIComponent(next)}` : '/'} className="link">
            Create one free
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
