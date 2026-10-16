// Live Claude checks (spends a few cents). Run: node api/test/live-claude.js [outDir]
// Calls the same prompts/schemas the routes use. generation_log rows are attempted with a fake user id
// and fail harmlessly (FK); nothing else is written.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateJson, costUsd } from '../claude.js';
import { getFirm } from '../db.js';
import {
  PARSE_SCHEMA, PARSE_SYSTEM, RESUME_SCHEMA, BUILD_SYSTEM, sanitizeResume, cleanAnswers, answersForPrompt, enforceBuilderFacts,
} from '../resume.js';
import { docxText, MIME } from '../files.js';
import { SAMPLE_ANSWERS } from './sample-answers.js';
import {
  LETTER_SCHEMA, LETTER_SYSTEM, letterPrompt, cleanParagraphs, assembleLetter, letterDate, letterIssues, wordCount,
} from '../letters.js';

const out = process.argv[2] || join(tmpdir(), 'atlas-live');
mkdirSync(out, { recursive: true });
const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url));
const userId = '00000000-0000-0000-0000-000000000000';
const runs = [];

async function run(label, args) {
  const t0 = Date.now();
  const { data, usage } = await generateJson({ userId, ...args });
  const cost = costUsd(usage.input_tokens, usage.output_tokens);
  runs.push({ label, ...usage, cost, ms: Date.now() - t0 });
  console.log(`${label}: in ${usage.input_tokens} out ${usage.output_tokens} $${cost} ${Date.now() - t0}ms`);
  return data;
}


const pdfResume = sanitizeResume(await run('parse PDF', {
  kind: 'resume_parse', system: PARSE_SYSTEM, schema: PARSE_SCHEMA, effort: 'low',
  content: [{ type: 'document', source: { type: 'base64', media_type: MIME.pdf, data: fx('sample-resume.pdf').toString('base64') } },
    { type: 'text', text: 'Extract this resume into the JSON format.' }],
}));
writeFileSync(join(out, 'parsed-pdf.json'), JSON.stringify(pdfResume, null, 2));

const docxResume = sanitizeResume(await run('parse DOCX', {
  kind: 'resume_parse', system: PARSE_SYSTEM, schema: PARSE_SCHEMA, effort: 'low',
  content: [{ type: 'document', source: { type: 'text', media_type: 'text/plain', data: await docxText(fx('sample-resume.docx')) } },
    { type: 'text', text: 'Extract this resume into the JSON format.' }],
}));
writeFileSync(join(out, 'parsed-docx.json'), JSON.stringify(docxResume, null, 2));

const { answers } = cleanAnswers(SAMPLE_ANSWERS);
const built = enforceBuilderFacts(sanitizeResume(await run('build', {
  kind: 'resume_write', system: BUILD_SYSTEM, schema: RESUME_SCHEMA, effort: 'medium',
  content: `<answers>\n${answersForPrompt(answers)}\n</answers>\n\nBuild the resume JSON from these answers.`,
})), answers);
writeFileSync(join(out, 'built.json'), JSON.stringify(built, null, 2));

const firm = await getFirm(process.env.LETTER_FIRM_ID || '5416eaed-5aa6-45b2-ba38-b64d88633abd'); // Bracewell, Houston
writeFileSync(join(out, 'firm.json'), JSON.stringify(firm, null, 2));
const profile = { full_name: 'Daniel Okafor', school: 'University of Houston Law Center', class_year: '1L', target_market: 'Houston' };
for (const [label, notes] of [['letter (no notes)', ''], ['letter (notes)', 'Grew up in Pasadena, TX, east of Houston. Want to do energy regulatory work after three years in the field.']]) {
  const data = await run(label, {
    kind: 'cover_letter', system: LETTER_SYSTEM, schema: LETTER_SCHEMA, effort: 'medium',
    content: letterPrompt({ profile, resume: pdfResume, firm, listing: null, notes }),
  });
  const paragraphs = cleanParagraphs(data.paragraphs);
  const text = assembleLetter({ date: letterDate(), firm, paragraphs, name: pdfResume.name });
  console.log(`  words ${wordCount(paragraphs.join(' '))}, paragraphs ${paragraphs.length}, issues: ${letterIssues(paragraphs).join(', ') || 'none'}`);
  writeFileSync(join(out, `${notes ? 'letter-notes' : 'letter'}.txt`), text);
}

const total = runs.reduce((s, r) => s + r.cost, 0);
writeFileSync(join(out, 'usage.json'), JSON.stringify(runs, null, 2));
console.log(`total $${total.toFixed(4)}`);
