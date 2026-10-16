import { site } from '../lib/site';

// The funnel's quiet ask, placed under every document.
export default function CoachingNote({ children }) {
  const link = site.strategyCallUrl;
  return (
    <aside className="no-print mt-8 border-t border-line pt-4 text-t14 text-fg-2">
      {children ?? 'A second set of eyes before you send it is the difference between a draft and an interview.'}{' '}
      {link ? (
        <a href={link} className="font-medium text-brand hover:underline">
          Book a free 20-minute review call
        </a>
      ) : (
        <span className="font-medium text-fg">Book a free 20-minute review call</span>
      )}
      .
    </aside>
  );
}
