import { Link } from 'react-router-dom';

const COLUMNS = [
  ['Firmward', [['Free firm map', '/explore'], ['Recruiting calendar', '/calendar'], ['Free workshop', '/workshop'], ['About', '/about']]],
  ['Get help', [['20-Firm Sprint', '/sprint'], ['Membership', '/membership'], ['90-Day Placement', '/placement'], ['For families', '/families']]],
  ['Markets', [['Dallas', '/markets/dallas'], ['Houston', '/markets/houston'], ['Austin', '/markets/austin'], ['New Orleans', '/markets/new-orleans'], ['Atlanta', '/markets/atlanta'], ['Nashville', '/markets/nashville']]],
  ['Firm types', [['Litigation boutiques', '/types/litigation-boutique'], ['Plaintiff firms', '/types/plaintiff'], ['Mid-size firms', '/types/mid-size'], ['Regional firms', '/types/regional'], ['Government', '/types/government'], ['Public interest', '/types/public-interest']]],
];

export default function Footer() {
  return (
    <footer className="app no-print border-t border-line bg-card pb-16 md:pb-0">
      <div className="mx-auto max-w-app px-4 py-10 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {COLUMNS.map(([title, links]) => (
            <div key={title}>
              <h2 className="text-t12 font-semibold uppercase tracking-wide text-fg-2">{title}</h2>
              <ul className="mt-2 space-y-1.5">
                {links.map(([label, to]) => (
                  <li key={to}>
                    <Link to={to} className="inline-flex min-h-[32px] items-center text-t14 text-fg hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 space-y-2 border-t border-line pt-6 text-t12 text-fg-2">
          <p className="font-medium text-fg">Firmward provides career coaching and application support, not legal advice.</p>
          <p>Not affiliated with or endorsed by any law school or law firm.</p>
          <p>
            <Link to="/terms" className="hover:underline">Terms</Link> · <Link to="/privacy" className="hover:underline">Privacy</Link> ·{' '}
            <Link to="/disclaimer" className="hover:underline">Disclaimer</Link> · <Link to="/credits" className="hover:underline">Plate credits</Link> · <Link to="/signin" className="hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
