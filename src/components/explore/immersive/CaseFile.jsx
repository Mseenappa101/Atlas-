import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusPill } from '../../app/firm';
import { officesLabel } from '../../../lib/format';
import { downloadIcs } from '../../../lib/ics';
import { site } from '../../../lib/site';
import { postingTypeLabel } from '../../../lib/listings';
import { portalUrl } from '../../../lib/application';
import { ROLE_LABEL } from '../../../lib/roles';
import InkStamp from '../../edition/InkStamp';
import UnlockForm from '../../UnlockForm';

const NP = <span className="cf-np">Not on the record</span>;
const fmt = (d, year = false) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) });
function windowText(o) {
  if (o.start && o.end) return `${fmt(o.start)} – ${fmt(o.end, true)}`;
  if (o.end) return `Until ${fmt(o.end, true)}`;
  if (o.start) return `From ${fmt(o.start, true)}`;
  return null;
}
function accepting(status) {
  if (status.kind === 'rolling') return 'Rolling';
  if (status.kind === 'unknown') return null;
  return status.label;
}
const readerNotes = (notes) => (notes && !/\b(page|website|site)\b/i.test(notes) ? notes : null);

function Stat({ label, children }) {
  return (<div className="cf-stat"><dt>{label}</dt><dd>{children}</dd></div>);
}

/**
 * A firm as a case file, in the immersive scene: exhibit tabs, sealed gated fields, and an
 * ADMITTED stamp once the record is unlocked. Reuses the real firm data + helpers (full parity
 * with the legacy FirmDetail — every field, link and gating rule).
 */
export default function CaseFile({ firm, listings = [], saved, onToggleSave }) {
  const [tab, setTab] = useState('A');
  const offices = firm.offices;
  const withProgram = offices.filter((o) => o.hires === 'yes' || o.hiresFor.length).map((o) => o.city);
  const hiresFor = firm.hiresFor.map((r) => ROLE_LABEL[r] ?? r);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const deadlineOffice = offices.find((o) => o.end && o.end >= today) ?? offices.find((o) => o.start && o.start >= today);
  const deadline = deadlineOffice ? (deadlineOffice.end && deadlineOffice.end >= today ? deadlineOffice.end : deadlineOffice.start) : null;
  const windowOffice = deadlineOffice ?? offices.find((o) => o.start || o.end);
  const differs = offices.length > 1 && new Set(offices.map((o) => `${windowText(o)}|${o.applyUrl}`)).size > 1;
  const notes = readerNotes(firm.notes);
  const portal = portalUrl(firm);

  const TABS = [
    { id: 'A', label: 'At a glance' },
    { id: 'B', label: 'Windows & offices' },
    { id: 'C', label: `Positions${listings.length ? ` (${listings.length})` : ''}` },
  ];

  return (
    <article className="cf">
      <header className="cf__head">
        <p className="cf__docket ed-smallcaps">No. 24 · {firm.states?.[0] ?? offices[0]?.state ?? '—'}</p>
        <h2 className="cf__name">{firm.name}</h2>
        <p className="cf__sub">{[firm.typeLabel, officesLabel(offices, 3)].filter(Boolean).join(' · ')}</p>
        <div className="cf__status"><StatusPill status={firm.status} /></div>
        {!firm.locked && <InkStamp label="On Record" sub="Firmward · admitted" className="cf__stamp" />}
      </header>

      <div className="cf__actions">
        <Link to={`/apply/${firm.slug}`} className="cf__btn cf__btn--primary">{saved ? 'Open my application' : 'Start application'}</Link>
        <button type="button" className="cf__btn" aria-pressed={saved} onClick={() => onToggleSave(firm)}>{saved ? 'Saved to My List' : 'Add to My List'}</button>
        <Link to={`/letters/new?firm=${firm.id}`} className="cf__btn">Write cover letter</Link>
        {portal && <a href={portal} target="_blank" rel="noopener noreferrer" className="cf__btn">{firm.applyUrl && !/^mailto:/i.test(firm.applyUrl) ? 'Firm’s application ↗' : 'Careers page ↗'}</a>}
      </div>

      {firm.locked ? (
        <div className="cf__sealed">
          <dl className="cf__stats">
            <Stat label="Firm type">{firm.typeLabel ?? NP}</Stat>
            <Stat label="Size">{firm.size ?? NP}</Stat>
            <Stat label="Offices">{officesLabel(offices, 4) || NP}</Stat>
          </dl>
          <div className="cf__seal">
            <p className="cf__seal-ex ed-smallcaps">Exhibit · Under seal</p>
            <UnlockForm title={`See how to apply to ${firm.name}`} blurb="Who they hire for (1L, 2L, post-grad), windows, how to apply, the recruiting contact and open positions. Free with your email." source={`/firms/${firm.slug}`} />
          </div>
        </div>
      ) : (
        <>
          <div className="cf__tabs" role="tablist" aria-label="Exhibits">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={`cf__tab${tab === t.id ? ' is-on' : ''}`} onClick={() => setTab(t.id)}>
                <span className="cf__tab-ex ed-smallcaps">Exhibit {t.id}</span>{t.label}
              </button>
            ))}
          </div>

          {tab === 'A' && (
            <dl className="cf__stats">
              <Stat label="Hires for">{hiresFor.length ? hiresFor.join(', ') : NP}</Stat>
              <Stat label="Application window">{(windowOffice && windowText(windowOffice)) || NP}</Stat>
              <Stat label="Accepting">{accepting(firm.status) ?? NP}</Stat>
              <Stat label="Split summers">{firm.splitSummers == null ? NP : firm.splitSummers ? 'Allowed' : 'Not allowed'}</Stat>
              <Stat label="Program length">{firm.programWeeks ? `${firm.programWeeks} weeks` : NP}</Stat>
              <Stat label="Offices with a program">{withProgram.length ? withProgram.join(', ') : NP}</Stat>
              {firm.recruitingEmail && <div className="cf-stat cf-stat--wide"><dt>Recruiting contact</dt><dd><a href={`mailto:${firm.recruitingEmail}`}>{firm.recruitingEmail}</a></dd></div>}
              {firm.practice?.length > 0 && <div className="cf-stat cf-stat--wide"><dt>Practice focus</dt><dd>{firm.practice.join(', ')}</dd></div>}
              {(notes || firm.fellowship) && <div className="cf-stat cf-stat--wide"><dt>Notes</dt><dd>{firm.fellowship ? `Fellowship: ${firm.fellowship}. ` : ''}{notes}</dd></div>}
            </dl>
          )}

          {tab === 'B' && (
            <div className="cf__windows">
              {deadline && (
                <div className="cf__deadline">
                  <p>{deadline === deadlineOffice.end ? 'Deadline' : 'Opens'} <span className="data">{fmt(deadline, true)}</span>{offices.length > 1 && <span className="cf-np"> · {deadlineOffice.city}</span>}</p>
                  <button type="button" className="cf__btn" onClick={() => downloadIcs({ title: `${firm.name}: application ${deadline === deadlineOffice.end ? 'deadline' : 'opens'}`, date: deadline, url: firm.applyUrl ?? firm.careersUrl ?? '', description: 'From Firmward. Check the firm’s page for the current deadline.' })}>Add to calendar</button>
                </div>
              )}
              <ul className="cf__offices">
                {offices.map((o) => (
                  <li key={o.id}>
                    <span className="cf__office-city">{o.city}, {o.state}</span>
                    <span className="cf__office-right">
                      {differs && <StatusPill status={o.status} />}
                      {(o.applyUrl || o.careersUrl) && <a href={o.applyUrl ?? o.careersUrl} target="_blank" rel="noopener noreferrer">{o.applyUrl ? 'Apply' : 'Careers'} ↗</a>}
                    </span>
                  </li>
                ))}
              </ul>
              {firm.careersUrl && <p className="cf__careers"><a href={firm.careersUrl} target="_blank" rel="noopener noreferrer">Recruiting page ↗</a></p>}
            </div>
          )}

          {tab === 'C' && (
            listings.length ? (
              <ul className="cf__listings">
                {listings.map((l) => (
                  <li key={l.id}>
                    <span className="cf__listing-main"><span className="cf__listing-title">{l.title}</span><span className="cf__listing-meta">{[l.yearsLabel, postingTypeLabel(l.type), l.place].filter(Boolean).join(' · ')}</span></span>
                    <span className="cf__listing-links">
                      <Link to={`/letters/new?listing=${l.id}`}>Letter</Link>
                      {l.applyUrl && <a href={l.applyUrl} target="_blank" rel="noopener noreferrer">Apply ↗</a>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="cf-np cf__empty">No open positions on the docket right now.</p>
          )}
        </>
      )}
      {site.correctionsEmail && <a className="cf__report" href={`mailto:${site.correctionsEmail}?subject=${encodeURIComponent(`Outdated info: ${firm.name}`)}`}>Report outdated info</a>}
    </article>
  );
}
