import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

let db = null;
export function getDb() {
  if (db) return db;
  if (!config.supabaseUrl || !config.serviceKey) throw new Error('VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
  db = createClient(config.supabaseUrl, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return db;
}

/** Unwraps a supabase response, throwing on error. */
export async function q(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`db: ${error.message}`);
  return data;
}

/** Verifies a Supabase access token; returns the auth user or null. */
export async function userFromToken(token) {
  const { data, error } = await getDb().auth.getUser(token);
  return error ? null : data.user;
}

const PLANS = { free: 'free', pro: 'pro', member: 'member', retainer: 'retainer' };
// Coaching plans include everything in Pro.
export const hasPro = (plan) => plan === 'pro' || plan === 'member' || plan === 'retainer';

export async function getPlan(userId) {
  const row = await q(getDb().from('subscriptions').select('plan').eq('user_id', userId).maybeSingle());
  return PLANS[row?.plan] || 'free';
}

// Counts letters generated, not letters kept: students can delete documents, so counting
// those would reset the free allowance. generation_log is written only by this server.
export async function countLetters(userId) {
  const { count, error } = await getDb().from('generation_log').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('kind', 'cover_letter').eq('ok', true);
  if (error) throw new Error(`db: ${error.message}`);
  return count;
}

export async function countAiSince(userId, sinceIso) {
  const { count, error } = await getDb().from('generation_log').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('ok', true).gte('created_at', sinceIso);
  if (error) throw new Error(`db: ${error.message}`);
  return count;
}

export const getSubscription = (userId) => q(getDb().from('subscriptions')
  .select('plan, stripe_customer_id, stripe_subscription_id, status, current_period_end, cancel_at_period_end')
  .eq('user_id', userId).maybeSingle());

export const subscriptionByCustomer = (customerId) => q(getDb().from('subscriptions')
  .select('user_id, plan').eq('stripe_customer_id', customerId).maybeSingle());

export const upsertSubscription = (userId, patch) => q(getDb().from('subscriptions')
  .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }));

export const signedFileUrl = async (path) => {
  const { data, error } = await getDb().storage.from(config.bucket).createSignedUrl(path, 120, { download: true });
  if (error) throw new Error(`storage: ${error.message}`);
  return data.signedUrl;
};

export async function countGenerationsSince(userId, sinceIso) {
  const { count, error } = await getDb().from('generation_log').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).gte('created_at', sinceIso);
  if (error) throw new Error(`db: ${error.message}`);
  return count;
}

export const logGeneration = (row) => q(getDb().from('generation_log').insert(row));

export const getProfile = (userId) => q(getDb().from('users')
  .select('id, email, full_name, school, class_year, target_market, resume_data, resume_source, resume_file_path')
  .eq('id', userId).maybeSingle());

/** Updates the profile row, creating it if the user signed up before the 003 signup trigger existed. */
export async function saveProfile(user, patch) {
  const rows = await q(getDb().from('users').update(patch).eq('id', user.id).select('id'));
  if (rows.length) return;
  await q(getDb().from('users').insert({
    id: user.id, email: user.email, full_name: user.user_metadata?.full_name || null, ...patch,
  }));
}

export const getFirm = (id) => q(getDb().from('firms')
  .select('id, name, city, state, practice_areas, firm_type, notes').eq('id', id).maybeSingle());

export const getListing = (id) => q(getDb().from('listings')
  .select('id, firm_id, title, class_years, posting_type, summary').eq('id', id).maybeSingle());

// documents.created_at is a timestamp without time zone holding UTC; return it as explicit UTC.
const utc = (ts) => (ts && !/(Z|[+-]\d\d:?\d\d)$/.test(ts) ? `${ts}Z` : ts);

export async function insertDocument(row) {
  const doc = await q(getDb().from('documents').insert(row)
    .select('id, title, content, firm_id, listing_id, created_at').single());
  return { ...doc, created_at: utc(doc.created_at) };
}

export const uploadFile = (path, buf, contentType) => q(getDb().storage.from(config.bucket)
  .upload(path, buf, { contentType, upsert: false }));
