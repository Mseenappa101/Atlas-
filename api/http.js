import { config } from './config.js';

/** An error the client sees: status, a stable code, and a sentence a student can read. */
export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const bad = (message) => new HttpError(400, 'bad_request', message);

export function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data) });
  res.end(data);
}

export function sendError(res, err) {
  sendJson(res, err.status, { error: err.code, message: err.message, ...err.extra });
}

/** Sets CORS headers for allowed origins. Returns true if the request was a preflight (already answered). */
export function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Unlock-Token');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  res.setHeader('Vary', 'Origin');
  if (req.method !== 'OPTIONS') return false;
  res.writeHead(204);
  res.end();
  return true;
}

/** Reads a JSON object body, enforcing the size limit. */
export async function readJson(req, limit = config.bodyLimit) {
  if (Number(req.headers['content-length'] || 0) > limit) throw tooLarge();
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw tooLarge();
    chunks.push(chunk);
  }
  if (!size) return {};
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {
    throw bad('The request body is not valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('The request body must be a JSON object.');
  return body;
}

const tooLarge = () => new HttpError(413, 'body_too_large', 'That request is too large. Files must be under 5 MB.');
