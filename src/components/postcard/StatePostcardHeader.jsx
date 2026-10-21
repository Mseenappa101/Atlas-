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

  // Reserve the card's height while the data/component load so the firm list below doesn't jump.
  return (
    <div className="border-b border-line p-4">
      <div className="mx-auto max-w-md" style={{ minHeight: 360 }}>
        {data && (
          <Suspense fallback={null}>
            <StatePostcard key={code} data={data} firmCount={firmCount} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
