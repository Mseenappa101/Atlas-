import { useState } from 'react';
import { US_STATES } from '../constants/states';
import { uploadResume } from '../lib/db';
import { useAuth } from '../context/AuthContext';

const labelStyle = {
  display: 'block',
  fontFamily: "'DM Mono', monospace",
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#5B6470',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: '#FFFFFF',
  border: '1px solid #E3E6E8',
  borderRadius: 2,
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: 16,
  color: '#14181F',
  outline: 'none',
  boxSizing: 'border-box',
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 120,
  resize: 'vertical',
};

const PRACTICE_AREAS = [
  'Corporate/M&A', 'Litigation', 'Real Estate', 'Intellectual Property',
  'Tax', 'Bankruptcy', 'Employment', 'Antitrust', 'Securities',
  'Environmental', 'Criminal Defense', 'Public Interest', 'Undecided',
];

const GRAD_YEARS = ['2026', '2027', '2028', '2029'];
const GPA_RANGES = ['3.7+', '3.5–3.7', '3.3–3.5', '3.0–3.3', 'Below 3.0', 'Prefer not to say'];

export default function ProfileForm({ step, initialData = {}, onSave, onSkip }) {
  const { user } = useAuth();

  const [fullName, setFullName] = useState(initialData.full_name || '');
  const [school, setSchool] = useState(initialData.school || '');
  const [gradYear, setGradYear] = useState(initialData.grad_year?.toString() || '');
  const [gpaRange, setGpaRange] = useState(initialData.gpa_range || '');

  const [interests, setInterests] = useState(initialData.interests || []);
  const [targetStates, setTargetStates] = useState(initialData.target_states || []);

  const [priorExperience, setPriorExperience] = useState(initialData.prior_experience || '');
  const [undergradSchool, setUndergradSchool] = useState(initialData.undergrad_school || '');
  const [undergradMajor, setUndergradMajor] = useState(initialData.undergrad_major || '');
  const [achievements, setAchievements] = useState(initialData.achievements || '');

  const [narrative, setNarrative] = useState(initialData.personal_narrative || '');

  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(initialData.resume_url ? 'Uploaded previously' : null);
  const [resumeUrl, setResumeUrl] = useState(initialData.resume_url || null);

  function toggleInterest(area) {
    setInterests((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  function toggleState(abbr) {
    setTargetStates((prev) =>
      prev.includes(abbr) ? prev.filter((s) => s !== abbr) : [...prev, abbr]
    );
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus('Uploading...');
    const { data, error } = await uploadResume(user.id, file);
    if (error) {
      setUploadStatus('Upload failed — please try again.');
    } else {
      setResumeUrl(data);
      setUploadStatus('Uploaded successfully');
    }
    setUploading(false);
  }

  function handleSubmit() {
    if (step === 1) {
      onSave({ full_name: fullName, school, grad_year: parseInt(gradYear) || null, gpa_range: gpaRange });
    } else if (step === 2) {
      onSave({ interests, target_states: targetStates });
    } else if (step === 3) {
      onSave({ prior_experience: priorExperience, undergrad_school: undergradSchool, undergrad_major: undergradMajor, achievements });
    } else if (step === 4) {
      onSave({ personal_narrative: narrative });
    } else if (step === 5) {
      onSave({ resume_url: resumeUrl });
    }
  }

  return (
    <div>
      {step === 1 && (
        <>
          <h2 style={headingStyle}>Tell Us About You</h2>
          <Field label="Full Name">
            <input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Law School">
            <input style={inputStyle} value={school} onChange={(e) => setSchool(e.target.value)} required />
          </Field>
          <Field label="Graduation Year">
            <select style={inputStyle} value={gradYear} onChange={(e) => setGradYear(e.target.value)}>
              <option value="">Select year</option>
              {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="GPA Range">
            <select style={inputStyle} value={gpaRange} onChange={(e) => setGpaRange(e.target.value)}>
              <option value="">Select range</option>
              {GPA_RANGES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={headingStyle}>What Are You Interested In?</h2>
          <Field label="Practice Areas">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {PRACTICE_AREAS.map((area) => (
                <label
                  key={area}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: "'EB Garamond', Georgia, serif",
                    fontSize: 14,
                    color: '#5B6470',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={interests.includes(area)}
                    onChange={() => toggleInterest(area)}
                    style={{ accentColor: '#1F5C45' }}
                  />
                  {area}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Target States">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {US_STATES.map((s) => {
                const active = targetStates.includes(s.abbr);
                return (
                  <button
                    key={s.abbr}
                    type="button"
                    onClick={() => toggleState(s.abbr)}
                    style={{
                      padding: '4px 8px',
                      border: active ? '1px solid #1F5C45' : '1px solid #E3E6E8',
                      borderRadius: 2,
                      background: active ? '#E7F0EC' : 'transparent',
                      color: active ? '#1F5C45' : '#5B6470',
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                  >
                    {s.abbr}
                  </button>
                );
              })}
            </div>
          </Field>
        </>
      )}

      {step === 3 && (
        <>
          <h2 style={headingStyle}>Your Background</h2>
          <Field label="Describe any work experience before law school">
            <textarea style={textareaStyle} value={priorExperience} onChange={(e) => setPriorExperience(e.target.value)} />
          </Field>
          <Field label="Undergraduate School">
            <input style={inputStyle} value={undergradSchool} onChange={(e) => setUndergradSchool(e.target.value)} />
          </Field>
          <Field label="Undergraduate Major">
            <input style={inputStyle} value={undergradMajor} onChange={(e) => setUndergradMajor(e.target.value)} />
          </Field>
          <Field label="Law review, moot court, pro bono work, honours, leadership roles, or other distinctions">
            <textarea style={textareaStyle} value={achievements} onChange={(e) => setAchievements(e.target.value)} />
          </Field>
        </>
      )}

      {step === 4 && (
        <>
          <h2 style={headingStyle}>In Your Own Voice</h2>
          <Field label="Personal Narrative">
            <textarea
              style={{ ...textareaStyle, minHeight: 200 }}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Tell us about yourself as a candidate — what makes you distinct, what drew you to the law, and what you are looking for in your 1L summer. This personalises every document we generate for you."
            />
          </Field>
        </>
      )}

      {step === 5 && (
        <>
          <h2 style={headingStyle}>Upload Your Resume</h2>
          <Field label="Resume (PDF)">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={uploading}
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: 14,
                color: '#5B6470',
              }}
            />
            {uploadStatus && (
              <p style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: uploadStatus.includes('failed') ? '#8A5A12' : '#1F5C45',
                marginTop: 8,
              }}>
                {uploadStatus}
              </p>
            )}
          </Field>
          <button
            type="button"
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: 14,
              fontStyle: 'italic',
              color: '#5B6470',
              cursor: 'pointer',
              padding: 0,
              marginBottom: 20,
            }}
          >
            Skip — you can add this later in Settings
          </button>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
        <button
          type="button"
          onClick={handleSubmit}
          style={btnStyle}
        >
          {step === 5 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const headingStyle = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: 28,
  fontWeight: 600,
  color: '#14181F',
  margin: '0 0 24px',
};

const btnStyle = {
  padding: '12px 24px',
  backgroundColor: '#14181F',
  color: '#1F5C45',
  border: 'none',
  borderRadius: 2,
  fontFamily: "'DM Mono', monospace",
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor: 'pointer',
};
