import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUserProfile, createUserProfile } from '../lib/db';

const AuthContext = createContext({ user: null, session: null, loading: true });

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up the auth state listener FIRST, then get the initial session.
    // This avoids the race condition that causes NavigatorLockAcquireTimeoutError.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        console.log('[Auth] onAuthStateChange:', { event, hasSession: !!s, userId: s?.user?.id });
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' && s?.user) {
          // Defer profile check to avoid blocking auth state updates
          setTimeout(async () => {
            const { data: profile } = await getUserProfile(s.user.id);
            if (!profile) {
              await createUserProfile(s.user.id, s.user.email);
            }
          }, 0);
        }
      }
    );

    // Trigger initial session check — onAuthStateChange will fire with INITIAL_SESSION
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log('[Auth] getSession resolved:', { hasSession: !!s, userId: s?.user?.id });
      // Only set if onAuthStateChange hasn't already fired
      setSession((prev) => prev ?? s);
      setUser((prev) => prev ?? s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
