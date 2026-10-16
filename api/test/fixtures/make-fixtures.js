// Builds the fictional sample resume as PDF (Playwright) and DOCX (docx). Run: node api/test/fixtures/make-fixtures.js
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

const here = dirname(fileURLToPath(import.meta.url));

// Fictional person and employers.
export const SAMPLE = {
  name: 'Daniel Okafor', contact: 'Houston, TX | (713) 555-0148 | daniel.okafor@example.edu',
  education: [
    { school: 'University of Houston Law Center', place: 'Houston, TX', lines: ['J.D. Candidate, May 2029', 'Activities: Hispanic Law Students Association; Energy Law Society'] },
    { school: 'Texas A&M University', place: 'College Station, TX', lines: ['B.S. in Petroleum Engineering, May 2023', 'GPA: 3.62', "Honors: Dean's List (four semesters)", 'Activities: Society of Petroleum Engineers, Treasurer'] },
  ],
  experience: [
    {
      employer: 'Brazos Midstream Services (fictional)', place: 'Houston, TX', title: 'Field Engineer', dates: 'June 2023 – July 2026',
      bullets: [
        'Reviewed pipeline right-of-way agreements with landowners and flagged access disputes for the legal team',
        'Prepared incident reports for state regulators after two compressor station shutdowns',
        'Coordinated weekly schedules for a crew of six contractors across three sites',
      ],
    },
    {
      employer: 'Aggie Tutoring Center', place: 'College Station, TX', title: 'Math Tutor', dates: 'August 2021 – May 2023',
      bullets: ['Tutored undergraduates in calculus and statics, about 10 students a week'],
    },
  ],
  skills: ['Languages: Spanish (conversational), Yoruba (conversational)', 'Interests: distance running, Texas history, barbecue', 'Other: AutoCAD, Excel'],
};

function html(s) {
  const sec = (t) => `<h2>${t}</h2>`;
  return `<!doctype html><html><head><style>
    body{font-family:'Times New Roman',serif;font-size:11pt;margin:0.6in;color:#000}
    h1{text-align:center;font-size:16pt;margin:0} .c{text-align:center;margin:2px 0 10px}
    h2{font-size:11pt;border-bottom:1px solid #000;margin:12px 0 4px;text-transform:uppercase}
    .row{display:flex;justify-content:space-between;font-weight:bold} p{margin:1px 0} ul{margin:2px 0 6px 18px;padding:0}
  </style></head><body>
  <h1>${s.name}</h1><div class="c">${s.contact}</div>
  ${sec('Education')}${s.education.map((e) => `<div class="row"><span>${e.school}</span><span>${e.place}</span></div>${e.lines.map((l) => `<p>${l}</p>`).join('')}`).join('')}
  ${sec('Experience')}${s.experience.map((e) => `<div class="row"><span>${e.employer}</span><span>${e.place}</span></div><div class="row" style="font-weight:normal"><i>${e.title}</i><span>${e.dates}</span></div><ul>${e.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`).join('')}
  ${sec('Skills &amp; Interests')}${s.skills.map((l) => `<p>${l}</p>`).join('')}
  </body></html>`;
}

async function pdf() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html(SAMPLE));
  writeFileSync(join(here, 'sample-resume.pdf'), await page.pdf({ format: 'Letter' }));
  await page.setContent(`<html><body style="font-family:serif;margin:1in">
    <h2>Weeknight Red Beans and Rice</h2><p>Serves 6. Soak one pound of red kidney beans overnight.</p>
    <p>Brown andouille sausage, then cook onion, celery and bell pepper until soft. Add beans, bay leaves,
    thyme and water; simmer two hours, mashing some beans against the pot. Serve over white rice.</p></body></html>`);
  writeFileSync(join(here, 'not-a-resume.pdf'), await page.pdf({ format: 'Letter' }));
  await browser.close();
}

async function docx() {
  const p = (text, opts = {}) => new Paragraph({ ...opts, children: [new TextRun({ text, bold: opts.bold, italics: opts.italics })] });
  const head = (t) => p(t.toUpperCase(), { bold: true, spacing: { before: 200 } });
  const children = [
    p(SAMPLE.name, { bold: true, alignment: AlignmentType.CENTER }),
    p(SAMPLE.contact, { alignment: AlignmentType.CENTER }),
    head('Education'),
    ...SAMPLE.education.flatMap((e) => [p(`${e.school}, ${e.place}`, { bold: true }), ...e.lines.map((l) => p(l))]),
    head('Experience'),
    ...SAMPLE.experience.flatMap((e) => [
      p(`${e.employer}, ${e.place}`, { bold: true }), p(`${e.title}, ${e.dates}`, { italics: true }),
      ...e.bullets.map((b) => new Paragraph({ text: b, bullet: { level: 0 } })),
    ]),
    head('Skills & Interests'),
    ...SAMPLE.skills.map((l) => p(l)),
  ];
  const doc = new Document({ sections: [{ children }] });
  writeFileSync(join(here, 'sample-resume.docx'), await Packer.toBuffer(doc));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await pdf();
  await docx();
  console.log('wrote sample-resume.pdf, sample-resume.docx, not-a-resume.pdf');
}
