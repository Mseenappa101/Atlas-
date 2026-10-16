import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useCatalog from '../hooks/useCatalog';
import useSession from '../hooks/useSession';
import { FIRM_TYPES, STATE_NAMES, recommended, slugify } from '../lib/catalog';
import { ButtonLink } from '../components/app/controls';
import { FirmButtonRow, FirmRow } from '../components/app/firm';
import { EmptyState, FirmRowSkeleton } from '../components/app/feedback';

const SHOWN = 10;

function setMeta(title, description) {
  document.title = title;
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = Object.assign(document.createElement('meta'), { name: 'description' });
    document.head.append(tag);
  }
  tag.content = description;
}

const listOf = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

const NOUN = {
  'litigation-boutique': ['litigation boutique', 'litigation boutiques'],
  'specialty-boutique': ['specialty boutique', 'specialty boutiques'],
  plaintiff: ['plaintiff firm', 'plaintiff firms'],
  'mid-size': ['mid-size firm', 'mid-size firms'],
  regional: ['regional firm', 'regional firms'],
  government: ['government employer', 'government employers'],
  'public-interest': ['public interest employer', 'public interest employers'],
  biglaw: ['BigLaw firm', 'BigLaw firms'],
};

// Plain facts from the data, no claims we can't back up.
function summary(firms) {
  const groups = FIRM_TYPES.map((t) => [t.value, firms.filter((f) => f.type === t.value).length])
    .filter(([, n]) => n)
    .map(([type, n]) => `${n} ${NOUN[type][n === 1 ? 0 : 1]}`);
  const hiring = firms.filter((f) => f.hires === 'yes').length;
  return [
    groups.length ? `By type: ${listOf(groups)}.` : null,
    hiring ? `${hiring} ${hiring === 1 ? 'is' : 'are'} confirmed to hire 1Ls.` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

function Page({ kind }) {
  const { slug } = useParams();
  const { firms, loading } = useCatalog();
  const { session } = useSession();
  const navigate = useNavigate();

  const { heading, firmsHere, intro, description } = useMemo(() => {
    if (kind === 'market') {
      const here = firms.filter((f) => f.cities.some((c) => slugify(c) === slug));
      const office = here.flatMap((f) => f.offices).find((o) => slugify(o.city) === slug);
      const place = office ? `${office.city}, ${STATE_NAMES[office.state] ?? office.state}` : slug.replace(/-/g, ' ');
      return {
        heading: `Law firms hiring 1Ls in ${office?.city ?? place}`,
        firmsHere: here,
        intro: here.length
          ? `Firmward tracks ${here.length} firm${here.length === 1 ? '' : 's'} with an office in ${place}. ${summary(here)}`
          : `Firmward doesn’t have firms in ${place} yet.`,
        description: `${here.length} law firms in ${place} for 1L summer jobs: boutiques, mid-size and regional firms first, with hiring status, application windows and direct links.`,
      };
    }
    const type = FIRM_TYPES.find((t) => t.value === slug);
    const here = firms.filter((f) => f.type === slug);
    const states = new Set(here.flatMap((f) => f.states)).size;
    return {
      heading: type ? `${type.label} firms that hire 1Ls` : 'Firms',
      firmsHere: here,
      intro: !type
        ? ''
        : here.length
          ? `Firmward tracks ${here.length} ${NOUN[slug][here.length === 1 ? 0 : 1]} across ${states} state${states === 1 ? '' : 's'}. ${here.filter((f) => f.hires === 'yes').length} confirmed to hire 1Ls.`
          : `Firmward doesn’t have ${NOUN[slug][1]} yet. We’re adding employers regularly.`,
      description: type ? `${type.label} law firms for 1L summer jobs, with hiring status, application windows and direct application links.` : '',
    };
  }, [firms, kind, slug]);

  const ranked = useMemo(() => recommended(firmsHere, null), [firmsHere]);

  useEffect(() => {
    if (!loading) setMeta(`${heading} — Firmward`, description);
  }, [heading, description, loading]);

  const open = (f) => navigate(session ? `/firms/${f.slug}` : `/?next=${encodeURIComponent(`/firms/${f.slug}`)}`);
  const cta = session ? `/explore` : '/';

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:px-6 md:pb-12">
      <nav aria-label="Breadcrumb" className="text-t12 text-fg-2">
        <Link to="/" className="inline-flex min-h-[44px] items-center hover:underline md:min-h-0">
          Firmward
        </Link>{' '}
        / {kind === 'market' ? 'Markets' : 'Firm types'}
      </nav>
      <h1 className="mt-2 text-t24 font-bold tracking-tight md:text-t32">{heading}</h1>
      {!loading && <p className="mt-2 text-t16 text-fg-2">{intro}</p>}

      <div className="mt-6 overflow-hidden rounded-app border border-line bg-card">
        {loading && <FirmRowSkeleton rows={6} />}
        {!loading && !ranked.length && (
          <div className="p-4">
            <EmptyState title="No firms here yet" action={<ButtonLink to={cta}>Explore all firms</ButtonLink>}>
              We&rsquo;re adding firms regularly.
            </EmptyState>
          </div>
        )}
        {ranked.slice(0, SHOWN).map((f) => (
          <FirmButtonRow key={f.id} firm={f} onClick={open} />
        ))}
        {ranked.length > SHOWN && (
          <div className="relative">
            <div aria-hidden="true" inert className="pointer-events-none select-none blur-[3px]">
              {ranked.slice(SHOWN, SHOWN + 3).map((f) => (
                <FirmRow key={f.id} firm={f} />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <ButtonLink to={cta}>{session ? `See all ${ranked.length} in Explore` : `Get free access to see all ${ranked.length}`}</ButtonLink>
            </div>
          </div>
        )}
      </div>

      {!session && ranked.length > 0 && ranked.length <= SHOWN && (
        <div className="mt-6 rounded-app border border-line bg-card p-4">
          <p className="text-t14">Save these firms, track your applications and get the recruiting calendar.</p>
          <ButtonLink to="/" className="mt-3">
            Get free access
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

export function MarketPage() {
  return (
    <div className="app min-h-screen">
      <Page kind="market" />
    </div>
  );
}

export function TypePage() {
  return (
    <div className="app min-h-screen">
      <Page kind="type" />
    </div>
  );
}
