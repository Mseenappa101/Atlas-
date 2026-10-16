import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(ROOT, '.env.local'), quiet: true });

const num = (v, d) => (v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);

export const config = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  usajobsKey: process.env.USAJOBS_API_KEY || null,
  cycleSeconds: num(process.env.WORKER_CYCLE_SECONDS, 300),
  concurrency: num(process.env.WORKER_CONCURRENCY, 8),
  sourcesPerCycle: num(process.env.WORKER_SOURCES_PER_CYCLE, 200),
  hostGapMs: num(process.env.WORKER_HOST_GAP_SECONDS, 10) * 1000,
  monthlyBudgetUsd: num(process.env.LLM_MONTHLY_BUDGET_USD, 40),
  extractMode: process.env.EXTRACT_MODE === 'direct' ? 'direct' : 'batch',
  contactEmail: 'mseenappa101@gmail.com',
};

export const USER_AGENT = `FirmwardBot/1.0 (+https://firmward.com; ${config.contactEmail})`;

let warned = false;
export function anthropicKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  if (process.env.VITE_ANTHROPIC_API_KEY) {
    if (!warned) console.warn('warn: using VITE_ANTHROPIC_API_KEY; rename it to ANTHROPIC_API_KEY (VITE_ vars can leak into the browser bundle)');
    warned = true;
    return process.env.VITE_ANTHROPIC_API_KEY;
  }
  return null;
}
