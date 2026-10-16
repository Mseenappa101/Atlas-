import { config } from '../config.js';
import { fetchJson } from '../fetch.js';
import { classYears, postingType, parseLocation, stateCode, isoDate } from './classify.js';

// Field names per https://developer.usajobs.gov/api-reference/get-api-search
export const USAJOBS_QUERIES = ['law clerk', 'legal intern', 'student trainee (law)', 'law student', 'legal extern'];

export const usajobsUrl = (keyword) =>
  `https://data.usajobs.gov/api/search?HiringPath=student&ResultsPerPage=250&Keyword=${encodeURIComponent(keyword)}`;

const LAW_TITLE_RE = /\b(law|legal|attorney|clerk|paralegal|judicial)\b/i;

/** USAJOBS Search API -> listings. One source per keyword query; employer = hiring agency. */
export async function fetchUsajobs(source) {
  if (!config.usajobsKey) throw new Error('USAJOBS_API_KEY not set');
  const data = await fetchJson(source.url, {
    Host: 'data.usajobs.gov',
    'User-Agent': config.contactEmail,
    'Authorization-Key': config.usajobsKey,
  });
  const listings = [];
  for (const item of data?.SearchResult?.SearchResultItems || []) {
    const d = item.MatchedObjectDescriptor || {};
    const title = (d.PositionTitle || '').trim();
    if (!title || !LAW_TITLE_RE.test(title)) continue;
    const details = d.UserArea?.Details || {};
    const text = [title, d.QualificationSummary, details.Education, details.MajorDuties].flat().filter(Boolean).join(' ');
    const loc0 = (d.PositionLocation || [])[0] || {};
    const fromDisplay = parseLocation(d.PositionLocationDisplay);
    const apply = Array.isArray(d.ApplyURI) ? d.ApplyURI[0] : d.ApplyURI;
    listings.push({
      title,
      employer_name: d.OrganizationName || d.DepartmentName || 'U.S. Government',
      class_years: classYears(text),
      posting_type: postingType(title) === 'other' ? 'intern' : postingType(title),
      city: loc0.CityName?.split(',')[0]?.trim() || fromDisplay.city,
      state: stateCode(loc0.CountrySubDivisionCode) || fromDisplay.state,
      window_start: isoDate(d.PositionStartDate),
      deadline: isoDate(d.ApplicationCloseDate || d.PositionEndDate),
      apply_url: apply || d.PositionURI || null,
      summary: (d.QualificationSummary || '').replace(/\s+/g, ' ').trim().slice(0, 200) || null,
    });
  }
  return { listings, firm: null };
}
