import { useEffect, useState } from 'react';
import { fetchOpenListings } from '../lib/listings';

let cache = null;

export default function useListings() {
  const [state, setState] = useState(() =>
    cache?.listings ? { listings: cache.listings, loading: false, error: null } : { listings: [], loading: true, error: null }
  );

  useEffect(() => {
    if (cache?.listings) return;
    let live = true;
    cache ??= { promise: fetchOpenListings() };
    cache.promise
      .then((listings) => {
        cache.listings = listings;
        if (live) setState({ listings, loading: false, error: null });
      })
      .catch((err) => {
        cache = null;
        if (live) setState({ listings: [], loading: false, error: err.message });
      });
    return () => {
      live = false;
    };
  }, []);

  return state;
}
