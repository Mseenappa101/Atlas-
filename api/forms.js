import { createHash, createHmac, hkdfSync, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { HttpError, bad } from './http.js';

// Shared pieces for the public (signed-out) forms: validation, honeypot, rate limits, unlock tokens.

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const CLASS_YEARS = ['1L', '2L', '3L', 'recent-grad', 'other'];
export const ROLES = ['1l-summer', '2l-summer', 'post-grad', 'entry-lateral', 'other'];
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

/** Trimmed single-line text, or null. */
export function text(v, max = 200) {
  if (typeof v !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\x00-\x1f\x7f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return s || null;
}

/** Multi-line text (keeps line breaks), or null. */
export function longText(v, max = 2000) {
  if (typeof v !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/\r\n/g, '\n').replace(/[\x00-\x09\x0b-\x1f\x7f]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
  return s || null;
}

export function email(v) {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (!s || s.length > 254 || !EMAIL.test(s)) throw bad('Enter a valid email address.');
  return s;
}

export const oneOf = (v, list) => (list.includes(v) ? v : null);

export function utm(body) {
  const src = body?.utm && typeof body.utm === 'object' ? body.utm : {};
  return Object.fromEntries(UTM_KEYS.map((k) => [k, text(src[k], 120)]));
}

/** Bots fill every field. Real visitors never see "company". */
export const isBot = (body) => Boolean(body?.company);

// ─── RATE LIMITS (in memory: the API runs as one process) ───────────────────

const hits = new Map();
setInterval(() => {
  const cutoff = Date.now() - 86_400_000;
  for (const [k, list] of hits) {
    const kept = list.filter((t) => t > cutoff);
    if (kept.length) hits.set(k, kept);
    else hits.delete(k);
  }
}, 10 * 60_000).unref();

/** Throws 429 if `key` was used more than `max` times in the last `windowMs`. */
export function limit(key, max, windowMs) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
  if (list.length >= max) throw new HttpError(429, 'rate_limited', 'Too many tries. Please wait a few minutes and try again.');
  list.push(now);
  hits.set(key, list);
}

export function clientIp(req) {
  // Behind Vercel's rewrite and Railway's proxy, the visitor is the first address in x-forwarded-for.
  return String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}

export const ipHash = (ip) => createHash('sha256').update(`firmward:${ip}`).digest('hex').slice(0, 16);

/** Per-IP and per-email limits shared by every public form. */
export function guard(route, ip, address) {
  limit(`${route}:ip:min:${ip}`, 5, 60_000);
  limit(`${route}:ip:day:${ip}`, 40, 86_400_000);
  if (address) limit(`${route}:email:${address}`, 4, 3_600_000);
}

// ─── UNLOCK TOKENS: proof a visitor gave their email, for the gated firm fields ─

function unlockKey() {
  const secret = config.tokenKey || config.serviceKey; // either way, never leaves the server
  return Buffer.from(hkdfSync('sha256', secret, 'firmward', 'map-unlock', 32));
}

export function unlockToken(address) {
  const body = Buffer.from(JSON.stringify({ e: address, t: Date.now() })).toString('base64url');
  return `${body}.${createHmac('sha256', unlockKey()).update(body).digest('base64url')}`;
}

export function verifyUnlock(token) {
  const [body, sig] = String(token ?? '').split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', unlockKey()).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
