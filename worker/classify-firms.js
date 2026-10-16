// One-off: assign firm_type to firms that have none, and re-check boutiques (the 004 keyword split is rough).
// Uses the careers-page text the scraper already stored. Low-confidence answers are not written;
// they go to a review file instead.
//   node worker/classify-firms.js [--dry-run] [--all]

import { writeFileSync } from 'fs';
import { getDb, q, selectAll } from './db.js';
import { getClient, costUsd, MODEL } from './extract.js';

const TYPES = ['litigation-boutique', 'specialty-boutique', 'plaintiff', 'mid-size', 'regional', 'biglaw', 'government', 'public-interest'];

const SYSTEM = `You classify US law firms and legal employers for a directory used by law students. Pick exactly one type:
- litigation-boutique: small firm (usually under ~75 lawyers) whose practice is mainly litigation, trials or appeals.
- specialty-boutique: small or focused firm built around one non-litigation area (IP/patent, employment, tax, trusts and estates, venture, insurance coverage, environmental), even if it has many offices.
- plaintiff: mainly represents plaintiffs (personal injury, mass torts, class actions, contingency work).
- mid-size: roughly 50–300 lawyers with several practice areas, not tied to one region.
- regional: full-service firm rooted in one state or region, often its largest local firm.
- biglaw: large national or international firm (roughly AmLaw 200, 500+ lawyers).
- government: a government office or agency.
- public-interest: nonprofit, legal aid or advocacy organization.
Use the firm's name, offices, practice areas, size and the careers-page text. Use your general knowledge of well-known firms only when you are confident. confidence is "high" only when the evidence clearly supports one type.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['firm_type', 'confidence', 'reason'],
  properties: {
    firm_type: { type: 'string', enum: TYPES },
    confidence: { type: 'string', enum: ['high', 'low'] },
    reason: { type: 'string' },
  },
};

async function main() {
  const dry = process.argv.includes('--dry-run');
  const all = process.argv.includes('--all');
  const db = getDb();

  const firms = await selectAll((a, b) => db.from('firms').select('id, name, firm_type, practice_areas, size').range(a, b));
  const offices = await selectAll((a, b) => db.from('offices').select('firm_id, city, state').range(a, b));
  const sources = await selectAll((a, b) => db.from('sources').select('id, firm_id').range(a, b));
  const jobs = await selectAll((a, b) => db.from('extraction_jobs').select('source_id, page_text, created_at').order('created_at', { ascending: false }).range(a, b));

  const pageBySource = new Map();
  for (const j of jobs) if (j.page_text && !pageBySource.has(j.source_id)) pageBySource.set(j.source_id, j.page_text);

  const todo = firms.filter((f) => all || !f.firm_type || f.firm_type.endsWith('boutique'));
  console.log(`${todo.length} firm(s) to classify${dry ? ' (dry run)' : ''} with ${MODEL}`);

  const review = [];
  let cost = 0;
  let written = 0;
  for (const f of todo) {
    const where = offices.filter((o) => o.firm_id === f.id).map((o) => `${o.city}, ${o.state}`).join('; ');
    const page = sources.filter((s) => s.firm_id === f.id).map((s) => pageBySource.get(s.id)).find(Boolean) ?? '';
    const content = [
      `Firm: ${f.name}`,
      `Offices: ${where || 'unknown'}`,
      `Practice areas: ${(f.practice_areas ?? []).join('; ') || 'unknown'}`,
      `Size: ${f.size ?? 'unknown'}`,
      page ? `Careers page text:\n${page.slice(0, 4000)}` : 'Careers page text: none',
    ].join('\n');

    try {
      const msg = await getClient().messages.create({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: 'user', content }],
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      });
      cost += costUsd(msg.usage);
      const out = JSON.parse(msg.content.filter((b) => b.type === 'text').map((b) => b.text).join(''));
      const changed = out.firm_type !== f.firm_type;
      console.log(`${out.confidence === 'high' ? 'ok ' : 'LOW'} ${f.name.padEnd(42)} ${String(f.firm_type).padEnd(20)} -> ${out.firm_type}${changed ? '' : ' (same)'}`);
      if (out.confidence !== 'high') {
        review.push({ id: f.id, name: f.name, current: f.firm_type, suggested: out.firm_type, reason: out.reason });
        continue;
      }
      if (changed && !dry) {
        await q(db.from('firms').update({ firm_type: out.firm_type }).eq('id', f.id));
        written++;
      }
    } catch (e) {
      console.log(`FAIL ${f.name}: ${e.message}`);
    }
  }

  const file = new URL('./firm-type-review.json', import.meta.url);
  writeFileSync(file, JSON.stringify(review, null, 2));
  console.log(`\nwrote ${written} type(s); ${review.length} low-confidence left for review in worker/firm-type-review.json; cost $${cost.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
