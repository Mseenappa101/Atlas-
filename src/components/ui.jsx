import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HIRES_LABELS } from '../lib/firms';

const STATUS_COLOR = { yes: 'text-status-yes', unknown: 'text-status-unknown', no: 'text-status-no' };

export function StatusMark({ value }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${STATUS_COLOR[value]}`}>
      <span aria-hidden="true" className="inline-block h-2 w-2 bg-current" />
      {HIRES_LABELS[value]}
    </span>
  );
}

export function Tag({ pressed, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-[44px] rounded-sm border px-3 text-xs transition-colors md:min-h-[32px] ${
        pressed
          ? 'border-accent text-accent'
          : 'border-rule text-ink hover:border-muted'
      }`}
    >
      {children}
    </button>
  );
}

export function ExternalLink({ href, children, className = '' }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`link whitespace-nowrap ${className}`}>
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

const BUTTON = {
  primary: 'bg-accent text-white hover:bg-accent-hover border border-accent hover:border-accent-hover',
  secondary: 'border border-muted text-ink hover:border-ink',
};

export function Button({ variant = 'primary', href, className = '', children, ...props }) {
  const cls = `inline-flex min-h-[44px] items-center justify-center rounded-sm px-5 text-sm font-medium transition-colors ${BUTTON[variant]} ${className}`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

// An in-app link that looks like a button.
export function LinkButton({ to, variant = 'primary', className = '', children }) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-sm px-5 text-sm font-medium transition-colors ${BUTTON[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="caps mb-1 block text-xs text-muted">
      {children}
    </label>
  );
}

const FIELD = 'block w-full min-h-[44px] rounded-sm border border-muted bg-surface px-3 text-sm text-ink placeholder:text-muted';

export function TextField({ label, className = '', id: given, ...props }) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <input id={id} className={FIELD} {...props} />
    </div>
  );
}

export function SelectField({ label, options, placeholder, className = '', ...props }) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={`${FIELD} appearance-none bg-[length:10px] bg-[right_12px_center] bg-no-repeat pr-8`} style={{ backgroundImage: CHEVRON }} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%235C5A55' stroke-width='1.2'/%3E%3C/svg%3E")`;

// Side panel on desktop, full-screen (or bottom) sheet on mobile.
// Traps focus, closes on Esc or backdrop click, returns focus to the opener.
export function Sheet({ open, onClose, label, variant = 'side', children }) {
  const panel = useRef(null);
  const opener = useRef(null);
  const [visible, setVisible] = useState(false);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const raf = requestAnimationFrame(() => setVisible(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector('[data-autofocus]')?.focus() ?? panel.current?.focus();

    function onKey(e) {
      if (e.key === 'Escape') close.current();
      if (e.key !== 'Tab') return;
      const nodes = panel.current.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!nodes.length) return;
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
      cancelAnimationFrame(raf);
      setVisible(false);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const side =
    'inset-0 md:inset-y-0 md:left-auto md:right-0 md:w-[480px] md:border-l md:border-rule ' +
    (visible ? 'md:translate-x-0' : 'md:translate-x-4');
  const bottom = 'inset-x-0 bottom-0 max-h-[85vh] border-t border-rule shadow-drawer ' + (visible ? 'translate-y-0' : 'translate-y-4');

  return (
    <div className="fixed inset-0 z-40">
      <div
        aria-hidden="true"
        onClick={() => close.current()}
        className={`absolute inset-0 bg-ink transition-opacity ${visible ? 'opacity-20' : 'opacity-0'}`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`absolute overflow-y-auto bg-surface transition ${visible ? 'opacity-100' : 'opacity-0'} ${variant === 'side' ? side : bottom}`}
      >
        {children}
      </div>
    </div>
  );
}

export function CloseButton({ onClick, label = 'Close' }) {
  return (
    <button
      type="button"
      data-autofocus
      onClick={onClick}
      className="caps -mr-2 min-h-[44px] px-2 text-xs text-muted hover:text-ink"
    >
      {label}
    </button>
  );
}
