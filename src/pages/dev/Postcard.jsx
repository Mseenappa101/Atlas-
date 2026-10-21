import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import StatePostcard from '../../components/postcard/StatePostcard';
import { EASE_OUT } from '../../lib/motion';

// DEV-only harness to self-review state postcards in isolation (not routed in production).
// ?bare=1 hides the controls + app chrome for clean GIF capture; ?state=TX picks the state; ?slow=N slows.
const STATES = { TX: 24, CA: 23, NY: 30, GA: 12, FL: 29, DC: 17 };
const params = () => new URLSearchParams(window.location.search);

export default function DevPostcard() {
  const bare = params().get('bare') === '1';
  const slow = Number(params().get('slow')) || 1;
  const [code, setCode] = useState(params().get('state') || 'TX');
  const [data, setData] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [k, setK] = useState(0);

  useEffect(() => {
    let live = true;
    setData(null);
    import(`../../data/states/${code.toLowerCase()}.js`).then((m) => { if (live) { setData(m.default); setRevealed(false); setK((n) => n + 1); } }).catch(() => {});
    return () => { live = false; };
  }, [code]);

  const card = data && (
    <>
      <StatePostcard key={k} data={data} firmCount={STATES[code] ?? 0} speed={slow} onReveal={() => setRevealed(true)} />
      <AnimatePresence>
        {revealed && (
          <motion.ul
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="mt-4 divide-y divide-line overflow-hidden rounded-app border border-line bg-card"
          >
            {['Caldwell & Vance LLP', 'Harbor Reed', 'Lone Star Litigation', 'Brazos Legal Group'].map((f) => (
              <li key={f} className="flex items-center justify-between px-4 py-3 text-t14">
                <span className="font-medium">{f}</span>
                <span className="data text-t12 text-fg-2">Hiring</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </>
  );

  if (bare) {
    return (
      <div style={{ background: 'var(--app-bg)', padding: 20, maxWidth: 560 }}>
        <style>{'header,footer,.no-print,a[href="#main"]{display:none!important}'}</style>
        {card}
      </div>
    );
  }

  return (
    <div className="app min-h-screen">
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {Object.keys(STATES).map((s) => (
            <button key={s} onClick={() => setCode(s)} className={`rounded-app border px-3 py-1.5 text-t14 font-semibold ${code === s ? 'border-brand bg-brand text-white' : 'border-line bg-card'}`}>{s}</button>
          ))}
          <button onClick={() => { setRevealed(false); setK((n) => n + 1); }} className="ml-auto rounded-app bg-brand px-4 py-1.5 text-t14 font-semibold text-white">Replay</button>
        </div>
        <p className="mb-3 text-t12 text-fg-2">{revealed ? 'revealed — firm list shown' : 'playing…'} · tap the card to skip</p>
        {card}
      </div>
    </div>
  );
}
