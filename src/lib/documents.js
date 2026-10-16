// Rendering and export for resumes and letters. Everything user- or model-written goes through esc().

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const join = (parts, sep) => parts.filter((p) => p && String(p).trim()).map(esc).join(sep);
const list = (items) => (items?.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');

export function resumeToHtml(r) {
  if (!r) return '';
  const education = (r.education ?? [])
    .map(
      (e) => `<p><strong>${esc(e.school)}</strong>${e.location ? `, ${esc(e.location)}` : ''}<br>
${join([e.degree, e.date], ', ')}${e.gpa ? `<br>GPA: ${esc(e.gpa)}` : ''}${e.honors?.length ? `<br>Honors: ${join(e.honors, '; ')}` : ''}${
        e.activities?.length ? `<br>Activities: ${join(e.activities, '; ')}` : ''
      }</p>`
    )
    .join('');
  const experience = (r.experience ?? [])
    .map(
      (x) => `<p><strong>${esc(x.employer)}</strong>${x.location ? `, ${esc(x.location)}` : ''}<br>
<em>${esc(x.title)}</em>${x.start || x.end ? `, ${join([x.start, x.end], ' – ')}` : ''}</p>${list(x.bullets)}`
    )
    .join('');
  const s = r.skills ?? {};
  const skills = [
    s.languages?.length && `Languages: ${join(s.languages, ', ')}`,
    s.other?.length && `Skills: ${join(s.other, ', ')}`,
    s.interests?.length && `Interests: ${join(s.interests, ', ')}`,
  ].filter(Boolean);

  return `<h2>${esc(r.name || 'Your Name')}</h2>
<p class="center">${join([r.location, r.email, r.phone], ' · ')}</p>
${education && `<h3>Education</h3>${education}`}
${experience && `<h3>Experience</h3>${experience}`}
${skills.length ? `<h3>Skills &amp; Interests</h3><p>${skills.join('<br>')}</p>` : ''}`;
}

export function letterToHtml(text) {
  return String(text ?? '')
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// Word and Google Docs both open an HTML document saved with a .doc extension.
export function downloadDoc(filename, title, bodyHtml) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:Georgia,serif;font-size:11pt;line-height:1.4}h2{text-align:center;font-size:16pt;margin:0}h3{font-size:11pt;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #000;margin:14pt 0 4pt}p{margin:0 0 8pt}.center{text-align:center}ul{margin:0 0 8pt}</style>
</head><body>${bodyHtml}</body></html>`;
  const url = URL.createObjectURL(new Blob(['﻿', html], { type: 'application/msword' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Prints only the element marked data-printable (see index.css), so "Save as PDF" gives a clean page.
export function printDocument() {
  document.body.dataset.print = 'doc';
  const done = () => {
    delete document.body.dataset.print;
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
}

export function slug(s) {
  return String(s ?? 'document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
