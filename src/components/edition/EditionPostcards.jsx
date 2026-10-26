import { useEffect, useState } from 'react';
import StatePostcard from '../postcard/StatePostcard';
import { loadState } from '../../data/states';

// A few representative markets to show as live, animated postcards inside Chapter V.
// firmCount mirrors the dev gallery's sample counts; the postcard component is reused as-is.
const SHOWCASE = [
  { code: 'TX', firms: 24 },
  { code: 'NY', firms: 30 },
  { code: 'FL', firms: 29 },
];

/**
 * Reuses the live, animated <StatePostcard> (the postage-stamp map cards from
 * Explore) as the body of "Where Firms Hire". Each state's geography loads
 * async; the cards keep their ambient stamp-in animation. Lazy with the route,
 * so motion stays off the main bundle.
 */
export default function EditionPostcards() {
  const [states, setStates] = useState({});

  useEffect(() => {
    let live = true;
    Promise.all(
      SHOWCASE.map((s) => loadState(s.code).then((d) => [s.code, d]).catch(() => [s.code, null]))
    ).then((pairs) => {
      if (live) setStates(Object.fromEntries(pairs));
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="ed-postcards" aria-label="Sample state markets">
      {SHOWCASE.map((s) =>
        states[s.code] ? (
          // No .ed-reveal here: these mount async (after the reveal observer runs) and
          // StatePostcard brings its own stamp-in animation.
          <div key={s.code} className="ed-postcard">
            <StatePostcard data={states[s.code]} firmCount={s.firms} />
          </div>
        ) : (
          <div key={s.code} className="ed-postcard ed-postcard--ph" aria-hidden="true" />
        )
      )}
    </div>
  );
}
