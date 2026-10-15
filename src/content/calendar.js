// 1L recruiting windows for the 2026–27 cycle. Typical ranges from past cycles, not promises:
// individual employers move. Dates are [year, month (1-12), day].
// Review before each edition; `reviewed` shows on the page.

export const CYCLE = { start: [2026, 10, 1], end: [2027, 6, 30], reviewed: 'Oct 2026' };

export const PATHS = [
  {
    path: 'BigLaw',
    windows: [
      { label: '1L diversity fellowships', start: [2026, 10, 15], end: [2027, 1, 15], note: 'Many firm and bar-association 1L programs open in the fall and close by mid-January.' },
      { label: '1L summer programs', start: [2026, 12, 1], end: [2027, 2, 15], note: 'The few firms with general 1L programs mostly take applications in December and January.' },
    ],
  },
  {
    path: 'Boutique',
    windows: [
      { label: 'Rolling, after fall grades', start: [2027, 1, 10], end: [2027, 4, 15], note: 'Small firms often hire once first-semester grades are out, and keep hiring into spring.' },
    ],
  },
  {
    path: 'Mid-size',
    windows: [
      { label: 'Applications', start: [2027, 1, 1], end: [2027, 3, 15], note: 'Some run a formal 1L program; many hire one or two 1Ls through direct outreach.' },
    ],
  },
  {
    path: 'Regional',
    windows: [
      { label: 'Applications', start: [2027, 1, 1], end: [2027, 4, 1], note: 'Firms in your home or target market are the most likely to take a 1L. Lead with the connection.' },
    ],
  },
  {
    path: 'Government',
    windows: [
      { label: 'Federal internships', start: [2026, 10, 15], end: [2027, 2, 1], note: 'Volunteer 1L internships at federal agencies. Several close by early winter.' },
      { label: 'Judges, DAs, AGs', start: [2027, 1, 1], end: [2027, 3, 31], note: 'Judicial internships and state and local offices mostly hire January through March.' },
    ],
  },
  {
    path: 'Public interest',
    windows: [
      { label: 'Summer positions', start: [2027, 1, 1], end: [2027, 3, 31], note: 'Legal aid and advocacy groups post summer roles after the new year.' },
      { label: 'Summer funding', start: [2027, 2, 1], end: [2027, 4, 15], note: 'School and outside grants for unpaid summer work. Deadlines vary by school.' },
    ],
  },
];

// Single-date milestones shown in the month list.
export const MILESTONES = [
  { date: [2026, 10, 15], text: 'Law school career offices can begin formal counseling with 1Ls.' },
  { date: [2027, 1, 15], text: 'Fall grades out at most schools. Update your resume the same week.' },
  { date: [2027, 5, 20], text: 'Most 1L summer jobs start late May to early June.' },
];
