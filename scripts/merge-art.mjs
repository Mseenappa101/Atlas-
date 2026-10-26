// Merges the per-group sourcing files (/tmp/art-G*.json, written by the imagery subagents) into
// public/art-src/manifest.json under `states`. Re-validates licences (only pd/cc0/by pass — BY-SA and
// any NC/ND/other are dropped here too, defence in depth) and normalises to the manifest shape.
// Existing states already in the manifest are left untouched. Run: node scripts/merge-art.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'public/art-src/manifest.json');
const SLOT_ORDER = ['capitol', 'supreme-court', 'federal-courthouse', 'landmark'];

function licenseString(code, version) {
  if (code === 'pd') return 'Public Domain';
  if (code === 'cc0') return 'CC0 1.0';
  if (code === 'by') return `CC BY ${version || '4.0'}`;
  return null; // anything else is rejected
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const groups = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];
const entries = [];
for (const g of groups) {
  const p = `/tmp/art-${g}.json`;
  if (!existsSync(p)) { console.warn(`! missing ${p}`); continue; }
  try {
    const arr = JSON.parse(readFileSync(p, 'utf8'));
    if (Array.isArray(arr)) entries.push(...arr);
    else console.warn(`! ${p} is not an array`);
  } catch (e) { console.warn(`! ${p}: ${e.message}`); }
}

// Group by state, validate, order by slot, dedupe by image URL.
const byState = {};
let rejected = 0;
for (const e of entries) {
  const lic = licenseString(e.license, e.licenseVersion);
  if (!lic) { rejected++; continue; }
  if (!e.st || !e.image || !e.page || !e.title) { rejected++; continue; }
  if (manifest.states[e.st]) continue; // never clobber a curated/existing state
  (byState[e.st] ??= []).push({ ...e, licenseStr: lic });
}

let added = 0, states = 0;
for (const [st, list] of Object.entries(byState)) {
  const seen = new Set();
  const ordered = list
    .filter((e) => { const k = e.image.split('?')[0]; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (SLOT_ORDER.indexOf(a.slot) + 99 * (SLOT_ORDER.indexOf(a.slot) < 0)) - (SLOT_ORDER.indexOf(b.slot) + 99 * (SLOT_ORDER.indexOf(b.slot) < 0)));
  manifest.states[st] = ordered.map((e, i) => ({
    file: `public/art-src/states/${st}/${i + 1}.jpg`,
    subject: e.subject || `${st} ${e.slot}`,
    title: e.title,
    creator: e.creator || '',
    license: e.licenseStr,
    sourcePage: e.page,
    imageUrl: e.image,
  }));
  added += ordered.length;
  states++;
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Merged ${added} images across ${states} new states (${rejected} rejected). Manifest now has ${Object.keys(manifest.states).length} states.`);
