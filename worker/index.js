import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { fetchPage, closeBrowser } from './fetch.js';
import { sha256, matchesStudentTerms, detectAts } from './text.js';
import { fetchGreenhouse } from './ats/greenhouse.js';
import { fetchLever } from './ats/lever.js';
import { fetchUsajobs } from './ats/usajobs.js';
import {
  dueSources, updateSource, sourcesByIds, insertSources, startRun, finishRun,
  jobsByStatus, updateJob, updateJobs, queueJob, updateFirm, updateOffice,
} from './db.js';
import { buildPageText, extractDirect, submitBatch, collectBatch, MODEL } from './extract.js';
import { applyExtraction, closeAllForSource, listingKey } from './listings.js';
import { fitToBudget } from './budget.js';

const MAX_FAILURES = 10;
const ADAPTERS = { greenhouse: fetchGreenhouse, lever: fetchLever, usajobs: fetchUsajobs };

let stopping = false;
let wake = null;

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const short = (u) => u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 70);

function nextCheck(minutes) {
  const jitter = 1 + (Math.random() * 0.2 - 0.1);
  return new Date(Date.now() + minutes * 60_000 * jitter).toISOString();
}

// ─── ONE SOURCE ────────────────────────────────────────────────────────────

async function checkPage(source, stats) {
  const page = await fetchPage(source.url);
  const hash = sha256(page.text);
  const via = page.via === 'browser' ? ' [browser]' : '';

  // Discover ATS boards linked from the page; they get their own (LLM-free) sources.
  const ats = detectAts(page.html, page.links).map((a) => ({
    ...a, firm_id: source.firm_id, office_id: source.office_id, employer_name: source.employer_name, city: source.city, state: source.state,
  }));
  if (ats.length) {
    const added = await insertSources(ats);
    if (added.length) log(`  + discovered ${added.length} ATS source(s) on ${short(source.url)}`);
  }

  if (hash === source.last_content_hash) {
    // Unchanged page still counts as a fresh check of what we show for the firm.
    const verified = { last_verified_at: new Date().toISOString() };
    if (source.firm_id) await updateFirm(source.firm_id, verified);
    if (source.office_id) await updateOffice(source.office_id, verified);
    return { status: `unchanged${via}` };
  }
  stats.pages_changed++;
  const patch = { last_content_hash: hash, last_changed_at: new Date().toISOString() };

  if (!matchesStudentTerms(page.text)) {
    const closed = await closeAllForSource(source.id);
    stats.listings_closed += closed;
    return { patch, status: `changed, no student terms${closed ? `, closed ${closed}` : ''}${via}` };
  }
  await queueJob(source.id, hash, buildPageText(page));
  stats.jobs_queued++;
  return { patch, status: `changed, queued extraction (${page.text.length} chars)${via}` };
}

async function checkAts(source, stats) {
  const extraction = await ADAPTERS[source.kind](source);
  const hash = sha256(extraction.listings.map(listingKey).sort().join('\n'));
  if (hash === source.last_content_hash) return { status: `unchanged (${extraction.listings.length} roles)` };
  stats.pages_changed++;
  const { opened, closed } = await applyExtraction(source, extraction);
  stats.listings_opened += opened;
  stats.listings_closed += closed;
  return {
    patch: { last_content_hash: hash, last_changed_at: new Date().toISOString() },
    status: `${extraction.listings.length} roles, +${opened} -${closed}`,
  };
}

async function processSource(source, stats) {
  const t0 = Date.now();
  const now = new Date().toISOString();
  try {
    const { patch = {}, status } = source.kind === 'page' ? await checkPage(source, stats) : await checkAts(source, stats);
    await updateSource(source.id, {
      ...patch, last_checked_at: now, last_status: status.slice(0, 200), consecutive_failures: 0,
      next_check_at: nextCheck(source.check_interval_minutes || 480),
    });
    log(`ok   ${short(source.url)} — ${status} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    stats.errors++;
    const failures = (source.consecutive_failures || 0) + 1;
    // Backoff: 1h, 2h, 4h ... capped at 7 days.
    const delayMin = Math.min(60 * 2 ** (failures - 1), 7 * 24 * 60);
    const active = failures < MAX_FAILURES;
    await updateSource(source.id, {
      last_checked_at: now, last_status: `error: ${e.message}`.slice(0, 200), consecutive_failures: failures,
      next_check_at: nextCheck(delayMin), active,
    }).catch((err) => log(`warn: could not record failure for ${source.id}: ${err.message}`));
    log(`FAIL ${short(source.url)} — ${e.message} (failure ${failures}${active ? '' : ', deactivated'})`);
  }
}

async function pool(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length && !stopping) await fn(items[i++]);
  });
  await Promise.all(workers);
}

// ─── EXTRACTION ────────────────────────────────────────────────────────────

async function withSources(jobs) {
  const sources = await sourcesByIds([...new Set(jobs.map((j) => j.source_id))]);
  const byId = new Map(sources.map((s) => [s.id, s]));
  return jobs.map((j) => ({ ...j, source: byId.get(j.source_id) })).filter((j) => j.source);
}

async function finishJob(job, r, stats) {
  const finished_at = new Date().toISOString();
  const usage = r.usage ? { input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens, cost_usd: r.cost } : {};
  if (!r.ok) {
    await updateJob(job.id, { status: 'failed', error: r.error?.slice(0, 500), finished_at, ...usage });
    // Expired/errored batch requests: forget the hash so the next check re-queues the page.
    if (r.error?.startsWith('batch ')) await updateSource(job.source_id, { last_content_hash: null });
    stats.errors++;
    log(`FAIL extract ${short(job.source.url)} — ${r.error}`);
    return;
  }
  const { opened, closed } = await applyExtraction(job.source, r.result);
  stats.listings_opened += opened;
  stats.listings_closed += closed;
  await updateJob(job.id, { status: 'done', finished_at, error: null, ...usage });
  log(`ok   extract ${short(job.source.url)} — ${r.result.listings.length} roles, +${opened} -${closed}, $${r.cost}`);
}

async function pollBatches(stats) {
  const submitted = await withSources(await jobsByStatus('submitted'));
  const byBatch = new Map();
  for (const j of submitted) (byBatch.get(j.batch_id) || byBatch.set(j.batch_id, []).get(j.batch_id)).push(j);
  for (const [batchId, jobs] of byBatch) {
    const results = await collectBatch(batchId, new Map(jobs.map((j) => [j.id, j.page_text])));
    if (!results) { log(`batch ${batchId}: still processing (${jobs.length} jobs)`); continue; }
    const jobById = new Map(jobs.map((j) => [j.id, j]));
    for (const r of results) {
      const job = jobById.get(r.jobId);
      if (job) await finishJob(job, r, stats).catch((e) => { stats.errors++; log(`FAIL apply ${r.jobId}: ${e.message}`); });
    }
    log(`batch ${batchId}: processed ${results.length} results`);
  }
}

function isTransient(e) {
  if (!(e instanceof Anthropic.APIError)) return e?.name === 'APIConnectionError';
  if (e instanceof Anthropic.APIConnectionError || e instanceof Anthropic.RateLimitError) return true;
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return true;
  if (e.status >= 500) return true;
  return e.status === 400 && /credit balance/i.test(e.message);
}

async function runExtraction(stats, notes) {
  const queued = await withSources(await jobsByStatus('queued'));
  if (!queued.length) return;
  const batch = config.extractMode === 'batch';
  const { allowed, over, spend } = await fitToBudget(queued, { batch });
  if (over.length) {
    await updateJobs(over.map((j) => j.id), { status: 'skipped', error: 'monthly LLM budget reached', finished_at: new Date().toISOString() });
    const msg = `budget: skipped ${over.length} job(s); month spend $${spend.total.toFixed(2)} of $${spend.budget}`;
    notes.push(msg);
    log(`warn: ${msg}`);
  }
  if (!allowed.length) return;

  if (batch) {
    const batchId = await submitBatch(allowed);
    await updateJobs(allowed.map((j) => j.id), { status: 'submitted', batch_id: batchId });
    log(`batch ${batchId}: submitted ${allowed.length} job(s) to ${MODEL}`);
    return;
  }
  for (const job of allowed) {
    if (stopping) break;
    try {
      const r = await extractDirect(job.source, job.page_text);
      await finishJob(job, { ok: true, ...r }, stats);
    } catch (e) {
      // Rate limits, overload, outages, billing: leave the job queued and retry next cycle.
      if (isTransient(e)) { notes.push(`extract paused: ${e.message.slice(0, 200)}`); log(`warn: extraction paused — ${e.message}`); break; }
      await finishJob(job, { ok: false, error: e.message }, stats);
    }
  }
}

// ─── CYCLE / LOOP ──────────────────────────────────────────────────────────

async function cycle() {
  const stats = { sources_checked: 0, pages_changed: 0, jobs_queued: 0, listings_opened: 0, listings_closed: 0, errors: 0 };
  const notes = [];
  const runId = await startRun();
  try {
    if (config.extractMode === 'batch') await pollBatches(stats).catch((e) => { stats.errors++; notes.push(`poll: ${e.message}`); log(`FAIL poll batches: ${e.message}`); });

    const sources = await dueSources(config.sourcesPerCycle);
    log(`cycle: ${sources.length} due source(s)`);
    await pool(sources, config.concurrency, async (s) => { await processSource(s, stats); stats.sources_checked++; });

    if (!stopping) await runExtraction(stats, notes).catch((e) => { stats.errors++; notes.push(`extract: ${e.message}`); log(`FAIL extraction: ${e.message}`); });
  } finally {
    await finishRun(runId, { ...stats, notes: notes.join('\n') || null });
    log(`cycle done: ${JSON.stringify(stats)}`);
  }
}

async function main() {
  const once = process.argv.includes('--once');
  const stop = (sig) => { if (!stopping) log(`${sig}: finishing current work, then exiting`); stopping = true; wake?.(); };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));

  log(`atlas worker: mode=${config.extractMode} cycle=${config.cycleSeconds}s concurrency=${config.concurrency} budget=$${config.monthlyBudgetUsd}/mo${once ? ' (once)' : ''}`);
  try {
    while (!stopping) {
      const started = Date.now();
      try { await cycle(); } catch (e) { log(`FAIL cycle: ${e.message}`); }
      if (once) break;
      const wait = config.cycleSeconds * 1000 - (Date.now() - started);
      if (wait > 0 && !stopping) await new Promise((r) => { wake = r; setTimeout(r, wait); });
    }
  } finally {
    await closeBrowser();
  }
  log('worker stopped');
}

if (process.argv.includes('--dry-run')) {
  const { dryRun } = await import('./dry-run.js');
  await dryRun(process.argv.slice(2)).finally(closeBrowser);
} else {
  await main();
}
