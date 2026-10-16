// fetch -> normalize -> hash -> prefilter (-> one live extraction with --extract). No database access.
// node worker/index.js --dry-run [--url <u> ...] [--limit 5] [--extract]
import { readFileSync } from 'fs';
import { join } from 'path';
import { ROOT } from './config.js';
import { fetchPage } from './fetch.js';
import { sha256, matchesStudentTerms, detectAts, truncateAroundHits } from './text.js';
import { fetchGreenhouse } from './ats/greenhouse.js';
import { fetchLever } from './ats/lever.js';
import { buildPageText, extractDirect, MODEL } from './extract.js';

function argValues(args, name) {
  const out = [];
  args.forEach((a, i) => { if (a === name && args[i + 1]) out.push(args[i + 1]); });
  return out;
}

function pickSources(args) {
  const firms = JSON.parse(readFileSync(join(ROOT, 'scripts/output/firms.json'), 'utf8'));
  const urls = argValues(args, '--url');
  if (urls.length) {
    return urls.map((url) => firms.find((f) => f.careers_url === url) || { name: new URL(url).host, careers_url: url });
  }
  const limit = Number(argValues(args, '--limit')[0] || 5);
  const seen = new Set();
  const distinct = firms.filter((f) => f.careers_url && !seen.has(f.careers_url) && seen.add(f.careers_url));
  const step = Math.max(1, Math.floor(distinct.length / limit));
  return Array.from({ length: limit }, (_, i) => distinct[i * step]).filter(Boolean);
}

const kindOf = (url) => (/greenhouse\.io/.test(url) ? 'greenhouse' : /jobs\.lever\.co/.test(url) ? 'lever' : 'page');

export async function dryRun(args) {
  const doExtract = args.includes('--extract');
  const picks = pickSources(args);
  let extracted = false;

  for (const f of picks) {
    const source = { id: 'dry-run', url: f.careers_url, employer_name: f.name, city: f.city || null, state: f.state || null, kind: kindOf(f.careers_url) };
    const t0 = Date.now();
    console.log(`\n── ${f.name}${f.city ? ` (${f.city}, ${f.state})` : ''} — ${source.url}`);
    try {
      if (source.kind !== 'page') {
        const r = await (source.kind === 'greenhouse' ? fetchGreenhouse : fetchLever)(source);
        console.log(`  ${source.kind}: ${r.listings.length} law-student role(s)`);
        for (const l of r.listings.slice(0, 10)) console.log(`   - ${l.title} [${l.class_years.join(',') || '-'}] ${l.posting_type} ${l.city || ''} ${l.apply_url}`);
        continue;
      }
      const page = await fetchPage(source.url);
      const hit = matchesStudentTerms(page.text);
      const ats = detectAts(page.html, page.links);
      const pageText = buildPageText(page);
      console.log(`  via=${page.via} http=${page.httpStatus} final=${page.url}`);
      console.log(`  text=${page.text.length} chars, links=${page.links.length}, prompt body=${pageText.length} chars`);
      console.log(`  hash=${sha256(page.text)}`);
      console.log(`  prefilter=${hit ? 'HIT' : 'miss'}${ats.length ? `, ATS: ${ats.map((a) => a.url).join(' ')}` : ''}`);
      console.log(`  sample: ${truncateAroundHits(page.text, 300).replace(/\n/g, ' | ')}`);

      if (doExtract && hit && !extracted) {
        extracted = true;
        console.log(`  extracting with ${MODEL} (direct)…`);
        const r = await extractDirect(source, pageText);
        console.log(JSON.stringify(r.result, null, 2).replace(/^/gm, '    '));
        console.log(`  usage: ${JSON.stringify(r.usage)}`);
        console.log(`  cost: $${r.cost} list, $${(r.cost / 2).toFixed(6)} via batch`);
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
    console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}
