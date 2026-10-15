import { useEffect, useState } from 'react';
import { fetchFirms } from '../lib/firms';

// One fetch per page load; the directory, landing preview and detail panel share it.
let cache = null;

export default function useFirms() {
  const [state, setState] = useState(() =>
    cache?.firms ? { firms: cache.firms, loading: false, error: null } : { firms: [], loading: true, error: null }
  );

  useEffect(() => {
    if (cache?.firms) return;
    let live = true;
    cache ??= { promise: fetchFirms() };
    cache.promise
      .then((firms) => {
        cache.firms = firms;
        if (live) setState({ firms, loading: false, error: null });
      })
      .catch((err) => {
        cache = null;
        if (live) setState({ firms: [], loading: false, error: err.message });
      });
    return () => {
      live = false;
    };
  }, []);

  return state;
}
