import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Esc to close, Tab stays inside, focus returns to the opener.
function useDialog(open, panel, onClose) {
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (panel.current?.querySelector('[data-autofocus]') ?? panel.current)?.focus();
    function onKey(e) {
      if (e.key === 'Escape') close.current();
      if (e.key !== 'Tab') return;
      const nodes = panel.current?.querySelectorAll(FOCUSABLE);
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, [open, panel]);
}

function Header({ title, onClose }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
      <h2 className="text-t16 font-semibold">{title}</h2>
      <button
        type="button"
        data-autofocus
        onClick={onClose}
        aria-label="Close"
        className="inline-flex h-11 w-11 items-center justify-center rounded-app text-fg-2 hover:bg-brand-tint hover:text-fg md:h-9 md:w-9"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

// Right-side panel (desktop).
export function Drawer({ open, onClose, title, children, footer }) {
  const panel = useRef(null);
  useDialog(open, panel, onClose);
  if (!open) return null;
  return (
    <div className="app fixed inset-0 z-40">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-[rgba(20,24,31,0.2)]" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-card shadow-pop">
        <Header title={title} onClose={onClose} />
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="border-t border-line p-4">{footer}</div>}
      </div>
    </div>
  );
}

// Bottom sheet (mobile). `footer` stays pinned, e.g. "Show 86 firms".
export function BottomSheet({ open, onClose, title, children, footer }) {
  const panel = useRef(null);
  useDialog(open, panel, onClose);
  if (!open) return null;
  return (
    <div className="app fixed inset-0 z-40">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-[rgba(20,24,31,0.2)]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[12px] bg-card shadow-pop"
      >
        <Header title={title} onClose={onClose} />
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="border-t border-line p-4">{footer}</div>}
      </div>
    </div>
  );
}

// Filter dropdown: a button that opens a checkbox list. Multi-select.
export function FilterMenu({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const id = useId();
  const count = value.length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !root.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        root.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-app border px-3 text-t14 transition-colors duration-150 md:min-h-[36px] ${
          count ? 'border-brand bg-brand-tint text-brand' : 'border-line bg-card text-fg hover:border-fg-2'
        }`}
      >
        {label}
        {count > 0 && <span className="data rounded-pill bg-brand px-1.5 text-t12 text-white">{count}</span>}
        <ChevronDown size={16} aria-hidden="true" className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <fieldset id={id} className="absolute left-0 top-full z-30 mt-1 max-h-80 min-w-[220px] overflow-y-auto rounded-app border border-line bg-card p-1 shadow-pop">
          <legend className="sr-only">{label}</legend>
          {options.map((o) => (
            <label key={o.value} className="flex min-h-[40px] cursor-pointer items-center gap-2.5 rounded-[4px] px-2.5 text-t14 hover:bg-canvas">
              <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} className="h-4 w-4 accent-[var(--app-brand)]" />
              <span className="flex-1">{o.label}</span>
              {o.count != null && <span className="data text-t12 text-fg-2">{o.count}</span>}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
