import { createServer } from 'node:http';
import { config } from './config.js';
import { HttpError, cors, readJson, sendJson, sendError } from './http.js';
import { userFromToken } from './db.js';
import { getUsage, parseResume, buildResume, saveResume, createLetter, storeResumeFile, resumeFileUrl } from './routes.js';
import { checkout, syncCheckout, portal, webhook } from './billing.js';

const ROUTES = {
  'GET /api/me/usage': getUsage,
  'POST /api/resume/file': storeResumeFile,
  'GET /api/resume/file': resumeFileUrl,
  'POST /api/resume/parse': parseResume,
  'POST /api/resume/build': buildResume,
  'PUT /api/resume': saveResume,
  'POST /api/letters': createLetter,
  'POST /api/billing/checkout': checkout,
  'POST /api/billing/sync': syncCheckout,
  'POST /api/billing/portal': portal,
};
const PATHS = new Set(Object.keys(ROUTES).map((k) => k.split(' ')[1]));

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function authenticate(req) {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
  const user = m && await userFromToken(m[1]).catch(() => null);
  if (!user) throw new HttpError(401, 'unauthorized', 'Please sign in again.');
  return user;
}

async function handle(req, res, ctx) {
  if (cors(req, res)) return;
  const path = new URL(req.url, 'http://x').pathname.replace(/\/+$/, '') || '/';
  if (req.method === 'GET' && path === '/api/health') return sendJson(res, 200, { ok: true });
  // Stripe signs the raw body, so this route reads it before any JSON parsing.
  if (req.method === 'POST' && path === '/api/stripe/webhook') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    return sendJson(res, 200, await webhook(Buffer.concat(chunks), req.headers['stripe-signature']));
  }
  const handler = ROUTES[`${req.method} ${path}`];
  if (!handler) {
    throw PATHS.has(path)
      ? new HttpError(405, 'method_not_allowed', 'That method is not allowed here.')
      : new HttpError(404, 'not_found', 'There is nothing at this address.');
  }
  const user = await authenticate(req);
  ctx.user = user.id;
  const body = req.method === 'GET' ? {} : await readJson(req);
  sendJson(res, 200, await handler(user, body));
}

const server = createServer(async (req, res) => {
  const t0 = Date.now();
  const ctx = { user: null };
  try {
    await handle(req, res, ctx);
  } catch (err) {
    if (!(err instanceof HttpError)) console.error(`${req.method} ${req.url}:`, err.stack || err.message);
    if (!res.headersSent) {
      sendError(res, err instanceof HttpError ? err
        : new HttpError(500, 'server_error', 'Something went wrong on our end. Please try again.'));
    }
  } finally {
    const path = req.url.split('?')[0];
    log(`${req.method} ${path} ${res.statusCode} ${Date.now() - t0}ms ${ctx.user ? ctx.user.slice(0, 8) : '-'}`);
  }
});
server.requestTimeout = 180_000;

server.listen(config.port, () => log(`atlas api listening on :${config.port} (origins: ${config.allowedOrigins.join(', ')})`));

let stopping = false;
function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  log(`${signal}: finishing in-flight requests`);
  server.close(() => { log('stopped'); process.exit(0); });
  server.closeIdleConnections();
  setTimeout(() => { log('forcing exit'); process.exit(1); }, 150_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
