import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeBase64, detectFileType, sanitizeFileName } from '../files.js';

const pdf = Buffer.from('%PDF-1.7\n%...rest');
// Minimal stand-in for a zip holding a Word document (only the bytes the detector looks at).
const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('....[Content_Types].xml....word/document.xml....')]);
const xlsx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('....[Content_Types].xml....xl/workbook.xml')]);

test('detectFileType sniffs bytes, not names', () => {
  assert.equal(detectFileType(pdf), 'pdf');
  assert.equal(detectFileType(docx), 'docx');
  assert.equal(detectFileType(xlsx), null);
  assert.equal(detectFileType(Buffer.from('{\\rtf1 hello world')), null);
  assert.equal(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])), null);
  assert.equal(detectFileType(Buffer.alloc(0)), null);
  assert.equal(detectFileType('not a buffer'), null);
});

test('decodeBase64 accepts plain and data URLs, rejects garbage', () => {
  const b64 = pdf.toString('base64');
  assert.deepEqual(decodeBase64(b64), pdf);
  assert.deepEqual(decodeBase64(`data:application/pdf;base64,${b64}`), pdf);
  assert.deepEqual(decodeBase64(b64.replace(/(.{4})/g, '$1\n')), pdf);
  assert.equal(decodeBase64(''), null);
  assert.equal(decodeBase64('not base64!!'), null);
  assert.equal(decodeBase64(42), null);
});

test('sanitizeFileName', () => {
  assert.equal(sanitizeFileName('My Resume (final).pdf', 'pdf'), 'My-Resume-final.pdf');
  assert.equal(sanitizeFileName('../../etc/passwd', 'pdf'), 'passwd.pdf');
  assert.equal(sanitizeFileName('Résumé.DOCX', 'docx'), 'Resume.docx');
  assert.equal(sanitizeFileName('resume.exe', 'pdf'), 'resume.pdf');
  assert.equal(sanitizeFileName('', 'docx'), 'resume.docx');
  assert.equal(sanitizeFileName('日本語.pdf', 'pdf'), 'resume.pdf');
  assert.ok(sanitizeFileName('a'.repeat(300), 'pdf').length <= 84);
});

test('real fixtures: detect type and extract DOCX text', async () => {
  const { readFileSync } = await import('node:fs');
  const { docxText } = await import('../files.js');
  const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url));
  assert.equal(detectFileType(fx('sample-resume.pdf')), 'pdf');
  assert.equal(detectFileType(fx('sample-resume.docx')), 'docx');
  const text = await docxText(fx('sample-resume.docx'));
  assert.match(text, /Daniel Okafor/);
  assert.match(text, /University of Houston Law Center/);
  assert.match(text, /right-of-way/);
});
