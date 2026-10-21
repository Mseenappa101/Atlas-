// Slow, seamless, infinite horizontal marquee (transform only). Pauses on hover. Under reduced motion it
// renders a static wrapped list instead of scrolling. `pxPerSecond` sets the pace.
export default function Marquee({ items, pxPerSecond = 32, className = '' }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!items?.length) return null;

  if (reduced) {
    return (
      <ul className={`flex flex-wrap justify-center gap-x-4 gap-y-1 ${className}`}>
        {items.map((it) => <li key={it} className="text-t14 text-fg-2">{it}</li>)}
      </ul>
    );
  }

  // Duplicate the row so translateX(-50%) loops seamlessly. Duration scales with content width.
  const row = [...items, ...items];
  const durationS = Math.max(20, (items.length * 110) / pxPerSecond);

  return (
    <div className={`marquee ${className}`} aria-label="Cities we cover">
      <div className="marquee-track" style={{ animationDuration: `${durationS}s` }}>
        {row.map((it, i) => (
          <span key={`${it}-${i}`} className="marquee-item" aria-hidden={i >= items.length ? 'true' : undefined}>
            <span className="text-t14 text-fg-2">{it}</span>
            <span className="text-brand/40" aria-hidden="true">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
