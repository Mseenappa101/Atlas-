// Document templates. Bracketed text is meant to be replaced.
// Bodies are trusted static HTML (h2, h3, p, ul, li, strong, em only) shared by the on-page view and the .doc download.

export const TEMPLATES = [
  {
    slug: '1l-resume',
    title: '1L resume',
    description: 'One page, education first, built for the January update when grades come out.',
    body: `
<h2>[FIRST LAST]</h2>
<p class="center">[City, State] · [email@school.edu] · [(555) 555-5555]</p>

<h3>Education</h3>
<p><strong>[Law School]</strong>, [City, State]<br>
Juris Doctor Candidate, May 2029<br>
GPA: [x.xx] <em>(add after fall grades only if it helps you)</em><br>
Activities: [Student organization], [Moot court / journal tryouts, if applicable]</p>

<p><strong>[University]</strong>, [City, State]<br>
Bachelor of Arts in [Major], [cum laude], May [Year]<br>
Honors: [Award or scholarship]<br>
Activities: [Leadership role, organization]</p>

<h3>Experience</h3>
<p><strong>[Employer]</strong>, [City, State]<br>
<em>[Title]</em>, [Month Year] – [Month Year]</p>
<ul>
<li>[Start with a verb. Say what you did and for whom: "Drafted weekly status memos for a five-attorney litigation team."]</li>
<li>[Give a number where you can: volume, dollars, people, deadlines.]</li>
<li>[Writing, research and client contact are what a firm is looking for. Lead with those.]</li>
</ul>

<p><strong>[Employer]</strong>, [City, State]<br>
<em>[Title]</em>, [Month Year] – [Month Year]</p>
<ul>
<li>[Two or three lines per job is enough. Older or unrelated jobs can be one line.]</li>
</ul>

<h3>Skills &amp; Interests</h3>
<p>Languages: [Language (fluency)]<br>
Interests: [Two or three specific ones. "Distance running, Texas barbecue, restoring old radios" starts conversations; "reading, travel" does not.]</p>
`,
  },
  {
    slug: 'boutique-cover-letter',
    title: 'Boutique cover letter',
    description: 'Short and specific: why this firm, why this city, what you can do for them this summer.',
    body: `
<p>[Your Name]<br>[Address]<br>[Email] · [Phone]</p>
<p>[Date]</p>
<p>[Hiring Attorney Name]<br>[Firm Name]<br>[Street Address]<br>[City, State ZIP]</p>

<p>Dear [Mr./Ms. Last Name]:</p>

<p>I am a first-year student at [Law School] and am writing to apply for a summer law clerk position with [Firm Name] in [City]. [One sentence on how you found them: a named attorney you spoke with, a case you followed, a talk you attended. If someone referred you, say so here.]</p>

<p>I am drawn to [Firm Name] because of [something specific to this firm: its trial work in commercial disputes, its plaintiff-side employment practice, its size and the early responsibility that comes with it]. [One sentence tying that to your own interest or background.] I also plan to build my career in [City], where [your real connection: family, undergrad, prior job].</p>

<p>Before law school, I [one or two concrete things you did that a small firm would value: wrote, researched, managed clients, handled deadlines]. At [Law School], I [legal writing assignment, research project, or activity]. I would bring the same [quality] to research and drafting for your attorneys this summer.</p>

<p>My resume is enclosed, and I would welcome the chance to talk. I can be reached at [phone] or [email]. Thank you for your time and consideration.</p>

<p>Sincerely,</p>
<p>[Your Name]</p>
`,
  },
  {
    slug: 'networking-emails',
    title: 'Networking emails',
    description: 'Three short emails: a first reach-out to an attorney, a follow-up, and a thank-you.',
    body: `
<h3>1. First reach-out</h3>
<p><strong>Subject:</strong> [Law School] 1L interested in [practice area] in [City]</p>
<p>Dear [Mr./Ms. Last Name],</p>
<p>I&rsquo;m a 1L at [Law School] and found your profile [through the alumni directory / on the firm&rsquo;s site]. [One specific line: you also went to X, you handled a case I read about, you moved from Y to Z.]</p>
<p>I&rsquo;m interested in [practice area] in [City] and would be grateful for 15 minutes to hear how you got started and what you&rsquo;d tell a 1L in my position. I&rsquo;m happy to work around your schedule, by phone or in person.</p>
<p>Thank you,<br>[Your Name]<br>[Law School], J.D. Candidate 2029<br>[Phone]</p>

<h3>2. Follow-up (one week, no reply)</h3>
<p><strong>Subject:</strong> Re: [original subject]</p>
<p>Dear [Mr./Ms. Last Name],</p>
<p>I wanted to follow up on my note below. I know your schedule is full, so even a short call in the next few weeks would be very helpful. Thank you again for considering it.</p>
<p>Best,<br>[Your Name]</p>

<h3>3. Thank-you (same day as the conversation)</h3>
<p><strong>Subject:</strong> Thank you</p>
<p>Dear [Mr./Ms. Last Name],</p>
<p>Thank you for taking the time to talk with me today. Your point about [one specific thing they said] was especially helpful, and I&rsquo;m going to [the concrete next step you&rsquo;ll take].</p>
<p>[If they offered: I&rsquo;ll reach out to [name] as you suggested.] I&rsquo;ll keep you posted on my search.</p>
<p>Best regards,<br>[Your Name]</p>
`,
  },
];
