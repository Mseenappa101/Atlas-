import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({ session: null, loading: true });

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder: will be wired to Supabase auth later
    setLoading(false);
  }, []);

  const signOut = async () => {
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, setSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
