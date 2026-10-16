// Free path: a cover letter filled in from the student's profile and resume and the firm's data.
// Brackets mark the parts only the student can write. No AI.

const YEAR = { '1L': 'first-year', '2L': 'second-year', '3L': 'third-year', transfer: 'first-year', incoming: 'incoming' };

const today = () => new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const lower = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const listOf = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

export function templateLetter({ profile, resume, firm, listing }) {
  const name = resume?.name || profile?.full_name || '[Your name]';
  const school = resume?.education?.[0]?.school || profile?.school || '[Your law school]';
  const year = YEAR[profile?.class_year] ?? 'first-year';
  const office = firm.offices?.find((o) => o.city === listing?.city) ?? firm.offices?.[0];
  const city = office?.city ?? '';
  const place = [office?.city, office?.state].filter(Boolean).join(', ');
  const role = listing?.title ? `the ${listing.title}` : 'a summer position';
  const practice = firm.practice?.slice(0, 2).map((p) => p.toLowerCase()) ?? [];
  const job = resume?.experience?.find((x) => x.employer);
  const contact = [resume?.email || profile?.email, resume?.phone].filter(Boolean).join(' or ');
  const ties = (profile?.target_market ?? '').toLowerCase().includes(city.toLowerCase()) && city;

  const p1 = `I am a ${year} student at ${school}, and I am applying for ${role} with ${firm.name}${city ? ` in ${city}` : ''}. [One sentence on how you found the firm: a person you spoke with, an event, or a case you followed.]`;
  const p2 = `${practice.length ? `${firm.name}'s work in ${listOf(practice)} is why I am applying.` : `I am applying to ${firm.name} because [the specific work that draws you to the firm].`} [One specific detail from the firm's site: a matter, the clients it represents, or how it trains summer associates.] ${
    ties ? `I plan to build my career in ${city}.` : city ? `[If you have a real connection to ${city}, say it here.]` : ''
  }`.trim();
  const p3 = `${
    job
      ? `Before law school, I worked as ${job.title ? `${/^[aeiou]/i.test(job.title) ? 'an' : 'a'} ${job.title}` : 'a member of the team'} at ${job.employer}${job.bullets?.[0] ? `, where I ${lower(job.bullets[0])}` : ''}.`
      : '[Describe one job or project where you wrote, researched or handled deadlines.]'
  } At ${school}, [name your legal writing work or an activity]. I would bring the same care to research and drafting for your attorneys this summer.`;
  const p4 = `My resume is enclosed, and I would welcome the chance to talk. ${contact ? `I can be reached at ${contact}. ` : ''}Thank you for your time and consideration.`;

  return [today(), ['Recruiting Committee', firm.name, place].filter(Boolean).join('\n'), 'Dear Recruiting Committee:', p1, p2, p3, p4, `Sincerely,\n${name}`].join('\n\n');
}
