import geo from './geo/tx.js';

// Texas — the flagship postcard (Tier 1). Original line-art (public-domain subjects only: the state
// capitol dome and a generic longhorn silhouette — no logos, no team marks). Geometry comes from the
// shared generator; colours/cities/landmark/copy are hand-authored. State colours live ONLY inside the
// card; the surrounding UI stays green.

export default {
  code: 'TX',
  name: 'Texas',
  nickname: 'The Lone Star State',
  tier: 1,

  // Drawn from the Texas flag: Old Glory blue, flag red, a gold lone star.
  colors: {
    ink: '#002868',      // outline + labels
    fill: '#DCE4F1',     // soft state fill (tint of flag blue)
    accent: '#BF0A30',   // city pins
    star: '#C08A2D',     // lone star / gilt
    paper: '#FBFAF6',    // postcard ground
  },

  viewBox: geo.viewBox,     // [400, 288]
  outline: geo.outline,
  centroid: geo.centroid,

  cities: [
    { name: 'Dallas', pin: geo.pins.Dallas, label: { dx: 8, dy: 4, anchor: 'start' } },
    { name: 'Houston', pin: geo.pins.Houston, label: { dx: 8, dy: 4, anchor: 'start' } },
    { name: 'Austin', pin: geo.pins.Austin, capital: true, label: { dx: 0, dy: -9, anchor: 'middle' } },
    { name: 'San Antonio', pin: geo.pins['San Antonio'], label: { dx: -8, dy: 14, anchor: 'end' } },
  ],

  // Landmark line-art, authored in a local 120×96 box; the component positions it rising behind the
  // state. `stroke` paths are drawn as line-art; `fill` paths are solid silhouettes.
  landmark: {
    box: [120, 96],
    // Capitol dome: pediment, columned drum, ribbed dome, lantern, finial.
    dome: [
      'M12,92 L108,92',                                  // ground line
      'M24,92 L24,60 L96,60 L96,92',                     // drum walls
      'M24,60 L96,60',                                    // drum cornice
      'M33,60 L33,88 M45,60 L45,88 M57,60 L57,88 M63,60 L63,88 M75,60 L75,88 M87,60 L87,88', // columns
      'M24,60 Q60,18 96,60 Z',                            // dome cap
      'M44,44 Q60,30 76,44 M38,52 Q60,34 82,52',          // dome ribs
      'M54,24 L66,24 L66,16 L54,16 Z',                    // lantern
      'M60,16 L60,6',                                     // finial mast
    ],
    // A small gilt star atop the finial (its own colour).
    finialStar: 'M60,2 L61.8,6.2 L66,6.2 L62.6,9 L64,13.2 L60,10.6 L56,13.2 L57.4,9 L54,6.2 L58.2,6.2 Z',
    // Longhorn silhouette (generic), authored in a local 120×54 box.
    longhornBox: [120, 54],
    longhorn:
      'M60,30 q-7,0 -10,6 q-2,4 -6,4 q7,4 16,2 q9,2 16,-2 q-4,0 -6,-4 q-3,-6 -10,-6 Z'
      + ' M50,30 C34,30 20,18 8,22 C20,24 30,34 50,33 Z'
      + ' M70,30 C86,30 100,18 112,22 C100,24 90,34 70,33 Z',
  },

  ambient: 'star', // the lone star twinkles after the reveal

  copy: 'Boutiques, mid-size and regional firms across Dallas, Houston, Austin and San Antonio.',
};
