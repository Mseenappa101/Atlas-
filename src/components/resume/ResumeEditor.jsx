import { useId, useState } from 'react';
import { api } from '../../lib/api';
import { Button, FieldLabel as Label, Input as TextField } from '../app/controls';

// Lists are edited one item per line.
const toLines = (arr) => (arr ?? []).join('\n');
const fromLines = (s) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

function Lines({ label, value, onChange, rows = 3, hint = 'One per line.' }) {
  const id = useId();
  return (
    <div className="sm:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-app border border-line bg-card px-3 py-2 text-t14 hover:border-fg-2"
      />
      <p className="mt-1 text-t12 text-fg-2">{hint}</p>
    </div>
  );
}

// Text versions of the list fields, so typing a newline doesn't get trimmed away mid-edit.
function toForm(r) {
  return {
    ...r,
    education: (r.education ?? []).map((e) => ({ ...e, honors: toLines(e.honors), activities: toLines(e.activities) })),
    experience: (r.experience ?? []).map((x) => ({ ...x, bullets: toLines(x.bullets) })),
    skills: { languages: toLines(r.skills?.languages), other: toLines(r.skills?.other), interests: toLines(r.skills?.interests) },
  };
}

function fromForm(f) {
  return {
    ...f,
    education: f.education.map((e) => ({ ...e, honors: fromLines(e.honors), activities: fromLines(e.activities) })),
    experience: f.experience.map((x) => ({ ...x, bullets: fromLines(x.bullets) })),
    skills: { languages: fromLines(f.skills.languages), other: fromLines(f.skills.other), interests: fromLines(f.skills.interests) },
  };
}

const blankEdu = { school: '', location: '', degree: '', date: '', gpa: '', honors: '', activities: '' };
const blankExp = { employer: '', location: '', title: '', start: '', end: '', bullets: '' };

export default function ResumeEditor({ resume, onSaved, onCancel }) {
  const [f, setF] = useState(() => toForm(resume));
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const top = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const item = (group, i, k) => (v) =>
    setF({ ...f, [group]: f[group].map((x, n) => (n === i ? { ...x, [k]: typeof v === 'string' ? v : v.target.value } : x)) });
  const remove = (group, i) => setF({ ...f, [group]: f[group].filter((_, n) => n !== i) });
  const skill = (k) => (v) => setF({ ...f, skills: { ...f.skills, [k]: v } });

  async function save(e) {
    e.preventDefault();
    setStatus('saving');
    try {
      const { resume: saved } = await api('/resume', { method: 'PUT', body: { resume: fromForm(f) } });
      onSaved(saved);
    } catch (err) {
      setMessage(err.message);
      setStatus('error');
    }
  }

  return (
    <form onSubmit={save} className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <h2 className="text-t12 font-semibold uppercase tracking-wide text-fg-2 sm:col-span-2">Contact</h2>
        <TextField label="Full name" value={f.name} onChange={top('name')} />
        <TextField label="Email" type="email" value={f.email} onChange={top('email')} />
        <TextField label="Phone" value={f.phone} onChange={top('phone')} />
        <TextField label="City, State" value={f.location} onChange={top('location')} />
      </section>

      <section className="space-y-6">
        <h2 className="text-t12 font-semibold uppercase tracking-wide text-fg-2">Education</h2>
        {f.education.map((e, i) => (
          <fieldset key={i} className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <legend className="sr-only">School {i + 1}</legend>
            <TextField label="School" value={e.school} onChange={item('education', i, 'school')} />
            <TextField label="City, State" value={e.location} onChange={item('education', i, 'location')} />
            <TextField label="Degree" value={e.degree} onChange={item('education', i, 'degree')} />
            <TextField label="Date" value={e.date} onChange={item('education', i, 'date')} />
            <TextField label="GPA" value={e.gpa} onChange={item('education', i, 'gpa')} />
            <div />
            <Lines label="Honors" value={e.honors} onChange={item('education', i, 'honors')} rows={2} />
            <Lines label="Activities" value={e.activities} onChange={item('education', i, 'activities')} />
            <button type="button" className="justify-self-start text-t14 text-brand hover:underline" onClick={() => remove('education', i)}>
              Remove this school
            </button>
          </fieldset>
        ))}
        <button type="button" className="text-t14 text-brand hover:underline" onClick={() => setF({ ...f, education: [...f.education, { ...blankEdu }] })}>
          Add a school
        </button>
      </section>

      <section className="space-y-6">
        <h2 className="text-t12 font-semibold uppercase tracking-wide text-fg-2">Experience</h2>
        {f.experience.map((x, i) => (
          <fieldset key={i} className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <legend className="sr-only">Job {i + 1}</legend>
            <TextField label="Employer" value={x.employer} onChange={item('experience', i, 'employer')} />
            <TextField label="City, State" value={x.location} onChange={item('experience', i, 'location')} />
            <TextField label="Title" value={x.title} onChange={item('experience', i, 'title')} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Start" value={x.start} onChange={item('experience', i, 'start')} />
              <TextField label="End" value={x.end} onChange={item('experience', i, 'end')} />
            </div>
            <Lines label="Bullets" value={x.bullets} onChange={item('experience', i, 'bullets')} rows={4} hint="One bullet per line." />
            <button type="button" className="justify-self-start text-t14 text-brand hover:underline" onClick={() => remove('experience', i)}>
              Remove this job
            </button>
          </fieldset>
        ))}
        <button type="button" className="text-t14 text-brand hover:underline" onClick={() => setF({ ...f, experience: [...f.experience, { ...blankExp }] })}>
          Add a job
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <h2 className="text-t12 font-semibold uppercase tracking-wide text-fg-2 sm:col-span-2">Skills &amp; interests</h2>
        <Lines label="Languages" value={f.skills.languages} onChange={skill('languages')} rows={2} />
        <Lines label="Skills" value={f.skills.other} onChange={skill('other')} rows={2} />
        <Lines label="Interests" value={f.skills.interests} onChange={skill('interests')} rows={2} />
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
        <Button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {status === 'error' && (
          <p role="alert" className="text-t14 text-st-soon-text">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
