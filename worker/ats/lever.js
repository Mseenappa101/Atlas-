import { fetchJson } from '../fetch.js';
import { isLawStudentRole, classYears, postingType, parseLocation } from './classify.js';

export const leverCompany = (url) => url.match(/jobs\.lever\.co\/([A-Za-z0-9_.-]+)/i)?.[1];

/** Lever public Postings API -> normalized listings (no LLM). */
export async function fetchLever(source) {
  const company = leverCompany(source.url);
  if (!company) throw new Error(`bad lever url ${source.url}`);
  const data = await fetchJson(`https://api.lever.co/v0/postings/${company}?mode=json`);
  const listings = [];
  for (const p of Array.isArray(data) ? data : []) {
    const body = [p.descriptionPlain, p.additionalPlain, ...(p.lists || []).map((l) => `${l.text} ${l.content}`)].join(' ').replace(/<[^>]+>/g, ' ');
    const title = (p.text || '').trim();
    if (!isLawStudentRole(`${title} ${p.categories?.commitment || ''}`.trim(), body)) continue;
    const loc = parseLocation(p.categories?.location);
    listings.push({
      title,
      class_years: classYears(`${title} ${body}`),
      posting_type: postingType(title),
      city: loc.city ?? source.city ?? null,
      state: loc.state ?? source.state ?? null,
      window_start: null,
      deadline: null,
      apply_url: p.hostedUrl || p.applyUrl || null,
      summary: (p.openingPlain || p.descriptionPlain || '').replace(/\s+/g, ' ').trim().slice(0, 200) || null,
    });
  }
  return { listings, firm: null };
}
