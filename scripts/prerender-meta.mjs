// After `vite build`: writes dist/<route>/index.html for each marketing page with its own <title>,
// description, Open Graph tags and robots, so link previews and crawlers see the right text before any
// JavaScript runs. Vercel serves these files ahead of the SPA rewrite. Also writes sitemap.xml and robots.txt.
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SITE } from '../site.config.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const base = readFileSync(join(DIST, 'index.html'), 'utf8');
const money = (n) => `$${n.toLocaleString('en-US')}`;
const P = SITE.PRICES;

const PAGES = [
  ['/explore', 'Free law firm map: who’s hiring law students and new grads — Firmward', 'Boutiques, mid-size, plaintiff, government and regional firms by state, with who they hire for (1L summer, 2L summer, post-grad), windows and how to apply.'],
  ['/sprint', '20-Firm Sprint: 20 emails to hiring firms in 5 days — Firmward', `A 5-day challenge for law students and new grads: a target list, a fixed resume, and 20 outreach emails sent to firms hiring for your role. ${money(P.sprint)}.`],
  ['/membership', 'Firmward Membership: weekly outreach critique — Firmward', `Weekly live call with draft critique, a monthly Outreach Sprint, mock interviews and the full Firmward database. ${money(P.membershipMonthly)}/month, cancel anytime.`],
  ['/placement', 'The 90-Day Placement: a done-for-you law job search — Firmward', 'For 3Ls and recent grads without an offer, 2Ls without a summer job, transfers and 1Ls: target list, drafted outreach and interview prep. Book a strategy call.'],
  ['/families', 'For families: how the 90-Day Placement works — Firmward', 'For parents of law students and new grads without a job offer: what the Placement does, the timeline, the price, and how to book a call.'],
  ['/workshop', 'Free weekly workshop for law students — Firmward', 'Free live workshop, Wednesdays at 8:00 pm ET: how to find the firms hiring for your role and write to them. Summer and post-grad.'],
  ['/about', 'About Firmward', 'Why Firmward exists: a 3L’s map of the firms that hire law students and new grads beyond BigLaw, and help landing a job at one.'],
  ['/calendar', 'Law student recruiting calendar — Firmward', 'When 1L summer, 2L summer and post-grad hiring happens, month by month, with each firm’s application window.'],
  ['/terms', 'Terms of Service — Firmward', 'Firmward terms of service.'],
  ['/privacy', 'Privacy Policy — Firmward', 'How Firmward collects and uses your information.'],
  ['/disclaimer', 'Disclaimer — Firmward', 'Firmward provides career coaching and application support, not legal advice.'],
  ['/signup', 'Create your free profile — Firmward', 'Save firms and track every application on any device.', true],
  ['/thanks/signup', 'Check your inbox — Firmward', '', true],
  ['/thanks/sprint', 'You’re in the Sprint — Firmward', '', true],
  ['/thanks/call', 'Your strategy call is booked — Firmward', '', true],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function pageHtml([path, title, description, noindex]) {
  let html = base
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${SITE.url}${path}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(title)}"`)
    .replace(/(<meta name="twitter:title" content=")[^"]*"/, `$1${esc(title)}"`)
    .replace(/(<meta name="robots" content=")[^"]*"/, `$1${noindex ? 'noindex, nofollow' : 'index, follow'}"`)
    .replace('</head>', `    <link rel="canonical" href="${SITE.url}${path}" />\n  </head>`);
  if (description) {
    html = html
      .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(description)}"`)
      .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(description)}"`)
      .replace(/(<meta name="twitter:description" content=")[^"]*"/, `$1${esc(description)}"`);
  }
  return html;
}

for (const page of PAGES) {
  const dir = join(DIST, page[0]);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), pageHtml(page));
}
// The home page is the Edition: preload the LCP hero painting (responsive) and the two above-the-fold
// Edition fonts so they download in parallel with the lazy chunk instead of after it mounts.
const homeHead = `    <link rel="canonical" href="${SITE.url}/" />
    <link rel="preload" as="image" href="/art/the-map/color-1024.webp" imagesrcset="/art/the-map/color-640.webp 640w, /art/the-map/color-1024.webp 1024w, /art/the-map/color-1600.webp 1600w" imagesizes="(max-width: 900px) 65vw, 100vw" fetchpriority="high" />
    <link rel="preload" as="font" type="font/woff2" href="/fonts/cinzel.woff2" crossorigin />
    <link rel="preload" as="font" type="font/woff2" href="/fonts/eb-garamond.woff2" crossorigin />
  </head>`;
writeFileSync(join(DIST, 'index.html'), base.replace('</head>', homeHead));

const MARKETS = ['dallas', 'houston', 'austin', 'san-antonio', 'new-orleans', 'atlanta', 'nashville', 'birmingham', 'miami', 'charlotte', 'new-york'];
const TYPES = ['litigation-boutique', 'specialty-boutique', 'plaintiff', 'mid-size', 'regional', 'government', 'public-interest'];
const urls = ['/', ...PAGES.filter((p) => !p[3]).map((p) => p[0]), ...MARKETS.map((m) => `/markets/${m}`), ...TYPES.map((t) => `/types/${t}`)];
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE.url}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *
Disallow: /thanks/
Disallow: /api/
Disallow: /account
Disallow: /my-list
Disallow: /apply/
Sitemap: ${SITE.url}/sitemap.xml
`);
console.log(`prerendered ${PAGES.length} pages, sitemap with ${urls.length} URLs`);
