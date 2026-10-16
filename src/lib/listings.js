import { supabase } from './supabase';

export const POSTING_TYPES = [
  { value: 'summer-associate', label: 'Summer associate' },
  { value: 'law-clerk', label: 'Law clerk' },
  { value: 'fellowship', label: 'Fellowship' },
  { value: 'intern', label: 'Internship' },
  { value: 'extern', label: 'Externship' },
  { value: 'other', label: 'Other' },
];

const TYPE_LABELS = Object.fromEntries(POSTING_TYPES.map((t) => [t.value, t.label]));

export async function fetchOpenListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('id,firm_id,title,employer_name,class_years,posting_type,city,state,window_start,deadline,apply_url,summary')
    .eq('status', 'open')
    .order('employer_name');
  if (error) throw new Error(error.message);
  return data.map(normalizeListing);
}

function parseDate(v) {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function normalizeListing(row) {
  return {
    id: row.id,
    firmId: row.firm_id,
    title: row.title,
    employer: row.employer_name,
    years: row.class_years ?? [],
    // Pages that just say "summer program" don't name a class year.
    yearsLabel: row.class_years?.length ? row.class_years.join(' · ') : 'Law students',
    type: row.posting_type,
    typeLabel: TYPE_LABELS[row.posting_type] ?? 'Other',
    city: row.city,
    state: row.state,
    place: [row.city, row.state].filter(Boolean).join(', ') || null,
    windowStart: parseDate(row.window_start),
    deadline: parseDate(row.deadline),
    applyUrl: row.apply_url,
    summary: row.summary,
  };
}

export function postingTypeLabel(value) {
  return TYPE_LABELS[value] ?? 'Other';
}
