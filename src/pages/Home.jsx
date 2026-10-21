import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SITE, foundingOpen, nextSprint } from '../../site.config';
import usePageMeta from '../hooks/usePageMeta';
import useCatalog from '../hooks/useCatalog';
import UnlockForm from '../components/UnlockForm';
import ScrambleHeadline from '../components/motion/ScrambleHeadline';
import Magnetic from '../components/motion/Magnetic';
import CountUp from '../components/motion/CountUp';
import Marquee from '../components/motion/Marquee';
import { Checks, Cta, DraftTag, Eyebrow, Faq, H1, Lead, Page, Section, TextLink } from '../components/marketing/kit';

// Lazy so Framer Motion (ticket tilt) loads only when the ladder renders, not in the initial chunk.
const OfferLadder = lazy(() => import('../components/offers/OfferLadder'));
import { OFFERS } from '../content/offers';
import { STAGES } from '../lib/roles';
import { money } from '../lib/money';
import { track } from '../lib/tracking';

// Real quotes only. The section stays hidden while this is empty.
const TESTIMONIALS = [];

const FAQ = [
  ['Who is Firmward for?', 'Law students at every stage and new grads: 1Ls looking for a first summer job, 2Ls without a summer offer, 3Ls and recent grads without a post-grad job, transfers, and anyone targeting boutiques, mid-size, plaintiff, government, public interest or regional firms instead of (or as well as) BigLaw.'],
  ['How much time does it take?', 'The map is free and takes as long as you like. The Sprint is about 30–45 minutes a day for five days, plus a 45-minute call on Friday. Membership is a weekly live call and whatever outreach you send. In the Placement, Michael does the drafting; you spend 2–3 hours a week reviewing and sending, plus a 30-minute call.'],
  ['Can I cancel?', 'Membership cancels anytime. The Sprint is a one-time purchase and isn’t refundable after Day 1. The Placement is a 90-day term billed monthly, then continues month to month until you accept an offer or cancel.'],
  ['Isn’t this just ChatGPT?', 'An AI can write an email. It can’t tell you which 20 firms are hiring for your role this month, when their windows open, who to write to, or read your draft with someone who has done this search. Firmward is that database plus real feedback. The AI tool is a bonus, not the product.'],
  ['Is this legal advice? Is Firmward affiliated with my school?', 'No to both. Firmward provides career coaching and application support, not legal advice. It isn’t affiliated with or endorsed by any law school or law firm.'],
];

function StagePicker() {
  const [stage, setStage] = useState(null);
  const navigate = useNavigate();
  const s = STAGES.find((x) => x.value === stage);
  const offer = s && OFFERS.find((o) => o.key === s.offer);
  const mapHref = s ? `/explore?${s.roles.map((r) => `role=${r}`).join('&')}` : '/explore';
  return (
    <section aria-labelledby="stage-h" className="mt-10 rounded-app border border-line bg-card p-5 md:p-6">
      <h2 id="stage-h" className="text-t20 font-semibold">Where are you?</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Your stage">
        {STAGES.map((x) => (
          <button
            key={x.value}
            type="button"
            aria-pressed={stage === x.value}
            onClick={() => {
              setStage(x.value);
              track('stage_selected', { stage: x.value });
            }}
            className={`min-h-[48px] rounded-app border px-3 text-t16 font-semibold transition-colors duration-150 ${stage === x.value ? 'border-brand bg-brand text-white' : 'border-line bg-card hover:border-fg-2'}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      {s && (
        <div className="mt-4 rounded-app bg-canvas p-4" role="status">
          <p className="text-t16">{s.note}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button type="button" onClick={() => navigate(mapHref)} className="inline-flex min-h-[44px] items-center gap-1 text-t16 font-semibold text-brand hover:underline">
              See firms hiring {s.value === '1L' ? 'for 1L summer' : s.value === '2L' ? 'for 2L summer' : 'new grads'} <ArrowRight size={16} aria-hidden="true" />
            </button>
            <Link to={offer.to} className="inline-flex min-h-[44px] items-center gap-1 text-t16 font-semibold text-fg hover:underline">
              {offer.name} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function ProofStrip() {
  const { firms, loading } = useCatalog();
  const states = new Set(firms.flatMap((f) => f.states)).size;
  const metros = new Set(firms.flatMap((f) => f.cities)).size;
  const cities = [...new Set(firms.flatMap((f) => f.cities))].filter(Boolean).sort((a, b) => a.localeCompare(b));
  const stats = [
    { value: firms.length, label: 'firms tracked' },
    { value: states, label: 'states' },
    { value: metros, label: 'metros' },
  ];
  return (
    <section aria-label="Coverage" className="mt-12 border-y border-line py-7">
      <div className="flex flex-wrap items-start justify-center gap-x-12 gap-y-5 text-center">
        {stats.map((s) => (
          <div key={s.label} className="min-w-[84px]">
            <div className="data text-[28px] font-bold leading-none text-fg md:text-t32">
              {loading ? '—' : <CountUp value={s.value} />}
            </div>
            <div className="mt-1.5 text-t12 uppercase tracking-[0.1em] text-fg-2">{s.label}</div>
          </div>
        ))}
      </div>
      {/* Reserve the row height so the marquee appearing after data loads doesn't shift content. */}
      <div className="mt-6 min-h-[20px]">
        {!loading && cities.length > 0 && <Marquee items={cities} />}
      </div>
    </section>
  );
}

function MapPreview() {
  const { firms, loading } = useCatalog();
  const states = new Set(firms.flatMap((f) => f.states)).size;
  return (
    <Link to="/explore" className="group mt-8 block overflow-hidden rounded-app border border-line bg-card">
      <img src="/how/map.png" alt="The Firmward map: firms by state" width="1280" height="744" className="w-full transition-opacity duration-150 group-hover:opacity-90" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-t14">
        <span className="text-fg-2">
          <span className="data font-medium text-fg">{loading ? '…' : firms.length}</span> firms in <span className="data font-medium text-fg">{loading ? '…' : states}</span> states, checked against their careers pages
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-brand">Open the map <ArrowRight size={16} aria-hidden="true" /></span>
      </div>
    </Link>
  );
}

export default function Home() {
  usePageMeta({
    title: 'Firmward — Find the firms that are hiring. Then land one.',
    description: 'Summer and post-grad jobs at boutiques, mid-size, plaintiff, government and regional firms, for law students and new grads. Free firm map, plus coaching to land the job.',
  });
  const sprint = nextSprint();

  return (
    <Page>
      <header className="max-w-3xl">
        <div className="r-up"><Eyebrow>For law students and new grads</Eyebrow></div>
        <ScrambleHeadline text="Find the firms that are hiring. Then land one." className="mt-2 text-[34px] font-bold leading-[1.1] tracking-tight md:text-[48px]" />
        <div className="r-up" style={{ animationDelay: '120ms' }}>
          <Lead>
            Summer and post-grad jobs at boutiques, mid-size, plaintiff, government and regional firms. For 1Ls, 2Ls, 3Ls and recent grads who aren’t being handed BigLaw.
          </Lead>
        </div>
        <div className="r-up mt-6 flex flex-wrap items-center gap-x-6 gap-y-2" style={{ animationDelay: '200ms' }}>
          <Magnetic><Cta to="/explore">Explore the free map</Cta></Magnetic>
          <TextLink to="/sprint">Join the next Sprint{sprint ? ` (starts ${new Date(`${sprint.start}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` : ''}</TextLink>
        </div>
      </header>

      <StagePicker />
      <MapPreview />
      <ProofStrip />

      <Section id="how" title="How Firmward works" intro="Start free with the map. When you want help turning it into interviews, there are three ways to go, from do-it-yourself to done-for-you.">
        <Suspense fallback={<div className="min-h-[480px]" />}><OfferLadder /></Suspense>
      </Section>

      <Section id="story" title={<>Why Firmward exists<DraftTag /></>}>
        <div className="max-w-2xl space-y-4 text-t16 leading-relaxed">
          <p>
            I’m {SITE.founder}, a 3L. I started law school at Brooklyn Law and transferred to Columbia Law, which meant running a lot of my search without the usual on-campus pipeline. Nobody handed me BigLaw.
          </p>
          <p>
            What worked was simple and tedious: finding the boutiques and mid-size firms that were actually hiring, working out who to write to, and sending a lot of careful, specific emails. That’s how I got a written post-grad offer at a Dallas litigation boutique.
          </p>
          <p>
            Most of that time went into finding information that should have been in one place: which firms hire students and new grads, when, and how to apply. Firmward puts it in one place. The Sprint, Membership and Placement help you act on it, whether you’re a 1L after a first summer or a 3L without an offer yet.
          </p>
          <TextLink to="/about">More about Firmward</TextLink>
        </div>
      </Section>

      {TESTIMONIALS.length > 0 && (
        <Section id="students" title="From students">
          <ul className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <li key={t.name} className="rounded-app border border-line bg-card p-5">
                <blockquote className="text-t16">“{t.quote}”</blockquote>
                <p className="mt-3 text-t14 text-fg-2">{t.name}, {t.detail}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="faq" title="Questions">
        <Faq items={FAQ} />
      </Section>

      <Section id="calendar">
        <UnlockForm
          title="Get the Law Student Recruiting Calendar + full firm data"
          blurb={`When 1L summer, 2L summer and post-grad hiring happens, month by month, and full access to who each firm hires for and how to apply. Free.${foundingOpen() ? ` Founding Membership is ${money(SITE.PRICES.membershipMonthly)}/month for life until Dec 21.` : ''}`}
          cta="Send me the calendar"
          source="/"
          onDone={() => setTimeout(() => (window.location.href = '/thanks/signup'), 600)}
        />
      </Section>
    </Page>
  );
}
