import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { SITE, foundingOpen, isPlaceholder } from '../../site.config';
import { SPRINT_COURSE } from '../content/course';
import { money } from '../lib/money';
import { api, ApiError } from '../lib/api';
import { track } from '../lib/tracking';
import usePageMeta from '../hooks/usePageMeta';
import { Page, Eyebrow, H1, Lead, Section, Checks, Cta } from '../components/marketing/kit';

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
      <Eyebrow>20-Firm Sprint · Course</Eyebrow>
      <H1>The Sprint course</H1>
      <Lead>Five short lessons, one a day, Monday to Friday. Watch at your own pace and send alongside the cohort.</Lead>

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

      <Section title="What’s inside" className="mt-12">
        <ol className="divide-y divide-line rounded-app border border-line bg-card">
          {SPRINT_COURSE.map((lesson, i) => (
            <li key={lesson.key} className="flex gap-4 px-4 py-4 md:px-5">
              <span className="data mt-0.5 shrink-0 text-t14 font-medium text-fg-2">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="data text-t12 uppercase tracking-wide text-fg-2">{lesson.day}</p>
                <p className="text-t16 font-semibold">{lesson.title}</p>
                <p className="mt-0.5 text-t14 text-fg-2">{lesson.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}

function UnlockedState({ email, videos, justPurchased }) {
  return (
    <>
      {justPurchased && (
        <div className="mt-8 rounded-app border border-brand bg-brand-tint p-5">
          <p className="text-t20 font-semibold">Payment received — you’re in.</p>
          <p className="mt-1 text-t16">
            Start with Monday below. Your {money(P.sprint)} counts toward Membership if you join within {SITE.FOUNDING.sprintCreditHours} hours
            {foundingOpen() ? `, and founding members lock ${money(P.membershipMonthly)}/month for life until Dec 21` : ''}.
          </p>
        </div>
      )}
      <p role="status" className="mt-6 inline-flex items-center gap-2 rounded-pill border border-brand bg-brand-tint px-3 py-1 text-t14 font-medium text-brand">
        Access unlocked{email ? ` · ${email}` : ''}
      </p>

      {/* Lesson index: a compact jump list on wide screens. */}
      <nav aria-label="Lessons" className="mt-8 hidden flex-wrap gap-x-5 gap-y-1 md:flex">
        {SPRINT_COURSE.map((lesson, i) => (
          <a key={lesson.key} href={`#${lesson.key}`} className="text-t14 text-fg-2 hover:text-brand">
            <span className="data">{String(i + 1).padStart(2, '0')}</span> {lesson.title}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-12">
        {SPRINT_COURSE.map((lesson, i) => (
          <Lesson key={lesson.key} lesson={lesson} index={i} url={videos[lesson.key]} />
        ))}
      </div>
    </>
  );
}

function Lesson({ lesson, index, url }) {
  return (
    <section id={lesson.key} className="scroll-mt-20">
      <div className="flex items-baseline gap-3">
        <span className="data text-t14 font-medium text-fg-2">{String(index + 1).padStart(2, '0')}</span>
        <p className="data text-t12 uppercase tracking-wide text-fg-2">{lesson.day}</p>
      </div>
      <h2 className="mt-1 text-t24 font-bold tracking-tight">{lesson.title}</h2>
      <p className="mt-1 text-t16 text-fg-2">{lesson.summary}</p>

      <LessonVideo title={lesson.title} url={url} />

      <div className="mt-5">
        <p className="data text-t12 uppercase tracking-wide text-fg-2">In this lesson</p>
        <div className="mt-2"><Checks items={lesson.notes} /></div>
      </div>
    </section>
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
