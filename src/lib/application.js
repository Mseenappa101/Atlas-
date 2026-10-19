// Helpers for the application workspace (pages/Apply.jsx and components/apply/).
import { api } from './api';

const CLASS_PHRASE = { '1L': 'a first-year law student', '2L': 'a second-year law student', '3L': 'a third-year law student', transfer: 'a law student', incoming: 'an incoming law student' };

/** A short, plain cover email the student can edit. */
export function defaultDraft({ firm, profile, accountEmail, hasLetter }) {
  const name = profile?.full_name?.trim() || '';
  const school = profile?.school?.trim();
  const who = `${CLASS_PHRASE[profile?.class_year] ?? 'a law student'}${school ? ` at ${school}` : ''}`;
  const role = profile?.class_year === '2L' || profile?.class_year === '3L' ? 'summer associate' : '1L summer associate';
  return {
    subject: `${name ? `${name} — ` : ''}${role.replace(/\b[a-z]/g, (c) => c.toUpperCase())} Application`,
    body: [
      'Dear Recruiting Team,',
      `I am ${who}, and I am writing to apply for ${firm.name}’s ${role} position. I have attached my resume${hasLetter ? ' and cover letter' : ''} for your consideration.`,
      'Thank you for your time. I look forward to hearing from you.',
      ['Best regards,', name, school, accountEmail].filter(Boolean).join('\n'),
    ].join('\n\n'),
  };
}

/** Where an email can go out from: connected inboxes first, then Firmward's address. */
export function sendOptions(conn, accountEmail) {
  if (!conn) return [];
  const list = conn.connections.map((c) => ({ value: c.provider, label: `${c.email} (${c.provider === 'gmail' ? 'Gmail' : 'Outlook'})` }));
  if (conn.available.firmward) list.push({ value: 'firmward', label: `Firmward — replies go to ${accountEmail}` });
  return list;
}

export async function connectInbox(provider, returnTo) {
  const { url } = await api('/email/connect', { method: 'POST', body: { provider, return_to: returnTo } });
  window.location.assign(url);
}

/** The resumes a student can attach: their uploaded file and/or their built resume. */
export function resumeOptions(profile) {
  const opts = [];
  if (profile?.resume_file_path) opts.push({ value: 'file', label: 'My uploaded resume', hint: profile.resume_file_path.split('/').pop().replace(/^\d+-/, '') });
  const r = profile?.resume_data;
  if (r && (r.education?.length || r.experience?.length)) opts.push({ value: 'builder', label: 'My built resume', hint: 'Sent as a PDF' });
  return opts;
}

/** The firm's own application page: a real form, never a mailto: link. */
export function portalUrl(firm) {
  const apply = firm.applyUrl && !/^mailto:/i.test(firm.applyUrl) ? firm.applyUrl : null;
  return apply ?? firm.careersUrl ?? null;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The firm's next published deadline (or opening) across its offices. */
export function firmDeadline(firm) {
  const t = startOfToday();
  const ends = firm.offices.map((o) => o.end).filter((d) => d && d >= t).sort((a, b) => a - b);
  if (ends.length) return { label: 'Deadline', date: ends[0] };
  const starts = firm.offices.map((o) => o.start).filter((d) => d && d >= t).sort((a, b) => a - b);
  return starts.length ? { label: 'Opens', date: starts[0] } : null;
}


