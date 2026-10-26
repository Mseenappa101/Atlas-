// Representative legal markets for the immersive map's city pillars + case files.
// lon/lat place the pillar (projected with the same albers-usa as the state geometry);
// `firms` sizes the pillar; `cases` are sample case-file cards (practice shown, firm/contact
// sealed until unlock — mirrors the live /explore gating). Hand-picked states are richest.
export const STATE_CITIES = {
  TX: { name: 'Texas', cities: [
    { name: 'Dallas', lon: -96.797, lat: 32.777, firms: 10, cases: [
      { practice: 'Commercial litigation boutique', hiring: '2L summer · post-grad' },
      { practice: 'Energy & regulatory', hiring: '1L summer · 2L summer' },
      { practice: 'Mid-size general practice', hiring: 'Post-grad associate' } ] },
    { name: 'Houston', lon: -95.369, lat: 29.760, firms: 8, cases: [
      { practice: 'Energy transactions', hiring: '2L summer' },
      { practice: 'Plaintiff trial firm', hiring: 'Post-grad associate' } ] },
    { name: 'Austin', lon: -97.743, lat: 30.267, firms: 4, cases: [
      { practice: 'Technology & IP boutique', hiring: '2L summer' } ] },
    { name: 'San Antonio', lon: -98.493, lat: 29.424, firms: 2, cases: [
      { practice: 'Regional general practice', hiring: 'Post-grad associate' } ] },
  ] },
  NY: { name: 'New York', cities: [
    { name: 'New York City', lon: -74.006, lat: 40.713, firms: 22, cases: [
      { practice: 'Litigation boutique', hiring: '2L summer · post-grad' },
      { practice: 'Specialty finance', hiring: '2L summer' },
      { practice: 'Public-interest fellowship', hiring: 'Post-grad' } ] },
    { name: 'Buffalo', lon: -78.878, lat: 42.886, firms: 4, cases: [
      { practice: 'Regional mid-size', hiring: 'Post-grad associate' } ] },
    { name: 'Albany', lon: -73.756, lat: 42.652, firms: 4, cases: [
      { practice: 'Government & regulatory', hiring: '2L summer' } ] },
  ] },
  LA: { name: 'Louisiana', cities: [
    { name: 'New Orleans', lon: -90.071, lat: 29.951, firms: 8, cases: [
      { practice: 'Maritime & admiralty', hiring: '2L summer · post-grad' },
      { practice: 'Litigation boutique', hiring: 'Post-grad associate' } ] },
    { name: 'Baton Rouge', lon: -91.187, lat: 30.451, firms: 3, cases: [
      { practice: 'Energy & environmental', hiring: '2L summer' } ] },
  ] },
  GA: { name: 'Georgia', cities: [
    { name: 'Atlanta', lon: -84.388, lat: 33.749, firms: 10, cases: [
      { practice: 'Mid-size general practice', hiring: '2L summer · post-grad' },
      { practice: 'Litigation boutique', hiring: 'Post-grad associate' } ] },
    { name: 'Savannah', lon: -81.099, lat: 32.083, firms: 2, cases: [
      { practice: 'Regional general practice', hiring: 'Post-grad' } ] },
  ] },
  FL: { name: 'Florida', cities: [
    { name: 'Miami', lon: -80.192, lat: 25.762, firms: 12, cases: [
      { practice: 'International arbitration', hiring: '2L summer' },
      { practice: 'Litigation boutique', hiring: 'Post-grad associate' } ] },
    { name: 'Orlando', lon: -81.379, lat: 28.538, firms: 8, cases: [
      { practice: 'Insurance defense', hiring: 'Post-grad' } ] },
    { name: 'Tampa', lon: -82.458, lat: 27.951, firms: 6, cases: [
      { practice: 'Business litigation', hiring: '2L summer' } ] },
    { name: 'Jacksonville', lon: -81.656, lat: 30.332, firms: 3, cases: [
      { practice: 'Regional mid-size', hiring: 'Post-grad associate' } ] },
  ] },
  CA: { name: 'California', cities: [
    { name: 'Los Angeles', lon: -118.244, lat: 34.052, firms: 10, cases: [
      { practice: 'Entertainment & IP', hiring: '2L summer · post-grad' },
      { practice: 'Litigation boutique', hiring: 'Post-grad associate' } ] },
    { name: 'San Francisco', lon: -122.419, lat: 37.775, firms: 9, cases: [
      { practice: 'Technology & venture', hiring: '2L summer' } ] },
    { name: 'San Diego', lon: -117.161, lat: 32.716, firms: 4, cases: [
      { practice: 'Life-sciences IP', hiring: '2L summer' } ] },
  ] },
  IL: { name: 'Illinois', cities: [
    { name: 'Chicago', lon: -87.630, lat: 41.878, firms: 15, cases: [
      { practice: 'Commercial litigation', hiring: '2L summer · post-grad' },
      { practice: 'Restructuring boutique', hiring: '2L summer' },
      { practice: 'Public-interest', hiring: 'Post-grad fellowship' } ] },
    { name: 'Springfield', lon: -89.650, lat: 39.798, firms: 2, cases: [
      { practice: 'Government & regulatory', hiring: 'Post-grad' } ] },
  ] },
  DC: { name: 'District of Columbia', cities: [
    { name: 'Washington', lon: -77.037, lat: 38.907, firms: 17, cases: [
      { practice: 'Appellate & regulatory', hiring: '2L summer · post-grad' },
      { practice: 'Government relations', hiring: '2L summer' },
      { practice: 'Public-interest litigation', hiring: 'Post-grad fellowship' } ] },
  ] },
};

// Firm total per state (for the national "lit jurisdiction" glow + pillar scaling).
export const STATE_FIRMS = Object.fromEntries(
  Object.entries(STATE_CITIES).map(([k, v]) => [k, v.cities.reduce((s, c) => s + c.firms, 0)])
);
