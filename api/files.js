import { basename, extname } from 'node:path';
import mammoth from 'mammoth';

export const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Decodes base64 (optionally a data: URL). Returns a Buffer, or null if it isn't base64. */
export function decodeBase64(s) {
  if (typeof s !== 'string') return null;
  const b64 = s.replace(/^data:[^;,]*;base64,/, '').replace(/\s+/g, '');
  if (!b64 || b64.length % 4 === 1 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(b64)) return null;
  return Buffer.from(b64, 'base64');
}

/**
 * 'pdf' | 'docx' | null, from the file's bytes (mime type and name are only hints a client controls).
 * A .docx is a zip whose entries include word/document.xml; zip entry names are stored as plain text.
 */
export function detectFileType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) return null;
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  if (isZip && buf.includes('word/document.xml', 0, 'latin1') && buf.includes('[Content_Types].xml', 0, 'latin1')) return 'docx';
  return null;
}

/** Storage-safe file name with the right extension for the detected type. */
export function sanitizeFileName(name, type) {
  const base = basename(String(name || 'resume'));
  const stem = base.slice(0, base.length - extname(base).length).normalize('NFKD').replace(/[^\x20-\x7e]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 80);
  return `${stem || 'resume'}.${type}`;
}

const MAX_TEXT = 60_000;

export async function docxText(buf) {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return value.replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT);
}
