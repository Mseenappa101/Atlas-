/**
 * An ink stamp (ADMITTED / HIRED / FILED) — a double-ruled oval with carved caps,
 * canted a few degrees like a hand stamp. Used as a reward micro-animation: it
 * "thumps" in with an overshoot + ink bleed when its container gains `.is-stamped`
 * (hover/focus/scroll). Pure SVG + CSS transform; reduced-motion shows it static.
 */
export default function InkStamp({ label = 'Admitted', sub = 'Firmward · Bar of Hiring', className = '' }) {
  return (
    <span className={`ed-stamp ${className}`} role="img" aria-label={`${label} stamp`}>
      <svg viewBox="0 0 220 140" aria-hidden="true">
        <defs>
          <path id={`arc-${label}`} d="M 34 70 A 76 76 0 0 1 186 70" fill="none" />
          <path id={`arcb-${label}`} d="M 40 76 A 70 70 0 0 0 180 76" fill="none" />
        </defs>
        <ellipse cx="110" cy="70" rx="96" ry="58" className="ed-stamp__ring" />
        <ellipse cx="110" cy="70" rx="86" ry="50" className="ed-stamp__ring ed-stamp__ring--thin" />
        <text className="ed-stamp__arc">
          <textPath href={`#arc-${label}`} startOffset="50%">★ UNITED · OFFER · ENTERED ★</textPath>
        </text>
        <text x="110" y="82" className="ed-stamp__label" textAnchor="middle">{label}</text>
        <text className="ed-stamp__arc ed-stamp__arc--b">
          <textPath href={`#arcb-${label}`} startOffset="50%">{sub}</textPath>
        </text>
      </svg>
    </span>
  );
}
