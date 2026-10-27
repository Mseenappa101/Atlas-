import { useState } from 'react';
import InkStamp from '../edition/InkStamp';
import useInViewOnce from '../../lib/useInViewOnce';
import './judiciary.css';

// Judiciary-theme building blocks for the light content/app pages (match the Edition's devices on a
// cream ground): an ink Stamp that thumps in on scroll, and Exhibit A/B/C tabbed sections.

/** An ADMITTED/FILED/ON-RECORD ink stamp that stamps in when it scrolls into view (reduced-motion: static). */
export function Stamp({ label, sub, className = '' }) {
  const [ref, inView] = useInViewOnce();
  return (
    <span ref={ref} className={`jx-stamp ${inView ? 'is-in' : ''} ${className}`}>
      <InkStamp label={label} sub={sub} />
    </span>
  );
}

/**
 * Exhibit-tabbed sections. `items`: [{ id: 'A', label, content }]. Renders a brass tab rail of
 * "Exhibit A / Exhibit B …" and the selected panel — the same case-file device used on firm pages.
 */
export function Exhibits({ items, label = 'Exhibits' }) {
  const [tab, setTab] = useState(items[0]?.id);
  const active = items.find((i) => i.id === tab) ?? items[0];
  return (
    <div className="jx-exhibits">
      <div className="jx-tabs" role="tablist" aria-label={label}>
        {items.map((i) => (
          <button key={i.id} type="button" role="tab" aria-selected={tab === i.id} className={`jx-tab ${tab === i.id ? 'is-on' : ''}`} onClick={() => setTab(i.id)}>
            <span className="jx-tab-ex ed-smallcaps">Exhibit {i.id}</span>
            <span className="jx-tab-label">{i.label}</span>
          </button>
        ))}
      </div>
      <div className="jx-panel" role="tabpanel">{active?.content}</div>
    </div>
  );
}

/** A sealed/filed docket caption line: "§ No. 24 — <text>" in small caps. */
export function Docket({ children, no = '24' }) {
  return (
    <p className="jx-docket ed-smallcaps"><span aria-hidden="true">§ </span>No.&nbsp;{no} — {children}</p>
  );
}
