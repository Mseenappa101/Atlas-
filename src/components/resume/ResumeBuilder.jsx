import { useEffect, useId, useState } from 'react';
import { api } from '../../lib/api';
import { answersToResume } from '../../lib/resumeFormat';
import { Button, FieldLabel as Label, Input as TextField } from '../app/controls';

const draftKey = (profile) => `atlas.resume-draft.${profile?.id ?? 'anon'}`;
const GRAD = { '1L': 'May 2029', '2L': 'May 2028', '3L': 'May 2027', transfer: 'May 2029', incoming: 'May 2030' };

const blankJob = () => ({ employer: '', location: '', title: '', start: '', end: '', what_you_did: '' });

function initial(profile) {
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey(profile)));
    if (saved) return saved;
  } catch {
    // No storage, or a bad draft: start fresh.
  }
  return {
    name: profile?.full_name ?? '',
    email: profile?.email ?? '',
    phone: '',
    location: '',
    law_school: { name: profile?.school ?? '', location: '', expected_grad: GRAD[profile?.class_year] ?? '', gpa: '', activities: '' },
    undergrad: { school: '', location: '', degree: '', major: '', grad_date: '', honors: '', activities: '' },
    jobs: [blankJob()],
    languages: '',
    interests: '',
  };
}

function TextArea({ label, hint, value, onChange, rows = 3 }) {
  const id = useId();
  return (
    <div className="sm:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={onChange}
        className="block w-full rounded-app border border-line bg-card px-3 py-2 text-t14 placeholder:text-fg-2 hover:border-fg-2"
      />
      {hint && <p className="mt-1 text-t12 text-fg-2">{hint}</p>}
    </div>
  );
}

const STEPS = ['Contact', 'Law school', 'College', 'Experience', 'Languages & interests'];

export default function ResumeBuilder({ profile, pro, onDone, onCancel }) {
  const [a, setA] = useState(() => initial(profile));
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(profile), JSON.stringify(a));
    } catch {
      // Draft saving is a convenience only.
    }
  }, [a, profile]);

  const top = (k) => (e) => setA({ ...a, [k]: e.target.value });
  const sub = (group, k) => (e) => setA({ ...a, [group]: { ...a[group], [k]: e.target.value } });
  const job = (i, k) => (e) => setA({ ...a, jobs: a.jobs.map((j, n) => (n === i ? { ...j, [k]: e.target.value } : j)) });

  // useAi: Pro rewrites bullets with Claude; otherwise the student's own words are formatted as-is.
  async function submit(useAi) {
    setStatus(useAi ? 'working' : 'saving');
    try {
      const answers = { ...a, jobs: a.jobs.filter((j) => j.employer.trim() || j.what_you_did.trim()) };
      const { resume } = useAi
        ? await api('/resume/build', { method: 'POST', body: { answers } })
        : await api('/resume', { method: 'PUT', body: { resume: answersToResume(answers) } });
      try {
        localStorage.removeItem(draftKey(profile));
      } catch {
        // ignore
      }
      onDone(resume);
    } catch (err) {
      setMessage(err.message);
      setStatus('error');
    }
  }

  function next(e) {
    e.preventDefault();
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit(pro);
  }
  const last = step === STEPS.length - 1;

  return (
    <form onSubmit={next}>
      <p className="data text-t12 text-fg-2">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {step === 0 && (
          <>
            <TextField label="Full name" required value={a.name} onChange={top('name')} autoComplete="name" />
            <TextField label="Email" type="email" required value={a.email} onChange={top('email')} autoComplete="email" />
            <TextField label="Phone" value={a.phone} onChange={top('phone')} autoComplete="tel" />
            <TextField label="City, State" value={a.location} onChange={top('location')} placeholder="Houston, TX" />
          </>
        )}
        {step === 1 && (
          <>
            <TextField label="Law school" required value={a.law_school.name} onChange={sub('law_school', 'name')} />
            <TextField label="City, State" value={a.law_school.location} onChange={sub('law_school', 'location')} />
            <TextField label="Expected graduation" value={a.law_school.expected_grad} onChange={sub('law_school', 'expected_grad')} placeholder="May 2029" />
            <TextField label="GPA (optional)" value={a.law_school.gpa} onChange={sub('law_school', 'gpa')} placeholder="Leave blank until grades are out" />
            <TextArea
              label="Activities"
              hint="Organizations, moot court, journal tryouts, research assistant work. One per line is fine."
              value={a.law_school.activities}
              onChange={sub('law_school', 'activities')}
            />
          </>
        )}
        {step === 2 && (
          <>
            <TextField label="College or university" value={a.undergrad.school} onChange={sub('undergrad', 'school')} />
            <TextField label="City, State" value={a.undergrad.location} onChange={sub('undergrad', 'location')} />
            <TextField label="Degree" value={a.undergrad.degree} onChange={sub('undergrad', 'degree')} placeholder="Bachelor of Arts" />
            <TextField label="Major" value={a.undergrad.major} onChange={sub('undergrad', 'major')} />
            <TextField label="Graduation" value={a.undergrad.grad_date} onChange={sub('undergrad', 'grad_date')} placeholder="May 2025" />
            <TextField label="Honors (optional)" value={a.undergrad.honors} onChange={sub('undergrad', 'honors')} placeholder="cum laude, Dean's List" />
            <TextArea label="Activities" value={a.undergrad.activities} onChange={sub('undergrad', 'activities')} />
          </>
        )}
        {step === 3 && (
          <div className="space-y-6 sm:col-span-2">
            {a.jobs.map((j, i) => (
              <fieldset key={i} className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                <legend className="float-left mb-2 w-full text-t12 font-semibold uppercase tracking-wide text-fg-2">Job {i + 1}</legend>
                <TextField label="Employer" value={j.employer} onChange={job(i, 'employer')} />
                <TextField label="City, State" value={j.location} onChange={job(i, 'location')} />
                <TextField label="Your title" value={j.title} onChange={job(i, 'title')} />
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Start" value={j.start} onChange={job(i, 'start')} placeholder="Jun 2023" />
                  <TextField label="End" value={j.end} onChange={job(i, 'end')} placeholder="Present" />
                </div>
                <TextArea
                  label="What did you do there?"
                  hint="Plain sentences are fine. Mention writing, research, clients, deadlines and any numbers. We won't add anything you didn't say."
                  rows={4}
                  value={j.what_you_did}
                  onChange={job(i, 'what_you_did')}
                />
                {a.jobs.length > 1 && (
                  <button
                    type="button"
                    className="justify-self-start text-t14 text-brand hover:underline"
                    onClick={() => setA({ ...a, jobs: a.jobs.filter((_, n) => n !== i) })}
                  >
                    Remove this job
                  </button>
                )}
              </fieldset>
            ))}
            <button type="button" className="text-t14 text-brand hover:underline" onClick={() => setA({ ...a, jobs: [...a.jobs, blankJob()] })}>
              Add another job
            </button>
          </div>
        )}
        {step === 4 && (
          <>
            <TextArea label="Languages (optional)" hint="Include fluency: Spanish (conversational)." value={a.languages} onChange={top('languages')} rows={2} />
            <TextArea
              label="Interests"
              hint="Two or three specific ones. Interviewers ask about these."
              value={a.interests}
              onChange={top('interests')}
              rows={2}
            />
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-line pt-4">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {!last && <Button type="submit">Next</Button>}
        {last && pro && (
          <>
            <Button type="submit" disabled={status !== 'idle' && status !== 'error'}>
              {status === 'working' ? 'Polishing your resume…' : 'Polish with AI'}
            </Button>
            <Button variant="secondary" disabled={status !== 'idle' && status !== 'error'} onClick={() => submit(false)}>
              Use my words as written
            </Button>
          </>
        )}
        {last && !pro && (
          <Button type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Creating…' : 'Create my resume'}
          </Button>
        )}
        {status === 'working' && (
          <span role="status" className="text-t14 text-fg-2">
            About 30 seconds.
          </span>
        )}
      </div>
      {status === 'error' && (
        <p role="alert" className="mt-2 text-t14 text-st-soon-text">
          {message}
        </p>
      )}
      {last && !pro && (
        <p className="mt-3 text-t12 text-fg-2">
          Your words, formatted as a one-page resume. With Pro ($4.99/month), AI rewrites each job into strong bullets.
        </p>
      )}
    </form>
  );
}
