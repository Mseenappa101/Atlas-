import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';

const BTN = {
  primary: 'bg-brand text-white hover:bg-brand-hover border border-brand hover:border-brand-hover',
  secondary: 'bg-card text-fg border border-line hover:border-fg-2',
  ghost: 'text-fg hover:bg-brand-tint border border-transparent',
};
const SIZE = {
  md: 'min-h-[44px] md:min-h-[40px] px-4 text-t14',
  sm: 'min-h-[44px] md:min-h-[32px] px-3 text-t14',
};

function btnClass(variant, size, className) {
  return `inline-flex items-center justify-center gap-2 rounded-app font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${SIZE[size]} ${className}`;
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, className = '', children, ...props }) {
  return (
    <button type="button" className={btnClass(variant, size, className)} {...props}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}

// Same look, for navigation. External links open in a new tab and say so.
export function ButtonLink({ to, href, variant = 'primary', size = 'md', icon: Icon, className = '', children }) {
  const cls = btnClass(variant, size, className);
  const inner = (
    <>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  );
}

export function IconButton({ label, icon, pressed, className = '', ...props }) {
  const Icon = icon;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-app text-fg-2 transition-colors duration-150 hover:bg-brand-tint hover:text-fg md:h-9 md:w-9 ${className}`}
      {...props}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

export function FieldLabel({ htmlFor, children, optional }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-t14 font-medium text-fg">
      {children}
      {optional && <span className="font-normal text-fg-2"> (optional)</span>}
    </label>
  );
}

const FIELD = 'block w-full min-h-[44px] md:min-h-[40px] rounded-app border border-line bg-card px-3 text-t14 text-fg placeholder:text-fg-2 transition-colors duration-150 hover:border-fg-2';

export function Input({ label, optional, icon: Icon, className = '', id: given, ...props }) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <div className={className}>
      {label && (
        <FieldLabel htmlFor={id} optional={optional}>
          {label}
        </FieldLabel>
      )}
      <div className="relative">
        {Icon && <Icon size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-2" />}
        <input id={id} className={`${FIELD} ${Icon ? 'pl-9' : ''}`} {...props} />
      </div>
    </div>
  );
}

export function Select({ label, optional, options, placeholder, className = '', id: given, ...props }) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <div className={className}>
      {label && (
        <FieldLabel htmlFor={id} optional={optional}>
          {label}
        </FieldLabel>
      )}
      <div className="relative">
        <select id={id} className={`${FIELD} appearance-none pr-9`} {...props}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value ?? o} value={o.value ?? o}>
              {o.label ?? o}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-2" />
      </div>
    </div>
  );
}

// Pill-shaped: toggles (aria-pressed) or applied filters with a remove button.
export function FilterChip({ selected, onClick, onRemove, children }) {
  if (onRemove) {
    return (
      <span className="inline-flex min-h-[44px] items-center gap-1 rounded-pill border border-brand bg-brand-tint pl-3 pr-1 text-t14 text-brand md:min-h-[32px]">
        {children}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove filter: ${typeof children === 'string' ? children : ''}`}
          className="inline-flex h-11 w-11 items-center justify-center rounded-pill hover:bg-card md:h-6 md:w-6"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center rounded-pill border px-3 text-t14 transition-colors duration-150 md:min-h-[32px] ${
        selected ? 'border-brand bg-brand-tint text-brand' : 'border-line bg-card text-fg hover:border-fg-2'
      }`}
    >
      {children}
    </button>
  );
}

// Segmented control (e.g. Table / Board). Uses radio semantics.
export function Segmented({ label, value, onChange, options }) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-app border border-line bg-card p-0.5">
      {options.map((o) => (
        <label
          key={o.value}
          className={`inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-app px-3 text-t14 transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand md:min-h-[32px] ${
            value === o.value ? 'bg-brand text-white' : 'text-fg-2 hover:text-fg'
          }`}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          {o.icon && <o.icon size={16} aria-hidden="true" />}
          {o.label}
        </label>
      ))}
    </div>
  );
}

// Underline tabs for switching sections of a page.
export function Tabs({ label, value, onChange, tabs }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-6 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`-mb-px min-h-[44px] border-b-2 text-t14 font-medium transition-colors duration-150 ${
            value === t.value ? 'border-brand text-fg' : 'border-transparent text-fg-2 hover:text-fg'
          }`}
        >
          {t.label}
          {t.count != null && <span className="data ml-1.5 text-t12 text-fg-2">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
