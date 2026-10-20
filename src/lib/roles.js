// "Hires for": the roles a firm hires law students and new grads into (firms.hires_for, listings.roles).
export const ROLES = [
  { value: '1l-summer', label: '1L summer', short: '1L summer' },
  { value: '2l-summer', label: '2L summer', short: '2L summer' },
  { value: 'post-grad', label: 'Post-grad associate', short: 'Post-grad' },
  { value: 'entry-lateral', label: 'Entry-level lateral', short: 'Entry lateral' },
];
export const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

// The home page's "Where are you?" stages and the roles each one searches for.
export const STAGES = [
  { value: '1L', label: '1L', roles: ['1l-summer'], offer: 'sprint', note: 'Your 1L summer job is usually found by writing to firms directly. The Sprint gets 20 of those emails out in 5 days.' },
  { value: '2L', label: '2L', roles: ['2l-summer'], offer: 'sprint', note: 'No summer job yet? Mid-size and regional firms keep hiring after OCI. Start with the Sprint; if you want it done for you, the Placement.' },
  { value: '3L', label: '3L', roles: ['post-grad'], offer: 'placement', note: 'No post-grad offer yet? The 90-Day Placement runs your search with you: 75+ firms contacted, every draft written for you.' },
  { value: 'recent-grad', label: 'Recent grad', roles: ['post-grad', 'entry-lateral'], offer: 'placement', note: 'Graduated without an offer? The 90-Day Placement is built for exactly this: a targeted, done-for-you search.' },
];
