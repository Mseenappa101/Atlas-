import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { HttpError } from './http.js';

// One secret (TOKEN_ENCRYPTION_KEY, 32+ random bytes) gives two keys: one encrypts stored mailbox
// tokens, the other signs the OAuth "state" so a callback can't be pinned on another account.
function keys() {
  if (!config.tokenKey || config.tokenKey.length < 32) {
    throw new HttpError(503, 'email_connect_unavailable', 'Connecting an inbox isn’t set up yet. You can still send from Firmward.');
  }
  const derive = (info) => Buffer.from(hkdfSync('sha256', config.tokenKey, 'firmward', info, 32));
  return { enc: derive('token-encryption'), mac: derive('oauth-state') };
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');

export function encrypt(text) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keys().enc, iv);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return ['v1', b64u(iv), b64u(cipher.getAuthTag()), b64u(data)].join('.');
}

export function decrypt(blob) {
  const [v, iv, tag, data] = String(blob).split('.');
  if (v !== 'v1') throw new Error('unknown token format');
  const decipher = createDecipheriv('aes-256-gcm', keys().enc, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

const STATE_TTL = 15 * 60_000;

export function signState(payload) {
  const body = b64u(JSON.stringify({ ...payload, t: Date.now(), n: b64u(randomBytes(8)) }));
  return `${body}.${b64u(createHmac('sha256', keys().mac).update(body).digest())}`;
}

/** Returns the payload, or null if the state was tampered with or is older than 15 minutes. */
export function verifyState(state) {
  const [body, sig] = String(state ?? '').split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', keys().mac).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return Date.now() - payload.t < STATE_TTL ? payload : null;
  } catch {
    return null;
  }
}
