import { motion } from 'motion/react';
import { OFFERS } from '../../content/offers';
import TicketCard from './TicketCard';

// Desktop: the three tickets start fanned and spring into an aligned row on scroll-in.
const fan = (i) => ({
  hidden: { opacity: 0, y: 24, rotate: [-5, 0, 5][i], x: [18, 0, -18][i] },
  show: { opacity: 1, y: 0, rotate: 0, x: 0, transition: { delay: i * 0.09, type: 'spring', stiffness: 260, damping: 26 } },
});

export default function OfferLadder() {
  return (
    <>
      {/* Mobile: swipeable stack with snap */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:hidden">
        {OFFERS.map((o) => (
          <li key={o.key} className="snap-center shrink-0 basis-[86%]">
            <TicketCard offer={o} />
          </li>
        ))}
      </ul>

      {/* Desktop: fan spreads into a row */}
      <motion.ul
        data-ladder
        className="hidden gap-5 md:grid md:grid-cols-3"
        style={{ perspective: 1200 }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        {OFFERS.map((o, i) => (
          <motion.li key={o.key} variants={fan(i)} className="h-full">
            <TicketCard offer={o} />
          </motion.li>
        ))}
      </motion.ul>
    </>
  );
}
