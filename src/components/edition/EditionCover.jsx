/**
 * The cover. Leads with a full-colour public-domain portrait (a legal scholar —
 * the recurring motif), a thin brass PORTICO drawn in line (pediment, columns,
 * stylobate — the "architecture as layout" motif), and a marble caption panel
 * carrying the case caption, the title, a one-line description and the record
 * index. As the tall wrap scrolls (Edition sets `--push`), the painting etches
 * into line-art, a field of citations blooms, the portico + panel zoom through,
 * and the first section rises — the "push through the colonnade into the record".
 */
export default function EditionCover({ chapters }) {
  // Portico over a 1000×680 frame: pediment, entablature, six columns, stylobate.
  const W = 1000, H = 680;
  const cols = [180, 308, 436, 564, 692, 820];
  const lines = [
    // pediment (raking cornice triangle)
    { el: 'path', props: { d: `M 120 196 L 500 40 L 880 196` }, len: 2 * Math.hypot(380, 156), i: 0 },
    // entablature (architrave + cornice bands)
    { el: 'line', props: { x1: 120, y1: 196, x2: 880, y2: 196 }, len: 760, i: 1 },
    { el: 'line', props: { x1: 150, y1: 232, x2: 850, y2: 232 }, len: 700, i: 1 },
    // columns
    ...cols.map((x, k) => ({ el: 'line', props: { x1: x, y1: 236, x2: x, y2: 592 }, len: 356, i: 2 + (k % 3) })),
    // stylobate steps
    { el: 'line', props: { x1: 128, y1: 596, x2: 872, y2: 596 }, len: 744, i: 5 },
    { el: 'line', props: { x1: 104, y1: 628, x2: 896, y2: 628 }, len: 792, i: 6 },
  ];

  return (
    <section className="ed-cover" aria-label="The Firmward Edition — cover">
      {/* colour painting ground → etched line-art on push; citation field blooms behind */}
      <picture className="ed-cover__pic">
        <source
          type="image/avif"
          srcSet="/art/the-map/color-400.avif 400w, /art/the-map/color-640.avif 640w, /art/the-map/color-1024.avif 1024w, /art/the-map/color-1600.avif 1600w"
          sizes="(max-width: 900px) 55vw, 100vw"
        />
        <img
          className="ed-cover__plate ed-cover__plate--color"
          src="/art/the-map/color-400.webp"
          srcSet="/art/the-map/color-400.webp 400w, /art/the-map/color-640.webp 640w, /art/the-map/color-1024.webp 1024w, /art/the-map/color-1600.webp 1600w"
          sizes="(max-width: 900px) 55vw, 100vw" alt="" aria-hidden="true" width={1024} height={1365} fetchPriority="high"
        />
      </picture>
      {/* Decorative overlay for the scroll "etch" effect — must not compete with the LCP colour plate. */}
      <img
        className="ed-cover__plate ed-cover__plate--line"
        src="/art/the-map/line-1024.webp" alt="" aria-hidden="true" width={1024} height={1365} loading="lazy" fetchPriority="low" decoding="async"
      />
      <div className="ed-cover__space ed-stars" aria-hidden="true" />
      <div className="ed-cover__veil" aria-hidden="true" />

      {/* portico + marble caption panel — the part that zooms through on push */}
      <div className="ed-cover__stage">
        <svg className="ed-cover__frame" viewBox={`-40 -40 ${W + 80} ${H + 80}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {lines.map((l, idx) => {
            const style = { '--len': l.len, '--i': l.i };
            if (l.el === 'line') return <line key={idx} {...l.props} style={style} />;
            return <path key={idx} {...l.props} style={style} />;
          })}
        </svg>

        <div className="ed-cover__panel">
          <p className="ed-cover__caption">
            In re <span>Your Job Search</span>
            <span className="ed-cover__docket">No.&nbsp;24 — Firmward</span>
          </p>
          <h1 className="ed-cover__title">The Firmward <em>Edition</em></h1>
          <p className="ed-cover__desc">
            A field guide to the law-student job search — the map, the sprint, and the way to a signed offer, in six sections.
          </p>
          <ol className="ed-cover__index" aria-label="Sections">
            {chapters.map((c) => (
              <li key={c.id}>
                <span className="ed-cover__index-sec ed-roman">§&nbsp;{c.roman}</span>
                <span className="ed-cover__index-label">{c.label}</span>
              </li>
            ))}
          </ol>
          <a className="ed-cta ed-cover__cta" href="/sprint">Start the Sprint</a>
        </div>
      </div>

      <div className="ed-cover__scroll" aria-hidden="true">Enter the record</div>
    </section>
  );
}
