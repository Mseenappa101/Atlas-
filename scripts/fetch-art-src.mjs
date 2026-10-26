// Downloads the source photos named in public/art-src/manifest.json (plates + state ring images) from
// their `imageUrl` into the `file` path, so scripts/gen-legal-art.mjs can process them. Idempotent:
// files already present are skipped unless --force. Run: node scripts/fetch-art-src.mjs [--force] [ST ...]
import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(join(ROOT, 'public/art-src/manifest.json'), 'utf8')));
const argv = process.argv.slice(2);
const force = argv.includes('--force');
const onlyStates = argv.filter((a) => !a.startsWith('--')).map((s) => s.toUpperCase());
const UA = 'firmward-art/1.0 (+https://firmward.org; legal-imagery pipeline)';

async function download(url, dest) {
  const full = join(ROOT, dest);
  if (!force && existsSync(full) && statSync(full).size > 1024) return 'skip';
  mkdirSync(dirname(full), { recursive: true });
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error(`too small (${buf.length}B)`);
  writeFileSync(full, buf);
  return `ok ${(buf.length / 1024).toFixed(0)}KB`;
}

const jobs = [];
for (const p of manifest.plates) if (p.imageUrl && !onlyStates.length) jobs.push({ label: `plate ${p.slug}`, url: p.imageUrl, file: p.file });
for (const [st, imgs] of Object.entries(manifest.states)) {
  if (onlyStates.length && !onlyStates.includes(st)) continue;
  imgs.forEach((img, i) => { if (img.imageUrl) jobs.push({ label: `${st}/${i + 1}`, url: img.imageUrl, file: img.file }); });
}

let ok = 0, skip = 0, failed = 0;
for (const j of jobs) {
  try {
    const r = await download(j.url, j.file);
    if (r === 'skip') { skip++; } else { ok++; console.log(`✓ ${j.label}: ${r}`); }
  } catch (e) {
    failed++; console.error(`✗ ${j.label}: ${e.message}  (${j.url})`);
  }
}
console.log(`\n${ok} downloaded, ${skip} already present, ${failed} failed, ${jobs.length} total.`);
if (failed) process.exit(1);
