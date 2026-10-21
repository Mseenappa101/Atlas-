import Stripe from 'stripe';
import { config } from './config.js';
import { HttpError, bad } from './http.js';
import { signAccess, verifyAccess } from './crypto.js';

// On-site Sprint course gating. There are no user accounts here: a paid Stripe Checkout Session is the
// credential. The Payment Link's success URL is set to /sprint/course?session_id={CHECKOUT_SESSION_ID};
// the course page exchanges that session for a signed access token (crypto.js) and keeps it in
// localStorage. Lesson video URLs are returned only for a valid token, so they never ship to the client.
//
// This has its own Stripe client on purpose — api/billing.js owns the subscription flow and is not touched.

let stripe = null;
function client() {
  if (!config.stripeKey) throw new HttpError(503, 'billing_unavailable', 'Payments aren’t set up yet. Please try again later.');
  stripe ??= new Stripe(config.stripeKey);
  return stripe;
}

const LESSON_KEYS = ['build-list', 'fix-resume', 'write-email', 'send-day', 'live-call'];

/** POST /api/sprint/unlock { session_id } → { token, email }. Verifies the Stripe session was paid. */
export async function unlockSprint(body) {
  const sid = body?.session_id;
  if (typeof sid !== 'string' || !sid.startsWith('cs_')) throw bad('Missing checkout session.');

  let session;
  try {
    session = await client().checkout.sessions.retrieve(sid);
  } catch {
    throw new HttpError(404, 'not_found', "We couldn't find that purchase. Open the course from the link in your receipt.");
  }
  const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
  if (!paid) throw new HttpError(402, 'not_paid', 'That purchase isn’t complete yet. If you just paid, wait a moment and reload.');

  // Optional: confirm this session actually bought the Sprint, not some other product.
  if (config.sprintPriceId) {
    const items = await client().checkout.sessions.listLineItems(sid, { limit: 10 }).catch(() => null);
    const ok = items?.data?.some((li) => li.price?.id === config.sprintPriceId);
    if (!ok) throw new HttpError(403, 'wrong_product', 'That purchase isn’t for the Sprint.');
  }

  const email = session.customer_details?.email || session.customer_email || null;
  return { token: signAccess({ sid: session.id, email }), email };
}

/** POST /api/sprint/lessons { token } → { email, lessons:[{ key, video_url }] }. 401 if the token fails. */
export function sprintLessons(body) {
  const payload = verifyAccess(body?.token);
  if (!payload) {
    throw new HttpError(401, 'locked', 'Your access link has expired or is invalid. Open the course from your receipt link again.');
  }
  const videos = config.sprintCourseVideos;
  return {
    email: payload.email ?? null,
    lessons: LESSON_KEYS.map((key) => ({ key, video_url: videos[key] })),
  };
}
