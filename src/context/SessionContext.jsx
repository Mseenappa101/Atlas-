import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SessionContext } from './session-context';

const PROFILE_COLUMNS = 'id,email,full_name,school,class_year,target_market,target_firm_type,resume_data,resume_source,resume_file_path,resume_updated_at';

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
