import { useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent, useReducedMotion } from 'motion/react';
import { EASE_OUT } from '../../lib/motion';

// Scroll-pinned phases (STEP 6). Desktop: the left column (phase nav + a progress rail that fills on
// scroll) stays pinned while the right column crossfades/slides through each phase. Mobile or reduced
// motion: a plain stacked timeline with fade-up reveals.
function Stacked({ phases, animate }) {
  return (
    <ol className="space-y-4">
      {phases.map(([name, when, what], i) => (
        <motion.li
          key={name}
          initial={animate ? { opacity: 0, y: 16 } : false}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.05 }}
          className="rounded-app border border-line bg-card p-5"
        >
          <p className="data text-t12 uppercase tracking-wide text-brand">{when}</p>
          <h3 className="mt-1 text-t20 font-bold">{name}</h3>
          <p className="mt-2 text-t16 text-fg-2">{what}</p>
        </motion.li>
      ))}
    </ol>
  );
}

export default function ScrollPhases({ phases }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);
  const fillH = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setActive(Math.max(0, Math.min(phases.length - 1, Math.floor(p * phases.length - 1e-4))));
  });

  if (reduced) return <Stacked phases={phases} animate={false} />;

  return (
    <>
      {/* Mobile: stacked timeline with fade-up */}
      <div className="md:hidden"><Stacked phases={phases} animate /></div>

      {/* Desktop: pinned left, scrolling right */}
      <div ref={ref} className="relative hidden md:block" style={{ height: `${phases.length * 85}vh` }}>
        <div className="sticky top-0 flex h-screen items-center">
          <div className="grid w-full grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] gap-12">
            <div className="flex gap-5">
              <div className="relative w-1 shrink-0 overflow-hidden rounded-full bg-line">
                <motion.div className="absolute inset-x-0 top-0 rounded-full bg-brand" style={{ height: fillH }} />
              </div>
              <ol className="space-y-7">
                {phases.map(([name, when], i) => (
                  <li key={name} className={`transition-opacity duration-200 ${i === active ? 'opacity-100' : 'opacity-40'}`}>
                    <p className="data text-t12 uppercase tracking-wide text-fg-2">{when}</p>
                    <p className="text-t24 font-bold tracking-tight">{name}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="relative min-h-[180px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                >
                  <p className="data text-t12 uppercase tracking-[0.1em] text-brand">{`Phase ${active + 1} · ${phases[active][1]}`}</p>
                  <h3 className="mt-2 text-t32 font-bold tracking-tight">{phases[active][0]}</h3>
                  <p className="mt-4 max-w-md text-t20 leading-relaxed text-fg-2">{phases[active][2]}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
