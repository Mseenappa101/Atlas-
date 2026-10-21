import geo from './geo/ny.js';

// New York (Tier 1). Landmark: the Brooklyn Bridge — two gothic towers, suspension cables, deck.
// Original line-art, public-domain subject. State colours (Old Glory blue + flag red) stay in the card.
export default {
  code: 'NY',
  name: 'New York',
  nickname: 'The Empire State',
  tier: 1,
  colors: { ink: '#1A2E52', fill: '#DBE2EE', accent: '#C8102E', star: '#C08A2D', paper: '#FBFAF6' },

  viewBox: geo.viewBox,
  outline: geo.outline,
  centroid: geo.centroid,

  cities: [
    { name: 'New York', pin: geo.pins['New York'], capital: false, label: { dx: -8, dy: 12, anchor: 'end' } },
    { name: 'Buffalo', pin: geo.pins.Buffalo, label: { dx: 8, dy: 4, anchor: 'start' } },
    { name: 'Albany', pin: geo.pins.Albany, capital: true, label: { dx: 8, dy: 4, anchor: 'start' } },
    { name: 'Rochester', pin: geo.pins.Rochester, label: { dx: 8, dy: -6, anchor: 'start' } },
  ],

  landmark: {
    box: [120, 80],
    scale: 0.42,
    anchorY: 0.55,
    art: [
      'M4,60 L116,60',                                   // deck
      'M30,60 L30,16 L46,16 L46,60',                     // left tower
      'M74,60 L74,16 L90,16 L90,60',                     // right tower
      'M34,58 L34,40 Q38,31 42,40 L42,58',               // left tower arch
      'M78,58 L78,40 Q82,31 86,40 L86,58',               // right tower arch
      'M38,16 Q60,56 82,16',                             // main cable swag
      'M6,52 Q22,38 38,16',                              // left side cable
      'M82,16 Q98,38 114,52',                            // right side cable
      'M48,34 L48,60 M54,38 L54,60 M60,40 L60,60 M66,38 L66,60 M72,34 L72,60', // suspenders
    ],
  },

  ambient: 'glow',
  copy: 'From Manhattan boutiques to upstate firms in Buffalo, Albany and Rochester.',
};
