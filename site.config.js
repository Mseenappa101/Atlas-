// Every link, date and price for the offer ladder, in one place. Read by the website (src/) and the API (api/).
// Anything here is PUBLIC: it ships in the website's JavaScript. Secrets and private links live in env vars:
//   RESEND_API_KEY, RESEND_AUDIENCE_ID (Resend segment; created automatically if unset),
//   EMAIL_FROM_ADDRESS, MICHAEL_EMAIL, WORKSHOP_ZOOM_URL  (see api/config.js)
//
// A value that starts with "PLACEHOLDER" shows as a visible placeholder on the site until you fill it in.

export const SITE = {
  name: 'Firmward',
  url: 'https://www.firmward.org',
  founder: 'Michael',

  // ─── LINKS ────────────────────────────────────────────────────────────────
  STRIPE_SPRINT_LINK: 'PLACEHOLDER_STRIPE_SPRINT_PAYMENT_LINK', // Stripe Payment Link for the $37 Sprint
  SKOOL_MEMBERSHIP_URL: 'PLACEHOLDER_SKOOL_URL',
  SCHEDULER_URL: 'PLACEHOLDER_CAL_COM_OR_CALENDLY_URL', // strategy calls for the Placement
  RECRUITING_CALENDAR_URL: '/calendar', // what the welcome email links to

  // ─── DATES (Eastern time offsets written out so they never shift) ──────────
  FOUNDING_DEADLINE: '2026-12-21T23:59:00-05:00',
  NEXT_SPRINTS: [
    { start: '2026-11-02', registrationCloses: '2026-11-01T23:59:00-05:00' },
    { start: '2026-11-16', registrationCloses: '2026-11-15T23:59:00-05:00' },
  ],
  NEXT_WORKSHOP: {
    title: 'How to find firms that are actually hiring (summer and post-grad)',
    datetime: '2026-10-21T20:00:00-04:00', // first session; repeats weekly (Wednesdays, 8:00 pm ET)
    durationMinutes: 45,
  },

  // ─── PRICES (whole dollars) ───────────────────────────────────────────────
  PRICES: {
    sprint: 37,
    membershipMonthly: 79,
    membershipAnnual: 790,
    placementTerm: 3000, // per 90-day term
    placementMonthly: 1000, // billed monthly; continues monthly after the term until an offer is accepted
  },
  FOUNDING: {
    memberSpots: 25,
    placementSpots: 5,
    placementExtraFirms: 25,
    sprintCreditHours: 48, // Sprint price is credited toward Membership if they join within this window
  },

  // ─── ANALYTICS ────────────────────────────────────────────────────────────
  PLAUSIBLE_DOMAIN: 'firmward.org', // add this site in Plausible; the script loads only in production
};

export const isPlaceholder = (v) => typeof v !== 'string' || v.startsWith('PLACEHOLDER');

/** The next Sprint whose registration hasn't closed, or null. */
export function nextSprint(now = new Date()) {
  return SITE.NEXT_SPRINTS.find((s) => new Date(s.registrationCloses) > now) ?? null;
}

export const foundingOpen = (now = new Date()) => now < new Date(SITE.FOUNDING_DEADLINE);

// US Eastern offset for a calendar date: daylight time from the second Sunday of March
// to the first Sunday of November.
function easternOffset(y, m, d) {
  const nthSunday = (month, n) => {
    const first = new Date(Date.UTC(y, month - 1, 1)).getUTCDay();
    return 1 + ((7 - first) % 7) + (n - 1) * 7;
  };
  const md = m * 100 + d;
  return md >= 300 + nthSunday(3, 2) && md < 1100 + nthSunday(11, 1) ? '-04:00' : '-05:00';
}

/** The next weekly workshop at the same Eastern wall-clock time, starting from NEXT_WORKSHOP.datetime. */
export function nextWorkshop(now = new Date()) {
  const { datetime, durationMinutes } = SITE.NEXT_WORKSHOP;
  const [, y, m, d, time] = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})/.exec(datetime);
  const day = new Date(Date.UTC(+y, +m - 1, +d));
  for (let i = 0; i < 520; i++) {
    const yy = day.getUTCFullYear();
    const mm = day.getUTCMonth() + 1;
    const dd = day.getUTCDate();
    const pad = (n) => String(n).padStart(2, '0');
    const start = new Date(`${yy}-${pad(mm)}-${pad(dd)}T${time}${easternOffset(yy, mm, dd)}`);
    if (start.getTime() + durationMinutes * 60_000 > now.getTime()) return { ...SITE.NEXT_WORKSHOP, start };
    day.setUTCDate(day.getUTCDate() + 7);
  }
  return null;
}
