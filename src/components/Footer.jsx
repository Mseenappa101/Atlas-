import { site } from '../lib/site';

export default function Footer() {
  const call = 'Book a free 20-minute strategy call';
  return (
    <footer className="no-print mt-16 border-t border-rule pb-14 md:pb-0">
      <div className="page space-y-2 py-8 text-xs text-muted">
        <p>
          Planning your 1L search?{' '}
          {site.strategyCallUrl ? (
            <a href={site.strategyCallUrl} className="link">
              {call}
            </a>
          ) : (
            call
          )}
          . Founding member terms close {site.foundingTermsClose}.
        </p>
        <p>Career information only, not legal advice. Not affiliated with or endorsed by any law school or law firm.</p>
      </div>
    </footer>
  );
}
