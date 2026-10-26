/**
 * Intro phase: thin golden construction lines draw themselves over black, then
 * the wordmark fades up. Pure SVG + CSS stroke-dashoffset (see edition.css
 * `.ed-intro`), so it runs on the compositor and respects reduced-motion.
 *
 * The geometry is a golden-ratio grille: an outer frame subdivided at φ with a
 * golden spiral of quarter-circle arcs — a nod to classical "construction".
 */
export default function ConstructionIntro() {
  // Golden-ratio subdivisions of a 1000×680 frame.
  const W = 1000;
  const H = 680;
  const gx = Math.round(W / 1.618); // 618
  const gy = Math.round(H / 1.618); // 420

  // Each stroked element gets a --len (≈ its path length) and --i (stagger order).
  const lines = [
    { el: 'rect', props: { x: 0, y: 0, width: W, height: H }, len: 2 * (W + H), i: 0 },
    { el: 'line', props: { x1: gx, y1: 0, x2: gx, y2: H }, len: H, i: 1 },
    { el: 'line', props: { x1: 0, y1: gy, x2: W, y2: gy }, len: W, i: 2 },
    { el: 'line', props: { x1: gx, y1: gy, x2: W, y2: gy }, len: W - gx, i: 3 },
    { el: 'rect', props: { x: gx, y: 0, width: W - gx, height: gy }, len: 2 * (W - gx + gy), i: 3 },
    // golden spiral arcs stepping inward from the top-right square
    { el: 'path', props: { d: `M ${W} ${gy} A ${W - gx} ${W - gx} 0 0 1 ${gx} 0` }, len: 1.6 * (W - gx), i: 4 },
    { el: 'path', props: { d: `M ${gx} 0 A ${gy} ${gy} 0 0 0 ${gx - gy} ${gy}` }, len: 1.6 * gy, i: 5 },
    { el: 'path', props: { d: `M ${gx - gy} ${gy} A ${gx - gy} ${gx - gy} 0 0 0 ${gx} ${H}` }, len: 1.6 * (gx - gy), i: 6 },
    // centre crosshair
    { el: 'circle', props: { cx: gx, cy: gy, r: 5 }, len: 32, i: 6 },
  ];

  return (
    <section className="ed-intro" aria-label="The Firmward Edition — cover">
      {/* starfield revealed behind the frame as it zooms away (opacity driven by --push) */}
      <div className="ed-intro__space ed-stars" aria-hidden="true" />

      <div className="ed-intro__stage">
        <svg
          className="ed-intro__svg"
          viewBox={`-40 -40 ${W + 80} ${H + 80}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {lines.map((l, idx) => {
            const style = { '--len': l.len, '--i': l.i };
            if (l.el === 'rect') return <rect key={idx} {...l.props} style={style} />;
            if (l.el === 'line') return <line key={idx} {...l.props} style={style} />;
            if (l.el === 'circle') return <circle key={idx} {...l.props} style={style} />;
            return <path key={idx} {...l.props} style={style} />;
          })}
        </svg>

        <div className="ed-intro__mark">
          <div className="ed-kicker" style={{ marginBottom: '1rem' }}>The Firmward</div>
          <div className="ed-wordmark">
            The Firmward <em>Edition</em>
          </div>
          <div className="ed-kicker" style={{ marginTop: '1rem', color: 'var(--ed-gold-soft)' }}>
            A field guide to the law-student search
          </div>
        </div>
      </div>

      <div className="ed-intro__scroll" aria-hidden="true">Scroll</div>
    </section>
  );
}
