// Free path: turns the resume form's answers into a resume in the student's own words. No AI.

function split(text) {
  const t = String(text ?? '').trim();
  if (!t) return [];
  const parts = /\n/.test(t) ? t.split('\n') : t.split(/[;,]/);
  return parts.map((s) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
}

// "What you did" becomes bullets: one per line, or one per sentence.
function bullets(text) {
  const t = String(text ?? '').trim();
  if (!t) return [];
  const parts = /\n/.test(t) ? t.split('\n') : t.split(/(?<=[.!?])\s+(?=[A-Z])/);
  return parts
    .map((s) => s.replace(/^[-•*]\s*/, '').trim().replace(/\.$/, ''))
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

export function answersToResume(a) {
  const law = a.law_school ?? {};
  const ug = a.undergrad ?? {};
  const education = [];
  if (law.name) {
    education.push({
      school: law.name.trim(),
      location: (law.location ?? '').trim(),
      degree: 'Juris Doctor Candidate',
      date: (law.expected_grad ?? '').trim(),
      gpa: (law.gpa ?? '').trim(),
      honors: [],
      activities: split(law.activities),
    });
  }
  if (ug.school) {
    const degree = [ug.degree?.trim(), ug.major?.trim() && `in ${ug.major.trim()}`].filter(Boolean).join(' ');
    education.push({
      school: ug.school.trim(),
      location: (ug.location ?? '').trim(),
      degree,
      date: (ug.grad_date ?? '').trim(),
      gpa: '',
      honors: split(ug.honors),
      activities: split(ug.activities),
    });
  }
  return {
    name: (a.name ?? '').trim(),
    email: (a.email ?? '').trim(),
    phone: (a.phone ?? '').trim(),
    location: (a.location ?? '').trim(),
    education,
    experience: (a.jobs ?? [])
      .filter((j) => j.employer?.trim() || j.what_you_did?.trim())
      .map((j) => ({
        employer: (j.employer ?? '').trim(),
        location: (j.location ?? '').trim(),
        title: (j.title ?? '').trim(),
        start: (j.start ?? '').trim(),
        end: (j.end ?? '').trim(),
        bullets: bullets(j.what_you_did),
      })),
    skills: { languages: split(a.languages), interests: split(a.interests), other: [] },
  };
}
