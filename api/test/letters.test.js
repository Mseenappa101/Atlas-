import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleLetter, cleanParagraphs, letterDate, letterTitle, letterIssues, letterPrompt, wordCount, LETTER_SCHEMA,
} from '../letters.js';

const firm = { name: 'Bracewell', city: 'Houston', state: 'TX' };

test('assembleLetter lays out the letter', () => {
  const text = assembleLetter({ date: 'October 15, 2026', firm, paragraphs: ['One.', 'Two.', 'Three.'], name: 'Ana Ruiz' });
  assert.equal(text, [
    'October 15, 2026', '', 'Recruiting Committee', 'Bracewell', 'Houston, TX', '',
    'Dear Recruiting Committee:', '', 'One.', '', 'Two.', '', 'Three.', '', 'Sincerely,', 'Ana Ruiz',
  ].join('\n'));
});

test('assembleLetter skips a missing city line', () => {
  const text = assembleLetter({ date: 'd', firm: { name: 'F' }, paragraphs: ['P'], name: 'N' });
  assert.ok(text.includes('F\n\nDear Recruiting Committee:'));
});

test('letterDate formats a long US date', () => {
  assert.equal(letterDate(new Date('2026-10-15T18:00:00Z')), 'October 15, 2026');
  // 02:00 UTC is still the previous evening in Central time.
  assert.equal(letterDate(new Date('2026-10-16T02:00:00Z')), 'October 15, 2026');
});

test('cleanParagraphs strips greetings, closings, bangs and junk', () => {
  assert.deepEqual(cleanParagraphs([
    'Dear Recruiting Committee:', ' I am a 1L!  Really. ', '', 7, 'Sincerely,', 'Thank you for your time.',
  ]), ['I am a 1L. Really.', 'Thank you for your time.']);
  assert.deepEqual(cleanParagraphs(null), []);
});

test('letterTitle', () => {
  assert.equal(letterTitle(firm, null), 'Bracewell — Summer position');
  assert.equal(letterTitle(firm, { title: '1L Summer Associate' }), 'Bracewell — 1L Summer Associate');
});

test('letterIssues flags clichés, length and paragraph count', () => {
  const ok = Array(3).fill('word '.repeat(100).trim());
  assert.deepEqual(letterIssues(ok), []);
  const bad = ['I am passionate about your esteemed firm.'];
  const issues = letterIssues(bad);
  assert.ok(issues.some((i) => i.includes('passionat')));
  assert.ok(issues.some((i) => i.includes('esteemed')));
  assert.ok(issues.some((i) => i.startsWith('length')));
  assert.ok(issues.some((i) => i.startsWith('paragraphs')));
  assert.equal(wordCount(' a  b\nc '), 3);
});

test('letterPrompt includes given facts and omits empty ones', () => {
  const p = letterPrompt({
    profile: { full_name: 'Ana', school: 'UH Law', class_year: '1L', target_market: '' },
    resume: { name: 'Ana Ruiz' },
    firm: { ...firm, practice_areas: ['Energy', 'Tax'], firm_type: null, notes: null },
    listing: null,
    notes: 'grew up in Houston',
  });
  assert.match(p, /practice_areas: Energy; Tax/);
  assert.match(p, /<student_notes>\ngrew up in Houston/);
  assert.match(p, /No specific posting/);
  assert.doesNotMatch(p, /target_market|firm_type|research_notes/);
  assert.equal(LETTER_SCHEMA.additionalProperties, false);
});
