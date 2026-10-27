import { useSyncExternalStore } from 'react';

// False on the server (prerender) and during the first client render (hydration), true thereafter.
// The React-sanctioned way to branch on "are we hydrated yet" without a mismatch or a setState-in-effect:
// getServerSnapshot returns false (used for SSR + the hydration render), getSnapshot returns true (used
// for every render after hydration), and React re-renders once when they differ.
const subscribe = () => () => {};
export default function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
