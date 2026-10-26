// Build-time art pipeline for the editorial redesign. Fetches public-domain paintings from the Art
// Institute of Chicago open-access collection (verified via the `is_public_domain` flag, CC0), and emits:
//   public/art/<slug>/color-{640,1024,1600}.webp  — responsive full-colour
//   public/art/<slug>/line-{1024,1600}.webp        — etched edge-detected line-art (white edges on black)
// plus public/art/CREDITS.md with full provenance. No runtime image processing; run once:  node scripts/gen-art.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/art');
const IIIF = 'https://www.artic.edu/iiif/2';
const HEADERS = { 'AIC-User-Agent': 'Firmward editorial redesign (non-commercial dev build)' };

// One classical, public-domain painting per chapter (scholars, jurists, philosophers, allegory).
const WORKS = [
  { slug: 'the-map', chapter: 'I', id: 93521 },
  { slug: 'the-sprint', chapter: 'II', id: 862 },
  { slug: 'membership', chapter: 'III', id: 111428 },
  { slug: 'placement', chapter: 'IV', id: 14569 },
  { slug: 'where-firms-hire', chapter: 'V', id: 149778 },
  { slug: 'about', chapter: 'VI', id: 36492 },
];
const COLOR_SIZES = [640, 1024, 1600];
const LINE_SIZES = [1024]; // line-art is a low-opacity atmospheric texture layer — one size is plenty

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
    await sharp(src).resize({ width: s }).webp({ quality: 78 }).toFile(join(dir, `color-${s}.webp`));
  }
  // Etched "aquatint" line-art: grayscale → heavy median denoise → gentle Laplacian edge → post-median
  // to clear residual speckle → normalise + gamma to lift faint contours (NO hard threshold, so the
  // anti-aliased grey contour structure keeps the figure recognizable). Designed to sit on the near-black
  // night background via `mix-blend-mode: screen` (black → invisible, light etched lines → visible) and
  // crossfade to the colour plate as each chapter scrolls in. Residual stipple reads as period etching.
  for (const s of LINE_SIZES) {
    await sharp(src).resize({ width: s }).grayscale()
      .median(5).blur(0.7)
      .convolve({ width: 3, height: 3, kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0] })
      .median(2).normalise().gamma(1.5).linear(1.4, -22)
      .blur(0.5) // soften residual stipple → far smaller WebP; invisible at the low display opacity
      .webp({ quality: 46, effort: 6 }).toFile(join(dir, `line-${s}.webp`));
  }

  credits.push({ ...w, title: a.title, artist: a.artist_title || a.artist_display, date: a.date_display, medium: a.medium_display, credit: a.credit_line });
  console.log(`✓ ${w.chapter} ${w.slug}: ${a.title} — ${a.artist_title || a.artist_display}`);
}

let md = '# Art credits\n\nEvery artwork below is in the **public domain**, verified via the Art Institute of Chicago '
  + 'open-access API (`is_public_domain: true`, released CC0). Images were edited for this site (resized to WebP '
  + 'and edge-detected into line-art). Regenerate with `node scripts/gen-art.mjs`.\n\n';
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
