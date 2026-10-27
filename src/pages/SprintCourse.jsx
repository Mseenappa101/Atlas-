import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { SITE, foundingOpen, isPlaceholder } from '../../site.config';
import { SPRINT_COURSE } from '../content/course';
import { money } from '../lib/money';
import { api, ApiError } from '../lib/api';
import { track } from '../lib/tracking';
import usePageMeta from '../hooks/usePageMeta';
import { Page, Eyebrow, H1, Lead, Section, Checks, Cta, Figure } from '../components/marketing/kit';
import { Exhibits, Stamp, Docket } from '../components/marketing/judiciary';
import Reveal from '../components/motion/Reveal';

// Exhibit A–E labels, one per sprint day, derived from the (unchanged) course data.
const EXHIBIT_IDS = ['A', 'B', 'C', 'D', 'E'];

const TOKEN_KEY = 'firmward_sprint_access';
const P = SITE.PRICES;

export default function SprintCourse() {
  usePageMeta({
    title: 'The Sprint course',
    description: 'The on-site lessons for the 20-Firm Sprint. Join the Sprint to unlock all five days.',
  });

  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('checking'); // checking | locked | unlocked | error
  const [email, setEmail] = useState(null);
  const [videos, setVideos] = useState({}); // lesson key -> url
  const [error, setError] = useState('');
  const [justPurchased, setJustPurchased] = useState(false); // arrived straight from Stripe checkout

  useEffect(() => {
    let cancelled = false;

    async function lessonsFor(token) {
      const { email: who, lessons } = await api('/sprint/lessons', { method: 'POST', body: { token } });
      if (cancelled) return;
      setEmail(who);
      setVideos(Object.fromEntries(lessons.map((l) => [l.key, l.video_url])));
      setStatus('unlocked');
    }

    async function run() {
      const sessionId = params.get('session_id');
      try {
        if (sessionId) {
          // Just back from Stripe: exchange the paid session for an access token, then drop it from the URL.
          const { token } = await api('/sprint/unlock', { method: 'POST', body: { session_id: sessionId } });
          localStorage.setItem(TOKEN_KEY, token);
          if (!cancelled) { setJustPurchased(true); track('sprint_purchase'); }
          setParams({}, { replace: true });
          await lessonsFor(token);
          return;
        }
        const saved = localStorage.getItem(TOKEN_KEY);
        if (saved) {
          await lessonsFor(saved);
          return;
        }
        if (!cancelled) setStatus('locked');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.code === 'locked' || err.status === 401)) {
          localStorage.removeItem(TOKEN_KEY);
          setStatus('locked');
        } else if (err instanceof ApiError && err.code === 'not_paid') {
          setError('Your payment is still processing. Wait a moment and reload this page.');
          setStatus('error');
        } else {
          setError(err?.message || 'Something went wrong loading the course. Reload the page in a minute.');
          setStatus('error');
        }
      }
    }
    run();
    return () => { cancelled = true; };
  }, [params, setParams]);

  return (
    <Page narrow>
      <div className="relative">
        {/* Filed stamp: floated to the top-right of the masthead on wide screens; static block on phones so it never overlaps. */}
        <div className="pointer-events-none absolute right-0 top-0 hidden md:block">
          <Stamp label="Filed" sub="20-Firm Sprint" />
        </div>
        <Eyebrow>In re · 20-Firm Sprint</Eyebrow>
        <Docket no="20">The Sprint course of record</Docket>
        <H1>The Sprint course</H1>
        <Lead>Five short lessons, one a day, Monday to Friday. Watch at your own pace and send alongside the cohort.</Lead>
        <div className="mt-6 md:hidden">
          <Stamp label="Filed" sub="20-Firm Sprint" />
        </div>
      </div>

      <Reveal as="div">
        <Figure slug="the-sprint" alt="U.S. federal courthouse" caption="The Sprint, entered into the record — one filing a day, Monday to Friday." />
      </Reveal>

      {status === 'checking' && <CheckingState />}
      {status === 'error' && (
        <p role="status" className="mt-8 rounded-app border border-line bg-card px-4 py-3 text-t16">{error}</p>
      )}
      {status === 'locked' && <LockedState />}
      {status === 'unlocked' && <UnlockedState email={email} videos={videos} justPurchased={justPurchased} />}
    </Page>
  );
}

// Loading: quiet hairline rows, no shimmer (per the design system).
function CheckingState() {
  return (
    <div className="mt-10 space-y-0" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((n) => <div key={n} className="h-11 border-b border-line" />)}
      <p className="sr-only">Checking your access…</p>
    </div>
  );
}

function LockedState() {
  return (
    <>
      <div className="mt-8 rounded-app border border-line bg-card p-5 md:p-6">
        <div className="flex items-start gap-3">
          <Lock size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
          <div>
            <p className="text-t20 font-semibold">Join the Sprint to unlock the lessons</p>
            <p className="mt-1 text-t16 text-fg-2">
              The five daily lessons and the Friday live call open as soon as you join. One payment of {money(P.sprint)},
              and your {money(P.sprint)} counts toward Membership if you join within {SITE.FOUNDING.sprintCreditHours} hours.
            </p>
            <div className="mt-4">
              <Cta href={SITE.STRIPE_SPRINT_LINK} stripe event="sprint_checkout_click" props={{ position: 'course_gate' }}>
                Join the Sprint · {money(P.sprint)}
              </Cta>
            </div>
            <p className="mt-3 text-t14 text-fg-2">
              Already joined? Open the course from the link in your receipt email to unlock it on this device.
            </p>
          </div>
        </div>
      </div>

      <Section title="The exhibits" intro="The five daily filings, entered as Exhibit A through E. Join the Sprint to admit the videos into evidence." className="mt-12">
        <Exhibits
          label="Sprint lessons"
          items={SPRINT_COURSE.map((lesson, i) => ({
            id: EXHIBIT_IDS[i],
            label: `${lesson.day} — ${lesson.title}`,
            content: (
              <div>
                <p className="data text-t12 uppercase tracking-wide text-fg-2">{lesson.day}</p>
                <h3 className="mt-0.5 font-display text-t20 font-semibold tracking-tight">{lesson.title}</h3>
                <p className="mt-1 text-t16 text-fg-2">{lesson.summary}</p>
                <div className="mt-4">
                  <p className="data text-t12 uppercase tracking-wide text-fg-2">In this lesson</p>
                  <div className="mt-2"><Checks items={lesson.notes} /></div>
                </div>
              </div>
            ),
          }))}
        />
      </Section>
    </>
  );
}

function UnlockedState({ email, videos, justPurchased }) {
  return (
    <>
      {justPurchased && (
        <div className="relative mt-8 overflow-hidden rounded-app border border-brand bg-brand-tint p-5">
          <div className="pointer-events-none absolute right-2 top-2 hidden sm:block">
            <Stamp label="Admitted" sub="Access granted" />
          </div>
          <p className="text-t20 font-semibold">Payment received — you’re in.</p>
          <p className="mt-1 max-w-xl text-t16">
            Start with Exhibit A (Monday) below. Your {money(P.sprint)} counts toward Membership if you join within {SITE.FOUNDING.sprintCreditHours} hours
            {foundingOpen() ? `, and founding members lock ${money(P.membershipMonthly)}/month for life until Dec 21` : ''}.
          </p>
        </div>
      )}
      <p role="status" className="mt-6 inline-flex items-center gap-2 rounded-pill border border-brand bg-brand-tint px-3 py-1 text-t14 font-medium text-brand">
        Access unlocked{email ? ` · ${email}` : ''}
      </p>

      <Section title="The record" intro="All five filings admitted. Select an exhibit to watch the lesson and work its notes." className="mt-12">
        <Exhibits
          label="Sprint lessons"
          items={SPRINT_COURSE.map((lesson, i) => ({
            id: EXHIBIT_IDS[i],
            label: `${lesson.day} — ${lesson.title}`,
            content: <Lesson lesson={lesson} index={i} url={videos[lesson.key]} />,
          }))}
        />
      </Section>
    </>
  );
}

function Lesson({ lesson, index, url }) {
  return (
    <div id={lesson.key} className="scroll-mt-20">
      <div className="flex items-baseline gap-3">
        <span className="data text-t14 font-medium text-fg-2">{String(index + 1).padStart(2, '0')}</span>
        <p className="data text-t12 uppercase tracking-wide text-fg-2">{lesson.day}</p>
      </div>
      <h3 className="mt-1 font-display text-t24 font-bold tracking-tight">{lesson.title}</h3>
      <p className="mt-1 text-t16 text-fg-2">{lesson.summary}</p>

      <LessonVideo title={lesson.title} url={url} />

      <div className="mt-5">
        <p className="data text-t12 uppercase tracking-wide text-fg-2">In this lesson</p>
        <div className="mt-2"><Checks items={lesson.notes} /></div>
      </div>
    </div>
  );
}

function LessonVideo({ title, url }) {
  if (!url || isPlaceholder(url)) {
    return (
      <div
        className="mt-4 flex items-center justify-center rounded-app border-2 border-dashed border-line bg-card text-t14 text-fg-2"
        style={{ aspectRatio: '16 / 9' }}
      >
        Lesson video — coming soon
      </div>
    );
  }
  return (
    <div className="relative mt-4 overflow-hidden rounded-app border border-line bg-card" style={{ aspectRatio: '16 / 9' }}>
      <iframe
        src={url}
        title={`${title} — lesson video`}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
