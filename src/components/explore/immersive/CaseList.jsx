import { StatusPill } from '../../app/firm';
import { officesLabel } from '../../../lib/format';
import { ROLE_LABEL } from '../../../lib/roles';

/**
 * The firm list as a stack of case-file cards in the drawer. Each card shows the docketed fields
 * (name, type · offices, status, who it hires for); clicking opens the full case file. Real data,
 * full gating — locked firms still show name + type (as the legacy list does).
 *
 * `groups` ([{ group, firms }]) switches on the legacy group-by-type sectioning used in a state view:
 * the docket is divided into themed registers (Boutiques, Plaintiff firms, … BigLaw last).
 */
function Card({ firm, letter, onOpen, savedIds, onToggleSave }) {
  const roles = firm.hiresFor.map((r) => ROLE_LABEL[r] ?? r);
  return (
    <li className="cl__item" style={{ '--i': letter }}>
      <button type="button" className="cl__card" onClick={() => onOpen(firm)}>
        <span className="cl__ex ed-smallcaps">Exhibit {String.fromCharCode(65 + (letter % 26))}</span>
        <span className="cl__name">{firm.name}</span>
        <span className="cl__meta">{[firm.typeLabel, officesLabel(firm.offices, 2)].filter(Boolean).join(' · ')}</span>
        <span className="cl__row">
          <StatusPill status={firm.status} />
          {roles.length > 0 && <span className="cl__roles">{roles.slice(0, 2).join(' · ')}</span>}
        </span>
      </button>
      {onToggleSave && (
        <button type="button" className="cl__save" aria-pressed={savedIds?.has(firm.id)} aria-label={savedIds?.has(firm.id) ? `Saved ${firm.name}` : `Save ${firm.name}`} onClick={() => onToggleSave(firm)}>
          {savedIds?.has(firm.id) ? '★' : '☆'}
        </button>
      )}
    </li>
  );
}

export default function CaseList({ firms, groups, onOpen, savedIds, onToggleSave, emptyLabel = 'No firms on this docket.' }) {
  if (!firms.length) return <p className="cl__empty">{emptyLabel}</p>;

  if (groups?.length) {
    let i = 0;
    return (
      <div className="cl-groups" aria-label="Firms by register">
        {groups.map(({ group, firms: list }) => (
          <section key={group} className="cl-group">
            <h3 className="cl-group__h ed-smallcaps">{group}<span className="cl-group__n">{list.length}</span></h3>
            <ul className="cl">
              {list.map((f) => <Card key={f.id} firm={f} letter={i++} onOpen={onOpen} savedIds={savedIds} onToggleSave={onToggleSave} />)}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <ul className="cl" aria-label="Firms">
      {firms.map((f, i) => <Card key={f.id} firm={f} letter={i} onOpen={onOpen} savedIds={savedIds} onToggleSave={onToggleSave} />)}
    </ul>
  );
}
