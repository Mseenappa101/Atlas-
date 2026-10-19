import PDFDocument from 'pdfkit';

// Letters and built resumes as PDFs, for email attachments and downloads. Times is a built-in PDF
// font, so nothing has to be shipped, but it only covers Windows-1252: anything else becomes "?".
const CP1252_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const safe = (s) => [...String(s ?? '')].map((c) => (c.charCodeAt(0) < 256 || CP1252_EXTRA.includes(c) ? c : '?')).join('');

const MARGIN = 72; // 1 inch

function render(build) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: MARGIN, info: { Producer: 'Firmward', Creator: 'Firmward' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    build(doc);
    doc.end();
  });
}

/** A cover letter: plain paragraphs separated by blank lines. */
export function letterPdf(text, title = 'Cover letter') {
  return render((doc) => {
    doc.info.Title = safe(title);
    doc.font('Times-Roman').fontSize(11.5);
    const paragraphs = String(text ?? '').replace(/\r/g, '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    for (const p of paragraphs) {
      doc.text(safe(p), { lineGap: 2 });
      doc.moveDown(0.8);
    }
  });
}

const joinParts = (parts, sep) => parts.filter((p) => p && String(p).trim()).join(sep);

/** A resume from the builder's structured data, in the plain one-page style law firms expect. */
export function resumePdf(r) {
  return render((doc) => {
    const width = doc.page.width - MARGIN * 2;
    doc.info.Title = safe(`${r.name || 'Resume'} — Resume`);
    doc.font('Times-Bold').fontSize(16).text(safe(r.name || 'Your Name'), { align: 'center' });
    const contact = joinParts([r.location, r.email, r.phone], '  ·  ');
    if (contact) doc.font('Times-Roman').fontSize(10.5).text(safe(contact), { align: 'center' });

    const heading = (label) => {
      doc.moveDown(0.7);
      doc.font('Times-Bold').fontSize(11).text(label.toUpperCase(), { characterSpacing: 0.6 });
      const y = doc.y + 1;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + width, y).lineWidth(0.6).stroke();
      doc.moveDown(0.35);
    };
    const line = (left, right) => {
      const y = doc.y;
      doc.font('Times-Bold').fontSize(11).text(safe(left), MARGIN, y, { width: width - 150 });
      if (right) doc.font('Times-Roman').text(safe(right), MARGIN + width - 150, y, { width: 150, align: 'right' });
      doc.x = MARGIN;
    };
    const body = (text, opts = {}) => doc.font(opts.italic ? 'Times-Italic' : 'Times-Roman').fontSize(11).text(safe(text), MARGIN, doc.y, { width, lineGap: 1 });

    if (r.education?.length) {
      heading('Education');
      for (const e of r.education) {
        line(e.school, e.location);
        const degree = joinParts([e.degree, e.date], ', ');
        if (degree) body(degree);
        if (e.gpa) body(`GPA: ${e.gpa}`);
        if (e.honors?.length) body(`Honors: ${e.honors.join('; ')}`);
        if (e.activities?.length) body(`Activities: ${e.activities.join('; ')}`);
        doc.moveDown(0.4);
      }
    }
    if (r.experience?.length) {
      heading('Experience');
      for (const x of r.experience) {
        line(x.employer, x.location);
        const role = joinParts([x.title, joinParts([x.start, x.end], ' – ')], ', ');
        if (role) body(role, { italic: true });
        for (const b of x.bullets ?? []) {
          const y = doc.y;
          doc.font('Times-Roman').fontSize(11).text('•', MARGIN + 4, y);
          doc.text(safe(b), MARGIN + 14, y, { width: width - 14, lineGap: 1 });
        }
        doc.x = MARGIN;
        doc.moveDown(0.4);
      }
    }
    const s = r.skills ?? {};
    const skills = [
      s.languages?.length && `Languages: ${s.languages.join(', ')}`,
      s.other?.length && `Skills: ${s.other.join(', ')}`,
      s.interests?.length && `Interests: ${s.interests.join(', ')}`,
    ].filter(Boolean);
    if (skills.length) {
      heading('Skills & Interests');
      for (const k of skills) body(k);
    }
  });
}
