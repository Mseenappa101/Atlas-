import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { signIn } from '../lib/access';
import useSession from '../hooks/useSession';
import { Button, Input } from '../components/app/controls';

export default function SignIn() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const next = params.get('next');
  const dest = next?.startsWith('/') && !next.startsWith('//') ? next : '/explore';

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
    <div className="app min-h-screen">
      <div className="mx-auto max-w-app px-4 pb-24 pt-10 md:px-6 md:pt-16">
        <form onSubmit={submit} className="mx-auto max-w-sm rounded-app border border-line bg-card p-6" aria-labelledby="signin-h">
          <h1 id="signin-h" className="text-t24 font-bold tracking-tight">
            Sign in
          </h1>
          <p className="mt-1 text-t14 text-fg-2">To your map, My List and documents.</p>
          <div className="mt-5 space-y-3">
            <Input label="Email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
            <Input label="Password" type="password" required autoComplete="current-password" value={form.password} onChange={set('password')} />
          </div>
          <Button type="submit" disabled={status === 'saving'} className="mt-5 w-full">
            {status === 'saving' ? 'Signing in…' : 'Sign in'}
          </Button>
          {status === 'error' && (
            <p role="alert" className="mt-3 text-t14 text-st-soon-text">
              {message}
            </p>
          )}
          <p className="mt-5 text-t14 text-fg-2">
            No profile yet?{' '}
            <Link to={next ? `/?next=${encodeURIComponent(next)}` : '/'} className="font-medium text-brand hover:underline">
              Get free access
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
