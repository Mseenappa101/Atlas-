import { Link } from 'react-router-dom';
import { Bookmark, CalendarPlus, ExternalLink, PenLine, Send } from 'lucide-react';
import { Button, ButtonLink } from '../app/controls';
import { FirmCard, MonogramTile, StatusPill } from '../app/firm';
import { officesLabel } from '../../lib/format';
import { downloadIcs } from '../../lib/ics';
import { site } from '../../lib/site';
import { postingTypeLabel } from '../../lib/listings';
import { portalUrl } from '../../lib/application';
import { ROLE_LABEL } from '../../lib/roles';
import UnlockForm from '../UnlockForm';

const NP = <span className="text-fg-2">Not published</span>;
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

// Scraper notes that describe the page itself ("This careers page...") aren't useful to a student.
function readerNotes(notes) {
  return notes && !/\b(page|website|site)\b/i.test(notes) ? notes : null;
}

function Stat({ label, children }) {
  return (
    <div className="rounded-app border border-line bg-card p-3">
      <dt className="text-t12 text-fg-2">{label}</dt>
      <dd className="mt-1 text-t14 font-medium text-fg">{children}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-t14 font-semibold text-fg">{title}</h3>
      {children}
    </section>
  );
}

export default function FirmDetail({ firm, listings = [], similar = [], saved, onToggleSave, onOpenFirm, headingLevel = 'h2' }) {
  const Heading = headingLevel;
  const offices = firm.offices;
  const withProgram = offices.filter((o) => o.hires === 'yes' || o.hiresFor.length).map((o) => o.city);
  const hiresFor = firm.hiresFor.map((r) => ROLE_LABEL[r] ?? r);
  // Only future dates get a calendar row.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineOffice = offices.find((o) => o.end && o.end >= today) ?? offices.find((o) => o.start && o.start >= today);
  const deadline = deadlineOffice ? (deadlineOffice.end && deadlineOffice.end >= today ? deadlineOffice.end : deadlineOffice.start) : null;
  const windowOffice = deadlineOffice ?? offices.find((o) => o.start || o.end);
  const differs = offices.length > 1 && new Set(offices.map((o) => `${windowText(o)}|${o.applyUrl}`)).size > 1;
  const notes = readerNotes(firm.notes);
  const portal = portalUrl(firm);
  const report = site.correctionsEmail
    ? `mailto:${site.correctionsEmail}?subject=${encodeURIComponent(`Outdated info: ${firm.name}`)}`
    : null;

  return (
    <article className="pb-8">
      <header className="flex items-start gap-4">
        <MonogramTile name={firm.name} size="lg" />
        <div className="min-w-0 flex-1">
          <Heading className="text-t24 font-bold leading-tight tracking-tight">{firm.name}</Heading>
          <p className="mt-0.5 text-t14 text-fg-2">{[firm.typeLabel, officesLabel(offices, 3)].filter(Boolean).join(' · ')}</p>
          <div className="mt-2">
            <StatusPill status={firm.status} />
          </div>
        </div>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        <ButtonLink to={`/apply/${firm.slug}`} icon={Send}>
          {saved ? 'Open my application' : 'Start application'}
        </ButtonLink>
        <Button variant="secondary" icon={Bookmark} aria-pressed={saved} onClick={() => onToggleSave(firm)}>
          {saved ? 'Saved to My List' : 'Add to My List'}
        </Button>
        <ButtonLink to={`/letters/new?firm=${firm.id}`} variant="secondary" icon={PenLine}>
          Write cover letter
        </ButtonLink>
        {portal && (
          <ButtonLink href={portal} variant="ghost" icon={ExternalLink}>
            {firm.applyUrl && !/^mailto:/i.test(firm.applyUrl) ? 'Firm’s application' : 'Careers page'}
          </ButtonLink>
        )}
      </div>


      {firm.locked ? (
        <>
          <Section title="At a glance">
            <dl className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              <Stat label="Firm type">{firm.typeLabel ?? NP}</Stat>
              <Stat label="Size">{firm.size ?? NP}</Stat>
              <Stat label="Offices">{officesLabel(offices, 4) || NP}</Stat>
            </dl>
          </Section>
          <div className="mt-6">
            <UnlockForm
              title={`See how to apply to ${firm.name}`}
              blurb="Who they hire for (1L summer, 2L summer, post-grad), application windows, how to apply, the recruiting contact and open positions. Free with your email."
              source={`/firms/${firm.slug}`}
            />
          </div>
        </>
      ) : (
      <Section title="Hiring at a glance">
        <dl className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <Stat label="Hires for">{hiresFor.length ? hiresFor.join(', ') : NP}</Stat>
          <Stat label="Application window">{(windowOffice && windowText(windowOffice)) || NP}</Stat>
          <Stat label="Accepting applications">{accepting(firm.status) ?? NP}</Stat>
          <Stat label="Split summers">{firm.splitSummers == null ? NP : firm.splitSummers ? 'Allowed' : 'Not allowed'}</Stat>
          <Stat label="Program length">{firm.programWeeks ? `${firm.programWeeks} weeks` : NP}</Stat>
          <Stat label="Offices with a program">{withProgram.length ? withProgram.join(', ') : NP}</Stat>
        </dl>
        {firm.recruitingEmail && <p className="mt-2 text-t14 text-fg-2">Recruiting contact: <a href={`mailto:${firm.recruitingEmail}`} className="text-brand hover:underline">{firm.recruitingEmail}</a></p>}
      </Section>
      )}

      {deadline && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-app border border-line bg-card px-3 py-2">
          <p className="text-t14">
            {deadline === deadlineOffice.end ? 'Deadline' : 'Opens'} <span className="data font-medium">{fmt(deadline, true)}</span>
            {offices.length > 1 && <span className="text-fg-2"> · {deadlineOffice.city}</span>}
          </p>
          <Button
            variant="secondary"
            size="sm"
            icon={CalendarPlus}
            onClick={() =>
              downloadIcs({
                title: `${firm.name}: application ${deadline === deadlineOffice.end ? 'deadline' : 'opens'}`,
                date: deadline,
                url: firm.applyUrl ?? firm.careersUrl ?? '',
                description: 'From Firmward. Check the firm’s page for the current deadline.',
              })
            }
          >
            Add to calendar
          </Button>
        </div>
      )}

      {differs && (
        <Section title="Offices">
          <ul className="divide-y divide-line rounded-app border border-line bg-card">
            {offices.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <span className="text-t14 font-medium">
                  {o.city}, {o.state}
                </span>
                <span className="flex items-center gap-3">
                  <StatusPill status={o.status} />
                  {(o.applyUrl || o.careersUrl) && (
                    <a href={o.applyUrl ?? o.careersUrl} target="_blank" rel="noopener noreferrer" className="text-t14 text-brand underline-offset-2 hover:underline">
                      {o.applyUrl ? 'Apply' : 'Careers'}
                      <span className="sr-only"> for {o.city} (opens in a new tab)</span> ↗
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {listings.length > 0 && (
        <Section title={`Open positions (${listings.length})`}>
          <ul className="divide-y divide-line rounded-app border border-line bg-card">
            {listings.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-t14 font-medium">{l.title}</span>
                  <span className="block text-t12 text-fg-2">
                    {[l.yearsLabel, postingTypeLabel(l.type), l.place].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3 text-t14">
                  <Link to={`/letters/new?listing=${l.id}`} className="text-brand hover:underline">
                    Letter
                  </Link>
                  {l.applyUrl && (
                    <a href={l.applyUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                      Apply<span className="sr-only"> (opens in a new tab)</span> ↗
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {firm.practice.length > 0 && (
        <Section title="Practice focus">
          <ul className="flex flex-wrap gap-1.5">
            {firm.practice.map((p) => (
              <li key={p} className="rounded-app border border-line bg-card px-2 py-1 text-t12 text-fg">
                {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(notes || firm.fellowship) && (
        <Section title="Notes">
          {firm.fellowship && <p className="text-t14">Fellowship: {firm.fellowship}.</p>}
          {notes && <p className="text-t14 text-fg-2">{notes}</p>}
        </Section>
      )}

      {firm.careersUrl && (
        <p className="mt-6 text-t14">
          <a href={firm.careersUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
            Recruiting page<span className="sr-only"> (opens in a new tab)</span> ↗
          </a>
        </p>
      )}

      <footer className="mt-6 space-y-1 border-t border-line pt-3 text-t12 text-fg-2">
        <p>
          {firm.verifiedAt ? (
            <>
              Last verified <span className="data">{fmt(firm.verifiedAt, true)}</span>
            </>
          ) : (
            'Not yet verified'
          )}
          {firm.careersUrl && (
            <>
              {' · Source: '}
              <a href={firm.careersUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                firm careers page ↗
              </a>
            </>
          )}
        </p>
        {report && (
          <p>
            <a href={report} className="text-brand hover:underline">
              Report outdated info
            </a>
          </p>
        )}
      </footer>

      {similar.length > 0 && (
        <Section title="Similar firms">
          <div className="grid grid-cols-2 gap-2">
            {similar.map((f) => (
              <FirmCard key={f.id} firm={f} onOpen={onOpenFirm} />
            ))}
          </div>
        </Section>
      )}
    </article>
  );
}
