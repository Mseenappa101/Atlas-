// A production-representative static server for `dist` — brotli/gzip compression + immutable caching for
// hashed assets/fonts + filesystem-first clean URLs (so /sprint serves dist/sprint/index.html). Mirrors
// how Vercel serves this build, for local Lighthouse runs. Not shipped. Usage: node scripts/serve-dist.mjs [port]
import { createServer } from 'node:http';
import { createSecureServer } from 'node:http2';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.argv[2]) || 4179;
// With FW_TLS_KEY/FW_TLS_CERT set, serve over HTTP/2+TLS (multiplexed, like Vercel) for accurate
// Lighthouse. Otherwise plain HTTP/1.1.
const TLS = process.env.FW_TLS_KEY && process.env.FW_TLS_CERT;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.txt', '.webmanifest']);

function resolve(pathname) {
  let p = decodeURIComponent(pathname.split('?')[0]);
  if (p.endsWith('/')) p = p + 'index.html';
  let file = join(DIST, p);
  if (existsSync(file) && statSync(file).isFile()) return file;
  // clean URL: /sprint -> /sprint/index.html
  if (existsSync(file) && statSync(file).isDirectory()) { const i = join(file, 'index.html'); if (existsSync(i)) return i; }
  const asIndex = join(DIST, p, 'index.html');
  if (existsSync(asIndex)) return asIndex;
  if (existsSync(file + '.html')) return file + '.html';
  return null;
}

// Mirror Vercel's /api rewrite to the Railway API so the preview behaves like production (forms, unlock).
const API_ORIGIN = 'https://api-production-124e.up.railway.app';
async function proxyApi(req, res) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    try {
      const r = await fetch(API_ORIGIN + req.url, {
        method: req.method,
        headers: { ...req.headers, host: new URL(API_ORIGIN).host },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
      });
      res.statusCode = r.status;
      r.headers.forEach((v, k) => { if (!/^(content-encoding|transfer-encoding|connection)$/i.test(k)) res.setHeader(k, v); });
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      res.statusCode = 502; res.end(`proxy error: ${e.message}`);
    }
  });
}

function handler(req, res) {
  if (req.url.startsWith('/api/')) return proxyApi(req, res);
  const file = resolve(req.url) || join(DIST, 'index.html'); // SPA fallback (like Vercel's catch-all rewrite)
  const ext = extname(file);
  const type = TYPES[ext] || 'application/octet-stream';
  const immutable = /\/assets\/|\/fonts\//.test(file);
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
  if (COMPRESSIBLE.has(ext)) {
    const accept = req.headers['accept-encoding'] || '';
    const raw = readFileSync(file);
    if (/\bbr\b/.test(accept)) { res.setHeader('Content-Encoding', 'br'); res.end(brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })); return; }
    if (/\bgzip\b/.test(accept)) { res.setHeader('Content-Encoding', 'gzip'); res.end(gzipSync(raw)); return; }
    res.end(raw); return;
  }
  createReadStream(file).pipe(res);
}

if (TLS) {
  createSecureServer(
    { key: readFileSync(process.env.FW_TLS_KEY), cert: readFileSync(process.env.FW_TLS_CERT), allowHTTP1: true },
    handler
  ).listen(PORT, () => console.log(`serving dist (HTTP/2 + brotli + immutable cache) at https://localhost:${PORT}`));
} else {
  createServer(handler).listen(PORT, () => console.log(`serving dist (brotli/gzip + immutable cache) at http://localhost:${PORT}`));
}
