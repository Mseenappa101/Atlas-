// Records a short video of a dev-server page with Playwright and converts it to an optimized GIF via
// ffmpeg. Used to capture animation checkpoints (postcard reveals, hero, offer cards, etc.).
//
// Usage: node scripts/capture.mjs <url> <out.gif> [ms] [vw] [vh] [cropW:cropH:cropX:cropY]
//   e.g. node scripts/capture.mjs "http://localhost:5173/dev/postcard?bare=1&state=TX" out/tx.gif 3200 560 620
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [, , url, out, ms = '3200', vw = '560', vh = '620', crop] = process.argv;
if (!url || !out) { console.error('usage: capture.mjs <url> <out.gif> [ms] [vw] [vh] [crop]'); process.exit(1); }

const VDIR = '/tmp/pw-capture';
rmSync(VDIR, { recursive: true, force: true });
mkdirSync(VDIR, { recursive: true });
mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: Number(vw), height: Number(vh) },
  deviceScaleFactor: 2,
  reducedMotion: 'no-preference',
  recordVideo: { dir: VDIR, size: { width: Number(vw), height: Number(vh) } },
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(Number(ms));
await ctx.close();
await browser.close();

const webm = join(VDIR, readdirSync(VDIR).find((f) => f.endsWith('.webm')));
// 24fps, scaled to 540px wide, palette for clean colors; optional crop "W:H:X:Y".
const vf = [crop ? `crop=${crop}` : null, 'fps=24', 'scale=540:-1:flags=lanczos', 'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse']
  .filter(Boolean).join(',');
execFileSync('ffmpeg', ['-y', '-i', webm, '-vf', vf, '-loop', '0', out], { stdio: 'inherit' });
console.log('wrote', out);
