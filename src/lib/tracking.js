// Analytics (Plausible) and channel attribution (UTM tags).
// UTM tags from the first visit are kept, so a buyer who came from TikTok last week is still
// credited to TikTok when they check out. Storage may be unavailable; every access is wrapped.

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const KEY = 'firmward.utm';

function read(storage) {
  try {
    return JSON.parse(storage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}

/** Call once on load: remembers this visit's UTM tags (first touch wins, kept 90 days). */
export function captureUtm() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const found = Object.fromEntries(UTM_KEYS.map((k) => [k, params.get(k)]).filter(([, v]) => v));
  const existing = read(localStorage);
  const fresh = existing && Date.now() - (existing.at ?? 0) < 90 * 86_400_000;
  if (Object.keys(found).length && !fresh) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...found, landing: window.location.pathname, at: Date.now() }));
    } catch {
      // attribution is best effort
    }
  }
}

/** { utm_source, utm_medium, ... } from the first visit, or {}. */
export function getUtm() {
  const saved = read(localStorage) ?? {};
  return Object.fromEntries(UTM_KEYS.filter((k) => saved[k]).map((k) => [k, saved[k]]));
}

/**
 * An outbound checkout or Skool link with the visitor's UTM tags added. For Stripe Payment Links the
 * channel also goes in client_reference_id (letters, digits, - and _ only), which shows on the payment.
 */
export function withUtm(url, { stripe = false } = {}) {
  if (!url || url.startsWith('PLACEHOLDER')) return url;
  try {
    const u = new URL(url, window.location.origin);
    const utm = getUtm();
    for (const [k, v] of Object.entries(utm)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    if (stripe && (utm.utm_source || utm.utm_campaign)) {
      const ref = [utm.utm_source, utm.utm_medium, utm.utm_campaign].filter(Boolean).join('__').replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 200);
      if (ref) u.searchParams.set('client_reference_id', ref);
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** Sends a Plausible custom event. Safe before the script loads, and a no-op in development. */
export function track(event, props) {
  try {
    if (typeof window.plausible === 'function') window.plausible(event, props ? { props } : undefined);
  } catch {
    // never let analytics break a click
  }
}
