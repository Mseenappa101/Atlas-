// Recruiting windows for the 2026–27 cycle: 1L summer, 2L summer and post-grad. Typical ranges from
// past cycles, not promises:
// individual employers move. Dates are [year, month (1-12), day].
// Review before each edition; `reviewed` shows on the page.

export const CYCLE = { start: [2026, 10, 1], end: [2027, 6, 30], reviewed: 'Oct 2026' };

export const PATHS = [
  {
    path: 'BigLaw',
    windows: [
      { label: '1L diversity fellowships', start: [2026, 10, 15], end: [2027, 1, 15], note: 'Many firm and bar-association 1L programs open in the fall and close by mid-January.' },
      { label: '1L summer programs', start: [2026, 12, 1], end: [2027, 2, 15], note: 'The few firms with general 1L programs mostly take applications in December and January.' },
      { label: '2L summer: after OCI', start: [2026, 10, 1], end: [2026, 12, 15], note: 'Most 2L hiring happened over the summer, but firms fill remaining spots through the fall.' },
    ],
  },
  {
    path: 'Boutique',
    windows: [
      { label: '1L summer: after fall grades', start: [2027, 1, 10], end: [2027, 4, 15], note: 'Small firms often hire 1Ls once first-semester grades are out, and keep hiring into spring.' },
      { label: 'Post-grad associates', start: [2027, 2, 1], end: [2027, 6, 30], note: 'Boutiques hire new grads when they need someone, often in spring. Direct outreach works best.' },
    ],
  },
  {
    path: 'Mid-size',
    windows: [
      { label: '1L summer', start: [2027, 1, 1], end: [2027, 3, 15], note: 'Some run a formal 1L program; many hire one or two 1Ls through direct outreach.' },
      { label: '2L summer', start: [2026, 10, 1], end: [2027, 2, 15], note: 'Many mid-size firms keep hiring 2Ls through the fall and winter after OCI.' },
      { label: 'Post-grad associates', start: [2027, 1, 15], end: [2027, 6, 30], note: 'Firms without a summer pipeline hire 3Ls and new grads directly, mostly in spring.' },
    ],
  },
  {
    path: 'Regional',
    windows: [
      { label: '1L summer', start: [2027, 1, 1], end: [2027, 4, 1], note: 'Firms in your home or target market are the most likely to take a 1L. Lead with the connection.' },
      { label: '2L summer', start: [2026, 10, 1], end: [2027, 2, 1], note: 'Regional firms often run a later 2L process than national firms.' },
      { label: 'Post-grad associates', start: [2027, 1, 15], end: [2027, 6, 30], note: 'Hiring for fall start dates picks up in spring; a market connection helps most.' },
    ],
  },
  {
    path: 'Government',
    windows: [
      { label: 'Federal internships', start: [2026, 10, 15], end: [2027, 2, 1], note: 'Volunteer 1L internships at federal agencies. Several close by early winter.' },
      { label: 'Judges, DAs, AGs', start: [2027, 1, 1], end: [2027, 3, 31], note: 'Judicial internships and state and local offices mostly hire January through March.' },
      { label: 'Post-grad: state and local', start: [2027, 1, 1], end: [2027, 5, 31], note: 'DA, public defender and state AG offices hire 3Ls for fall starts, often in spring.' },
    ],
  },
  {
    path: 'Public interest',
    windows: [
      { label: 'Summer positions', start: [2027, 1, 1], end: [2027, 3, 31], note: 'Legal aid and advocacy groups post summer roles after the new year.' },
      { label: 'Summer funding', start: [2027, 2, 1], end: [2027, 4, 15], note: 'School and outside grants for unpaid summer work. Deadlines vary by school.' },
      { label: 'Post-grad: staff attorney roles', start: [2027, 1, 15], end: [2027, 6, 30], note: 'Organizations hire 3Ls for staff roles as funding is confirmed, mostly in spring.' },
    ],
  },
];

// Single-date milestones shown in the month list.
export const MILESTONES = [
  { date: [2026, 10, 15], text: 'Law school career offices can begin formal counseling with 1Ls. 3Ls without offers: start your post-grad list now.' },
  { date: [2027, 1, 15], text: 'Fall grades out at most schools. Update your resume the same week.' },
  { date: [2027, 2, 23], text: 'February bar exam. Firms hiring new grads often move after results come out.' },
  { date: [2027, 5, 20], text: 'Most summer jobs start late May to early June.' },
];
