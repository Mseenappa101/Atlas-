import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.TOKEN_ENCRYPTION_KEY ||= 'test-key-0123456789-0123456789-0123456789';
const { encrypt, decrypt, signState, verifyState } = await import('../crypto.js');
const { buildMime } = await import('../mail.js');
const { letterPdf, resumePdf } = await import('../pdf.js');
const { pickRecruitingEmail, onPage, isEmail } = await import('../../worker/recruiting-email.js');

test('tokens round-trip and tampering is detected', () => {
  const blob = encrypt('1//refresh-token');
  assert.notEqual(blob, encrypt('1//refresh-token')); // fresh IV each time
  assert.equal(decrypt(blob), '1//refresh-token');
  const parts = blob.split('.');
  parts[3] = Buffer.from('tampered').toString('base64url');
  assert.throws(() => decrypt(parts.join('.')));
});

test('OAuth state is signed and can’t be edited', () => {
  const state = signState({ u: 'user-1', p: 'gmail', r: '/apply/x' });
  assert.deepEqual({ ...verifyState(state), t: 0, n: 0 }, { u: 'user-1', p: 'gmail', r: '/apply/x', t: 0, n: 0 });
  const [body, sig] = state.split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url')), u: 'someone-else' })).toString('base64url');
  assert.equal(verifyState(`${forged}.${sig}`), null);
  assert.equal(verifyState('garbage'), null);
  assert.equal(verifyState(undefined), null);
});

test('MIME message carries headers, both bodies and attachments', () => {
  const raw = buildMime({
    fromName: 'Doe, Jane', fromEmail: 'jane@school.edu', to: 'recruiting@firm.com', cc: ['mentor@school.edu'],
    subject: 'Application — 1L Summer Associate', text: 'Hello\n\nThanks', html: '<p>Hello</p>',
    attachments: [{ filename: 'Jane Doe - Resume.pdf', mime: 'application/pdf', content: Buffer.from('%PDF-1.7 test') }],
  });
  assert.match(raw, /^From: "Doe, Jane" <jane@school\.edu>\r\n/);
  assert.match(raw, /\r\nTo: recruiting@firm\.com\r\n/);
  assert.match(raw, /\r\nCc: mentor@school\.edu\r\n/);
  assert.match(raw, /\r\nSubject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=\r\n/); // the em dash is encoded
  assert.match(raw, /Content-Disposition: attachment; filename="Jane Doe - Resume\.pdf"/);
  assert.ok(raw.includes(Buffer.from('%PDF-1.7 test').toString('base64')));
  assert.ok(raw.trimEnd().endsWith('--'));
  assert.ok(!/\r\n(Subject|To):.*\n.*\n/.test(raw.split('\r\n\r\n')[0])); // no header injection
});

test('subjects with line breaks can’t add headers', () => {
  const raw = buildMime({ fromName: 'A', fromEmail: 'a@b.co', to: 'c@d.co', cc: [], subject: 'Hi\r\nBcc: x@evil.co', text: 't', html: 'h', attachments: [] });
  assert.ok(!/\r\nBcc:/i.test(raw));
});

test('letters and built resumes render as PDFs', async () => {
  const letter = await letterPdf('October 19, 2026\n\nDear Recruiting Committee:\n\nI am writing — with “interest” — to apply. 你好\n\nSincerely,\nJane Doe');
  assert.equal(letter.subarray(0, 5).toString(), '%PDF-');
  const resume = await resumePdf({
    name: 'Jane Doe', email: 'jane@school.edu', phone: '555-0100', location: 'Houston, TX',
    education: [{ school: 'University of Houston Law Center', location: 'Houston, TX', degree: 'J.D. Candidate', date: 'May 2028', gpa: '3.6', honors: ['Dean’s List'], activities: ['Moot Court'] }],
    experience: [{ employer: 'Harris County Attorney', location: 'Houston, TX', title: 'Intern', start: 'May 2025', end: 'Aug 2025', bullets: ['Drafted memos on Texas civil procedure.'] }],
    skills: { languages: ['Spanish'], other: [], interests: ['Running'] },
  });
  assert.equal(resume.subarray(0, 5).toString(), '%PDF-');
  assert.ok(resume.length > 1500);
});

test('recruiting email picker prefers recruiting inboxes and ignores the rest', () => {
  const page = 'Contact us: info@smithlaw.com. Media: press@smithlaw.com. To apply for our 1L summer program, send your resume to recruiting@smithlaw.com. logo@2x.png';
  assert.equal(pickRecruitingEmail(page, 'https://www.smithlaw.com'), 'recruiting@smithlaw.com');
  assert.equal(pickRecruitingEmail('Questions? info@smithlaw.com', 'https://smithlaw.com'), null);
  assert.equal(pickRecruitingEmail('Asia applicants: asiarecruiting@mofo.com', 'https://mofo.com'), null);
  assert.equal(onPage('recruiting@smithlaw.com', page), true);
  assert.equal(onPage('made-up@smithlaw.com', page), false);
  assert.equal(isEmail('a@b.co'), true);
  assert.equal(isEmail('not an email'), false);
});
