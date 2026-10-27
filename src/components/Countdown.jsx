import { useEffect, useState } from 'react';
import useHydrated from '../lib/useHydrated';

function parts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Live "12d 4h 09m" until `to`. Renders `after` (default nothing) once it has passed. */
export default function Countdown({ to, after = null, seconds = false, className = '' }) {
  const target = new Date(to).getTime();
  const iso = new Date(to).toISOString();
  // The server render and the first client render show a stable placeholder (no clock read), so hydration
  // matches; `now` is only consulted once hydrated, then ticks on an interval.
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), seconds ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [seconds]);
  if (!hydrated) {
    return <time dateTime={iso} className={`data ${className}`}>&hellip;</time>;
  }
  if (now >= target) return after;
  const { d, h, m, s } = parts(target - now);
  const pad = (n) => String(n).padStart(2, '0');
  const label = `${d ? `${d}d ` : ''}${h}h ${pad(m)}m${seconds ? ` ${pad(s)}s` : ''}`;
  return (
    <time dateTime={iso} className={`data ${className}`} aria-label={`${d} days ${h} hours ${m} minutes left`}>
      {label}
    </time>
  );
}
