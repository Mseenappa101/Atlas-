import geo from './geo/fl.js';

// Florida (Tier 1). Landmark: a Miami Beach Art Deco facade (stepped tower, fluting, eyebrow bands).
// Original line-art — architectural, reads cleanly in the narrow peninsula.
export default {
  code: 'FL',
  name: 'Florida',
  nickname: 'The Sunshine State',
  tier: 1,
  colors: { ink: '#1F6E6A', fill: '#D7ECE7', accent: '#E08A2C', star: '#E0A42C', sun: '#E0A42C', paper: '#FBFAF6' },

  viewBox: geo.viewBox,
  outline: geo.outline,
  centroid: geo.centroid,

  cities: [
    { name: 'Jacksonville', pin: geo.pins.Jacksonville, label: { dx: -8, dy: 4, anchor: 'end' } },
    { name: 'Orlando', pin: geo.pins.Orlando, label: { dx: 8, dy: 4, anchor: 'start' } },
    { name: 'Tampa', pin: geo.pins.Tampa, label: { dx: -8, dy: 4, anchor: 'end' } },
    { name: 'Miami', pin: geo.pins.Miami, label: { dx: -8, dy: 4, anchor: 'end' } },
  ],

  landmark: {
    box: [110, 96],
    scale: 0.3,
    anchorY: 0.46,
    dy: 16,
    dx: 8,
    art: [
      'M22,92 L88,92',                                                       // ground
      'M28,92 L28,46 L36,46 L36,32 L46,32 L46,22 L64,22 L64,32 L74,32 L74,46 L82,46 L82,92', // stepped facade
      'M50,22 L52,14 L55,9 L58,14 L60,22',                                   // ziggurat finial
      'M55,9 L55,3',                                                          // mast
      'M46,32 L46,88 M51,24 L51,88 M55,22 L55,88 M59,24 L59,88 M64,32 L64,88', // central fluting
      'M34,50 L34,88 M76,50 L76,88',                                          // wing fluting
      'M28,54 L82,54 M28,66 L82,66 M28,78 L82,78',                           // eyebrow bands
    ],
  },

  ambient: 'glow',
  copy: 'Miami, Orlando, Tampa and Jacksonville — summer and post-grad roles statewide.',
};
