import { SITE, nextSprint } from '../site.config.js';

// Branded email templates. Each returns { subject, html, text }. Copy marked "DRAFT" is for Michael's review.

const GREEN = '#1F5C45';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const abs = (path) => (/^https?:/.test(path) ? path : `${SITE.url}${path}`);
const money = (n) => `$${n.toLocaleString('en-US')}`;

const et = (date, opts) => new Date(date).toLocaleString('en-US', { timeZone: 'America/New_York', ...opts });
export const etDateTime = (d) => `${et(d, { weekday: 'long', month: 'long', day: 'numeric' })} at ${et(d, { hour: 'numeric', minute: '2-digit' })} ET`;
const etDate = (d) => et(d, { weekday: 'long', month: 'long', day: 'numeric' });

const FOOTER_TEXT = 'Firmward provides career coaching and application support, not legal advice.';

/**
 * Blocks: strings are paragraphs; { button: [label, url] }; { list: [..] }; { heading }.
 * Builds both versions from the same content so they never drift apart.
 */
function render({ preheader = '', blocks, why }) {
  const html = blocks.map((b) => {
    if (typeof b === 'string') return `<p style="margin:0 0 16px">${esc(b).replace(/\n/g, '<br>')}</p>`;
    if (b.heading) return `<h2 style="margin:24px 0 8px;font-size:17px;line-height:1.3;color:#14181F">${esc(b.heading)}</h2>`;
    if (b.list) return `<ul style="margin:0 0 16px;padding-left:20px">${b.list.map((i) => `<li style="margin:0 0 6px">${esc(i)}</li>`).join('')}</ul>`;
    if (b.button) {
      const [label, url] = b.button;
      return `<p style="margin:8px 0 24px"><a href="${esc(abs(url))}" style="display:inline-block;background:${GREEN};color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:6px">${esc(label)}</a></p>`;
    }
    return '';
  }).join('\n');

  const text = blocks.map((b) => {
    if (typeof b === 'string') return b;
    if (b.heading) return b.heading.toUpperCase();
    if (b.list) return b.list.map((i) => `- ${i}`).join('\n');
    if (b.button) return `${b.button[0]}: ${abs(b.button[1])}`;
    return '';
  }).join('\n\n');

  return {
    html: `<!doctype html><html><body style="margin:0;background:#F6F7F5;font-family:Arial,Helvetica,sans-serif;color:#14181F">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #E3E6E8;border-radius:8px">
<tr><td style="padding:24px 28px 0;font-weight:700;letter-spacing:.18em;font-size:14px;color:${GREEN}">FIRMWARD</td></tr>
<tr><td style="padding:16px 28px 8px;font-size:15px;line-height:1.55">${html}</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#5B6470">${esc(why)}<br>${esc(FOOTER_TEXT)}</p>
</td></tr></table></body></html>`,
    text: `${text}\n\n--\n${why}\n${FOOTER_TEXT}`,
  };
}

const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] || '';
const hi = (name) => (firstName(name) ? `Hi ${firstName(name)},` : 'Hi,');
const WHY = 'You’re getting this because you signed up at firmward.org.';

// ─── DAY 0: welcome (sent on signup) ────────────────────────────────────────

export function welcomeEmail({ name, unlockUrl }) {
  return {
    subject: 'Your recruiting calendar + the full Firmward firm data',
    ...render({
      preheader: 'The full map is unlocked on this browser. Here’s the calendar.',
      why: WHY,
      blocks: [
        hi(name),
        'Thanks for signing up. Two things you can use today:',
        { heading: '1. The Law Student Recruiting Calendar' },
        'When 1L summer, 2L summer and post-grad hiring actually happens, month by month, with each firm’s window on it.',
        { button: ['Open the calendar', SITE.RECRUITING_CALENDAR_URL] },
        { heading: '2. The full firm data' },
        'Who each firm hires for (1L summer, 2L summer, post-grad), application windows, how to apply and the recruiting contact. It’s unlocked on the browser you signed up on. On another device, use this link:',
        { button: ['Unlock the full map', unlockUrl] },
        `Next: if you want a real list of firms to contact, the 20-Firm Sprint takes you from that list to 20 sent emails in 5 days (${money(SITE.PRICES.sprint)}).`,
        `— ${SITE.founder}`,
      ],
    }),
  };
}

// ─── WORKSHOP CONFIRMATION ──────────────────────────────────────────────────

export function workshopEmail({ name, title, start, zoomUrl }) {
  return {
    subject: `You’re registered: ${title}`,
    ...render({
      preheader: `${etDateTime(start)}. Calendar invite attached.`,
      why: 'You’re getting this because you registered for a Firmward workshop.',
      blocks: [
        hi(name),
        `You’re in for “${title}”, ${etDateTime(start)}. It’s free, about 45 minutes, and there’s time for questions at the end.`,
        zoomUrl ? { button: ['Join on Zoom', zoomUrl] } : 'The Zoom link will come in a reminder email before the workshop.',
        'The calendar invite is attached, so it’s one tap to add to your calendar.',
        'Bring one question about your search. Summer or post-grad, any class year.',
        `— ${SITE.founder}`,
      ],
    }),
  };
}

// ─── PLACEMENT APPLICATION ──────────────────────────────────────────────────

const ROLE_LABEL = { '1l-summer': '1L summer', '2l-summer': '2L summer', 'post-grad': 'Post-grad associate', 'entry-lateral': 'Entry-level lateral', other: 'Other' };
const CLASS_LABEL = { '1L': '1L', '2L': '2L', '3L': '3L', 'recent-grad': 'Recent grad', other: 'Other' };

export function placementToMichael(a) {
  const rows = [
    ['Name', a.name], ['Email', a.email], ['School', a.school], ['Class / grad year', `${CLASS_LABEL[a.class_year] ?? a.class_year ?? ''}${a.grad_year ? ` (${a.grad_year})` : ''}`],
    ['Role sought', ROLE_LABEL[a.role_sought] ?? a.role_sought], ['Target markets', a.markets], ['Firm types', a.firm_types],
    ['Current situation', a.situation], ['Biggest blocker', a.blocker],
    ['Source', [a.source_page, a.utm?.utm_source, a.utm?.utm_campaign].filter(Boolean).join(' · ')],
  ];
  return {
    subject: `Placement application: ${a.name} (${CLASS_LABEL[a.class_year] ?? ''}, ${ROLE_LABEL[a.role_sought] ?? ''})`,
    ...render({
      why: 'Sent by firmward.org when someone submits the Placement form. Reply to reach the applicant.',
      blocks: [
        'New Placement application. They were shown your scheduler next.',
        ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
      ],
    }),
  };
}

export function placementConfirmEmail({ name }) {
  return {
    subject: 'Got your Placement application',
    ...render({
      preheader: 'Next: book your strategy call if you haven’t yet.',
      why: 'You’re getting this because you applied for the 90-Day Placement at firmward.org.',
      blocks: [
        hi(name),
        'Thanks for applying for the 90-Day Placement. I read every application myself before our call.',
        'If you didn’t book a time on the page, you can do it here:',
        { button: ['Book a strategy call', '/placement#book'] },
        'Before the call, have your current resume handy and a rough list of the markets and firm types you want. We’ll spend the call on your situation, not a pitch.',
        `— ${SITE.founder}`,
      ],
    }),
  };
}

// ─── WELCOME SEQUENCE: day 2 and day 4 (templates to send later; see README) ─
// DRAFT FOR MICHAEL'S REVIEW.

export function sequenceDay2({ name }) {
  return {
    subject: 'Why I built Firmward (and the mistake I see at every stage)',
    ...render({
      preheader: 'From a 3L who wasn’t handed BigLaw.',
      why: WHY,
      blocks: [
        hi(name),
        'Quick story. I started law school at Brooklyn Law, transferred to Columbia Law, and I’m now a 3L with a written post-grad offer at a Dallas litigation boutique. None of that came from on-campus recruiting. It came from finding the firms that were actually hiring and writing to them directly.',
        'That’s what Firmward is for. Here’s the most common mistake I see at each stage:',
        { list: [
          '1Ls: waiting for 1L summer jobs to be posted. Most boutiques and mid-size firms never post. They hire whoever writes a good email at the right time.',
          '2Ls: treating the summer as a BigLaw-or-nothing bet. If OCI didn’t land, the mid-size and regional firms are still hiring, often into the spring.',
          '3Ls and recent grads: sending 5 applications and waiting. Post-grad hiring at small firms is a volume game: 50 to 100 targeted emails, with follow-ups.',
        ] },
        'Next email: how to fix that in 5 days.',
        `— ${SITE.founder}`,
      ],
    }),
  };
}

export function sequenceDay4({ name }) {
  const sprint = nextSprint();
  const founding = etDate(SITE.FOUNDING_DEADLINE);
  return {
    subject: '20 emails to hiring firms in 5 days',
    ...render({
      preheader: sprint ? `Next Sprint starts ${etDate(`${sprint.start}T12:00:00-05:00`)}.` : 'The 20-Firm Sprint.',
      why: WHY,
      blocks: [
        hi(name),
        `The 20-Firm Sprint is a 5-day challenge (${money(SITE.PRICES.sprint)}). In 5 days you’ll have a target list, a fixed resume, and 20 outreach emails sent to firms that are actually hiring for your role.`,
        { list: [
          'Monday: build a 20-firm target list from Firmward, filtered to your class year and role.',
          'Tuesday: fix the top third of your resume.',
          'Wednesday: write the outreach email that gets answered.',
          'Thursday: send day. 20 emails out.',
          'Friday: a live 45-minute call with me to critique drafts and answer questions.',
        ] },
        sprint ? `Next cohort starts ${etDate(`${sprint.start}T12:00:00-05:00`)}. Registration closes ${etDateTime(sprint.registrationCloses)}.` : 'The next cohort dates are on the Sprint page.',
        `The ${money(SITE.PRICES.sprint)} counts toward Membership if you join within ${SITE.FOUNDING.sprintCreditHours} hours. Founding Membership terms (${money(SITE.PRICES.membershipMonthly)}/month for life) close ${founding}.`,
        { button: ['Join the next Sprint', '/sprint'] },
        `— ${SITE.founder}`,
      ],
    }),
  };
}

// ─── CALENDAR INVITE (.ics) ─────────────────────────────────────────────────

const icsDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s) => String(s ?? '').replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');

export function workshopIcs({ title, start, durationMinutes, zoomUrl, uid }) {
  const end = new Date(new Date(start).getTime() + durationMinutes * 60_000);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Firmward//Workshop//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${uid}@firmward.org`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(`Firmward workshop: ${title}`)}`,
    `DESCRIPTION:${icsText(zoomUrl ? `Join on Zoom: ${zoomUrl}` : 'The Zoom link will be emailed before the workshop.')}`,
    zoomUrl ? `LOCATION:${icsText(zoomUrl)}` : null, zoomUrl ? `URL:${zoomUrl}` : null,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].filter((l) => l !== null).join('\r\n');
}
