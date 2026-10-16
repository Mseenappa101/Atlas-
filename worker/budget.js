import { config } from './config.js';
import { getDb, q, selectAll } from './db.js';
import { estimateCostUsd } from './extract.js';

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};

/** Spend so far this calendar month (UTC) plus an estimate for batches still in flight. */
export async function monthSpend() {
  const db = getDb();
  const done = await selectAll((a, b) => db.from('extraction_jobs').select('cost_usd')
    .gte('finished_at', monthStart()).not('cost_usd', 'is', null).range(a, b));
  const spent = done.reduce((s, r) => s + Number(r.cost_usd), 0);
  const inflight = await q(db.from('extraction_jobs').select('page_text').eq('status', 'submitted'));
  const pending = inflight.reduce((s, r) => s + estimateCostUsd(r.page_text, { batch: true }), 0);
  return { spent, pending, total: spent + pending, budget: config.monthlyBudgetUsd };
}

/** Splits jobs into those that fit under the remaining budget and those that don't. */
export async function fitToBudget(jobs, { batch }) {
  const s = await monthSpend();
  let room = s.budget - s.total;
  const allowed = [];
  const over = [];
  for (const j of jobs) {
    const est = estimateCostUsd(j.page_text, { batch });
    if (est <= room) { allowed.push(j); room -= est; } else over.push(j);
  }
  return { allowed, over, spend: s };
}
