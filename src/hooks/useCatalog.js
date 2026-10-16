import { useEffect, useState } from 'react';
import { fetchCatalog } from '../lib/catalog';

let cache = null;

export default function useCatalog() {
  const [state, setState] = useState(() =>
    cache?.data ? { ...cache.data, loading: false, error: null } : { firms: [], idMap: null, loading: true, error: null }
  );

  useEffect(() => {
    if (cache?.data) return;
    let live = true;
    cache ??= { promise: fetchCatalog() };
    cache.promise
      .then((data) => {
        cache.data = data;
        if (live) setState({ ...data, loading: false, error: null });
      })
      .catch((err) => {
        cache = null;
        if (live) setState({ firms: [], idMap: null, loading: false, error: err.message ?? 'Failed to load' });
      });
    return () => {
      live = false;
    };
  }, []);

  return state;
}
