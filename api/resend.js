import { config } from './config.js';
import { HttpError } from './http.js';

// Resend: transactional email, contacts and the "Firmward List" segment.

const RESEND = 'https://api.resend.com';
const headers = () => ({ Authorization: `Bearer ${config.resendKey}`, 'Content-Type': 'application/json' });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), 'resend:', ...a);

export const resendReady = () => Boolean(config.resendKey);

async function call(method, path, body) {
  const res = await fetch(`${RESEND}${path}`, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

/** Sends one email. attachments: [{ filename, content: Buffer|string, content_type }]. */
export async function sendEmail({ to, subject, html, text, replyTo, attachments = [], from = config.emailFrom }) {
  if (!config.resendKey) throw new HttpError(503, 'email_unavailable', 'Email isn’t set up yet. Please try again later.');
  const r = await call('POST', '/emails', {
    from, to: [].concat(to), subject, html, text,
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(attachments.length ? { attachments: attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString('base64'), content_type: a.content_type })) } : {}),
  });
  if (!r.ok) throw new Error(`resend send ${r.status}: ${r.json.message ?? ''}`);
  return r.json.id;
}

// ─── SEGMENT ────────────────────────────────────────────────────────────────

let segmentId = config.resendSegmentId;
let segmentLookup = null;

/** The "Firmward List" segment id: from RESEND_AUDIENCE_ID, else found or created by name. */
export function listSegment() {
  if (segmentId) return Promise.resolve(segmentId);
  segmentLookup ??= (async () => {
    const list = await call('GET', '/segments');
    const found = (list.json.data ?? []).find((s) => s.name === config.resendSegmentName);
    if (found) segmentId = found.id;
    else {
      const made = await call('POST', '/segments', { name: config.resendSegmentName });
      if (!made.ok) throw new Error(`resend segment ${made.status}: ${made.json.message ?? ''}`);
      segmentId = made.json.id;
      log(`created segment "${config.resendSegmentName}" ${segmentId}; set RESEND_AUDIENCE_ID=${segmentId} to pin it`);
    }
    return segmentId;
  })().finally(() => {
    segmentLookup = null;
  });
  return segmentLookup;
}

const names = (full) => {
  const parts = String(full ?? '').trim().split(/\s+/).filter(Boolean);
  return { first_name: parts[0] ?? undefined, last_name: parts.length > 1 ? parts.slice(1).join(' ') : undefined };
};

/**
 * Adds (or updates) a contact and puts it in the Firmward List segment.
 * `unsubscribed` is applied to new contacts, and to existing ones only when given: registering for a
 * workshop shouldn't undo someone's unsubscribe, but asking to subscribe should.
 * Returns the contact id, 'existing', or 'invalid' (undeliverable; don't retry).
 */
export async function upsertContact({ email, name, unsubscribed }) {
  const segment = await listSegment();
  const created = await call('POST', '/contacts', { email, ...names(name), unsubscribed: Boolean(unsubscribed), segments: [{ id: segment }] });
  if (created.ok) return created.json.id;
  if (created.status === 422 && !/exist/i.test(created.json.message ?? '')) return 'invalid';
  if (created.status !== 409 && !/exist/i.test(created.json.message ?? '')) throw new Error(`resend contact ${created.status}: ${created.json.message ?? ''}`);
  // Already a contact: keep their subscription choice as given, and make sure they're in the segment.
  const id = encodeURIComponent(email);
  const upd = await call('PATCH', `/contacts/${id}`, { ...names(name), ...(unsubscribed === undefined ? {} : { unsubscribed }) });
  if (!upd.ok) throw new Error(`resend contact update ${upd.status}: ${upd.json.message ?? ''}`);
  const seg = await call('POST', `/contacts/${id}/segments/${segment}`);
  if (!seg.ok && seg.status !== 409) log(`segment add ${seg.status}: ${seg.json.message ?? ''}`);
  return upd.json.id ?? 'existing';
}

export async function setUnsubscribed(email, unsubscribed) {
  const r = await call('PATCH', `/contacts/${encodeURIComponent(email)}`, { unsubscribed });
  if (!r.ok) throw new Error(`resend unsubscribe ${r.status}: ${r.json.message ?? ''}`);
}

/** Starts any Resend Automation listening for `event` (e.g. the welcome sequence) for this contact. */
export async function sendEvent(event, email, payload = {}) {
  const r = await call('POST', '/events/send', { event, email, payload });
  if (!r.ok && r.status !== 404) log(`event ${event} ${r.status}: ${r.json.message ?? ''}`);
}
