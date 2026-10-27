// Processes the sourced legal/judicial photos (public/art-src/, see manifest.json) into the site's art:
//   public/art/<slug>/color-{640,1024,1600}.webp + line-1024.webp   — the six chapter plates (XDoG line-art)
//   public/art/states/<ST>/<n>.webp                                  — colour ring images for the 3D map
//   public/art/states/index.json                                     — { ST: [url, ...] } for PhaseMap
//   public/art/CREDITS.md                                            — full provenance (title/creator/licence/source)
// CC BY-SA images are EXCLUDED from the rings (share-alike would bind our derivative); everything used is
// Public Domain, CC0, or CC BY (attribution satisfied in CREDITS). Run: node scripts/gen-legal-art.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/art');
const manifest = JSON.parse(readFileSync(join(ROOT, 'public/art-src/manifest.json'), 'utf8'));
const COLOR_SIZES = [400, 640, 1024, 1600];
const isBySa = (lic) => /BY-SA/i.test(lic || '');
// Attribution is required for CC BY (not for Public Domain / CC0). Used to show credit lines in the UI.
const creditRequired = (lic) => /\bBY\b/i.test(lic || '') && !isBySa(lic);

// XDoG line-art (same method as gen-art.mjs; architectural edges are clean, so a mid eps works well).
async function lineArt(src, { pre = 3, eps = 3.6 } = {}) {
  const sigma = 1.0, k = 1.7, phi = 0.55, gain = 1.4, W = 1024;
  const g = await sharp(src).resize({ width: W }).grayscale().normalise().median(pre).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = g.info;
  const blur = (s) => sharp(g.data, { raw: { width, height, channels: 1 } }).blur(s).raw().toBuffer();
  const [b1, b2] = await Promise.all([blur(sigma), blur(sigma * k)]);
  const out = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    const mag = Math.abs(b1[i] - b2[i]);
    const ink = mag <= eps ? 0 : Math.tanh(phi * (mag - eps));
    out[i] = Math.max(0, Math.min(255, Math.round(ink * 255 * gain)));
  }
  return sharp(out, { raw: { width, height, channels: 1 } }).blur(0.3);
}

const credits = { plates: [], states: {} };

// ── Chapter plates ──
for (const p of manifest.plates) {
  const dir = join(OUT, p.slug);
  mkdirSync(dir, { recursive: true });
  const src = join(ROOT, p.file);
  for (const s of COLOR_SIZES) {
    await sharp(src).resize({ width: s }).webp({ quality: 80 }).toFile(join(dir, `color-${s}.webp`));
  }
  await (await lineArt(src)).webp({ quality: 60, effort: 6 }).toFile(join(dir, 'line-1024.webp'));
  credits.plates.push(p);
  console.log(`✓ plate ${p.slug}: ${p.subject}`);
}

// ── State ring images (colour; exclude BY-SA) ──
const index = {};
// Richer, per-image provenance the app can fetch (map credit lines + the Plate-credits page).
const creditsJson = { plates: credits.plates.map((p) => ({ ...p, creditRequired: creditRequired(p.license) })), states: {} };
for (const [st, imgs] of Object.entries(manifest.states)) {
  const dir = join(OUT, 'states', st);
  mkdirSync(dir, { recursive: true });
  const used = imgs.filter((x) => !isBySa(x.license));
  index[st] = [];
  credits.states[st] = [];
  creditsJson.states[st] = [];
  let n = 1;
  for (const img of used) {
    const file = `${n}.webp`;
    const url = `/art/states/${st}/${file}`;
    await sharp(join(ROOT, img.file)).resize({ width: 960, height: 640, fit: 'cover' }).webp({ quality: 74 }).toFile(join(dir, file));
    index[st].push(url);
    credits.states[st].push(img);
    creditsJson.states[st].push({ url, subject: img.subject, title: img.title, creator: img.creator || null, license: img.license, sourcePage: img.sourcePage, creditRequired: creditRequired(img.license) });
    n++;
  }
  console.log(`✓ state ${st}: ${used.length} ring images (${imgs.length - used.length} BY-SA excluded)`);
}
writeFileSync(join(OUT, 'states', 'index.json'), JSON.stringify(index));
writeFileSync(join(OUT, 'credits.json'), JSON.stringify(creditsJson));

// ── CREDITS.md ──
let md = '# Art credits\n\nEvery image below is used under **Public Domain, CC0, or CC BY** (attribution given). '
  + 'Sourced via Wikimedia Commons (U.S. government, SCOTUS, and Carol M. Highsmith / Library of Congress collections). '
  + 'Images were edited for this site (resized to WebP; chapter plates additionally processed into XDoG line-art). '
  + 'CC BY-SA images were deliberately **excluded** to avoid share-alike obligations on derivatives. '
  + 'Regenerate with `node scripts/gen-legal-art.mjs`.\n\n## Chapter plates\n';
for (const p of credits.plates) {
  md += `- **${p.subject}** — ${p.title}. ${p.creator ? p.creator + '. ' : ''}${p.license}. ${p.sourcePage}\n`;
}
md += '\n## State map — ring images\n';
for (const [st, imgs] of Object.entries(credits.states)) {
  md += `\n### ${st}\n`;
  for (const img of imgs) md += `- **${img.subject}** — ${img.title}. ${img.creator ? img.creator + '. ' : ''}${img.license}. ${img.sourcePage}\n`;
}
writeFileSync(join(OUT, 'CREDITS.md'), md);
console.log('\nwrote plates + state rings + index.json + CREDITS.md');
