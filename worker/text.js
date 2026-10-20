import * as cheerio from 'cheerio';
import { createHash } from 'crypto';

const STRIP = [
  'script', 'style', 'noscript', 'template', 'svg', 'iframe', 'canvas', 'form', 'button', 'select',
  'nav', '[role="navigation"]',
].join(',');
// Page chrome; header/footer inside main/article are content and stay.
const CHROME = 'header, footer, [role="banner"], [role="contentinfo"]';

// Cookie/consent widgets (OneTrust, Cookiebot, generic banners).
const NOISE_SELECTOR = [
  '[id*="cookie" i]', '[class*="cookie" i]', '[id*="consent" i]', '[class*="consent" i]',
  '[id*="onetrust" i]', '[class*="onetrust" i]', '[id*="gdpr" i]', '[class*="gdpr" i]',
  '[id*="cybot" i]', '[class*="skip-link" i]',
].join(',');

const BLOCK = 'p,div,section,article,main,aside,li,ul,ol,tr,table,h1,h2,h3,h4,h5,h6,dt,dd,blockquote,pre,address';

const VOLATILE_LINE = [
  /©|\(c\)\s*\d{4}|copyright\s+\d{4}|all rights reserved/i,
  /\b(cookies?|consent)\b.*\b(accept|use|policy|preferences|settings)\b/i,
  /^(last (updated|modified)|updated|posted|published)\b.{0,40}\d/i,
];
const VOLATILE_INLINE = [
  /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/g, // ISO timestamps
  /\b\d{1,2}:\d{2}(:\d{2})?\s?(am|pm)?\b/gi,                                // clock times
  /\b[A-Za-z0-9_-]{32,}\b/g,                                               // tokens, nonces, hashes
];

/** HTML -> { text, links, title }. Text is normalized and noise-free so its hash is stable. */
export function htmlToText(html, baseUrl) {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim();
  const links = extractLinks($, baseUrl);
  $(STRIP).remove();
  $(CHROME).filter((_, el) => $(el).parents('main, article').length === 0).remove();
  $(NOISE_SELECTOR).remove();
  $('br').replaceWith('\n');
  $(BLOCK).each((_, el) => { $(el).prepend('\n').append('\n'); });
  const raw = ($('body').length ? $('body') : $.root()).text();
  return { text: normalizeText(raw), links, title };
}

export function normalizeText(raw) {
  const seen = new Set();
  const lines = [];
  for (let line of raw.split('\n')) {
    line = line.replace(/\s+/g, ' ').trim();
    if (!line || VOLATILE_LINE.some((re) => re.test(line))) continue;
    for (const re of VOLATILE_INLINE) line = line.replace(re, '');
    line = line.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    // Short repeated lines are menu/boilerplate echoes; long ones are content.
    if (line.length < 60 && seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }
  return lines.join('\n');
}

function extractLinks($, baseUrl) {
  const out = [];
  const seen = new Set();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || /^(#|javascript:|mailto:|tel:)/i.test(href)) return;
    let url;
    try { url = new URL(href, baseUrl).href; } catch { return; }
    if (seen.has(url)) return;
    seen.add(url);
    out.push({ url, text: $(el).text().replace(/\s+/g, ' ').trim().slice(0, 120) });
  });
  return out;
}

export const sha256 = (s) => createHash('sha256').update(s).digest('hex');
export const sha1 = (s) => createHash('sha1').update(s).digest('hex');

// ─── KEYWORD PREFILTER ─────────────────────────────────────────────────────

export const STUDENT_RE = new RegExp(`\\b(?:${[
  '[123]Ls?', 'first[- ]year', 'second[- ]year', 'summer associates?', 'summer (law )?(clerk|program)s?',
  'law clerks?', 'law clerkships?', 'law students?', 'interns?', 'internships?', 'externs?', 'externships?',
  'fellows?(hips?)?', 'judicial', 'on[- ]campus interview(s|ing)?',
  // New-grad hiring (post-grad associate, staff attorney, 0–2 years).
  'new (law )?grad(uate)?s?', 'recent (law )?grad(uate)?s?', 'graduating (law )?students?', 'entry[- ]level',
  'junior associates?', 'first[- ]year associates?', 'staff attorneys?', 'class of 20\\d\\d',
].join('|')})\\b`, 'i');
const OCI_RE = /\bOCI\b/; // case-sensitive: "oci" alone is too ambiguous

export function matchesStudentTerms(text) {
  return STUDENT_RE.test(text) || OCI_RE.test(text);
}

const STUDENT_RE_G = new RegExp(STUDENT_RE.source, 'gi');

/** Keep ~max chars, prioritizing the page head and windows around keyword hits. */
export function truncateAroundHits(text, max = 12000, window = 1200) {
  if (text.length <= max) return text;
  const ranges = [[0, Math.min(1500, text.length)]];
  for (const m of text.matchAll(STUDENT_RE_G)) {
    ranges.push([Math.max(0, m.index - window), Math.min(text.length, m.index + window)]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  let out = '';
  for (const [s, e] of merged) {
    const piece = (s > 0 ? '\n[…]\n' : '') + text.slice(s, e);
    if (out.length + piece.length > max) { out += piece.slice(0, max - out.length); break; }
    out += piece;
  }
  return out;
}

/** Links worth showing the model: careers/apply/student pages, PDFs, ATS hosts. */
export function relevantLinks(links, limit = 40) {
  const re = /apply|career|recruit|student|summer|clerk|intern|extern|fellow|1l|2l|oci|graduate|entry|associate|attorney-opening|job|position|opening|greenhouse|lever\.co|workday|icims|taleo|\.pdf/i;
  return links.filter((l) => re.test(l.url) || re.test(l.text)).slice(0, limit);
}

export function looksJsRendered(html, text) {
  if (text.length < 400) return true;
  return /enable javascript|requires javascript|<div id="(root|app|__next)">\s*<\/div>/i.test(html) && text.length < 1500;
}

// ─── ATS DISCOVERY ─────────────────────────────────────────────────────────

const GH_RE = /https?:\/\/(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board\?for=)?([A-Za-z0-9_-]+)/i;
const LEVER_RE = /https?:\/\/jobs\.lever\.co\/([A-Za-z0-9_.-]+)/i;
const GH_RESERVED = new Set(['embed', 'v1', 'api']);

/** Returns [{ kind, url }] for Greenhouse/Lever boards referenced in links or raw HTML. */
export function detectAts(html, links = []) {
  const found = new Map();
  const hay = [html, ...links.map((l) => l.url)].join('\n');
  for (const m of hay.matchAll(new RegExp(GH_RE.source, 'gi'))) {
    const token = m[1].toLowerCase();
    if (!GH_RESERVED.has(token)) found.set(`gh:${token}`, { kind: 'greenhouse', url: `https://boards.greenhouse.io/${token}` });
  }
  for (const m of hay.matchAll(new RegExp(LEVER_RE.source, 'gi'))) {
    const co = m[1].toLowerCase();
    found.set(`lv:${co}`, { kind: 'lever', url: `https://jobs.lever.co/${co}` });
  }
  return [...found.values()];
}
