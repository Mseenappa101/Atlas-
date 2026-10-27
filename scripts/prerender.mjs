// After the client build + prerender-meta + the SSR build: renders each marketing route to HTML and
// injects it into that route's (already meta-stamped) index.html, replacing the empty <div id="root">.
// The client then hydrates this markup (see src/main.jsx). Run via `npm run build`.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
// route -> CSS chunk prefixes that the route's lazy component owns but that Vite only injects via JS
// after hydration (so they're absent from the prerendered HTML, leaving the content unstyled → CLS).
// Inlining them makes the route fully styled on first paint.
const ROUTE_LAZY_CSS = { '/': ['Edition'] };
const ROUTES = ['/', '/sprint', '/membership', '/placement'];

const { render } = await import(pathToFileURL(join(ROOT, 'dist-ssr/entry-server.js')).href);

const readCss = (href) => readFileSync(join(DIST, href.replace(/^\//, '')), 'utf8');

// Inline the build's stylesheet(s) into the prerendered HTML so first paint doesn't block on a separate
// CSS request — the single biggest FCP win for these content-in-HTML pages. The <link> is replaced by a
// <style>, so the markup these pages hydrate against still carries every rule.
function inlineCss(html) {
  return html.replace(/<link[^>]*rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g, (tag, href) => {
    try { return `<style>${readCss(href)}</style>`; } catch { return tag; }
  });
}

// Inline the CSS chunks a route's lazy component owns (Vite injects these via JS post-hydration).
function inlineLazyCss(html, route) {
  const prefixes = ROUTE_LAZY_CSS[route];
  if (!prefixes) return html;
  const files = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.css') && prefixes.some((p) => f.startsWith(p)));
  if (!files.length) return html;
  const styles = files.map((f) => `<style>${readCss(`/assets/${f}`)}</style>`).join('');
  return html.replace('</head>', `${styles}</head>`);
}

const ROOT_DIV = '<div id="root"></div>';
let ok = 0;
for (const route of ROUTES) {
  const file = route === '/' ? join(DIST, 'index.html') : join(DIST, route, 'index.html');
  const template = readFileSync(file, 'utf8');
  if (!template.includes(ROOT_DIV)) {
    console.error(`✗ ${route}: no empty root div in ${file}`);
    process.exitCode = 1;
    continue;
  }
  const appHtml = await render(route);
  // Inline the render-blocking CSS and the route's lazy-chunk CSS so the page is fully styled on first
  // paint (big FCP win; fixes the cover CLS on home). The markup still carries every rule for hydration.
  let out = inlineCss(template.replace(ROOT_DIV, `<div id="root">${appHtml}</div>`));
  out = inlineLazyCss(out, route);
  writeFileSync(file, out);
  console.log(`✓ prerendered ${route} (${(appHtml.length / 1024).toFixed(0)}KB of HTML)`);
  ok++;
}
console.log(`prerendered ${ok}/${ROUTES.length} routes with content`);
