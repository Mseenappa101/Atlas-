// All-day calendar event as an .ics download. Works with Google, Apple and Outlook calendars.
const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
// iCalendar text escaping: backslash, semicolon and comma get a backslash; newlines become \n.
const esc = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

export function downloadIcs({ title, date, description = '', url = '' }) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Firmward//1L Directory//EN',
    'BEGIN:VEVENT',
    `UID:${ymd(date)}-${Math.random().toString(36).slice(2)}@firmward.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(date)}`,
    `DTEND;VALUE=DATE:${ymd(next)}`,
    `SUMMARY:${esc(title)}`,
    description && `DESCRIPTION:${esc(description)}`,
    url && `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
  const href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href, download: `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics` });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
