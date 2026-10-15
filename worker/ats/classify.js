import * as cheerio from 'cheerio';
import { STUDENT_RE } from '../text.js';

const LEGAL_RE = /\b(law|legal|J\.?D\.?|juris|attorney|counsel|paralegal|litigation|judicial|clerk(ship)?|summer associates?|OCI)\b/i;
const NON_LAW_STUDENT_RE = /\b(software|engineer|data|marketing|design|finance|sales|product|research scientist)\b/i;

/** True when a posting looks like a law-student role (no LLM; keyword rules only). */
export function isLawStudentRole(title, body = '') {
  if (!STUDENT_RE.test(title) && !/\bOCI\b/.test(title)) return false;
  if (LEGAL_RE.test(title)) return true;
  // e.g. "Summer Intern" at a law-adjacent org: require legal context in the body, and no obvious non-law discipline.
  return !NON_LAW_STUDENT_RE.test(title) && /\blaw (school|student)|\bJ\.?D\.? (candidate|student)|\b[123]L\b/i.test(body);
}

export function classYears(text) {
  const out = new Set();
  for (const m of text.matchAll(/\b(?:rising\s+)?([123])L(?:s)?\b/g)) out.add(`${m[1]}L`);
  if (/first[- ]year (law )?students?/i.test(text)) out.add('1L');
  if (/second[- ]year (law )?students?/i.test(text)) out.add('2L');
  if (/third[- ]year (law )?students?|graduating (law )?students?/i.test(text)) out.add('3L');
  // "J.D. (or expected) by Spring 2027" with that year at most a year out -> open to current 3Ls.
  const jd = text.match(/J\.?D\.?[^;\n]{0,80}?\bby\b[^;\n]{0,20}?\b(20\d\d)\b/i);
  if (jd && Number(jd[1]) <= new Date().getFullYear() + 1) out.add('3L');
  return ['1L', '2L', '3L'].filter((y) => out.has(y));
}

export function postingType(title) {
  if (/summer associate/i.test(title)) return 'summer-associate';
  if (/law clerk|clerkship|judicial/i.test(title)) return 'law-clerk';
  if (/fellow/i.test(title)) return 'fellowship';
  if (/extern/i.test(title)) return 'extern';
  if (/intern/i.test(title)) return 'intern';
  return 'other';
}

export const htmlToPlain = (html) => cheerio.load(html || '').root().text().replace(/\s+/g, ' ').trim();

const STATES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
  delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA',
  'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'puerto rico': 'PR', guam: 'GU', 'virgin islands': 'VI',
};
const CODES = new Set(Object.values(STATES));

export function stateCode(s) {
  if (!s) return null;
  const t = s.trim();
  if (CODES.has(t.toUpperCase()) && t.length === 2) return t.toUpperCase();
  return STATES[t.toLowerCase()] || null;
}

/** "Washington, DC" / "New York City, NY; San Francisco, CA" / "Remote" -> { city, state } of the first US location. */
export function parseLocation(loc) {
  if (!loc) return { city: null, state: null };
  for (const part of loc.split(/[;|]/)) {
    const [city, region] = part.split(',').map((x) => x?.trim());
    const state = stateCode(region || '');
    if (state) return { city: city || null, state };
  }
  return { city: null, state: null };
}

export const isoDate = (s) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
