// Shared motion tokens. EVERY animation on the site imports from here so timing, easing and stagger
// stay consistent. Mirror of the CSS tokens in index.css (--dur-*, --ease-*).
//
// Rules of the road:
//   • Animate ONLY transform, opacity, clip-path, stroke-dashoffset (composite-friendly; no layout/paint).
//   • Respect prefers-reduced-motion — use MotionConfig reducedMotion="user" at the root, and the
//     reveal/stagger helpers below collapse to instant when reduced motion is on.
//   • Nothing here should delay a CTA, a form, or the map. Reveals are enhancements, never gates.

// Durations in SECONDS (Motion uses seconds) and MS (for CSS / setTimeout).
export const DURATION = { fast: 0.15, base: 0.25, slow: 0.45 };
export const DURATION_MS = { fast: 150, base: 250, slow: 450 };

// Easing. ease-out for reveals (enter), a gentle back-out for playful "drop" moments.
export const EASE_OUT = [0.22, 1, 0.36, 1];
export const EASE_OUT_BACK = [0.34, 1.56, 0.64, 1];
export const EASE_OUT_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Springs for interactive UI (drawers, tilt, magnetic, stamp). damping high enough to avoid wobble.
export const SPRING = { type: 'spring', stiffness: 400, damping: 32, mass: 0.8 };
export const SPRING_SOFT = { type: 'spring', stiffness: 260, damping: 30 };
export const SPRING_BOUNCY = { type: 'spring', stiffness: 500, damping: 18, mass: 0.7 };

// Stagger steps (seconds between children).
export const STAGGER = { tight: 0.04, base: 0.07, loose: 0.12 };

// Transition presets.
export const reveal = { duration: DURATION.base, ease: EASE_OUT };
export const revealSlow = { duration: DURATION.slow, ease: EASE_OUT };

/** True if the user asked for reduced motion (safe during SSR/prerender). */
export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ─── Variants ────────────────────────────────────────────────────────────────
// Section/element reveal: fade up 12px. Pair with whileInView={{ once: true, amount: 0.2 }}.
export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: reveal },
};

// A container that staggers its children's reveal.
export const staggerContainer = (step = STAGGER.base, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren } },
});

// Standard once-in-view props for Motion's whileInView.
export const inViewOnce = { once: true, amount: 0.2 };

/** Framer "viewport" + initial/animate props for a fade-up reveal, in one spread. */
export const revealProps = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: inViewOnce,
  variants: fadeUp,
};
