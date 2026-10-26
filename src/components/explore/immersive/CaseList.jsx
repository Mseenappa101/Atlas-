import { StatusPill } from '../../app/firm';
import { officesLabel } from '../../../lib/format';
import { ROLE_LABEL } from '../../../lib/roles';

/**
 * The firm list as a stack of case-file cards in the drawer. Each card shows the docketed fields
 * (name, type · offices, status, who it hires for); clicking opens the full case file. Real data,
 * full gating — locked firms still show name + type (as the legacy list does).
 */
export default function CaseList({ firms, onOpen, savedIds, onToggleSave, emptyLabel = 'No firms on this docket.' }) {
  if (!firms.length) return <p className="cl__empty">{emptyLabel}</p>;
  return (
    <ul className="cl" aria-label="Firms">
      {firms.map((f, i) => {
        const roles = f.hiresFor.map((r) => ROLE_LABEL[r] ?? r);
        return (
          <li key={f.id} className="cl__item" style={{ '--i': i }}>
            <button type="button" className="cl__card" onClick={() => onOpen(f)}>
              <span className="cl__ex ed-smallcaps">Exhibit {String.fromCharCode(65 + (i % 26))}</span>
              <span className="cl__name">{f.name}</span>
              <span className="cl__meta">{[f.typeLabel, officesLabel(f.offices, 2)].filter(Boolean).join(' · ')}</span>
              <span className="cl__row">
                <StatusPill status={f.status} />
                {roles.length > 0 && <span className="cl__roles">{roles.slice(0, 2).join(' · ')}</span>}
              </span>
            </button>
            {onToggleSave && (
              <button type="button" className="cl__save" aria-pressed={savedIds?.has(f.id)} aria-label={savedIds?.has(f.id) ? `Saved ${f.name}` : `Save ${f.name}`} onClick={() => onToggleSave(f)}>
                {savedIds?.has(f.id) ? '★' : '☆'}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
