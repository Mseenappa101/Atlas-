import { lazy, Suspense, useEffect, useRef, useState } from 'react';

// three.js + r3f is a heavy chunk — only import it when the map scrolls near the viewport, so the
// homepage's first paint never pays for it.
const PhaseMap = lazy(() => import('./PhaseMap'));

export default function LazyPhaseMap({ height = '72vh' }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (e) => { if (e[0].isIntersecting) { setShow(true); io.disconnect(); } },
      { rootMargin: '400px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="phasemap-wrap" style={{ minHeight: height }}>
      {show ? (
        <Suspense fallback={<div className="phasemap-skel" style={{ height }} aria-hidden="true" />}>
          <PhaseMap height={height} />
        </Suspense>
      ) : (
        <div className="phasemap-skel" style={{ height }} aria-hidden="true" />
      )}
    </div>
  );
}
