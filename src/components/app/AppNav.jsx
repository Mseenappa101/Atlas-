import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bookmark, CalendarDays, Compass, FileText } from 'lucide-react';
import useSession from '../../hooks/useSession';
import useMyList from '../../hooks/useMyList';
import { ButtonLink } from './controls';

const LINKS = [
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/my-list', label: 'My List', icon: Bookmark, count: true },
];
// Mobile tab order from the brief.
const TABS = [LINKS[0], LINKS[1], LINKS[3], LINKS[2]];

function initials(name, email) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) || email?.slice(0, 2) || '?').toUpperCase();
}

function AccountMenu() {
  const { profile, session, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !root.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        root.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = 'flex min-h-[44px] w-full items-center rounded-app px-3 text-left text-t14 text-fg hover:bg-canvas md:min-h-[36px]';
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen(!open)}
        className="inline-flex h-11 w-11 items-center justify-center md:h-9 md:w-9"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-pill bg-brand text-t12 font-semibold text-white">
          {initials(profile?.full_name, session?.user.email)}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-app border border-line bg-card p-1 shadow-pop">
          <p className="truncate px-3 py-2 text-t12 text-fg-2">{session?.user.email}</p>
          <Link to="/resume" className={item} onClick={() => setOpen(false)}>
            My resume
          </Link>
          <Link to="/documents" className={item} onClick={() => setOpen(false)}>
            My documents
          </Link>
          <Link to="/pro" className={item} onClick={() => setOpen(false)}>
            Plan and billing
          </Link>
          <button
            type="button"
            className={item}
            onClick={async () => {
              setOpen(false);
              await signOut();
              navigate('/');
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppNav() {
  const { session, loading } = useSession();
  const { ids } = useMyList();
  const count = ids.size;

  return (
    <>
      <header className="app no-print sticky top-0 z-30 border-b border-line bg-card">
        <nav aria-label="Main" className="mx-auto flex h-14 max-w-app items-center gap-6 px-4 md:px-6">
          <Link to="/" className="inline-flex min-h-[44px] items-center text-t16 font-bold tracking-[0.18em] text-fg">
            ATLAS
          </Link>
          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map(({ to, label, count: showCount }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `inline-flex h-9 items-center gap-1.5 rounded-app px-3 text-t14 font-medium transition-colors duration-150 ${
                      isActive ? 'bg-brand-tint text-brand' : 'text-fg-2 hover:text-fg'
                    }`
                  }
                >
                  {label}
                  {showCount && count > 0 && (
                    <span className="data rounded-pill bg-brand px-1.5 text-t12 leading-5 text-white" aria-label={`${count} saved`}>
                      {count}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="ml-auto flex items-center">
            {loading ? null : session ? (
              <AccountMenu />
            ) : (
              <>
                <Link to="/signin" className="mr-2 hidden h-9 items-center px-2 text-t14 text-fg-2 hover:text-fg sm:inline-flex">
                  Sign in
                </Link>
                <ButtonLink to="/" size="sm">
                  Get free access
                </ButtonLink>
              </>
            )}
          </div>
        </nav>
      </header>

      <nav aria-label="Main" className="app no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card md:hidden">
        <ul className="grid grid-cols-4">
          {TABS.map(({ to, label, icon: Icon, count: showCount }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-t12 font-medium ${isActive ? 'text-brand' : 'text-fg-2'}`
                }
              >
                <span className="relative">
                  <Icon size={20} aria-hidden="true" />
                  {showCount && count > 0 && (
                    <span className="data absolute -right-3 -top-1.5 rounded-pill bg-brand px-1 text-t12 leading-4 text-white">{count}</span>
                  )}
                </span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
