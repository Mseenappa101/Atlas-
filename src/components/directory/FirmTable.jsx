import { formatWindow, isWindowPast } from '../../lib/firms';
import { StatusMark, ExternalLink } from '../ui';

const DASH = <span className="text-muted">—</span>;

const COLUMNS = [
  { key: 'firm', label: 'Firm', sortable: true, w: 'w-[25%]' },
  { key: 'city', label: 'City', sortable: true, w: 'w-[14%]' },
  { key: 'practice', label: 'Practice focus', w: 'w-[18%]' },
  { key: 'size', label: 'Size', w: 'w-[9%]' },
  { key: 'hires', label: 'Hires 1Ls', w: 'w-[10%]' },
  { key: 'window', label: 'Application window', sortable: true, w: 'w-[16%]' },
  { key: 'apply', label: 'Apply', w: 'w-[8%]', align: 'text-right' },
];

// Compact column set for narrow placements (landing preview).
const PREVIEW_COLUMNS = [
  { key: 'firm', label: 'Firm', w: 'w-[38%]' },
  { key: 'city', label: 'City', w: 'w-[24%]' },
  { key: 'hires', label: 'Hires 1Ls', w: 'w-[16%]' },
  { key: 'window', label: 'Window', w: 'w-[22%]' },
];

const CELL = 'border-b border-rule px-3 py-2.5 align-baseline first:pl-0 last:pr-0';

const CELLS = {
  city: (f) => <td key="city" className={CELL}>{f.place}</td>,
  practice: (f) => (
    <td key="practice" className={`${CELL} text-muted`}>
      {f.practice.length ? f.practice.join(', ') : DASH}
    </td>
  ),
  size: (f) => (
    <td key="size" className={`${CELL} nums whitespace-nowrap font-mono text-xs`}>
      {f.size ?? DASH}
    </td>
  ),
  hires: (f) => (
    <td key="hires" className={`${CELL} text-xs`}>
      <StatusMark value={f.hires} />
    </td>
  ),
  window: (f) => (
    <td key="window" className={CELL}>
      <Window firm={f} />
    </td>
  ),
  apply: (f) => (
    <td key="apply" className={`${CELL} text-right`} onClick={(e) => e.stopPropagation()}>
      <ApplyLink firm={f} />
    </td>
  ),
};

function ApplyLink({ firm, className }) {
  if (firm.applyUrl) return <ExternalLink href={firm.applyUrl} className={className}>Apply</ExternalLink>;
  if (firm.careersUrl) return <ExternalLink href={firm.careersUrl} className={className}>Careers</ExternalLink>;
  return DASH;
}

function Window({ firm }) {
  const w = formatWindow(firm);
  if (!w) return DASH;
  if (isWindowPast(firm)) return <span className="nums font-mono text-xs text-muted">Closed {w.replace(/^Until /, '')}</span>;
  return <span className="nums font-mono text-xs">{w}</span>;
}

function SortHeader({ col, sort, onSort }) {
  const sortable = col.sortable && sort;
  const active = sortable && sort.key === col.key;
  const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined;
  return (
    <th
      scope="col"
      aria-sort={sortable ? ariaSort ?? 'none' : undefined}
      className={`caps sticky top-0 z-10 border-b border-ink bg-paper px-3 py-2 text-left text-xs font-medium text-muted first:pl-0 last:pr-0 ${col.w} ${col.align ?? ''}`}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort(col.key)}
          className={`caps inline-flex items-center gap-1 whitespace-nowrap hover:text-ink ${active ? 'text-ink' : ''}`}
        >
          {col.label}
          <span aria-hidden="true" className="w-2 font-sans">
            {active ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
          </span>
        </button>
      ) : (
        col.label
      )}
    </th>
  );
}

function Row({ firm, onOpen, columns, inert }) {
  if (inert) {
    // Teaser rows behind the email gate: visible but not readable or reachable.
    return (
      <tr aria-hidden="true" inert className="select-none blur-[3px]">
        <th scope="row" className={`${CELL} text-left font-serif text-base font-normal`}>{firm.name}</th>
        {columns.slice(1).map((c) => CELLS[c.key](firm))}
      </tr>
    );
  }
  return (
    <tr onClick={() => onOpen(firm)} className="cursor-pointer transition-colors hover:bg-surface">
      <th scope="row" className={`${CELL} text-left font-normal`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(firm);
          }}
          className="text-left font-serif text-base leading-snug hover:text-accent"
        >
          {firm.name}
        </button>
      </th>
      {columns.slice(1).map((c) => CELLS[c.key](firm))}
    </tr>
  );
}

function GroupHead({ index, place, count, span }) {
  return (
    <tr>
      <th colSpan={span} scope="rowgroup" className="border-b border-rule px-0 pb-2 pt-8 text-left font-normal">
        <span className="font-serif text-lg">
          <span className="nums font-mono text-sm text-muted">{String(index + 1).padStart(2, '0')}</span> — {place}
        </span>
        <span className="nums ml-3 font-mono text-xs text-muted">{count} firms</span>
      </th>
    </tr>
  );
}

function MobileEntry({ firm, onOpen, inert }) {
  if (inert) {
    return (
      <li aria-hidden="true" inert className="select-none border-b border-rule py-3 blur-[3px]">
        <span className="block font-serif text-base">{firm.name}</span>
        <span className="block text-xs text-muted">{firm.place}</span>
      </li>
    );
  }
  return (
    <li className="border-b border-rule py-3">
      <button type="button" onClick={() => onOpen(firm)} className="block min-h-[44px] w-full text-left">
        <span className="block font-serif text-base leading-snug">{firm.name}</span>
        <span className="block text-xs text-muted">{[firm.place, firm.typeLabel].filter(Boolean).join(' · ')}</span>
      </button>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-3">
          <StatusMark value={firm.hires} />
          <Window firm={firm} />
        </span>
        <ApplyLink firm={firm} className="inline-flex min-h-[44px] items-center md:min-h-0" />
      </div>
    </li>
  );
}

// `groups`: [{ city, place, firms }] for the by-market view; otherwise pass `firms`.
// `inertFrom`: rows at or after this index render blurred and unreachable (landing teaser).
export default function FirmTable({ firms, groups, sort, onSort, onOpen, variant = 'full', inertFrom = Infinity, caption = 'Law firms' }) {
  const columns = variant === 'preview' ? PREVIEW_COLUMNS : COLUMNS;
  const sections = groups ?? [{ city: null, firms }];
  return (
    <>
      <table className="hidden w-full table-fixed border-separate border-spacing-0 text-sm md:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <SortHeader key={col.key} col={col} sort={sort} onSort={onSort} />
            ))}
          </tr>
        </thead>
        {sections.map((g, i) => (
          <tbody key={g.city ?? 'all'}>
            {g.city && <GroupHead index={i} place={g.place} count={g.firms.length} span={columns.length} />}
            {g.firms.map((f, j) => (
              <Row key={f.id} firm={f} onOpen={onOpen} columns={columns} inert={j >= inertFrom} />
            ))}
          </tbody>
        ))}
      </table>

      <div className="md:hidden">
        {sections.map((g, i) => (
          <section key={g.city ?? 'all'} aria-label={g.place ?? undefined}>
            {g.city && (
              <h2 className="border-b border-rule pb-2 pt-6 text-lg">
                <span className="nums font-mono text-sm text-muted">{String(i + 1).padStart(2, '0')}</span> — {g.place}
              </h2>
            )}
            <ul>
              {g.firms.map((f, j) => (
                <MobileEntry key={f.id} firm={f} onOpen={onOpen} inert={j >= inertFrom} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

export function TablePlaceholder({ rows = 6 }) {
  return (
    <div role="status" aria-label="Loading firms">
      <div className="h-9 border-b border-ink" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-11 border-b border-rule" />
      ))}
    </div>
  );
}
