import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RequireProfile from '../components/RequireProfile';
import { Button, ButtonLink, Input, Select } from '../components/app/controls';
import { Card } from '../components/apply/Card';
import ConnectNotice from '../components/apply/ConnectNotice';
import { ConnectButtons } from '../components/apply/Compose';
import useSession from '../hooks/useSession';
import useUsage from '../hooks/useUsage';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { CLASS_YEARS } from '../lib/profileOptions';

const PLAN_LABEL = { free: 'Free', pro: 'Pro', member: 'Membership (includes Pro)', retainer: 'Retainer (includes Pro)' };
const PROVIDER = { gmail: 'Gmail', outlook: 'Outlook' };

function Profile() {
  const { session, profile, refreshProfile } = useSession();
  const [form, setForm] = useState({ full_name: profile?.full_name ?? '', school: profile?.school ?? '', class_year: profile?.class_year ?? '' });
  const [status, setStatus] = useState('');
  const dirty = form.full_name !== (profile?.full_name ?? '') || form.school !== (profile?.school ?? '') || form.class_year !== (profile?.class_year ?? '');

  async function save(e) {
    e.preventDefault();
    setStatus('Saving…');
    const { error } = await supabase
      .from('users')
      .update({ full_name: form.full_name.trim() || null, school: form.school.trim() || null, class_year: form.class_year || null })
      .eq('id', session.user.id);
    if (error) return setStatus('Couldn’t save. Try again.');
    await refreshProfile();
    setStatus('Saved.');
  }

  return (
    <Card title="Profile" description="Used on your cover letters and application emails.">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} autoComplete="name" />
        <Input label="Email" value={session.user.email} readOnly disabled />
        <Input label="Law school" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
        <Select label="Year" options={CLASS_YEARS} placeholder="Choose" value={form.class_year} onChange={(e) => setForm({ ...form, class_year: e.target.value })} />
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={!dirty}>Save profile</Button>
          <p role="status" className="text-t14 text-fg-2">{status}</p>
        </div>
      </form>
    </Card>
  );
}

function Password() {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('');
  return (
    <Card title="Password">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (value.length < 8) return setStatus('Use at least 8 characters.');
          setStatus('Saving…');
          const { error } = await supabase.auth.updateUser({ password: value });
          setStatus(error ? error.message : 'Password changed.');
          if (!error) setValue('');
        }}
      >
        <Input label="New password" type="password" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="new-password" className="min-w-[220px] flex-1" />
        <Button type="submit" variant="secondary" disabled={!value}>Change password</Button>
        <p role="status" className="w-full text-t14 text-fg-2">{status}</p>
      </form>
    </Card>
  );
}

function Plan() {
  const [usage] = useUsage();
  const [status, setStatus] = useState('');
  const plan = usage?.plan ?? null;
  const coaching = plan === 'member' || plan === 'retainer';
  return (
    <Card title="Plan and billing">
      <p className="text-t14">
        {plan ? (
          <>
            You&rsquo;re on <span className="font-semibold">{PLAN_LABEL[plan] ?? plan}</span>.
          </>
        ) : usage?.failed ? (
          'We couldn’t load your plan just now.'
        ) : (
          'Loading…'
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {plan === 'free' && <ButtonLink to="/membership">See Membership</ButtonLink>}
        {plan === 'pro' && (
          <Button
            variant="secondary"
            onClick={async () => {
              setStatus('Opening billing…');
              try {
                const { url } = await api('/billing/portal', { method: 'POST' });
                window.location.assign(url);
              } catch (e) {
                setStatus(e.message);
              }
            }}
          >
            Manage billing
          </Button>
        )}
      </div>
      {coaching && <p className="mt-2 text-t14 text-fg-2">Pro is included with your coaching plan.</p>}
      <p role="status" className="mt-2 text-t14 text-fg-2">{status}</p>
    </Card>
  );
}

function Email() {
  const [conn, setConn] = useState(null);
  const [message, setMessage] = useState('');
  const load = () => api('/email/connections').then(setConn).catch((e) => setMessage(e.message));
  useEffect(() => {
    load();
  }, []);

  return (
    <Card title="Sending applications" description="Connect your email to send applications from your own address. Firmward can only send. It can’t read your inbox.">
      {!conn ? (
        <p className="text-t14 text-fg-2">{message || 'Loading…'}</p>
      ) : (
        <>
          {conn.connections.length > 0 && (
            <ul className="mb-3 divide-y divide-line rounded-app border border-line">
              {conn.connections.map((c) => (
                <li key={c.provider} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-t14">
                  <span>
                    <span className="font-medium">{PROVIDER[c.provider]}</span> · {c.email}
                  </span>
                  <button
                    type="button"
                    className="min-h-[44px] text-brand hover:underline md:min-h-0"
                    onClick={async () => {
                      if (!window.confirm(`Disconnect ${c.email}? You can reconnect any time.`)) return;
                      await api('/email/disconnect', { method: 'POST', body: { provider: c.provider } }).catch((e) => setMessage(e.message));
                      load();
                    }}
                  >
                    Disconnect
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ConnectButtons conn={conn} returnTo="/account" onError={setMessage} />
          <p className="mt-3 text-t14 text-fg-2">
            {conn.available.firmward
              ? `Without a connection, applications go out from Firmward as “Your Name via Firmward”, and replies come to ${conn.account_email}.`
              : !conn.available.gmail && !conn.available.outlook
                ? 'Sending from Firmward is being set up.'
                : null}
          </p>
          {message && <p role="status" className="mt-2 text-t14 text-st-closed-text">{message}</p>}
        </>
      )}
    </Card>
  );
}

function Newsletter() {
  const [subscribed, setSubscribed] = useState(null);
  const [status, setStatus] = useState('');
  useEffect(() => {
    api('/me/newsletter').then((r) => setSubscribed(r.subscribed)).catch(() => setStatus('Couldn’t load this setting.'));
  }, []);
  return (
    <Card title="Email from Firmward">
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-t14">
        <input
          type="checkbox"
          className="mt-0.5 h-[18px] w-[18px] accent-brand"
          disabled={subscribed === null}
          checked={Boolean(subscribed)}
          onChange={async (e) => {
            const next = e.target.checked;
            setSubscribed(next);
            try {
              await api('/me/newsletter', { method: 'PUT', body: { subscribed: next } });
              setStatus(next ? 'You’re subscribed.' : 'You’re unsubscribed.');
            } catch (err) {
              setSubscribed(!next);
              setStatus(err.message);
            }
          }}
        />
        <span>
          <span className="block font-medium">Recruiting newsletter</span>
          <span className="block text-fg-2">Deadlines that are coming up, newly opened summer and post-grad roles, and application advice. About twice a month.</span>
        </span>
      </label>
      <p role="status" className="mt-1 text-t14 text-fg-2">{status}</p>
    </Card>
  );
}

function AccountPage() {
  const { signOut } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    document.title = 'Account — Firmward';
  }, []);
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:px-6 md:pb-12">
      <h1 className="mb-5 text-t24 font-bold tracking-tight md:text-t32">Account</h1>
      <ConnectNotice />
      <div className="space-y-4">
        <Profile />
        <Email />
        <Plan />
        <Newsletter />
        <Password />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-t14">
          <p className="text-fg-2">
            <Link to="/privacy" className="hover:underline">Privacy</Link> · <Link to="/terms" className="hover:underline">Terms</Link>
          </p>
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Account() {
  return (
    <RequireProfile>
      <div className="app min-h-screen">
        <AccountPage />
      </div>
    </RequireProfile>
  );
}
