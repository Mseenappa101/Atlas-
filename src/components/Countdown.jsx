import { useEffect, useState } from 'react';

function parts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Live "12d 4h 09m" until `to`. Renders `after` (default nothing) once it has passed. */
export default function Countdown({ to, after = null, seconds = false, className = '' }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), seconds ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [seconds]);
  if (now >= target) return after;
  const { d, h, m, s } = parts(target - now);
  const pad = (n) => String(n).padStart(2, '0');
  const label = `${d ? `${d}d ` : ''}${h}h ${pad(m)}m${seconds ? ` ${pad(s)}s` : ''}`;
  return (
    <time dateTime={new Date(to).toISOString()} className={`data ${className}`} aria-label={`${d} days ${h} hours ${m} minutes left`}>
      {label}
    </time>
  );
}
