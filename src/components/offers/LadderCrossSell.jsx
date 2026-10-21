import { lazy, Suspense } from 'react';
import { Section } from '../marketing/kit';

// Cross-sell the full ladder at the bottom of each offer page. Lazy so Framer Motion (ticket tilt) stays
// out of the offer page's initial chunk; the 480px fallback reserves the row height to avoid layout shift.
const OfferLadder = lazy(() => import('./OfferLadder'));

export default function LadderCrossSell({
  title = 'The three ways to work with us',
  intro = 'From a 5-day sprint to a done-for-you search — pick the level of help you want.',
}) {
  return (
    <Section title={title} intro={intro}>
      <Suspense fallback={<div className="min-h-[480px]" />}>
        <OfferLadder />
      </Suspense>
    </Section>
  );
}
