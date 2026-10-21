import { createServer } from 'node:http';
import { config } from './config.js';
import { HttpError, cors, readJson, sendJson, sendError } from './http.js';
import { userFromToken } from './db.js';
import { getUsage, parseResume, buildResume, saveResume, createLetter, storeResumeFile, resumeFileUrl } from './routes.js';
import { checkout, syncCheckout, portal, webhook } from './billing.js';
import {
  listConnections, startConnect, connectCallback, disconnect, uploadApplicationFile, deleteApplicationFile, applicationFileUrl, documentPdf, sendApplication,
} from './applications.js';
import { getNewsletter, setNewsletter, startNewsletterSync } from './newsletter.js';
import { subscribe, workshop, placementApply } from './leads.js';
import { privateCatalog } from './catalog.js';
import { generateDocument } from './ai.js';
import { unlockSprint, sprintLessons } from './sprint.js';

// Signed-out forms: (body, req) => response. Small bodies only.
const PUBLIC = {
  'POST /api/subscribe': subscribe,
  'POST /api/workshop': workshop,
  'POST /api/placement-apply': placementApply,
  // Sprint course: the paid Stripe session is the credential, so these need no signed-in user.
  'POST /api/sprint/unlock': unlockSprint,
  'POST /api/sprint/lessons': sprintLessons,
};

const ROUTES = {
  'GET /api/me/usage': getUsage,
  'POST /api/resume/file': storeResumeFile,
  'GET /api/resume/file': resumeFileUrl,
  'POST /api/resume/parse': parseResume,
  'POST /api/resume/build': buildResume,
  'PUT /api/resume': saveResume,
  'POST /api/letters': createLetter,
  'POST /api/ai/document': generateDocument,
  'POST /api/billing/checkout': checkout,
  'POST /api/billing/sync': syncCheckout,
  'POST /api/billing/portal': portal,
  'GET /api/email/connections': listConnections,
  'POST /api/email/connect': startConnect,
  'POST /api/email/disconnect': disconnect,
  'POST /api/files': uploadApplicationFile,
  'POST /api/files/delete': deleteApplicationFile,
  'POST /api/files/url': applicationFileUrl,
  'POST /api/documents/pdf': documentPdf,
  'POST /api/applications/send': sendApplication,
  'GET /api/me/newsletter': getNewsletter,
  'PUT /api/me/newsletter': setNewsletter,
};
const PATHS = new Set([...Object.keys(ROUTES), ...Object.keys(PUBLIC), 'GET /api/catalog/private'].map((k) => k.split(' ')[1]));

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
  // Google / Microsoft send the student back here after they approve; the signed state identifies them.
  const connect = req.method === 'GET' && /^\/api\/connect\/(gmail|outlook)\/callback$/.exec(path);
  if (connect) {
    res.writeHead(302, { Location: await connectCallback(new URL(req.url, 'http://x'), connect[1]), 'Cache-Control': 'no-store' });
    return res.end();
  }
  const open = PUBLIC[`${req.method} ${path}`];
  if (open) return sendJson(res, 200, await open(await readJson(req, 16 * 1024), req));
  // Gated firm data: an unlock token from /api/subscribe, or a signed-in student.
  if (req.method === 'GET' && path === '/api/catalog/private') {
    const user = req.headers.authorization ? await authenticate(req).catch(() => null) : null;
    res.setHeader('Cache-Control', 'private, max-age=300');
    return sendJson(res, 200, await privateCatalog(req, user));
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

server.listen(config.port, () => log(`firmward api listening on :${config.port} (origins: ${config.allowedOrigins.join(', ')})`));
startNewsletterSync();

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
