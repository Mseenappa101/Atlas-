import { buildGeneric } from './_generic';

// Loads a state's postcard data: hand-authored Tier-1 art if it exists, otherwise a generic Tier-2 card
// built from the shared geometry. import.meta.glob keeps each state in its own lazy chunk (per-state
// load on click; every state asset stays small).
const TIER1 = new Set(['tx', 'la', 'ny', 'ga', 'fl']);
const geoModules = import.meta.glob('./geo/*.js');
const tierModules = import.meta.glob('./[a-z][a-z].js');

export async function loadState(code) {
  const lc = String(code || '').toLowerCase();
  if (TIER1.has(lc)) {
    const loader = tierModules[`./${lc}.js`];
    if (loader) return (await loader()).default;
  }
  const geoLoader = geoModules[`./geo/${lc}.js`];
  if (!geoLoader) return null;
  const geo = (await geoLoader()).default;
  return buildGeneric(lc.toUpperCase(), geo);
}
