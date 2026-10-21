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
    scale: 0.36,
    anchorY: 0.6,
    art: [
      // peach body — two shoulders with a top cleft, plump rounded bottom
      'M49,28 C32,28 20,43 20,61 C20,80 35,93 50,93 C65,93 80,80 80,61 C80,43 68,28 51,28 C50.5,31 49.5,31 49,28 Z',
      'M50,31 C45,50 45,73 50,91',                      // suture crease
      'M52,37 C61,49 61,71 56,86',                      // far-lobe contour
      'M50,28 L53,18',                                  // stem
      'M56,22 Q71,18 85,20',                            // leaf vein
    ],
    accent: { d: 'M53,21 C63,9 82,11 88,19 C77,26 60,28 53,23 Z', color: 'leaf' }, // leaf blade
  },

  ambient: 'glow',
  copy: 'Atlanta’s market plus Savannah, Augusta and Macon firms across the state.',
};
