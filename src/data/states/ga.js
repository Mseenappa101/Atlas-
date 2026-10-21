import geo from './geo/ga.js';

// Georgia (Tier 1). Landmark: a peach with a leaf — the state fruit. Original line-art.
export default {
  code: 'GA',
  name: 'Georgia',
  nickname: 'The Peach State',
  tier: 1,
  colors: { ink: '#7A2E2E', fill: '#F3E0DC', accent: '#C65D3B', star: '#C08A2D', leaf: '#4E7B3B', paper: '#FBFAF6' },

  viewBox: geo.viewBox,
  outline: geo.outline,
  centroid: geo.centroid,

  cities: [
    { name: 'Atlanta', pin: geo.pins.Atlanta, capital: true, label: { dx: 8, dy: 4, anchor: 'start' } },
    { name: 'Augusta', pin: geo.pins.Augusta, label: { dx: -8, dy: 4, anchor: 'end' } },
    { name: 'Savannah', pin: geo.pins.Savannah, label: { dx: -8, dy: 4, anchor: 'end' } },
    { name: 'Macon', pin: geo.pins.Macon, label: { dx: 8, dy: 14, anchor: 'start' } },
  ],

  landmark: {
    box: [96, 96],
    scale: 0.34,
    anchorY: 0.6,
    art: [
      // peach body (two soft lobes with a top cleft)
      'M48,30 C28,30 20,48 20,62 C20,82 36,92 48,92 C60,92 76,82 76,62 C76,48 68,30 50,30 Q49,34 48,30 Z',
      'M48,36 Q51,62 48,90',                            // crease
      'M50,30 L55,18',                                  // stem
    ],
    accent: { d: 'M55,22 Q72,12 86,20 Q70,30 55,28 Q53,25 55,22 Z', color: 'leaf' }, // leaf
  },

  ambient: 'glow',
  copy: 'Atlanta’s market plus Savannah, Augusta and Macon firms across the state.',
};
