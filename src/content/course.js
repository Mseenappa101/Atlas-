// Public curriculum for the on-site Sprint course (/sprint/course). Everything here ships in the client
// bundle on purpose — it's the outline a prospective buyer should see. The lesson VIDEOS are gated and
// come from the API (/api/sprint/lessons) only after a paid Stripe session is verified. Keys match
// api/config.js `sprintCourseVideos` and api/sprint.js LESSON_KEYS.

export const SPRINT_COURSE = [
  {
    key: 'build-list',
    day: 'Monday',
    title: 'Build your list',
    summary: 'Build a 20-firm target list from the Firmward database, filtered to your class year and the role you’re after.',
    notes: [
      'Filter the directory to your market and the role you want: 1L summer, 2L summer, post-grad associate or an entry-level move.',
      'Sort for firms that actually hire for your role, not just the biggest names.',
      'Find the right person to write to at each firm, and record it in the list template.',
    ],
  },
  {
    key: 'fix-resume',
    day: 'Tuesday',
    title: 'Fix your resume',
    summary: 'Fix the top third of your resume — the part a recruiter reads in the first ten seconds.',
    notes: [
      'Rework the top third so your strongest line is the first thing read.',
      'Cut the filler that every student includes and nobody reads.',
      'Make each bullet show a result, not a responsibility.',
    ],
  },
  {
    key: 'write-email',
    day: 'Wednesday',
    title: 'Write the email',
    summary: 'Write the outreach email that gets answered: short, specific to the firm, with a clear ask.',
    notes: [
      'Open with the one specific reason you’re writing this firm.',
      'Keep it under 150 words with a single, clear ask.',
      'Build the reusable template you’ll send to all 20 firms.',
    ],
  },
  {
    key: 'send-day',
    day: 'Thursday',
    title: 'Send day',
    summary: '20 emails sent, each personalized to the firm.',
    notes: [
      'Personalize the template for each firm — one real sentence per email.',
      'Send all 20 in one focused block, and log who you wrote.',
      'Set a reminder for the follow-up you’ll send next week.',
    ],
  },
  {
    key: 'live-call',
    day: 'Friday',
    title: 'Live call',
    summary: 'A live 45-minute call with Michael: draft critique and Q&A.',
    notes: [
      'Bring your list, your resume and a sent email for live critique.',
      'Watch the recording here if you can’t make the call live.',
      'Leave with the plan for the weeks after the Sprint.',
    ],
  },
];
