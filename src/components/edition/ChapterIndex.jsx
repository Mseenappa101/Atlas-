import { useActiveChapter } from './hooks';

function jump(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Chapter index. `variant="rail"` is the sticky desktop left column (Roman
 * numerals, dotted leaders, active highlight); `variant="bar"` is the compact
 * sticky top chapter bar on mobile. Both highlight the active chapter and
 * jump on click (Lenis intercepts smooth scroll on desktop; native on touch).
 */
export default function ChapterIndex({ chapters, variant = 'rail' }) {
  const ids = chapters.map((c) => c.id);
  const active = useActiveChapter(ids);

  if (variant === 'bar') {
    return (
      <div className="ed-topbar" aria-label="Chapters">
        <div className="ed-topbar__track">
          {chapters.map((c) => (
            <button
              key={c.id}
              type="button"
              className="ed-topbar__item"
              aria-current={active === c.id ? 'true' : 'false'}
              onClick={() => jump(c.id)}
            >
              <span className="ed-roman">{c.roman}</span> · {c.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <nav className="ed-index" aria-label="Chapters">
      <div className="ed-index__title">Contents</div>
      {chapters.map((c) => (
        <button
          key={c.id}
          type="button"
          className="ed-index__item"
          aria-current={active === c.id ? 'true' : 'false'}
          onClick={() => jump(c.id)}
        >
          <span className="ed-index__num ed-roman">{c.roman}</span>
          <span className="ed-index__label">{c.label}</span>
          <span className="ed-index__dots" aria-hidden="true" />
        </button>
      ))}
    </nav>
  );
}
