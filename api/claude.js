import Anthropic from '@anthropic-ai/sdk';
import { config, MODEL, PRICE } from './config.js';
import { countGenerationsSince, logGeneration } from './db.js';
import { HttpError } from './http.js';

let client = null;
function getClient() {
  if (client) return client;
  if (!config.anthropicKey) throw new Error('ANTHROPIC_API_KEY not set');
  client = new Anthropic({ apiKey: config.anthropicKey, timeout: 120_000, maxRetries: 2 });
  return client;
}

export const costUsd = (inTok, outTok) => Number(((inTok * PRICE.input + outTok * PRICE.output) / 1e6).toFixed(6));

/** 429 once a user has made DAILY_GENERATION_CAP calls in the last 24h. */
export async function assertUnderDailyCap(userId) {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  if (await countGenerationsSince(userId, since) >= config.dailyCap) {
    throw new HttpError(429, 'daily_cap', `You've hit today's limit of ${config.dailyCap} generations. Try again tomorrow.`);
  }
}

const aiFailed = () => new HttpError(502, 'ai_failed', "We couldn't generate that just now. Please try again in a minute.");

/**
 * One structured-output call. Sonnet 5 runs adaptive thinking by default; effort steers depth.
 * Every attempt is logged to generation_log (ok=false on any failure). Returns the parsed JSON.
 */
export async function generateJson({ userId, kind, system, content, schema, effort, maxTokens = 16000 }) {
  let usage = null;
  let ok = false;
  try {
    const res = await getClient().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
      output_config: { effort, format: { type: 'json_schema', schema } },
    });
    usage = res.usage;
    if (res.stop_reason !== 'end_turn') throw aiFailed();
    const text = res.content.find((b) => b.type === 'text')?.text;
    let data;
    try { data = JSON.parse(text); } catch { throw aiFailed(); }
    ok = true;
    return { data, usage: { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens } };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error(`claude ${kind} failed:`, err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err.message);
    throw aiFailed();
  } finally {
    const inTok = usage?.input_tokens ?? null;
    const outTok = usage?.output_tokens ?? null;
    await logGeneration({
      user_id: userId, kind, ok, input_tokens: inTok, output_tokens: outTok,
      cost_usd: usage ? costUsd(inTok, outTok) : null,
    }).catch((e) => console.error('generation_log insert failed:', e.message));
  }
}
