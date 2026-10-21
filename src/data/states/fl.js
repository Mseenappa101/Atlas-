import geo from './geo/fl.js';

// Florida (Tier 1). Landmark: a palm over a rising sun. Original line-art.
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
    scale: 0.34,
    anchorY: 0.42,
    dy: 10,
    dx: 8,
    art: [
      'M58,92 Q52,60 60,36',                            // trunk
      'M60,36 Q40,24 22,30',                            // frond
      'M60,36 Q48,18 40,10',                            // frond
      'M60,36 Q62,14 72,8',                             // frond
      'M60,36 Q82,16 100,26',                           // frond
      'M60,36 Q86,34 100,46',                           // frond
      'M60,36 Q42,32 26,46',                            // frond
      'M56,68 Q58,66 60,68 M55,56 Q57,54 59,56',        // trunk texture
    ],
  },

  ambient: 'glow',
  copy: 'Miami, Orlando, Tampa and Jacksonville — summer and post-grad roles statewide.',
};
