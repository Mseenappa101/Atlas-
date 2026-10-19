// Picks the address a careers page gives for student applications, or null. Shared by the
// extractor (to check the model's answer is really on the page) and the backfill script.

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const RECRUITING_NAME = /recruit|career|hiring|jobs|talent|summer|student|lawclerk|clerkship|hr\b|^hr|humanresources|employment|apply|applications?|resumes?/i;
const NEARBY = /recruit|appl(y|ication)|résumé|resume|cover letter|summer (associate|program)|law clerk|1L|interested candidates|submit/i;
const NOT_A_MAILBOX = /\.(png|jpe?g|gif|svg|webp)$|@(example|sentry|wixpress|domain|email)\./i;
const NOT_RECRUITING = /(asia|europe|emea|apac|london|uk|china|japan|lateral|staff)[a-z.]*recruit|^(privacy|webmaster|marketing|media|press|news|unsubscribe|noreply|no-reply|donotreply|billing|accounts?payable|ap|abuse|security|support|it)@/i;

const domainOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
};

export function isEmail(s) {
  return typeof s === 'string' && s.length <= 254 && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(s);
}

export function pickRecruitingEmail(pageText, website) {
  if (!pageText) return null;
  const firmDomain = domainOf(website);
  const scored = new Map();
  for (const m of pageText.matchAll(EMAIL_RE)) {
    const email = m[0].replace(/\.$/, '').toLowerCase();
    if (NOT_A_MAILBOX.test(email) || NOT_RECRUITING.test(email)) continue;
    const [local, domain] = email.split('@');
    const around = pageText.slice(Math.max(0, m.index - 160), m.index + email.length + 60);
    let score = 0;
    if (RECRUITING_NAME.test(local)) score += 2;
    if (NEARBY.test(around)) score += 1;
    if (firmDomain && (domain === firmDomain || domain.endsWith(`.${firmDomain}`))) score += 1;
    if (score >= 2) scored.set(email, Math.max(score, scored.get(email) ?? 0));
  }
  const best = [...scored].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

/** True if the address appears on the page, so a model can't invent one. */
export const onPage = (email, pageText) => Boolean(email && pageText && pageText.toLowerCase().includes(email.toLowerCase()));
