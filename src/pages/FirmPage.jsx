import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import RequireProfile from '../components/RequireProfile';
import FirmDetail from '../components/explore/FirmDetail';
import { EmptyState } from '../components/app/feedback';
import useCatalog from '../hooks/useCatalog';
import useListings from '../hooks/useListings';
import useMyList from '../hooks/useMyList';
import { recommended } from '../lib/catalog';

function Page() {
  const { slug } = useParams();
  const { firms, idMap, loading } = useCatalog();
  const { listings } = useListings();
  const { ids, toggle } = useMyList();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from ?? '/explore';

  const firm = firms.find((f) => f.slug === slug);
  const firmListings = useMemo(() => (firm ? listings.filter((l) => (idMap?.get(l.firmId) ?? l.firmId) === firm.id) : []), [firm, listings, idMap]);
  const similar = useMemo(
    () => (firm ? recommended(firms.filter((f) => f.id !== firm.id && f.group === firm.group && f.states.some((s) => firm.states.includes(s))), null).slice(0, 4) : []),
    [firms, firm]
  );

  useEffect(() => {
    if (firm) document.title = `${firm.name} — Firmward`;
  }, [firm]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4 md:px-6 md:pb-12">
      <button
        type="button"
        onClick={() => (location.state?.from ? navigate(-1) : navigate(from))}
        className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-t14 text-fg-2 hover:text-fg"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to results
      </button>
      {loading && <div className="h-40 animate-pulse rounded-app bg-line" aria-busy="true" />}
      {!loading && !firm && (
        <EmptyState title="We couldn’t find that firm" action={<Link to="/explore" className="text-brand hover:underline">Go to Explore</Link>}>
          The link may be out of date.
        </EmptyState>
      )}
      {firm && (
        <FirmDetail
          firm={firm}
          listings={firmListings}
          similar={similar}
          saved={ids.has(firm.id)}
          onToggleSave={(f) => toggle(f.id)}
          onOpenFirm={(f) => navigate(`/firms/${f.slug}`, { state: { from } })}
          headingLevel="h1"
        />
      )}
    </div>
  );
}

export default function FirmPage() {
  return (
    <RequireProfile>
      <div className="app min-h-screen">
        <Page />
      </div>
    </RequireProfile>
  );
}
