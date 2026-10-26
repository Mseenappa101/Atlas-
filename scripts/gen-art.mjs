// Build-time art pipeline for the editorial redesign. Fetches public-domain paintings from the Art
// Institute of Chicago open-access collection (verified via the `is_public_domain` flag, CC0), and emits:
//   public/art/<slug>/color-{640,1024,1600}.webp  — responsive full-colour plate
//   public/art/<slug>/line-1024.webp              — clean etched line-art (white lines on black)
// plus public/art/CREDITS.md with full provenance. No runtime image processing; run once:  node scripts/gen-art.mjs
//
// Line-art uses XDoG (eXtended Difference-of-Gaussians): the difference of two Gaussian blurs isolates
// coherent contours and — unlike a raw Laplacian — ignores the fine craquelure/canvas texture that made
// the first pass grainy. Plain-background portraits come out as crisp etchings; busier multi-figure
// allegories stay denser (they carry more real detail), which is why the prominent cover/early chapters
// use clean-background portraits. Meant to sit on the night ground via mix-blend-mode:screen and
// crossfade to the colour plate as each chapter scrolls in.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/art');
const IIIF = 'https://www.artic.edu/iiif/2';
const HEADERS = { 'AIC-User-Agent': 'Firmward editorial redesign (non-commercial dev build)' };

// `pre` = pre-smoothing median radius (bump for textured sources to suppress craquelure);
// `eps` = edge-magnitude threshold (raise for high-contrast sources, lower for dark/low-contrast ones).
// the-map (Corneille, cleanest) doubles as the cover motif — the hero figure IS Chapter I's figure.
// the-map (Corneille, high-contrast clean bg) carries the prominent cover/Chapter-I etching. The darker
// paintings are noisy at low eps and empty at high; a high eps keeps their background clean with a faint
// contour that reads well as a subtle underlay crossfading to the colour plate.
const WORKS = [
  { slug: 'the-map', chapter: 'I', id: 79774, pre: 4, eps: 5 },          // Corneille de Lyon — clean plain bg, cover motif
  { slug: 'the-sprint', chapter: 'II', id: 862, pre: 4, eps: 4.5 },      // Follower of Frans Hals
  { slug: 'membership', chapter: 'III', id: 111428, pre: 4, eps: 4.5 },  // Heraclitus (Spanish)
  { slug: 'placement', chapter: 'IV', id: 14569, pre: 4, eps: 4.5 },     // Daumier, Two Lawyers
  { slug: 'where-firms-hire', chapter: 'V', id: 149778, pre: 4, eps: 4.5 }, // Batoni, Allegory of Peace and War
  { slug: 'about', chapter: 'VI', id: 36492, pre: 4, eps: 4.5 },         // de Mura, Allegory of Charity
];
const COLOR_SIZES = [640, 1024, 1600];
const LINE_WIDTH = 1024;

// XDoG line-art. Returns a sharp instance (white lines on black) for the given source buffer.
async function lineArt(src, { pre = 4, eps = 4.5 } = {}) {
  // Pure difference-of-Gaussians (tau=1) → response ≈ 0 in flat areas regardless of brightness, so dark
  // and light flat regions both stay black and only real contours ink. `eps` thresholds edge magnitude;
  // tanh squashes it to clean strokes. NO final normalise (it would restore the noise floor).
  const sigma = 1.5, k = 1.7, phi = 0.55, gain = 1.4;
  const g = await sharp(src).resize({ width: LINE_WIDTH }).grayscale().normalise().median(pre)
    .raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = g.info;
  const blur = (s) => sharp(g.data, { raw: { width: W, height: H, channels: 1 } }).blur(s).raw().toBuffer();
  const [b1, b2] = await Promise.all([blur(sigma), blur(sigma * k)]);
  const out = Buffer.alloc(W * H);
  for (let i = 0; i < W * H; i++) {
    const mag = Math.abs(b1[i] - b2[i]);                       // DoG edge magnitude
    const ink = mag <= eps ? 0 : Math.tanh(phi * (mag - eps)); // 0..1, only at real contours
    out[i] = Math.max(0, Math.min(255, Math.round(ink * 255 * gain)));
  }
  return sharp(out, { raw: { width: W, height: H, channels: 1 } }).blur(0.3);
}

mkdirSync(OUT, { recursive: true });
const credits = [];

for (const w of WORKS) {
  const res = await fetch(`https://api.artic.edu/api/v1/artworks/${w.id}?fields=id,title,artist_title,artist_display,date_display,medium_display,is_public_domain,image_id,credit_line`, { headers: HEADERS });
  const { data: a } = await res.json();
  if (!a?.is_public_domain) { console.error(`SKIP ${w.slug} (#${w.id}): not flagged public domain`); continue; }
  if (!a.image_id) { console.error(`SKIP ${w.slug} (#${w.id}): no image`); continue; }

  const src = Buffer.from(await (await fetch(`${IIIF}/${a.image_id}/full/1686,/0/default.jpg`, { headers: HEADERS })).arrayBuffer());
  const dir = join(OUT, w.slug);
  mkdirSync(dir, { recursive: true });

  for (const s of COLOR_SIZES) {
    await sharp(src).resize({ width: s }).webp({ quality: 80 }).toFile(join(dir, `color-${s}.webp`));
  }
  await (await lineArt(src, { pre: w.pre, eps: w.eps })).webp({ quality: 60, effort: 6 }).toFile(join(dir, `line-${LINE_WIDTH}.webp`));

  credits.push({ ...w, title: a.title, artist: a.artist_title || a.artist_display, date: a.date_display, medium: a.medium_display, credit: a.credit_line });
  console.log(`✓ ${w.chapter} ${w.slug}: ${a.title} — ${a.artist_title || a.artist_display}`);
}

let md = '# Art credits\n\nEvery artwork below is in the **public domain**, verified via the Art Institute of Chicago '
  + 'open-access API (`is_public_domain: true`, released CC0). Images were edited for this site (resized to WebP '
  + 'and processed into XDoG line-art). Regenerate with `node scripts/gen-art.mjs`.\n\n';
for (const c of credits) {
  md += `## ${c.chapter} · ${c.slug}\n`
    + `- **${c.title}** — ${c.artist} (${c.date})\n`
    + `- ${c.medium}\n`
    + `- The Art Institute of Chicago — ${c.credit || 'Public Domain (CC0)'}\n`
    + `- Source: https://www.artic.edu/artworks/${c.id}\n`
    + '- License: Public Domain / CC0\n\n';
}
writeFileSync(join(OUT, 'CREDITS.md'), md);
console.log(`\nwrote ${credits.length} works + CREDITS.md`);
