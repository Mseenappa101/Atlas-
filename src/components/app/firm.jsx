import { useId } from 'react';
import { Bookmark } from 'lucide-react';
import { monogram, officesLabel } from '../../lib/format';

const TILE = { sm: 'h-8 w-8 text-t12', md: 'h-10 w-10 text-t14', lg: 'h-14 w-14 text-t20' };

export function MonogramTile({ name, size = 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-app border border-line bg-[#ECEFEC] font-semibold tracking-wide text-brand ${TILE[size]}`}
    >
      {monogram(name)}
    </span>
  );
}

const PILL = {
  open: 'bg-st-open-bg text-st-open-text',
  rolling: 'bg-st-open-bg text-st-open-text',
  soon: 'bg-st-soon-bg text-st-soon-text',
  upcoming: 'bg-st-unknown-bg text-st-unknown',
  closed: 'bg-st-closed-bg text-st-closed-text',
  unknown: 'bg-st-unknown-bg text-st-unknown',
};
const DOT = {
  open: 'bg-st-open',
  rolling: 'bg-st-open',
  soon: 'bg-st-soon',
  upcoming: 'bg-st-unknown',
  closed: 'bg-st-closed',
  unknown: 'bg-st-unknown',
};

// status: { kind, label } from lib/status. The label always carries the meaning.
export function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-0.5 text-t12 font-medium ${PILL[status.kind]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-pill ${DOT[status.kind]}`} />
      {status.label}
    </span>
  );
}

export function BookmarkToggle({ saved, onToggle, firmName, inList = false }) {
  return (
    <button
      type="button"
      tabIndex={inList ? -1 : undefined}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${firmName} from My List` : `Save ${firmName} to My List`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-app transition-colors duration-150 hover:bg-brand-tint md:h-9 md:w-9 ${
        saved ? 'text-brand' : 'text-fg-2 hover:text-fg'
      }`}
    >
      <Bookmark size={18} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}

// firm: { id, name, typeLabel, offices, status }. Rendered as an option in a listbox.
export function FirmRow({ firm, selected, saved, onSelect, onToggleSave, id }) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      onClick={() => onSelect?.(firm)}
      className={`group flex min-h-[72px] cursor-pointer items-center gap-3 border-b border-l-[3px] border-b-line px-4 py-3 transition-colors duration-150 ${
        selected ? 'border-l-brand bg-card' : 'border-l-transparent hover:bg-card'
      }`}
    >
      <MonogramTile name={firm.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-t16 font-semibold leading-tight text-fg">{firm.name}</p>
        <p className="truncate text-t14 text-fg-2">{[firm.typeLabel, officesLabel(firm.offices)].filter(Boolean).join(' · ')}</p>
        <div className="mt-1">
          <StatusPill status={firm.status} />
        </div>
      </div>
      {onToggleSave && <BookmarkToggle inList saved={saved} onToggle={() => onToggleSave(firm)} firmName={firm.name} />}
    </div>
  );
}

// Compact card for collections and "Similar firms".
export function FirmCard({ firm, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(firm)}
      className="flex w-full min-w-0 flex-col items-start gap-3 rounded-app border border-line bg-card p-4 text-left transition-colors duration-150 hover:border-fg-2"
    >
      <span className="flex w-full min-w-0 items-center gap-3">
        <MonogramTile name={firm.name} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-t14 font-semibold text-fg">{firm.name}</span>
          <span className="block truncate text-t12 text-fg-2">{[firm.typeLabel, officesLabel(firm.offices, 1)].filter(Boolean).join(' · ')}</span>
        </span>
      </span>
      <StatusPill status={firm.status} />
    </button>
  );
}

// Keyboard: the list is one tab stop. Up/Down move the selection (the detail panel follows),
// Home/End jump, Enter opens the full detail (mobile page), S saves the selected firm.
export function FirmList({ firms, selectedId, onSelect, onOpen, savedIds, onToggleSave, label }) {
  const base = useId();
  const index = firms.findIndex((f) => f.id === selectedId);
  const optionId = (f) => `${base}-${f.id}`;

  function onKeyDown(e) {
    const move = (i) => {
      const f = firms[Math.max(0, Math.min(firms.length - 1, i))];
      if (!f) return;
      e.preventDefault();
      onSelect(f);
      document.getElementById(optionId(f))?.scrollIntoView({ block: 'nearest' });
    };
    if (e.key === 'ArrowDown') move(index + 1);
    else if (e.key === 'ArrowUp') move(index < 0 ? 0 : index - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(firms.length - 1);
    else if (e.key === 'Enter' && index >= 0) {
      e.preventDefault();
      onOpen?.(firms[index]);
    } else if ((e.key === 's' || e.key === 'S') && index >= 0 && onToggleSave) {
      e.preventDefault();
      onToggleSave(firms[index]);
    }
  }

  return (
    <div
      role="listbox"
      aria-label={label}
      tabIndex={0}
      aria-activedescendant={index >= 0 ? optionId(firms[index]) : undefined}
      onKeyDown={onKeyDown}
      className="outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
    >
      {firms.map((f) => (
        <FirmRow
          key={f.id}
          id={optionId(f)}
          firm={f}
          selected={f.id === selectedId}
          saved={savedIds?.has(f.id)}
          onSelect={onSelect}
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  );
}

// Same look as FirmRow, as a plain button: for short lists outside a listbox (landing, SEO pages).
export function FirmButtonRow({ firm, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(firm)}
      className="flex min-h-[72px] w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-canvas"
    >
      <MonogramTile name={firm.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-t16 font-semibold leading-tight text-fg">{firm.name}</span>
        <span className="block truncate text-t14 text-fg-2">{[firm.typeLabel, officesLabel(firm.offices)].filter(Boolean).join(' · ')}</span>
        <span className="mt-1 block">
          <StatusPill status={firm.status} />
        </span>
      </span>
    </button>
  );
}
