import { lazy, Suspense, useEffect, useState } from 'react';
import { loadState } from '../../data/states';

// Reveals the state postcard above the firm list when a state is selected. The postcard component and
// the per-state data both load lazily (only on a state click), keyed by code so the reveal replays.
const StatePostcard = lazy(() => import('./StatePostcard'));

export default function StatePostcardHeader({ code, firmCount }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    loadState(code).then((d) => { if (live) setData(d); }).catch(() => {});
    return () => { live = false; };
  }, [code]);

  if (!data) return null;
  return (
    <div className="border-b border-line p-4">
      <Suspense fallback={null}>
        <StatePostcard key={code} data={data} firmCount={firmCount} className="mx-auto max-w-md" />
      </Suspense>
    </div>
  );
}
