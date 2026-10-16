import { NavLink, Link, useLocation } from 'react-router-dom';
import useSession from '../hooks/useSession';

const LINKS = [
  { to: '/directory', label: 'Directory' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/templates', label: 'Templates' },
];

export default function NavBar() {
  // The landing page carries its own masthead, so the small wordmark steps aside there.
  const home = useLocation().pathname === '/';
  const { session, loading } = useSession();
  const links = loading ? LINKS : [...LINKS, session ? { to: '/documents', label: 'My documents' } : { to: '/signin', label: 'Sign in' }];
  return (
    <header className="no-print border-b border-rule">
      <nav aria-label="Main" className="page flex min-h-[56px] flex-wrap items-center justify-between gap-x-6">
        {home ? (
          <span />
        ) : (
          <Link to="/" className="caps inline-flex min-h-[44px] items-center font-serif text-lg font-semibold tracking-[0.12em] text-ink">
            Atlas
          </Link>
        )}
        <ul className="flex flex-wrap items-center gap-x-1 md:gap-x-4">
          {links.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `inline-flex min-h-[44px] items-center px-2 text-sm decoration-accent decoration-2 underline-offset-[6px] ${
                    isActive ? 'text-ink underline' : 'text-muted hover:text-ink'
                  }`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
