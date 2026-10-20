import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { isPlaceholder } from '../../../site.config';
import { track, withUtm } from '../../lib/tracking';

// Building blocks for the marketing pages, in the app's design system.

export function Page({ children, narrow = false }) {
  return (
    <div className="app min-h-screen">
      <div className={`mx-auto px-4 pb-24 pt-8 md:px-6 md:pb-16 md:pt-12 ${narrow ? 'max-w-3xl' : 'max-w-app'}`}>{children}</div>
    </div>
  );
}

export function Eyebrow({ children }) {
  return <p className="text-t12 font-semibold uppercase tracking-[0.12em] text-brand">{children}</p>;
}

export function H1({ children }) {
  return <h1 className="mt-2 text-[34px] font-bold leading-[1.1] tracking-tight md:text-[48px]">{children}</h1>;
}

export function Lead({ children }) {
  return <p className="mt-4 max-w-2xl text-t16 leading-relaxed text-fg-2 md:text-t20">{children}</p>;
}

export function Section({ title, intro, children, id, className = '' }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={`mt-14 md:mt-20 ${className}`}>
      {title && <h2 id={id ? `${id}-h` : undefined} className="text-t24 font-bold tracking-tight md:text-t32">{title}</h2>}
      {intro && <p className="mt-2 max-w-2xl text-t16 text-fg-2">{intro}</p>}
      <div className={title ? 'mt-6' : ''}>{children}</div>
    </section>
  );
}

export function Checks({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i} className="flex gap-2.5 text-t16 leading-snug">
          <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

const BTN = 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-app px-5 text-t16 font-semibold transition-colors duration-150';
const PRIMARY = `${BTN} bg-brand text-white hover:bg-brand-hover`;
const SECONDARY = `${BTN} border border-line bg-card text-fg hover:border-fg-2`;

/**
 * The page's main action. `href` for outside links (Stripe, Skool, scheduler): UTM tags are added and a
 * placeholder link renders as a visible, disabled placeholder. `event` is tracked on click.
 */
export function Cta({ to, href, children, variant = 'primary', event, props, stripe = false, className = '' }) {
  const cls = `${variant === 'primary' ? PRIMARY : SECONDARY} ${className}`;
  if (href && isPlaceholder(href)) {
    return (
      <span className={`${cls} cursor-not-allowed border-2 border-dashed border-st-soon-text bg-st-soon-bg text-st-soon-text`} title={`Fill in ${href} in site.config.js`}>
        {children} <span className="text-t12 font-normal">({href.replace('PLACEHOLDER_', '')})</span>
      </span>
    );
  }
  if (href || to?.startsWith('#')) {
    return (
      <a href={href ? withUtm(href, { stripe }) : to} className={cls} onClick={() => event && track(event, props)}>
        {children}
        <ArrowRight size={18} aria-hidden="true" />
      </a>
    );
  }
  return (
    <Link to={to} className={cls} onClick={() => event && track(event, props)}>
      {children}
      <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}

export function TextLink({ to, children }) {
  return (
    <Link to={to} className="inline-flex min-h-[44px] items-center gap-1 text-t16 font-semibold text-brand hover:underline">
      {children} <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

/** Visible on localhost and preview links only, never on firmward.org: copy waiting for Michael's review. */
export function DraftTag({ children = 'Draft for review' }) {
  if (typeof window !== 'undefined' && /(^|\.)firmward\.org$/.test(window.location.hostname)) return null;
  return <span className="ml-2 inline-block rounded-pill border border-dashed border-st-soon-text bg-st-soon-bg px-2 py-0.5 align-middle text-t12 font-medium text-st-soon-text">{children}</span>;
}

export function Faq({ items }) {
  return (
    <div className="divide-y divide-line rounded-app border border-line bg-card">
      {items.map(([q, a]) => (
        <details key={q} className="group px-4 py-1 md:px-5">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 text-t16 font-semibold">
            {q}
            <span aria-hidden="true" className="text-t20 text-fg-2 transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="pb-4 text-t16 leading-relaxed text-fg-2">{a}</div>
        </details>
      ))}
    </div>
  );
}

/** A simple table that becomes stacked cards on phones. rows: [[cell, cell, ...]] */
export function ResponsiveTable({ caption, head, rows }) {
  return (
    <>
      <table className="hidden w-full overflow-hidden rounded-app border border-line bg-card text-left text-t14 md:table">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-canvas text-t12 uppercase tracking-wide text-fg-2">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, n) => (
            <tr key={n} className="align-top">
              {r.map((c, i) => (i === 0 ? <th key={i} scope="row" className="px-4 py-3 font-semibold">{c}</th> : <td key={i} className="px-4 py-3 text-fg-2">{c}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {rows.map((r, n) => (
          <li key={n} className="rounded-app border border-line bg-card p-4">
            <p className="text-t16 font-semibold">{r[0]}</p>
            {r.slice(1).map((c, i) => (
              <p key={i} className="mt-1.5 text-t14 text-fg-2">
                <span className="font-medium text-fg">{head[i + 1]}: </span>
                {c}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}
