import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bookmark, CalendarDays, Compass, FileText, Menu, X } from 'lucide-react';
import useSession from '../../hooks/useSession';
import useMyList from '../../hooks/useMyList';

const LINKS = [
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/my-list', label: 'My List', icon: Bookmark, count: true },
];
// Mobile tab order from the brief.
const TABS = [LINKS[0], LINKS[1], LINKS[3], LINKS[2]];
// Signed-out visitors: the free map and the offer ladder.
const PUBLIC_LINKS = [
  { to: '/explore', label: 'Free map' },
  { to: '/sprint', label: 'Sprint' },
  { to: '/membership', label: 'Membership' },
  { to: '/placement', label: 'Placement' },
  { to: '/workshop', label: 'Free workshop' },
];

function PublicMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button type="button" aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)} className="inline-flex h-11 w-11 items-center justify-center rounded-app text-fg">
        {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-14 z-40 border-b border-line bg-card shadow-pop">
          <ul className="mx-auto max-w-app px-4 py-2">
            {[...PUBLIC_LINKS, { to: '/about', label: 'About' }, { to: '/signin', label: 'Sign in' }].map((l) => (
              <li key={l.to}>
                <Link to={l.to} onClick={() => setOpen(false)} className="flex min-h-[48px] items-center border-b border-line text-t16 font-medium last:border-0">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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
          <Link to="/account" className={item} onClick={() => setOpen(false)}>
            Account and email
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
  const links = session ? LINKS : PUBLIC_LINKS;

  return (
    <>
      <header className="app no-print sticky top-0 z-30 border-b border-line bg-card">
        <nav aria-label="Main" className="relative mx-auto flex h-14 max-w-app items-center gap-6 px-4 md:px-6">
          <Link to="/" className="inline-flex min-h-[44px] items-center text-t16 font-bold tracking-[0.18em] text-fg">
            FIRMWARD
          </Link>
          <ul className="hidden items-center gap-1 md:flex">
            {links.map(({ to, label, count: showCount }) => (
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
          <div className="ml-auto flex items-center gap-1">
            {loading ? null : session ? (
              <AccountMenu />
            ) : (
              <>
                <Link to="/signin" className="hidden h-9 items-center px-2 text-t14 font-medium text-fg-2 hover:text-fg md:inline-flex">
                  Sign in
                </Link>
                <Link to="/explore" className="inline-flex h-9 items-center px-2 text-t14 font-medium text-brand md:hidden">
                  Free map
                </Link>
                <PublicMenu />
              </>
            )}
          </div>
        </nav>
      </header>

      {session && (
        <nav aria-label="App" className="app no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card md:hidden">
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
      )}
    </>
  );
}
