import { isPlaceholder } from '../../../site.config';
import { Cta } from '../marketing/kit';
import WaitlistForm from './WaitlistForm';

// Renders the real offer CTA (Stripe / Skool / scheduler link) once it's filled in site.config, and a
// themed waitlist capture while the link is still a PLACEHOLDER — so the live site never shows a dead
// button. Fill the link in site.config and the button switches back on automatically.
export default function OfferCta({ link, offer, waitlistLabel, children, ...ctaProps }) {
  if (!isPlaceholder(link)) return <Cta href={link} {...ctaProps}>{children}</Cta>;
  return <WaitlistForm offer={offer} label={waitlistLabel} />;
}
