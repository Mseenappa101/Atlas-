/**
 * The cover. Leads with a full-colour public-domain portrait (the Corneille de
 * Lyon gentleman — the recurring motif), a thin golden-ratio construction frame,
 * and a parchment panel holding the title, a one-line description and the chapter
 * index. As the tall wrap scrolls (see Edition's push handler setting `--push`),
 * the painting crossfades to its clean etched line-art, a starfield blooms, the
 * frame + panel zoom toward the viewer and fade, and the first chapter rises —
 * the "push through the frame into the night" move.
 */
export default function EditionCover({ chapters }) {
  // Golden-ratio grille over a 1000×680 frame.
  const W = 1000, H = 680;
  const gx = Math.round(W / 1.618), gy = Math.round(H / 1.618);
  const lines = [
    { el: 'rect', props: { x: 0, y: 0, width: W, height: H }, len: 2 * (W + H), i: 0 },
    { el: 'line', props: { x1: gx, y1: 0, x2: gx, y2: H }, len: H, i: 1 },
    { el: 'line', props: { x1: 0, y1: gy, x2: W, y2: gy }, len: W, i: 2 },
    { el: 'path', props: { d: `M ${W} ${gy} A ${W - gx} ${W - gx} 0 0 1 ${gx} 0` }, len: 1.6 * (W - gx), i: 3 },
    { el: 'path', props: { d: `M ${gx} 0 A ${gy} ${gy} 0 0 0 ${gx - gy} ${gy}` }, len: 1.6 * gy, i: 4 },
    { el: 'circle', props: { cx: gx, cy: gy, r: 5 }, len: 32, i: 5 },
  ];

  return (
    <section className="ed-cover" aria-label="The Firmward Edition — cover">
      {/* colour painting ground → etched line-art on push; starfield blooms behind */}
      <img
        className="ed-cover__plate ed-cover__plate--color"
        src="/art/the-map/color-1024.webp"
        srcSet="/art/the-map/color-640.webp 640w, /art/the-map/color-1024.webp 1024w, /art/the-map/color-1600.webp 1600w"
        /* the hero is a heavily-darkened full-bleed ground — a smaller source on phones is invisible and much faster (LCP) */
        sizes="(max-width: 900px) 65vw, 100vw" alt="" aria-hidden="true" width={1024} height={1365} fetchPriority="high"
      />
      <img
        className="ed-cover__plate ed-cover__plate--line"
        src="/art/the-map/line-1024.webp" alt="" aria-hidden="true" width={1024} height={1365} loading="eager"
      />
      <div className="ed-cover__space ed-stars" aria-hidden="true" />
      <div className="ed-cover__veil" aria-hidden="true" />

      {/* frame + parchment panel — the part that zooms through on push */}
      <div className="ed-cover__stage">
        <svg className="ed-cover__frame" viewBox={`-40 -40 ${W + 80} ${H + 80}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {lines.map((l, idx) => {
            const style = { '--len': l.len, '--i': l.i };
            if (l.el === 'rect') return <rect key={idx} {...l.props} style={style} />;
            if (l.el === 'line') return <line key={idx} {...l.props} style={style} />;
            if (l.el === 'circle') return <circle key={idx} {...l.props} style={style} />;
            return <path key={idx} {...l.props} style={style} />;
          })}
        </svg>

        <div className="ed-cover__panel">
          <h1 className="ed-cover__title">The Firmward <em>Edition</em></h1>
          <p className="ed-cover__desc">
            A field guide to the law-student job search — the map, the sprint, and the way to a signed offer, in six chapters.
          </p>
          <ol className="ed-cover__index" aria-label="Chapters">
            {chapters.map((c) => (
              <li key={c.id}>
                <span className="ed-cover__index-label">{c.label}</span>
                <span className="ed-cover__index-num ed-roman">{c.roman}</span>
              </li>
            ))}
          </ol>
          <a className="ed-cta ed-cover__cta" href="/sprint">Start the Sprint</a>
        </div>
      </div>

      <div className="ed-cover__scroll" aria-hidden="true">Scroll to begin</div>
    </section>
  );
}
