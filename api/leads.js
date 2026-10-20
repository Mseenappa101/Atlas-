import { SITE, nextWorkshop } from '../site.config.js';
import { config } from './config.js';
import { HttpError, bad } from './http.js';
import { getDb, q } from './db.js';
import { CLASS_YEARS, ROLES, clientIp, email, guard, ipHash, isBot, longText, oneOf, text, unlockToken, utm } from './forms.js';
import { resendReady, sendEmail, sendEvent, upsertContact } from './resend.js';
import { placementConfirmEmail, placementToMichael, welcomeEmail, workshopEmail, workshopIcs } from './emails.js';

// Public (signed-out) forms: map unlock / homepage capture, workshop registration, Placement application.
// Each validates, drops bots quietly, rate-limits, logs a signups row, then emails through Resend.
// Email failures are logged, not shown as errors: the signup itself is already saved.

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), 'forms:', ...a);
const mask = (e) => e.replace(/^(.).*@/, '$1…@');

function common(body, req, route) {
  const address = email(body.email);
  const ip = clientIp(req);
  guard(route, ip, address);
  return {
    email: address,
    name: text(body.name, 120),
    class_year: oneOf(body.class_year, CLASS_YEARS),
    role_sought: oneOf(body.role_sought, ROLES),
    source_page: text(body.source_page, 200),
    referrer: text(body.referrer, 300),
    ...utm(body),
    ip_hash: ipHash(ip),
  };
}

const logSignup = (kind, row, details = {}) => q(getDb().from('signups').insert({ kind, ...row, details }));

/** Adds or refreshes the person on the email list (waitlist_subscribers), then pushes them to Resend. */
async function addToList(row, { subscribe }) {
  const db = getDb();
  const existing = await q(db.from('waitlist_subscribers').select('id, unsubscribed').ilike('email', row.email.replace(/[\\%_]/g, '\\$&')).maybeSingle());
  const fields = {
    ...(row.name ? { full_name: row.name } : {}),
    ...(row.class_year ? { class_year: row.class_year } : {}),
    ...(row.role_sought ? { role_sought: row.role_sought } : {}),
  };
  let unsubscribed = existing?.unsubscribed ?? false;
  if (existing) {
    if (subscribe) unsubscribed = false;
    await q(db.from('waitlist_subscribers').update({ ...fields, unsubscribed }).eq('id', existing.id));
  } else {
    await q(db.from('waitlist_subscribers').insert({
      email: row.email, ...fields, source: row.source_page || 'firmward-form', utm_source: row.utm_source, utm_campaign: row.utm_campaign, unsubscribed: false,
    }));
  }
  if (!resendReady()) return;
  try {
    const id = await upsertContact({ email: row.email, name: row.name, unsubscribed: subscribe ? false : undefined });
    await q(db.from('waitlist_subscribers').update({ resend_contact_id: id, synced_at: new Date().toISOString() }).ilike('email', row.email.replace(/[\\%_]/g, '\\$&')));
  } catch (e) {
    log(`contact for ${mask(row.email)} will retry in the background sync: ${e.message}`);
  }
}

async function trySend(what, message) {
  if (!resendReady()) {
    log(`${what}: RESEND_API_KEY not set, not sent`);
    return false;
  }
  try {
    await sendEmail(message);
    return true;
  } catch (e) {
    log(`${what} failed: ${e.message}`);
    return false;
  }
}

// ─── POST /api/subscribe: map unlock + homepage "recruiting calendar" capture ─

export async function subscribe(body, req) {
  if (isBot(body)) return { ok: true, unlock_token: null };
  const row = common(body, req, 'subscribe');
  await logSignup('subscribe', row);
  await addToList(row, { subscribe: true });
  // Starts the welcome sequence Automation in Resend (day 2 and day 4 emails), if one is set up.
  if (resendReady()) sendEvent('firmward.subscribed', row.email, { class_year: row.class_year, role_sought: row.role_sought, source: row.source_page }).catch(() => {});
  const token = unlockToken(row.email);
  const sent = await trySend(`welcome to ${mask(row.email)}`, {
    to: row.email,
    replyTo: config.michaelEmail ?? undefined,
    ...welcomeEmail({ name: row.name, unlockUrl: `${SITE.url}/explore?unlock=${encodeURIComponent(token)}` }),
  });
  return { ok: true, unlock_token: token, email_sent: sent };
}

// ─── POST /api/workshop ─────────────────────────────────────────────────────

export async function workshop(body, req) {
  if (isBot(body)) return { ok: true };
  const row = common(body, req, 'workshop');
  const ws = nextWorkshop();
  if (!ws) throw new HttpError(409, 'no_workshop', 'There’s no workshop scheduled right now. Check back soon.');
  await logSignup('workshop', row, { workshop_start: ws.start.toISOString(), workshop_title: ws.title });
  await addToList(row, { subscribe: false });
  const sent = await trySend(`workshop confirmation to ${mask(row.email)}`, {
    to: row.email,
    replyTo: config.michaelEmail ?? undefined,
    ...workshopEmail({ name: row.name, title: ws.title, start: ws.start, zoomUrl: config.workshopZoomUrl }),
    attachments: [{
      filename: 'firmward-workshop.ics',
      content_type: 'text/calendar; charset=utf-8; method=PUBLISH',
      content: workshopIcs({ title: ws.title, start: ws.start, durationMinutes: ws.durationMinutes, zoomUrl: config.workshopZoomUrl, uid: `workshop-${ws.start.getTime()}-${row.ip_hash}` }),
    }],
  });
  return { ok: true, start: ws.start.toISOString(), email_sent: sent };
}

// ─── POST /api/placement-apply ──────────────────────────────────────────────

export async function placementApply(body, req) {
  if (isBot(body)) return { ok: true };
  const row = common(body, req, 'placement');
  if (!row.name) throw bad('Add your name.');
  const answers = {
    school: text(body.school, 160),
    grad_year: text(body.grad_year, 20),
    markets: text(body.markets, 300),
    firm_types: text(body.firm_types, 300),
    situation: longText(body.situation, 2000),
    blocker: longText(body.blocker, 2000),
  };
  if (!answers.school) throw bad('Add your law school.');
  if (!row.class_year) throw bad('Choose your class year.');
  if (!row.role_sought) throw bad('Choose the role you’re looking for.');
  await logSignup('placement', row, answers);

  const application = { ...row, ...answers, utm: { utm_source: row.utm_source, utm_campaign: row.utm_campaign } };
  if (config.michaelEmail) {
    await trySend(`placement notice for ${mask(row.email)}`, { to: config.michaelEmail, replyTo: row.email, ...placementToMichael(application) });
  } else {
    log('placement application saved; MICHAEL_EMAIL not set, so no notification was sent');
  }
  const sent = await trySend(`placement confirmation to ${mask(row.email)}`, {
    to: row.email, replyTo: config.michaelEmail ?? undefined, ...placementConfirmEmail({ name: row.name }),
  });
  return { ok: true, email_sent: sent };
}
