import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bookmark, CalendarDays, Compass, FileText, Menu, X } from 'lucide-react';
import { SITE, foundingOpen } from '../../../site.config';
import Countdown from '../Countdown';
import useSession from '../../hooks/useSession';
import useMyList from '../../hooks/useMyList';
import './jnav.css';

// Docket links. Public visitors see the map + the offer ladder; signed-in users get the app nav.
const PUBLIC_LINKS = [
  { to: '/explore', label: 'The Map' },
  { to: '/sprint', label: 'The Sprint' },
  { to: '/membership', label: 'Membership' },
  { to: '/placement', label: 'Placement' },
  { to: '/workshop', label: 'Workshop' },
];
const APP_LINKS = [
  { to: '/explore', label: 'The Map', icon: Compass },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/my-list', label: 'My List', icon: Bookmark, count: true },
];
const TABS = [APP_LINKS[0], APP_LINKS[1], APP_LINKS[3], APP_LINKS[2]];

const BANNER_KEY = 'firmward.founding-banner-dismissed';

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
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); root.current?.querySelector('button')?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div ref={root} className="jnav__account">
      <button type="button" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen(!open)} className="jnav__avatar">
        {initials(profile?.full_name, session?.user.email)}
      </button>
      {open && (
        <div className="jnav__account-menu">
          <p className="jnav__account-email">{session?.user.email}</p>
          <Link to="/resume" onClick={() => setOpen(false)}>My resume</Link>
          <Link to="/documents" onClick={() => setOpen(false)}>My documents</Link>
          <Link to="/account" onClick={() => setOpen(false)}>Account and email</Link>
          <Link to="/pro" onClick={() => setOpen(false)}>Plan and billing</Link>
          <button type="button" onClick={async () => { setOpen(false); await signOut(); navigate('/'); }}>Sign out</button>
        </div>
      )}
    </div>
  );
}

export default function AppNav() {
  const { session, loading } = useSession();
  const { ids } = useMyList();
  const { pathname } = useLocation();
  const count = ids.size;
  const links = session ? APP_LINKS : PUBLIC_LINKS;

  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(BANNER_KEY) === SITE.FOUNDING_DEADLINE; } catch { return false; }
  });
  const lastY = useRef(0);

  useEffect(() => { const t = setTimeout(() => setLoaded(true), 20); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 90 && y > lastY.current + 4) setHidden(true);
      else if (y < lastY.current - 4 || y < 90) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showNotice = foundingOpen() && !dismissed && !pathname.startsWith('/thanks');
  const dismiss = () => { setDismissed(true); try { localStorage.setItem(BANNER_KEY, SITE.FOUNDING_DEADLINE); } catch { /* visit only */ } };

  return (
    <>
      <header className={`jnav no-print${loaded ? ' is-loaded' : ''}${hidden ? ' is-hidden' : ''}`}>
        {showNotice && (
          <div className="jnav__notice">
            <p>
              <span aria-hidden="true" className="jnav__sec">§</span>
              <Link to="/membership">Founding terms close Dec 21</Link>
              <span> · <Countdown to={SITE.FOUNDING_DEADLINE} className="data" /> left</span>
            </p>
            <button type="button" className="jnav__notice-x" onClick={dismiss} aria-label="Dismiss"><X size={15} aria-hidden="true" /></button>
          </div>
        )}

        <nav aria-label="Main" className="jnav__bar">
          <Link to="/" className="jnav__mark">Firmward</Link>
          <ul className="jnav__links">
            {links.map(({ to, label, count: showCount }) => (
              <li key={to}>
                <NavLink to={to} end={to === '/explore'}>
                  <span className="jnav__sec" aria-hidden="true">§</span>{label}
                  {showCount && count > 0 && <span className="jnav__count" aria-label={`${count} saved`}>{count}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="jnav__right">
            {loading ? null : session ? (
              <AccountMenu />
            ) : (
              <>
                <Link to="/signin" className="jnav__signin">Sign in</Link>
                <Link to="/sprint" className="jnav__cta">Start the Sprint</Link>
              </>
            )}
            <button type="button" className="jnav__menu-btn" aria-expanded={menu} aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu(!menu)}>
              {menu ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>

          {menu && (
            <div className="jnav__sheet">
              <ul>
                {(session ? APP_LINKS : [...PUBLIC_LINKS, { to: '/about', label: 'About' }, { to: '/signin', label: 'Sign in' }]).map((l) => (
                  <li key={l.to}><Link to={l.to} onClick={() => setMenu(false)}><span className="jnav__sec" aria-hidden="true">§</span>{l.label}</Link></li>
                ))}
              </ul>
            </div>
          )}
        </nav>
      </header>

      {session && (
        <nav aria-label="App" className="no-print fixed inset-x-0 bottom-0 z-30 md:hidden" style={{ background: 'var(--app-navy)', borderTop: '1px solid rgba(180,144,78,0.4)' }}>
          <ul className="grid grid-cols-4">
            {TABS.map(({ to, label, icon: Icon, count: showCount }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/explore'}
                  className={({ isActive }) => `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-t12 ${isActive ? 'text-[#57d29a]' : 'text-[rgba(244,241,234,0.7)]'}`}
                >
                  <span className="relative">
                    <Icon size={20} aria-hidden="true" />
                    {showCount && count > 0 && <span className="data absolute -right-3 -top-1.5 rounded-pill bg-brand px-1 text-t12 leading-4 text-white">{count}</span>}
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
