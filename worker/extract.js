import Anthropic from '@anthropic-ai/sdk';
import { anthropicKey } from './config.js';
import { truncateAroundHits, relevantLinks } from './text.js';

export const MODEL = 'claude-haiku-4-5';
const PRICE_IN = 1 / 1e6;   // $/token, list
const PRICE_OUT = 5 / 1e6;
const MAX_TOKENS = 4096;

let client = null;
export function getClient() {
  if (client) return client;
  const apiKey = anthropicKey();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  client = new Anthropic({ apiKey });
  return client;
}

// Stable system prompt. At ~600 tokens it is below Haiku 4.5's 4096-token cache minimum, so no cache_control.
const SYSTEM = `You extract law-student job opportunities from a law firm or legal employer's careers page for ATLAS, a directory for 1L/2L/3L law students.

Return listings only for roles open to CURRENT law students: summer associate programs, 1L/2L diversity or summer programs, law clerk positions for students, legal internships/externships, and student fellowships. Exclude lateral attorney, associate, partner, staff, paralegal and non-legal roles, and post-graduate positions that require a completed J.D. (judicial clerkships for graduates are excluded unless the page says students apply now as 3Ls).

Rules:
- Use only facts present on the page. Never invent dates, deadlines, locations or links. If a value is not stated, use null.
- class_years: which of 1L, 2L, 3L the role is open to, based on the page ("first-year" = 1L, "second-year" = 2L, "third-year" = 3L, "rising 2L" = currently a 1L applying for the summer after 1L, so 1L). If the page says "law students" without a year, use [].
- posting_type: summer-associate, law-clerk, intern, fellowship, extern, or other.
- window_start: date applications open (YYYY-MM-DD). deadline: application deadline (YYYY-MM-DD). If only a month and year are given, use null rather than guessing a day. If no year is stated, use null.
- apply_url: an absolute URL taken from the page's links that applies to or describes this specific role. Resolve relative links against the page URL. Prefer the listed links; null if none fits.
- city/state: the office for the role if stated; state as a 2-letter US code.
- summary: one sentence, at most 200 characters, describing the role and who may apply.
- rolling: true only if the page says applications are accepted or reviewed on a rolling basis.
- If one program covers several offices, return one listing with the office stated on the page, or city null if it spans many offices.
- If the page has no qualifying roles, return an empty listings array.

Firm fields (describe the employer, from this page only; use unknown/null/[] when the page doesn't say):
- hires_1l: yes if the page describes a 1L summer program or 1L hiring; no only if it explicitly says it does not hire 1Ls; otherwise unknown.
- firm_type: litigation-boutique (small firm focused on litigation/trials), specialty-boutique (small firm focused on one non-litigation area such as IP, employment, tax, trusts or venture), plaintiff (represents plaintiffs: personal injury, class actions, mass torts), mid-size (roughly 50–300 lawyers, several practice areas), regional (full-service firm rooted in one state or region), biglaw (large national or international firm), government, public-interest, or null if unclear.
- practice_areas: up to 4 main practice areas named on the page.
- size: attorney headcount or size description if stated (e.g. "250 attorneys"), else null.`;

const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });

export const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['listings', 'firm'],
  properties: {
    listings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'class_years', 'posting_type', 'city', 'state', 'window_start', 'deadline', 'apply_url', 'summary', 'rolling'],
        properties: {
          title: { type: 'string' },
          class_years: { type: 'array', items: { type: 'string', enum: ['1L', '2L', '3L'] } },
          posting_type: { type: 'string', enum: ['summer-associate', 'law-clerk', 'intern', 'fellowship', 'extern', 'other'] },
          city: nullable({ type: 'string' }),
          state: nullable({ type: 'string' }),
          window_start: nullable({ type: 'string', format: 'date' }),
          deadline: nullable({ type: 'string', format: 'date' }),
          apply_url: nullable({ type: 'string' }),
          summary: { type: 'string' },
          rolling: { type: 'boolean' },
        },
      },
    },
    firm: {
      type: 'object',
      additionalProperties: false,
      required: ['hires_1l', 'firm_type', 'practice_areas', 'size'],
      properties: {
        hires_1l: { type: 'string', enum: ['yes', 'no', 'unknown'] },
        firm_type: nullable({ type: 'string', enum: ['litigation-boutique', 'specialty-boutique', 'plaintiff', 'mid-size', 'regional', 'biglaw', 'government', 'public-interest'] }),
        practice_areas: { type: 'array', items: { type: 'string' } },
        size: nullable({ type: 'string' }),
      },
    },
  },
};

/** The text stored in extraction_jobs.page_text: page URL, relevant links, and the trimmed page body. */
export function buildPageText(page) {
  const links = relevantLinks(page.links).map((l) => `- ${l.text || '(no text)'} -> ${l.url}`).join('\n');
  return [
    `PAGE URL: ${page.url}`,
    page.title ? `PAGE TITLE: ${page.title}` : null,
    `RELEVANT LINKS:\n${links || '(none)'}`,
    `PAGE TEXT:\n${truncateAroundHits(page.text, 12000)}`,
  ].filter(Boolean).join('\n\n');
}

export function buildParams(source, pageText) {
  const today = new Date().toISOString().slice(0, 10);
  const who = [source.employer_name, [source.city, source.state].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `Employer: ${who}\nToday's date: ${today}\n\n${pageText}`,
    }],
    output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
  };
}

export function costUsd(usage, { batch = false } = {}) {
  const input = (usage.input_tokens || 0)
    + 1.25 * (usage.cache_creation_input_tokens || 0)
    + 0.1 * (usage.cache_read_input_tokens || 0);
  const cost = input * PRICE_IN + (usage.output_tokens || 0) * PRICE_OUT;
  return Number((batch ? cost / 2 : cost).toFixed(6));
}

/** Rough pre-call estimate (chars/4 + system + typical output) used by the budget guard. */
export function estimateCostUsd(pageText, { batch = true } = {}) {
  const input = Math.ceil((pageText?.length || 0) / 4) + 900;
  return costUsd({ input_tokens: input, output_tokens: 1000 }, { batch });
}

/** Message -> sanitized { listings, firm }. Throws on refusal/truncation/bad JSON. */
export function parseMessage(message, pageUrl, pageText = '') {
  if (message.stop_reason === 'refusal') throw new Error('model refused');
  if (message.stop_reason === 'max_tokens') throw new Error('output truncated (max_tokens)');
  const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return sanitize(JSON.parse(text), pageUrl, pageText);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = new Set(['summer-associate', 'law-clerk', 'intern', 'fellowship', 'extern', 'other']);
const FIRM_TYPES = new Set(['litigation-boutique', 'specialty-boutique', 'plaintiff', 'mid-size', 'regional', 'biglaw', 'government', 'public-interest']);

function absUrl(u, base) {
  if (!u) return null;
  try {
    const url = new URL(u, base);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch { return null; }
}

// A wrong "No" steers students away from a firm, so only accept it when the page says so in words.
const EXPLICIT_NO_1L = /\b(not|no|unable to)\b[^.]{0,60}\b(1Ls?|first[- ]year)\b|\b(1Ls?|first[- ]year)\b[^.]{0,60}\b(not eligible|ineligible|not (be )?considered|do(es)? not)\b/i;

export function sanitize(out, pageUrl, pageText = '') {
  const listings = (out.listings || []).filter((l) => l?.title?.trim()).map((l) => ({
    title: l.title.trim().slice(0, 200),
    class_years: [...new Set((l.class_years || []).filter((y) => ['1L', '2L', '3L'].includes(y)))].sort(),
    posting_type: TYPES.has(l.posting_type) ? l.posting_type : 'other',
    city: l.city?.trim() || null,
    state: /^[A-Za-z]{2}$/.test(l.state || '') ? l.state.toUpperCase() : null,
    window_start: DATE_RE.test(l.window_start || '') ? l.window_start : null,
    deadline: DATE_RE.test(l.deadline || '') ? l.deadline : null,
    apply_url: absUrl(l.apply_url, pageUrl),
    summary: (l.summary || '').trim().slice(0, 200) || null,
    rolling: l.rolling === true,
  }));
  const f = out.firm || {};
  const firm = {
    hires_1l: f.hires_1l === 'no' && !EXPLICIT_NO_1L.test(pageText) ? 'unknown'
      : ['yes', 'no', 'unknown'].includes(f.hires_1l) ? f.hires_1l : 'unknown',
    firm_type: FIRM_TYPES.has(f.firm_type) ? f.firm_type : null,
    practice_areas: (f.practice_areas || []).map((p) => String(p).trim()).filter(Boolean).slice(0, 4),
    size: f.size?.trim() || null,
  };
  return { listings, firm };
}

const pageUrlOf = (pageText) => pageText.match(/^PAGE URL: (.+)$/m)?.[1];

// ─── DIRECT (immediate) ────────────────────────────────────────────────────

export async function extractDirect(source, pageText) {
  const message = await getClient().messages.create(buildParams(source, pageText));
  return { result: parseMessage(message, pageUrlOf(pageText) || source.url, pageText), usage: message.usage, cost: costUsd(message.usage) };
}

// ─── BATCHES (50% off) ─────────────────────────────────────────────────────

/** jobs: [{ id, page_text, source }] -> batch id. custom_id = job id. */
export async function submitBatch(jobs) {
  const batch = await getClient().messages.batches.create({
    requests: jobs.map((j) => ({ custom_id: j.id, params: buildParams(j.source, j.page_text) })),
  });
  return batch.id;
}

/** Returns null while processing; otherwise an array of { jobId, ok, result|error, usage, cost }. */
export async function collectBatch(batchId, pageTextById) {
  const c = getClient();
  const batch = await c.messages.batches.retrieve(batchId);
  if (batch.processing_status !== 'ended') return null;
  const out = [];
  for await (const r of await c.messages.batches.results(batchId)) {
    const jobId = r.custom_id;
    if (r.result.type !== 'succeeded') {
      const err = r.result.type === 'errored' ? `${r.result.error?.error?.type || r.result.error?.type || 'error'}` : r.result.type;
      out.push({ jobId, ok: false, error: `batch ${err}` });
      continue;
    }
    const message = r.result.message;
    const cost = costUsd(message.usage, { batch: true });
    try {
      const text = pageTextById.get(jobId) || '';
      const result = parseMessage(message, pageUrlOf(text), text);
      out.push({ jobId, ok: true, result, usage: message.usage, cost });
    } catch (e) {
      out.push({ jobId, ok: false, error: e.message, usage: message.usage, cost });
    }
  }
  return out;
}
