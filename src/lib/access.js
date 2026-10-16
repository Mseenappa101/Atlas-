import { supabase } from './supabase';

// Step 1 of sign-up: just email and password. A database trigger (migration 003) creates the
// profile, a free plan and the email-list entry.
export async function createAccount(email, password) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      throw new Error('There’s already a profile with this email. Sign in instead.');
    }
    if (/password/i.test(error.message)) throw new Error(error.message);
    throw new Error('Couldn’t create your profile. Check your connection and try again.');
  }
  return { needsConfirmation: !data.session, userId: data.user?.id };
}

// Step 2 (optional): details that personalize Explore. Migration 005 copies them to the email list.
export async function saveProfileDetails(userId, details) {
  const patch = {};
  if (details.name?.trim()) patch.full_name = details.name.trim();
  if (details.school?.trim()) patch.school = details.school.trim();
  if (details.classYear) patch.class_year = details.classYear;
  if (details.markets?.length) patch.target_market = details.markets.join(', ');
  if (details.types?.length) patch.target_firm_type = details.types.join(', ');
  if (!Object.keys(patch).length) return;
  const { error } = await supabase.from('users').update(patch).eq('id', userId);
  if (error) throw new Error('Couldn’t save those details. You can add them later.');
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    throw new Error(/invalid/i.test(error.message) ? 'That email and password don’t match a profile.' : error.message);
  }
}
