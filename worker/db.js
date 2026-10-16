import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

let db = null;
export function getDb() {
  if (db) return db;
  if (!config.supabaseUrl || !config.supabaseKey) throw new Error('VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
  db = createClient(config.supabaseUrl, config.supabaseKey, { auth: { persistSession: false } });
  return db;
}

/** Unwraps a supabase response, throwing on error. */
export async function q(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`db: ${error.message}`);
  return data;
}

/** Selects every row of a query, paging past PostgREST's 1000-row cap. build = (from, to) => query. */
export async function selectAll(build, page = 1000) {
  const rows = [];
  for (let from = 0; ; from += page) {
    const batch = await q(build(from, from + page - 1));
    rows.push(...batch);
    if (batch.length < page) return rows;
  }
}

export const dueSources = (limit) => q(getDb().from('sources').select('*')
  .eq('active', true).lte('next_check_at', new Date().toISOString())
  .order('next_check_at', { ascending: true }).limit(limit));

export const updateSource = (id, patch) => q(getDb().from('sources').update(patch).eq('id', id));

export const sourcesByIds = (ids) => (ids.length
  ? q(getDb().from('sources').select('*').in('id', ids)) : Promise.resolve([]));

/** Inserts sources, ignoring URLs that already exist. */
export const insertSources = (rows) => (rows.length
  ? q(getDb().from('sources').upsert(rows, { onConflict: 'url', ignoreDuplicates: true }).select('id'))
  : Promise.resolve([]));

export const startRun = async () => (await q(getDb().from('scrape_runs').insert({}).select('id').single())).id;
export const finishRun = (id, stats) => q(getDb().from('scrape_runs')
  .update({ ...stats, finished_at: new Date().toISOString() }).eq('id', id));

export const jobsByStatus = (status, limit = 5000) => q(getDb().from('extraction_jobs')
  .select('id, source_id, content_hash, page_text, batch_id, created_at').eq('status', status)
  .order('created_at', { ascending: true }).limit(limit));

export const updateJobs = (ids, patch) => (ids.length
  ? q(getDb().from('extraction_jobs').update(patch).in('id', ids)) : Promise.resolve());

export const updateJob = (id, patch) => q(getDb().from('extraction_jobs').update(patch).eq('id', id));

/** Queues a job for a changed page; any older queued job for the same source is superseded. */
export async function queueJob(sourceId, contentHash, pageText) {
  await q(getDb().from('extraction_jobs').update({ status: 'skipped', error: 'superseded', finished_at: new Date().toISOString() })
    .eq('source_id', sourceId).eq('status', 'queued'));
  return (await q(getDb().from('extraction_jobs')
    .insert({ source_id: sourceId, content_hash: contentHash, page_text: pageText }).select('id').single())).id;
}

export const updateFirm = (id, patch) => q(getDb().from('firms').update(patch).eq('id', id));

export const updateOffice = (id, patch) => q(getDb().from('offices').update(patch).eq('id', id));
