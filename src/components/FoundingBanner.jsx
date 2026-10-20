import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { SITE, foundingOpen } from '../../site.config';
import Countdown from './Countdown';

const KEY = 'firmward.founding-banner-dismissed';
const read = () => {
  try {
    return localStorage.getItem(KEY) === SITE.FOUNDING_DEADLINE;
  } catch {
    return false;
  }
};

// Site-wide until the founding deadline passes; dismissible (remembered on this browser).
export default function FoundingBanner() {
  const [hidden, setHidden] = useState(read);
  const { pathname } = useLocation();
  if (hidden || !foundingOpen() || pathname.startsWith('/thanks')) return null;
  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, SITE.FOUNDING_DEADLINE);
    } catch {
      // stays hidden for this visit
    }
  };
  return (
    <div className="app no-print border-b border-line bg-brand-tint">
      <div className="mx-auto flex max-w-app items-center gap-3 px-4 py-2 text-t14 md:px-6">
        <p className="min-w-0 flex-1">
          <Link to="/membership" className="font-semibold text-brand hover:underline">Founding terms close Dec 21</Link>
          <span className="text-fg-2">
            {' '}· <Countdown to={SITE.FOUNDING_DEADLINE} /> left
          </span>
        </p>
        <button type="button" onClick={close} aria-label="Dismiss" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-app text-fg-2 hover:text-fg md:h-7 md:w-7">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
