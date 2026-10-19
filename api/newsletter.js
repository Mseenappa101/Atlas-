import { config } from './config.js';
import { getDb, q } from './db.js';

// Everyone on the email list (waitlist_subscribers: every profile, plus older sign-ups) becomes a
// Resend contact, so newsletters go out as Resend broadcasts. Unsubscribe links in broadcasts are
// handled by Resend; the account page toggle below updates both sides.

const RESEND = 'https://api.resend.com';
const headers = () => ({ Authorization: `Bearer ${config.resendKey}`, 'Content-Type': 'application/json' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), 'newsletter:', ...a);

function names(full) {
  const parts = String(full ?? '').trim().split(/\s+/).filter(Boolean);
  return { first_name: parts[0] ?? undefined, last_name: parts.length > 1 ? parts.slice(1).join(' ') : undefined };
}

// Resend addresses a contact by id or by email.
const contactUrl = (email) => `${RESEND}/contacts/${encodeURIComponent(email)}`;

async function updateExisting(row) {
  const res = await fetch(contactUrl(row.email), { method: 'PATCH', headers: headers(), body: JSON.stringify({ unsubscribed: row.unsubscribed }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${json.message ?? ''}`.trim());
  return json.id ?? 'existing';
}

async function pushOne(row) {
  const res = await fetch(`${RESEND}/contacts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email: row.email,
      ...names(row.full_name),
      unsubscribed: row.unsubscribed,
      ...(config.resendSegmentId ? { segments: [{ id: config.resendSegmentId }] } : {}),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.ok) return json.id;
  // Already a contact (added by hand, or a retry): link to it instead.
  if (res.status === 409 || /exist/i.test(json.message ?? '')) return updateExisting(row);
  if (res.status === 422) return 'invalid'; // not a deliverable address; don't retry forever
  throw new Error(`${res.status} ${json.message ?? ''}`.trim());
}

export async function syncNewsletterOnce(limit = 50) {
  const rows = await q(getDb().from('waitlist_subscribers').select('id, email, full_name, unsubscribed')
    .is('synced_at', null).order('created_at').limit(limit));
  let done = 0;
  for (const row of rows) {
    try {
      const id = await pushOne(row);
      await q(getDb().from('waitlist_subscribers').update({ resend_contact_id: id, synced_at: new Date().toISOString() }).eq('id', row.id));
      done++;
    } catch (e) {
      log(`stopped at ${row.email.replace(/^(.).*@/, '$1…@')}: ${e.message}`);
      break; // rate limit or outage: try again next round
    }
    await sleep(600); // Resend allows a few requests per second
  }
  return { synced: done, pending: rows.length - done };
}

export function startNewsletterSync() {
  if (!config.resendKey) {
    log('RESEND_API_KEY not set; email list stays in the database only');
    return;
  }
  const run = async () => {
    try {
      const r = await syncNewsletterOnce();
      if (r.synced) log(`added ${r.synced} contact(s)`);
    } catch (e) {
      log(e.message);
    }
  };
  setTimeout(run, 10_000).unref();
  setInterval(run, 5 * 60_000).unref();
}

// ─── ACCOUNT PAGE ───────────────────────────────────────────────────────────

const rowFor = (email) => q(getDb().from('waitlist_subscribers').select('id, unsubscribed, resend_contact_id')
  .ilike('email', email.replace(/[\\%_]/g, '\\$&')).maybeSingle());

export async function getNewsletter(user) {
  const row = await rowFor(user.email);
  return { subscribed: row ? !row.unsubscribed : false };
}

export async function setNewsletter(user, body) {
  const subscribed = Boolean(body.subscribed);
  const row = await rowFor(user.email);
  if (!row) {
    await q(getDb().from('waitlist_subscribers').insert({ email: user.email, unsubscribed: !subscribed, source: 'atlas-profile' }));
    return { subscribed };
  }
  // Not yet in Resend: the next sync creates the contact with this setting.
  let synced = Boolean(row.resend_contact_id && row.resend_contact_id !== 'invalid');
  if (synced && config.resendKey) {
    try {
      await updateExisting({ email: user.email, unsubscribed: !subscribed });
    } catch (e) {
      log(`subscription change failed, will retry: ${e.message}`);
      synced = false;
    }
  }
  await q(getDb().from('waitlist_subscribers').update({ unsubscribed: !subscribed, ...(synced ? {} : { synced_at: null }) }).eq('id', row.id));
  return { subscribed };
}
