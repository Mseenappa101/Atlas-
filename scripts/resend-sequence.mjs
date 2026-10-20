// Uploads the welcome-sequence emails (day 2 and day 4, from api/emails.js) to Resend as published
// Templates, so a Resend Automation can send them. Safe to re-run: existing templates are updated.
// Re-run after editing the copy or the Sprint dates (day 4 names the next cohort).
//   RESEND_API_KEY=re_… node scripts/resend-sequence.mjs
//
// Then, once, in Resend → Automations → New automation:
//   Trigger: event "firmward.subscribed"  (sent by /api/subscribe for every new signup)
//   → Delay 2 days → Send email: "firmward-welcome-day-2"
//   → Delay 2 days → Send email: "firmward-welcome-day-4"
//   Enable it.
import { config } from '../api/config.js';
import { sequenceDay2, sequenceDay4 } from '../api/emails.js';

if (!config.resendKey) {
  console.error('Set RESEND_API_KEY (in .env.local or the environment) first.');
  process.exit(1);
}
const headers = { Authorization: `Bearer ${config.resendKey}`, 'Content-Type': 'application/json' };
const call = async (method, path, body) => {
  const res = await fetch(`https://api.resend.com${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${json.message ?? ''}`);
  return json;
};

const TEMPLATES = [
  { alias: 'firmward-welcome-day-2', name: 'Firmward welcome — day 2', email: sequenceDay2({ name: '' }) },
  { alias: 'firmward-welcome-day-4', name: 'Firmward welcome — day 4', email: sequenceDay4({ name: '' }) },
];

const existing = (await call('GET', '/templates?limit=100')).data ?? [];
for (const t of TEMPLATES) {
  const body = { name: t.name, alias: t.alias, subject: t.email.subject, html: t.email.html, text: t.email.text, from: config.emailFrom, ...(config.michaelEmail ? { reply_to: config.michaelEmail } : {}) };
  const found = existing.find((x) => x.alias === t.alias || x.name === t.name);
  const id = found ? (await call('PATCH', `/templates/${found.id}`, body), found.id) : (await call('POST', '/templates', body)).id;
  await call('POST', `/templates/${id}/publish`);
  console.log(`${found ? 'updated' : 'created'} and published ${t.alias} (${id})`);
}
