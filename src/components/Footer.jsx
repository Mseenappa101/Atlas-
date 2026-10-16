import { Link } from 'react-router-dom';
import { site } from '../lib/site';

const MARKETS = [
  ['Dallas', 'dallas'],
  ['Houston', 'houston'],
  ['Austin', 'austin'],
  ['New Orleans', 'new-orleans'],
  ['Atlanta', 'atlanta'],
  ['Nashville', 'nashville'],
];
const TYPES = [
  ['Litigation boutiques', 'litigation-boutique'],
  ['Plaintiff firms', 'plaintiff'],
  ['Mid-size firms', 'mid-size'],
  ['Regional firms', 'regional'],
  ['Government', 'government'],
  ['Public interest', 'public-interest'],
];

function Col({ title, links }) {
  return (
    <div>
      <h2 className="text-t12 font-semibold uppercase tracking-wide text-fg-2">{title}</h2>
      <ul className="mt-2 space-y-1.5">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link to={to} className="text-t14 text-fg hover:underline">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="app no-print border-t border-line bg-card pb-16 md:pb-0">
      <div className="mx-auto max-w-app px-4 py-10 md:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <Col title="Atlas" links={[['Explore', '/explore'], ['Calendar', '/calendar'], ['Templates', '/templates'], ['My List', '/my-list'], ['Pro', '/pro']]} />
          <Col title="Markets" links={MARKETS.map(([l, s]) => [l, `/markets/${s}`])} />
          <Col title="Firm types" links={TYPES.map(([l, s]) => [l, `/types/${s}`])} />
        </div>
        <div className="mt-8 space-y-2 border-t border-line pt-6 text-t12 text-fg-2">
          <p>
            Want help with your recruiting plan?{' '}
            {site.strategyCallUrl ? (
              <a href={site.strategyCallUrl} className="font-medium text-brand hover:underline">
                Book a free strategy call
              </a>
            ) : (
              <span className="font-medium text-fg">Book a free strategy call</span>
            )}
            .
          </p>
          <p>Career information only, not legal advice. Not affiliated with or endorsed by any law school or law firm.</p>
        </div>
      </div>
    </footer>
  );
}
