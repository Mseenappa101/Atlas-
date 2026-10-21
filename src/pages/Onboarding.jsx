import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { getUserProfile, updateUserProfile } from '../lib/db';
import ProfileForm from '../components/ProfileForm';

function detectStep(profile) {
  if (!profile) return 1;
  if (!profile.full_name || !profile.school) return 1;
  if (!profile.interests?.length && !profile.target_states?.length) return 2;
  if (!profile.prior_experience && !profile.undergrad_school) return 3;
  if (!profile.personal_narrative) return 4;
  return 5;
}

const spinner = (
  <div style={{ maxWidth: 600, margin: '0 auto', padding: '3rem 2rem', textAlign: 'center' }}>
    <div
      style={{
        width: 32,
        height: 32,
        border: '3px solid #E3E6E8',
        borderTopColor: '#1F5C45',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto',
      }}
    />
  </div>
);

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({});
  const [profileLoading, setProfileLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    document.title = 'Get Started | Firmward';
  }, []);

  console.log('[Onboarding] render:', { authLoading, userId: user?.id, profileLoading, fetched: fetched.current });

  useEffect(() => {
    if (authLoading || !user || fetched.current) return;
    fetched.current = true;
    console.log('[Onboarding] Calling getUserProfile for:', user.id);

    async function load() {
      const { data, error } = await getUserProfile(user.id);
      console.log('[Onboarding] getUserProfile result:', { data, error });
      if (data) {
        if (data.onboarding_complete) {
          navigate('/dashboard', { replace: true });
          return;
        }
        setProfile(data);
        setStep(detectStep(data));
      }
      setProfileLoading(false);
    }
    load();
  }, [authLoading, user, navigate]);

  async function handleSave(data) {
    if (user) {
      await updateUserProfile(user.id, data);
      setProfile((prev) => ({ ...prev, ...data }));
    }
    if (step === 5) {
      if (user) {
        await updateUserProfile(user.id, { onboarding_complete: true });
      }
      navigate('/dashboard', { replace: true });
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleSkip() {
    if (step === 5) {
      if (user) {
        updateUserProfile(user.id, { onboarding_complete: true });
      }
      navigate('/dashboard', { replace: true });
    } else {
      setStep((s) => s + 1);
    }
  }

  if (authLoading || profileLoading) return spinner;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '3rem 2rem' }}>
      {/* Progress */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#5B6470',
            marginBottom: 8,
          }}
        >
          Step {step} of 5
        </div>
        <div style={{ height: 2, backgroundColor: '#E3E6E8', borderRadius: 1 }}>
          <div
            style={{
              height: 2,
              width: `${(step / 5) * 100}%`,
              backgroundColor: '#1F5C45',
              borderRadius: 1,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        {step > 1 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              textTransform: 'uppercase',
              color: '#5B6470',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            &larr; Back
          </button>
        ) : (
          <span />
        )}

        {step > 1 && (
          <button
            onClick={handleSkip}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: 14,
              fontStyle: 'italic',
              color: '#5B6470',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Skip for now
          </button>
        )}
      </div>

      <ProfileForm
        step={step}
        initialData={profile}
        onSave={handleSave}
        onSkip={handleSkip}
      />
    </div>
  );
}
