import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeResume, resumeShapeError, cleanList, cleanStr, cleanAnswers, enforceBuilderFacts, hasContent, RESUME_SCHEMA, PARSE_SCHEMA,
} from '../resume.js';

const EMPTY = {
  name: '', email: '', phone: '', location: '', education: [], experience: [],
  skills: { languages: [], interests: [], other: [] },
};

test('sanitizeResume fills the full shape from junk', () => {
  for (const junk of [null, undefined, 'x', 42, [], { education: 'nope', skills: [] }]) {
    assert.deepEqual(sanitizeResume(junk), EMPTY);
  }
});

test('sanitizeResume cleans strings, lists and entries', () => {
  const r = sanitizeResume({
    name: '  Jane\n  Doe ', email: 7, phone: null, location: { x: 1 }, extra: 'dropped',
    education: [{ school: 'UT Law', gpa: 3.7, honors: 'Dean\'s List', activities: ['  • Moot Court', 'moot court', '', 5] }, {}, 'bad'],
    experience: [{ employer: 'Acme', bullets: ['- Did a thing', null] }, { title: '' }],
    skills: { languages: ['Spanish (fluent)'], interests: null, other: 'Excel' },
  });
  assert.equal(r.name, 'Jane Doe');
  assert.equal(r.email, '7');
  assert.equal(r.phone, '');
  assert.equal(r.location, '');
  assert.equal(r.extra, undefined);
  assert.deepEqual(r.education, [{
    school: 'UT Law', location: '', degree: '', date: '', gpa: '3.7', honors: ["Dean's List"], activities: ['Moot Court', '5'],
  }]);
  assert.deepEqual(r.experience, [{ employer: 'Acme', location: '', title: '', start: '', end: '', bullets: ['Did a thing'] }]);
  assert.deepEqual(r.skills, { languages: ['Spanish (fluent)'], interests: [], other: ['Excel'] });
  assert.ok(hasContent(r));
  assert.ok(!hasContent(EMPTY));
});

test('sanitizeResume caps sizes', () => {
  const r = sanitizeResume({
    name: 'x'.repeat(1000),
    experience: Array.from({ length: 40 }, (_, i) => ({ employer: `E${i}`, bullets: Array(20).fill(0).map((_, j) => `b${j}`) })),
  });
  assert.equal(r.name.length, 200);
  assert.equal(r.experience.length, 15);
  assert.equal(r.experience[0].bullets.length, 8);
});

test('cleanStr / cleanList', () => {
  assert.equal(cleanStr('a\u0000b c'), 'a b c');
  assert.equal(cleanStr(NaN), '');
  assert.deepEqual(cleanList(['A', 'a', ' b ']), ['A', 'b']);
});

test('resumeShapeError', () => {
  assert.equal(resumeShapeError(sanitizeResume({})), null);
  assert.equal(resumeShapeError({}), null);
  assert.match(resumeShapeError(null), /object/);
  assert.match(resumeShapeError({ name: 5 }), /name/);
  assert.match(resumeShapeError({ education: {} }), /education/);
  assert.match(resumeShapeError({ education: ['x'] }), /education/);
  assert.match(resumeShapeError({ experience: [{ bullets: 'one' }] }), /arrays/);
  assert.match(resumeShapeError({ skills: [] }), /skills/);
  assert.match(resumeShapeError({ experience: Array(16).fill({}) }), /Too many/);
});

test('schemas are strict objects', () => {
  const walk = (s) => {
    if (s.type === 'object') {
      assert.equal(s.additionalProperties, false);
      assert.deepEqual(s.required, Object.keys(s.properties));
      Object.values(s.properties).forEach(walk);
    }
    if (s.type === 'array') walk(s.items);
  };
  walk(RESUME_SCHEMA);
  walk(PARSE_SCHEMA);
  assert.equal(PARSE_SCHEMA.properties.is_resume.type, 'boolean');
});

test('cleanAnswers validates and trims', () => {
  assert.ok(cleanAnswers(null).error);
  assert.match(cleanAnswers({}).error, /name/);
  assert.match(cleanAnswers({ name: 'A' }).error, /school or job/);
  const { answers } = cleanAnswers({
    name: ' A ', law_school: { name: 'UT', gpa: 3.5, junk: 1 }, jobs: [{ employer: 'X', what_you_did: 'stuff' }, {}, 'bad'], hack: 1,
  });
  assert.equal(answers.name, 'A');
  assert.equal(answers.law_school.gpa, '3.5');
  assert.equal(answers.law_school.junk, undefined);
  assert.equal(answers.jobs.length, 1);
  assert.equal(answers.hack, undefined);
});

test('enforceBuilderFacts pins contact info, GPA and employers to the answers', () => {
  const { answers } = cleanAnswers({
    name: 'Ana Ruiz', email: 'ana@x.edu', law_school: { name: 'UH Law', gpa: '' },
    jobs: [{ employer: 'H-E-B', what_you_did: 'ran a register' }],
  });
  const r = enforceBuilderFacts(sanitizeResume({
    name: 'Ana M. Ruiz', email: 'wrong@x.com',
    education: [{ school: 'UH Law', gpa: '3.9' }],
    experience: [{ employer: 'HEB Grocery' }, { employer: 'Invented LLP' }, { employer: '', title: 'Volunteer' }],
  }), answers);
  assert.equal(r.name, 'Ana Ruiz');
  assert.equal(r.email, 'ana@x.edu');
  assert.equal(r.education[0].gpa, '');
  assert.deepEqual(r.experience.map((e) => e.employer), ['HEB Grocery', '']);

  const withGpa = cleanAnswers({ name: 'A', law_school: { name: 'UH', gpa: '3.62' } }).answers;
  assert.equal(enforceBuilderFacts(sanitizeResume({ education: [{ school: 'UH', gpa: '3.62' }] }), withGpa).education[0].gpa, '3.62');
});
