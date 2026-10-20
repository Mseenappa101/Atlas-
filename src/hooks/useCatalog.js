import { useEffect, useState } from 'react';
import { fetchCatalog } from '../lib/catalog';
import useAccess from './useAccess';

// One load per access level, shared by every page. Unlocking or signing in loads the full data.
const cache = new Map();
const EMPTY = { firms: [], listings: [], idMap: null, unlocked: false };

function keyFor({ level, token, accessToken }) {
  if (level === 'member') return `member:${accessToken ? 'session' : ''}`;
  return level === 'unlocked' ? `unlocked:${token}` : 'public';
}

export default function useCatalog() {
  const access = useAccess();
  const key = access.ready ? keyFor(access) : null;
  const [state, setState] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    if (!key) return;
    let live = true;
    let entry = cache.get(key);
    if (!entry) {
      entry = { promise: fetchCatalog({ token: access.level === 'unlocked' ? access.token : null, accessToken: access.level === 'member' ? access.accessToken : null }) };
      cache.set(key, entry);
    }
    entry.promise
      .then((data) => {
        entry.data = data;
        if (live) setState({ key, data, error: null });
      })
      .catch((err) => {
        cache.delete(key);
        if (live) setState({ key, data: null, error: err.message ?? 'Failed to load' });
      });
    return () => {
      live = false;
    };
    // The access token refreshes hourly; the cache key deliberately ignores that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // While a new level loads, keep showing the last data rather than flashing empty.
  const current = state.key === key ? state : null;
  const shown = current?.data ?? state.data ?? cache.get(key)?.data;
  return {
    ...(shown ?? EMPTY),
    loading: !current?.data && !current?.error,
    error: current?.error ?? null,
  };
}
