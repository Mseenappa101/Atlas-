import geo from './geo/la.js';

// Louisiana (Tier 1). Landmark: a St. Charles-style streetcar. Original line-art.
export default {
  code: 'LA',
  name: 'Louisiana',
  nickname: 'The Pelican State',
  tier: 1,
  colors: { ink: '#2E5A54', fill: '#DDEBE7', accent: '#B5842B', star: '#B5842B', paper: '#FBFAF6' },

  viewBox: geo.viewBox,
  outline: geo.outline,
  centroid: geo.centroid,

  cities: [
    { name: 'Shreveport', pin: geo.pins.Shreveport, label: { dx: 8, dy: 4, anchor: 'start' } },
    { name: 'Baton Rouge', pin: geo.pins['Baton Rouge'], capital: true, label: { dx: 8, dy: -6, anchor: 'start' } },
    { name: 'Lafayette', pin: geo.pins.Lafayette, label: { dx: -8, dy: 4, anchor: 'end' } },
    { name: 'New Orleans', pin: geo.pins['New Orleans'], label: { dx: -8, dy: 14, anchor: 'end' } },
  ],

  landmark: {
    box: [120, 72],
    scale: 0.44,
    anchorY: 0.55,
    art: [
      'M22,30 L22,56 L98,56 L98,30 Z',                  // body
      'M18,30 L102,30',                                 // roof
      'M30,36 L44,36 L44,48 L30,48 Z',                  // window
      'M50,36 L64,36 L64,48 L50,48 Z',                  // window
      'M70,36 L84,36 L84,48 L70,48 Z',                  // window
      'M88,36 L96,36 L96,56 L88,56',                    // door
      'M38,56 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 Z',      // wheel
      'M72,56 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 Z',      // wheel
      'M14,64 L106,64',                                 // rail
      'M60,30 L70,14',                                  // trolley pole
      'M16,12 L108,12',                                 // wire
    ],
  },

  ambient: 'glow',
  copy: 'New Orleans, Baton Rouge, Lafayette and Shreveport — boutiques and regional firms.',
};
