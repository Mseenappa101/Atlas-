import Stripe from 'stripe';
import { config } from './config.js';
import { HttpError } from './http.js';
import { getSubscription, subscriptionByCustomer, upsertSubscription } from './db.js';

let stripe = null;
function client() {
  if (!config.stripeKey) throw new HttpError(503, 'billing_unavailable', 'Payments aren’t set up yet. Please try again later.');
  stripe ??= new Stripe(config.stripeKey);
  return stripe;
}

let priceId = null;
async function proPrice() {
  if (priceId) return priceId;
  const { data } = await client().prices.list({ lookup_keys: [config.proPriceLookupKey], active: true, limit: 1 });
  if (!data.length) throw new HttpError(503, 'billing_unavailable', 'The Pro plan isn’t set up in Stripe yet.');
  priceId = data[0].id;
  return priceId;
}

const ACTIVE = new Set(['active', 'trialing', 'past_due']);

// Coaching plans (member, retainer) are set by hand and include Pro; Stripe never downgrades them.
async function applySubscription(userId, sub) {
  const current = await getSubscription(userId);
  const coaching = current?.plan === 'member' || current?.plan === 'retainer';
  const patch = {
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    status: sub.status,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    current_period_end: sub.items?.data?.[0]?.current_period_end
      ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
      : null,
  };
  if (!coaching) patch.plan = ACTIVE.has(sub.status) ? 'pro' : 'free';
  await upsertSubscription(userId, patch);
  return patch.plan ?? current.plan;
}

// ─── ROUTES (signed in) ─────────────────────────────────────────────────────

export async function checkout(user) {
  const current = await getSubscription(user.id);
  if (current?.plan && current.plan !== 'free' && current.status !== 'canceled') {
    throw new HttpError(409, 'already_pro', 'You already have Pro. Use “Manage billing” to change it.');
  }
  const session = await client().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: await proPrice(), quantity: 1 }],
    client_reference_id: user.id,
    ...(current?.stripe_customer_id ? { customer: current.stripe_customer_id } : { customer_email: user.email }),
    subscription_data: { metadata: { user_id: user.id } },
    metadata: { user_id: user.id },
    allow_promotion_codes: true,
    success_url: `${config.appUrl}/pro?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.appUrl}/pro?status=canceled`,
  });
  return { url: session.url };
}

// Called by the success page so Pro switches on immediately, without waiting for the webhook.
export async function syncCheckout(user, body) {
  if (typeof body.session_id !== 'string' || !body.session_id.startsWith('cs_')) {
    throw new HttpError(400, 'bad_request', 'Missing checkout session.');
  }
  const session = await client().checkout.sessions.retrieve(body.session_id, { expand: ['subscription'] });
  if (session.client_reference_id !== user.id) throw new HttpError(403, 'forbidden', 'That checkout belongs to a different account.');
  if (!session.subscription) throw new HttpError(409, 'not_paid', 'That checkout isn’t complete yet.');
  const plan = await applySubscription(user.id, session.subscription);
  return { plan };
}

export async function portal(user) {
  const current = await getSubscription(user.id);
  if (!current?.stripe_customer_id) throw new HttpError(404, 'no_billing', 'There’s no billing account for this profile yet.');
  const session = await client().billingPortal.sessions.create({
    customer: current.stripe_customer_id,
    return_url: `${config.appUrl}/pro`,
  });
  return { url: session.url };
}

// ─── WEBHOOK (signed by Stripe, no user token) ──────────────────────────────

export async function webhook(rawBody, signature) {
  if (!config.stripeWebhookSecret) throw new HttpError(503, 'billing_unavailable', 'Webhook secret not configured.');
  let event;
  try {
    event = client().webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
  } catch {
    throw new HttpError(400, 'bad_signature', 'Invalid webhook signature.');
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    if (s.mode === 'subscription' && s.client_reference_id && s.subscription) {
      const sub = await client().subscriptions.retrieve(s.subscription);
      await applySubscription(s.client_reference_id, sub);
    }
  } else if (event.type.startsWith('customer.subscription.')) {
    const sub = event.data.object;
    const userId = sub.metadata?.user_id ?? (await subscriptionByCustomer(sub.customer))?.user_id;
    if (userId) await applySubscription(userId, sub);
  }
  return { received: true };
}
