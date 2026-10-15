import { fetchJson } from '../fetch.js';
import { isLawStudentRole, classYears, postingType, htmlToPlain, parseLocation, isoDate } from './classify.js';

export const boardToken = (url) => url.match(/greenhouse\.io\/(?:embed\/job_board\?for=)?([A-Za-z0-9_-]+)/i)?.[1];

/** Greenhouse public Job Board API -> normalized listings (no LLM). */
export async function fetchGreenhouse(source) {
  const token = boardToken(source.url);
  if (!token) throw new Error(`bad greenhouse url ${source.url}`);
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`);
  const listings = [];
  for (const job of data.jobs || []) {
    // content is HTML-escaped HTML; decode twice.
    const body = htmlToPlain(htmlToPlain(job.content));
    if (!isLawStudentRole(job.title, body)) continue;
    const loc = parseLocation(job.location?.name);
    listings.push({
      title: job.title.trim(),
      class_years: classYears(`${job.title} ${body}`),
      posting_type: postingType(job.title),
      city: loc.city ?? source.city ?? null,
      state: loc.state ?? source.state ?? null,
      window_start: null,
      deadline: isoDate(job.application_deadline),
      apply_url: job.absolute_url || null,
      summary: body.slice(0, 200) || null,
    });
  }
  return { listings, firm: null };
}
