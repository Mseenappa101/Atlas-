import { supabase } from './supabase';

const KEY = 'atlas.access';

// The gate is a light one: it remembers a signup in this browser. Storage can be blocked, so never throw.
export function hasAccess() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function grantAccess() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Private mode or blocked storage: they get in for this visit only.
  }
}

export async function signUp(form) {
  const { error } = await supabase.from('waitlist_subscribers').insert({
    email: form.email.trim().toLowerCase(),
    full_name: form.name.trim(),
    law_school: form.school.trim(),
    class_year: form.classYear,
    target_market: form.market || null,
    target_firm_type: form.firmType || null,
    source: 'atlas-gate',
  });
  // 23505 = already signed up with this email. Let them in.
  if (error && error.code !== '23505') throw new Error(error.message);
  grantAccess();
}
