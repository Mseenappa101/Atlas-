import { useCallback, useMemo, useState } from 'react';
import useSession from '../hooks/useSession';
import { captureTokenFromUrl, readToken, saveToken } from '../lib/unlock';
import { AccessContext } from './access-context';

// Who can see the gated firm fields: signed-in students ("member"), visitors who gave their email
// ("unlocked"), and everyone else ("public").
export function AccessProvider({ children }) {
  const { session, loading } = useSession();
  const [token, setToken] = useState(() => captureTokenFromUrl() ?? readToken());
  const unlock = useCallback((t) => {
    saveToken(t);
    setToken(t);
  }, []);
  const level = session ? 'member' : token ? 'unlocked' : 'public';
  const value = useMemo(
    () => ({ level, token, unlock, canSeeDetails: level !== 'public', ready: !loading, accessToken: session?.access_token ?? null }),
    [level, token, unlock, loading, session?.access_token]
  );
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}
