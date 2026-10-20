import { SITE } from '../../site.config';
import usePageMeta from '../hooks/usePageMeta';
import { Cta, DraftTag, Eyebrow, H1, Page, Section } from '../components/marketing/kit';

export default function About() {
  usePageMeta({
    title: 'About Firmward',
    description: 'Why Firmward exists: a 3L’s map of the firms that hire law students and new grads beyond BigLaw, and help landing a job at one.',
  });
  return (
    <Page narrow>
      <Eyebrow>About</Eyebrow>
      <H1>Built by a law student who wasn’t handed BigLaw.<DraftTag /></H1>
      <div className="mt-6 space-y-4 text-t16 leading-relaxed">
        <p>
          I’m {SITE.founder}, a 3L. I started law school at Brooklyn Law and transferred to Columbia Law. Transferring meant missing much of the usual on-campus pipeline, so I ran my own search.
        </p>
        <p>
          The jobs were there: boutiques, mid-size firms, plaintiff firms, government offices and regional firms that hire students and new grads every year. Most of them never come to campus and rarely post. They hire whoever finds them and writes a good, specific email at the right time.
        </p>
        <p>
          Finding them was the hard part. Which firms take 1Ls? Who hires post-grad without a summer program? When do applications open, and who reads them? I spent more time answering those questions than writing applications. Doing it anyway is how I got a written post-grad offer at a Dallas litigation boutique.
        </p>
        <p>
          Firmward is the tool I wanted: a map of the firms that hire beyond BigLaw, with who they hire for, their windows and how to apply. For students who want help acting on it, there’s the 20-Firm Sprint, Membership and the 90-Day Placement.
        </p>
        <p className="text-fg-2">Firmward provides career coaching and application support, not legal advice. It isn’t affiliated with any law school or law firm.</p>
      </div>
      <Section>
        <Cta to="/explore">Explore the free map</Cta>
      </Section>
    </Page>
  );
}
