import { STATE_NAMES } from '../../lib/catalog';
import { NICKNAMES } from './nicknames';

// Tier-2 generic postcard: the state outline + a neoclassical courthouse glyph + a neutral palette.
// Used for every state without hand-authored art. State colours stay a restrained slate (not the green
// UI chrome). The glyph reads as "law/courthouse", fitting a legal directory.

const COURTHOUSE = {
  box: [120, 96],
  scale: 0.4,
  anchorY: 0.6,
  art: [
    'M16,88 L104,88',                                   // ground
    'M20,82 L100,82',                                   // top step
    'M24,76 L96,76',                                    // stylobate
    'M30,42 L30,76 M44,42 L44,76 M58,42 L58,76 M62,42 L62,76 M76,42 L76,76 M90,42 L90,76', // columns
    'M22,42 L98,42',                                    // architrave
    'M18,36 L60,12 L102,36',                            // pediment
    'M28,36 L60,18 L92,36',                             // pediment inner
  ],
};

const PALETTE = { ink: '#3A4759', fill: '#E6EAF0', accent: '#B45309', star: '#C08A2D', paper: '#FBFAF6' };

export function buildGeneric(code, geo) {
  const name = STATE_NAMES[code] ?? code;
  return {
    code,
    name,
    nickname: NICKNAMES[code] ?? '',
    tier: 2,
    colors: PALETTE,
    viewBox: geo.viewBox,
    outline: geo.outline,
    centroid: geo.centroid,
    cities: [], // Tier 2 keeps it simple — no city pins
    landmark: COURTHOUSE,
    ambient: 'glow',
    copy: `Boutiques, mid-size and regional firms across ${name}.`,
  };
}
