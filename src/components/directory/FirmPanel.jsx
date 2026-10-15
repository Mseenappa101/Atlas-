import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatWindow, isWindowPast, longDate, shortDate } from '../../lib/firms';
import { site } from '../../lib/site';
import { Sheet, CloseButton, StatusMark, Button, ExternalLink } from '../ui';

const POSTING_LABELS = {
  'summer-associate': 'Summer associate',
  'law-clerk': 'Law clerk',
  intern: 'Internship',
  fellowship: 'Fellowship',
  extern: 'Externship',
  other: 'Other',
};

function useOpenListings(firmId) {
  const [listings, setListings] = useState([]);
  useEffect(() => {
    if (!firmId) return;
    let live = true;
    supabase
      .from('listings')
      .select('id,title,class_years,posting_type,deadline,apply_url')
      .eq('firm_id', firmId)
      .eq('status', 'open')
      .order('deadline', { ascending: true, nullsFirst: false })
      .then(({ data }) => live && setListings(data ?? []));
    return () => {
      live = false;
      setListings([]);
    };
  }, [firmId]);
  return listings;
}

function Fact({ label, children }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-rule py-2.5">
      <dt className="caps text-xs text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

// Scraper notes that describe the page itself ("This careers page...") aren't useful to a reader.
function readerNotes(notes) {
  if (!notes || /\b(page|website|site)\b/i.test(notes)) return null;
  return notes;
}

export default function FirmPanel({ firm, onClose }) {
  const listings = useOpenListings(firm?.id);
  if (!firm) return null;

  const windowText = formatWindow(firm);
  const notes = readerNotes(firm.notes);
  const report = site.correctionsEmail
    ? `mailto:${site.correctionsEmail}?subject=${encodeURIComponent(`Outdated info: ${firm.name} (${firm.place})`)}`
    : null;

  return (
    <Sheet open onClose={onClose} label={firm.name}>
      <article className="flex min-h-full flex-col px-5 pb-6 pt-3 md:px-8">
        <div className="flex justify-end">
          <CloseButton onClick={onClose} />
        </div>

        <header className="border-b border-ink pb-4">
          <h2 className="text-xl leading-tight md:text-2xl">{firm.name}</h2>
          <p className="mt-1 text-sm text-muted">{[firm.place, firm.typeLabel].filter(Boolean).join(' · ')}</p>
        </header>

        <dl className="text-sm">
          <Fact label="Hires 1Ls">
            <StatusMark value={firm.hires} />
          </Fact>
          <Fact label="Application window">
            {!windowText && <span className="text-muted">Not posted</span>}
            {windowText && (
              <span className="nums font-mono text-xs">
                {windowText}
                {isWindowPast(firm) && <span className="font-sans text-muted"> · closed for this cycle</span>}
              </span>
            )}
          </Fact>
          <Fact label="Practice focus">
            {firm.practiceAll.length ? firm.practiceAll.join(', ') : <span className="text-muted">—</span>}
          </Fact>
          <Fact label="Approx. size">
            {firm.size ? <span className="nums font-mono text-xs">{firm.size}</span> : <span className="text-muted">—</span>}
          </Fact>
          {firm.fellowship && <Fact label="Fellowship">{firm.fellowship}</Fact>}
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {firm.applyUrl && <Button href={firm.applyUrl}>Open application ↗</Button>}
          {firm.careersUrl && <ExternalLink href={firm.careersUrl}>Recruiting page</ExternalLink>}
        </div>

        {listings.length > 0 && (
          <section className="mt-8">
            <h3 className="caps border-b border-ink pb-1 text-xs text-muted">Open postings</h3>
            <ul>
              {listings.map((l) => (
                <li key={l.id} className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5">
                  <span>
                    <span className="block">{l.title}</span>
                    <span className="nums font-mono text-xs text-muted">
                      {[l.class_years?.join('/'), POSTING_LABELS[l.posting_type], l.deadline && `Due ${shortDate(new Date(l.deadline + 'T00:00'))}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {l.apply_url && <ExternalLink href={l.apply_url}>Apply</ExternalLink>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {notes && (
          <section className="mt-8">
            <h3 className="caps border-b border-ink pb-1 text-xs text-muted">Notes</h3>
            <p className="mt-2 text-sm">{notes}</p>
          </section>
        )}

        <footer className="mt-auto space-y-1 border-t border-rule pt-4 text-xs text-muted">
          <p className="nums font-mono">
            {firm.verifiedAt ? `Last verified: ${longDate(firm.verifiedAt)}` : 'Not yet verified'}
            {firm.source && ` · Source: ${firm.source.toLowerCase()}`}
          </p>
          {report && (
            <p>
              <a href={report} className="link">
                Report outdated info
              </a>
            </p>
          )}
        </footer>
      </article>
    </Sheet>
  );
}
