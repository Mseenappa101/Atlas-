import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import useSession from './useSession';

// Plan and AI usage from the API: { plan, pro, letters_used, letters_limit, ai_used_month, ai_limit_month }.
export default function useUsage() {
  const { session } = useSession();
  const [usage, setUsage] = useState(null);
  // `failed` lets pages fall back gracefully when the API can't be reached.
  const refresh = useCallback(
    () =>
      api('/me/usage')
        .then(setUsage)
        .catch(() => setUsage({ failed: true, plan: 'free', pro: false })),
    []
  );
  useEffect(() => {
    if (session) refresh();
  }, [session, refresh]);
  return [usage, setUsage, refresh];
}
