import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SessionContext } from './session-context';

const PROFILE_COLUMNS = 'id,email,full_name,school,class_year,target_market,target_firm_type,resume_data,resume_source,resume_file_path,resume_updated_at';

// DEV-only preview of a signed-in session (via /account?devpreview etc.) so the profile-gated pages can
// be built and screenshotted without real auth. import.meta.env.DEV gates it — Vite strips this from
// production builds, and it only activates on an explicit ?devpreview param in local dev.
const DEV_PREVIEW = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('devpreview');
const DEV_SESSION = { user: { id: 'dev-preview', email: 'preview@firmward.test' }, access_token: 'dev-preview' };
const DEV_PROFILE = { id: 'dev-preview', email: 'preview@firmward.test', full_name: 'Jordan A. Reyes', school: 'Firmward School of Law', class_year: '2L', resume_data: null, resume_file_path: null, resume_updated_at: null };

export function SessionProvider({ children }) {
  const [session, setSession] = useState(DEV_PREVIEW ? DEV_SESSION : null);
  const [profile, setProfile] = useState(DEV_PREVIEW ? DEV_PROFILE : null);
  const [loading, setLoading] = useState(!DEV_PREVIEW);

  const loadProfile = useCallback(async (s) => {
    if (!s) {
      setProfile(null);
      return;
    }
    let { data, error } = await supabase.from('users').select(PROFILE_COLUMNS).eq('id', s.user.id).maybeSingle();
    // Before migration 003 the newer profile columns don't exist; fall back to the original ones.
    if (error) ({ data } = await supabase.from('users').select('id,email,full_name,school').eq('id', s.user.id).maybeSingle());
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    if (DEV_PREVIEW) return undefined; // dev preview: skip real auth
    let live = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!live) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (live) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Defer the query: supabase-js holds a lock during this callback.
      if (event !== 'TOKEN_REFRESHED') setTimeout(() => loadProfile(s), 0);
    });
    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      refreshProfile: () => loadProfile(session),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, profile, loading, loadProfile]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
