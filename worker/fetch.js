import robotsParser from 'robots-parser';
import { config, USER_AGENT } from './config.js';
import { htmlToText, looksJsRendered } from './text.js';

const TIMEOUT_MS = 20_000;
const ROBOTS_TTL_MS = 24 * 3600_000;
const ROBOTS_ERROR_TTL_MS = 3600_000;

export class FetchError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// ─── PER-HOST POLITENESS ───────────────────────────────────────────────────
// Requests to one host run one at a time, at least gapMs apart (or the robots Crawl-delay if longer).

const hostChains = new Map();
const hostLast = new Map();
const hostDelay = new Map();

export function politely(url, fn) {
  const host = new URL(url).host;
  const prev = hostChains.get(host) || Promise.resolve();
  const run = prev.then(async () => {
    const gap = Math.max(config.hostGapMs, hostDelay.get(host) || 0);
    const wait = (hostLast.get(host) || 0) + gap - Date.now();
    if (wait > 0) await sleep(wait);
    try { return await fn(); } finally { hostLast.set(host, Date.now()); }
  });
  hostChains.set(host, run.catch(() => {}));
  return run;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── ROBOTS.TXT ────────────────────────────────────────────────────────────

const robotsCache = new Map();

async function getRobots(url) {
  const { origin, host } = new URL(url);
  const hit = robotsCache.get(origin);
  if (hit && hit.expires > Date.now()) return hit.robots;
  const robotsUrl = `${origin}/robots.txt`;
  let body = '';
  let ttl = ROBOTS_TTL_MS;
  try {
    const res = await politely(robotsUrl, () => fetch(robotsUrl, {
      headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10_000), redirect: 'follow',
    }));
    if (res.ok) body = await res.text();
    else if (res.status >= 500) ttl = ROBOTS_ERROR_TTL_MS; // treat as allow, but recheck soon
  } catch {
    ttl = ROBOTS_ERROR_TTL_MS;
  }
  const robots = robotsParser(robotsUrl, body);
  const delay = robots.getCrawlDelay(USER_AGENT);
  if (delay) hostDelay.set(host, Math.min(delay, 120) * 1000);
  robotsCache.set(origin, { robots, expires: Date.now() + ttl });
  return robots;
}

export async function isAllowed(url) {
  const robots = await getRobots(url);
  return robots.isAllowed(url, USER_AGENT) !== false;
}

// ─── PAGE FETCH ────────────────────────────────────────────────────────────

/** Fetches a page politely; falls back to a headless browser when the HTML looks empty/JS-rendered. */
export async function fetchPage(url) {
  if (!(await isAllowed(url))) throw new FetchError('blocked by robots.txt', 'robots');

  const res = await politely(url, () => fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  }));
  const finalUrl = res.url || url;
  const type = res.headers.get('content-type') || '';
  if (!res.ok && res.status !== 403 && res.status !== 429) throw new FetchError(`HTTP ${res.status}`, res.status);
  if (res.status === 429) throw new FetchError('HTTP 429', 429);
  if (res.ok && type && !/html|xml|text\/plain/i.test(type)) throw new FetchError(`unsupported content-type ${type.split(';')[0]}`, 'type');

  const html = res.ok ? await res.text() : '';
  const parsed = htmlToText(html, finalUrl);
  // 403s are often bot walls that a real browser gets through; tiny text usually means client-side rendering.
  if (res.ok && !looksJsRendered(html, parsed.text)) return { url: finalUrl, html, ...parsed, via: 'fetch', httpStatus: res.status };

  const rendered = await politely(url, () => renderWithBrowser(url));
  const r = htmlToText(rendered.html, rendered.url);
  if (!rendered.ok && r.text.length < 400) throw new FetchError(`HTTP ${rendered.status} (browser)`, rendered.status);
  // Keep whichever version has more content.
  if (r.text.length >= parsed.text.length) return { url: rendered.url, html: rendered.html, ...r, via: 'browser', httpStatus: rendered.status };
  return { url: finalUrl, html, ...parsed, via: 'fetch', httpStatus: res.status };
}

/** JSON GET for public ATS/government APIs (not subject to robots; still host-polite). */
export async function fetchJson(url, headers = {}) {
  const res = await politely(url, () => fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }));
  if (!res.ok) throw new FetchError(`HTTP ${res.status}`, res.status);
  return res.json();
}

// ─── HEADLESS BROWSER (one shared instance) ────────────────────────────────

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = import('playwright').then(({ chromium }) => chromium.launch({ headless: true }));
    browserPromise.catch(() => { browserPromise = null; });
  }
  return browserPromise;
}

async function renderWithBrowser(url) {
  const browser = await getBrowser();
  const context = await browser.newContext({ userAgent: USER_AGENT });
  try {
    const page = await context.newPage();
    await page.route('**/*', (route) => (
      ['image', 'media', 'font'].includes(route.request().resourceType()) ? route.abort() : route.continue()
    ));
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    return { url: page.url(), html: await page.content(), status: resp?.status() ?? 0, ok: resp ? resp.ok() : false };
  } finally {
    await context.close();
  }
}

export async function closeBrowser() {
  if (!browserPromise) return;
  const b = await browserPromise.catch(() => null);
  browserPromise = null;
  await b?.close().catch(() => {});
}
