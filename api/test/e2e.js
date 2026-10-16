// End-to-end over HTTP against the live Supabase project. Needs migration 003.
// Run: node api/test/e2e.js            (no Claude spend; seeds rows to reach 402 / 429)
//      E2E_CLAUDE=1 node api/test/e2e.js (also parse PDF/DOCX, build, and 3 real letters)
// Creates one throwaway auth user and deletes everything it made, even on failure.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { config, ROOT } from '../config.js';
import { getDb } from '../db.js';

const CLAUDE = process.env.E2E_CLAUDE === '1';
const PORT = 8799;
const BASE = `http://localhost:${PORT}`;
const BRACEWELL = '5416eaed-5aa6-45b2-ba38-b64d88633abd';
const db = getDb();
const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url));

let pass = 0;
const fails = [];
function check(name, cond, info = '') {
  if (cond) { pass++; console.log(`  ok  ${name}`); } else { fails.push(name); console.log(`  FAIL ${name} ${info}`); }
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const file = (name, buf, mime) => ({ file_base64: buf.toString('base64'), file_name: name, mime_type: mime });

const ts = Date.now();
const email = `atlas-test+${ts}@example.com`;
const password = `T3st-${ts}-${Math.random().toString(36).slice(2)}`;
let userId = null;
let server = null;
let serverLog = '';

async function cleanup() {
  if (server) server.kill('SIGTERM');
  if (!userId) return;
  const files = (await db.storage.from(config.bucket).list(userId)).data || [];
  if (files.length) await db.storage.from(config.bucket).remove(files.map((f) => `${userId}/${f.name}`));
  await db.from('documents').delete().eq('user_id', userId);
  await db.from('generation_log').delete().eq('user_id', userId);
  await db.from('waitlist_subscribers').delete().eq('email', email);
  const { error } = await db.auth.admin.deleteUser(userId); // cascades users -> subscriptions
  if (error) console.log('deleteUser:', error.message);
  const left = await Promise.all([
    db.from('users').select('id', { count: 'exact', head: true }).eq('id', userId),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('generation_log').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('waitlist_subscribers').select('id', { count: 'exact', head: true }).eq('email', email),
    db.storage.from(config.bucket).list(userId),
  ]);
  const counts = left.slice(0, 5).map((r) => r.count);
  console.log(`cleanup: users/subs/docs/log/waitlist left = ${counts.join('/')}, storage files left = ${left[5].data?.length ?? 0}`);
}

async function main() {
  // ─── user + trigger ───
  const { data: created, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: 'Daniel Okafor', school: 'University of Houston Law Center', class_year: '1L', target_market: 'Houston' },
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  userId = created.user.id;
  console.log(`test user ${userId.slice(0, 8)}`);
  const profile = (await db.from('users').select('*').eq('id', userId).maybeSingle()).data;
  check('trigger created users row with metadata', profile?.full_name === 'Daniel Okafor' && profile?.class_year === '1L' && profile?.school);
  const sub = (await db.from('subscriptions').select('plan').eq('user_id', userId).maybeSingle()).data;
  check('trigger created free subscription', sub?.plan === 'free');
  const wl = (await db.from('waitlist_subscribers').select('source').eq('email', email).maybeSingle()).data;
  check('trigger created waitlist row', wl?.source === 'atlas-profile');

  const anon = createClient(config.supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: session, error: signErr } = await anon.auth.signInWithPassword({ email, password });
  if (signErr) throw new Error(`signIn: ${signErr.message}`);
  const token = session.session.access_token;

  // ─── server ───
  server = spawn(process.execPath, ['api/index.js'], { cwd: ROOT, env: { ...process.env, API_PORT: String(PORT) } });
  server.stdout.on('data', (d) => { serverLog += d; });
  server.stderr.on('data', (d) => { serverLog += d; });
  for (let i = 0; i < 50; i++) {
    if (await fetch(`${BASE}/api/health`).then((r) => r.ok, () => false)) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  // ─── auth + basics ───
  let r = await call('GET', '/api/health');
  check('health', r.status === 200 && r.json.ok === true);
  r = await call('GET', '/api/me/usage');
  check('401 without token', r.status === 401 && r.json.error === 'unauthorized');
  r = await call('GET', '/api/me/usage', { token: 'not-a-token' });
  check('401 with bad token', r.status === 401);
  r = await call('GET', '/api/me/usage', { token });
  check('usage fresh user', r.status === 200 && r.json.plan === 'free' && r.json.letters_used === 0 && r.json.letters_limit === 3, JSON.stringify(r.json));

  r = await call('POST', '/api/letters', { token, body: { firm_id: BRACEWELL } });
  check('409 no_resume', r.status === 409 && r.json.error === 'no_resume');
  r = await call('POST', '/api/letters', { token, body: {} });
  check('400 letter without ids', r.status === 400);
  r = await call('POST', '/api/letters', { token, body: { firm_id: BRACEWELL, notes: 'x'.repeat(1001) } });
  check('400 notes too long', r.status === 400);

  r = await call('POST', '/api/resume/parse', { token, body: file('resume.txt', Buffer.from('Daniel Okafor\nEducation...'), 'text/plain') });
  check('415 text file', r.status === 415 && r.json.error === 'unsupported_file');
  r = await call('POST', '/api/resume/parse', { token, body: file('resume.pdf', Buffer.from('GIF89a........'), 'application/pdf') });
  check('415 lying mime type', r.status === 415);
  r = await call('POST', '/api/resume/parse', { token, body: file('big.pdf', Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(5.5 * 1024 * 1024)]), 'application/pdf') });
  check('413 file over 5 MB', r.status === 413, `${r.status}`);
  r = await call('POST', '/api/resume/parse', { token, body: { file_base64: '***' } });
  check('400 bad base64', r.status === 400);

  r = await call('PUT', '/api/resume', { token, body: { resume: { education: 'nope' } } });
  check('PUT invalid shape 400', r.status === 400 && r.json.error === 'invalid_resume');
  r = await call('PUT', '/api/resume', { token, body: { resume: {
    name: 'Daniel Okafor', email: 'daniel.okafor@example.edu', phone: '', location: 'Houston, TX',
    education: [{ school: 'University of Houston Law Center', location: 'Houston, TX', degree: 'J.D. Candidate', date: 'May 2029', gpa: '', honors: [], activities: ['Energy Law Society'] }],
    experience: [{ employer: 'Brazos Midstream Services', location: 'Houston, TX', title: 'Field Engineer', start: 'June 2023', end: 'July 2026', bullets: ['Reviewed pipeline right-of-way agreements'] }],
    skills: { languages: ['Spanish'], interests: [], other: [] }, junk: 'dropped',
  } } });
  check('PUT valid resume', r.status === 200 && r.json.resume.education.length === 1 && !('junk' in r.json.resume));
  const afterPut = (await db.from('users').select('resume_data, resume_source').eq('id', userId).single()).data;
  check('PUT saved, source unchanged', afterPut.resume_data?.name === 'Daniel Okafor' && afterPut.resume_source === null);

  if (CLAUDE) await claudeFlows(token);
  else await seededLimits(token);

  // ─── daily cap (seeded rows, no spend) ───
  const have = (await db.from('generation_log').select('id', { count: 'exact', head: true }).eq('user_id', userId)).count;
  const need = Math.max(0, config.dailyCap - have);
  if (need) await db.from('generation_log').insert(Array.from({ length: need }, () => ({ user_id: userId, kind: 'resume_write', ok: true })));
  r = await call('POST', '/api/resume/build', { token, body: { answers: { name: 'A', law_school: { name: 'UH' } } } });
  check('429 daily_cap', r.status === 429 && r.json.error === 'daily_cap', `${r.status} ${JSON.stringify(r.json)}`);

  // ─── logs ───
  check('server log has no resume text or tokens', !/Okafor|right-of-way|Bearer|eyJ/.test(serverLog));
}

/** No Claude: insert 3 letters directly, then the 4th request must be refused. */
async function seededLimits(token) {
  await db.from('documents').insert([1, 2, 3].map((i) => ({ user_id: userId, firm_id: BRACEWELL, type: 'cover_letter', title: `seed ${i}`, content: 'seed' })));
  let r = await call('GET', '/api/me/usage', { token });
  check('usage counts letters', r.json.letters_used === 3);
  r = await call('POST', '/api/letters', { token, body: { firm_id: BRACEWELL } });
  check('402 limit_reached', r.status === 402 && r.json.error === 'limit_reached' && r.json.used === 3 && r.json.limit === 3, JSON.stringify(r.json));
  await db.from('subscriptions').update({ plan: 'member' }).eq('user_id', userId);
  r = await call('GET', '/api/me/usage', { token });
  check('member has no limit', r.json.plan === 'member' && r.json.letters_limit === null);
  await db.from('subscriptions').update({ plan: 'free' }).eq('user_id', userId);
}

async function claudeFlows(token) {
  const { SAMPLE_ANSWERS } = await import('./sample-answers.js');
  const report = [];
  const timed = async (label, fn) => { const t0 = Date.now(); const r = await fn(); report.push(`${label} ${r.status} ${Date.now() - t0}ms`); return r; };

  let r = await timed('parse pdf', () => call('POST', '/api/resume/parse', { token, body: file('Daniel Okafor Resume.pdf', fx('sample-resume.pdf'), 'application/pdf') }));
  check('parse PDF', r.status === 200 && r.json.resume.name === 'Daniel Okafor' && r.json.resume.experience.length === 2, JSON.stringify(r.json).slice(0, 300));
  let row = (await db.from('users').select('resume_source, resume_file_path').eq('id', userId).single()).data;
  check('parse saved upload + file path', row.resume_source === 'upload' && row.resume_file_path?.startsWith(`${userId}/`) && row.resume_file_path.endsWith('-Daniel-Okafor-Resume.pdf'));
  const stored = (await db.storage.from(config.bucket).list(userId)).data;
  check('original stored in bucket', stored?.length === 1);

  r = await timed('parse docx', () => call('POST', '/api/resume/parse', { token, body: file('resume.docx', fx('sample-resume.docx'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') }));
  check('parse DOCX', r.status === 200 && r.json.resume.education.length === 2, JSON.stringify(r.json).slice(0, 300));

  r = await timed('parse non-resume', () => call('POST', '/api/resume/parse', { token, body: file('letter.pdf', fx('not-a-resume.pdf'), 'application/pdf') }));
  check('422 not_a_resume', r.status === 422 && r.json.error === 'not_a_resume', `${r.status}`);

  r = await timed('build', () => call('POST', '/api/resume/build', { token, body: { answers: SAMPLE_ANSWERS } }));
  check('build', r.status === 200 && r.json.resume.name === 'Priya Natarajan' && r.json.resume.experience.length === 2, JSON.stringify(r.json).slice(0, 300));
  row = (await db.from('users').select('resume_source').eq('id', userId).single()).data;
  check('build saved source builder', row.resume_source === 'builder');

  // Back to Daniel's resume for letters.
  await call('POST', '/api/resume/parse', { token, body: file('resume.pdf', fx('sample-resume.pdf'), 'application/pdf') });

  const listing = (await db.from('listings').select('id, firm_id').eq('status', 'open').not('firm_id', 'is', null).limit(1).single()).data;
  r = await timed('letter firm', () => call('POST', '/api/letters', { token, body: { firm_id: BRACEWELL } }));
  check('letter 1 (firm only)', r.status === 200 && r.json.document.title === 'Bracewell — Summer position' && r.json.usage.letters_used === 1, JSON.stringify(r.json).slice(0, 300));
  r = await timed('letter notes', () => call('POST', '/api/letters', { token, body: { firm_id: BRACEWELL, notes: 'Grew up in Pasadena, TX, east of Houston. Want energy regulatory work.' } }));
  check('letter 2 (notes)', r.status === 200 && r.json.usage.letters_used === 2);
  r = await timed('letter listing', () => call('POST', '/api/letters', { token, body: { listing_id: listing.id } }));
  check('letter 3 (listing only -> its firm)', r.status === 200 && r.json.document.firm_id === listing.firm_id && r.json.document.listing_id === listing.id);
  r = await call('POST', '/api/letters', { token, body: { firm_id: BRACEWELL } });
  check('402 after 3 letters', r.status === 402 && r.json.error === 'limit_reached' && r.json.used === 3);

  const logs = (await db.from('generation_log').select('kind, ok, input_tokens, output_tokens, cost_usd').eq('user_id', userId)).data;
  check('generation_log rows with cost', logs.length >= 7 && logs.every((l) => l.ok ? l.cost_usd > 0 : true));
  console.log(report.join('\n'));
  console.table(logs);
}

try {
  await main();
} catch (e) {
  fails.push(e.message);
  console.log('ERROR', e.message);
} finally {
  await cleanup();
  console.log(`\n${pass} passed, ${fails.length} failed${fails.length ? `: ${fails.join('; ')}` : ''}`);
  if (fails.length) console.log(serverLog);
  process.exit(fails.length ? 1 : 0);
}
