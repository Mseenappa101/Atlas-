import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import useSession from '../hooks/useSession';

// Pinned to the bottom of the map: the next step from browsing to sending.
export default function MapCtaBar() {
  const { session } = useSession();
  return (
    <div className={`no-print fixed inset-x-0 z-20 border-t border-brand bg-brand text-white ${session ? 'bottom-[57px] md:bottom-0' : 'bottom-0'}`}>
      <Link to="/sprint" className="mx-auto flex min-h-[48px] max-w-app items-center justify-between gap-3 px-4 text-t14 md:px-6">
        <span>
          <span className="font-semibold">Turn this list into 20 sent emails:</span> join the next Sprint.
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline">
          See the Sprint <ArrowRight size={16} aria-hidden="true" />
        </span>
      </Link>
    </div>
  );
}
