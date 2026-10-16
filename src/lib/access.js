import { supabase } from './supabase';

// Profile fields ride along as signup metadata; a database trigger (migration 003)
// copies them into users, subscriptions and the email list.
export async function createProfile(form) {
  const { data, error } = await supabase.auth.signUp({
    email: form.email.trim().toLowerCase(),
    password: form.password,
    options: {
      data: {
        full_name: form.name.trim(),
        school: form.school.trim(),
        class_year: form.classYear,
        target_market: form.market || null,
        target_firm_type: form.firmType || null,
      },
    },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      throw new Error('You already have a profile with this email. Sign in instead.');
    }
    if (/password/i.test(error.message)) throw new Error(error.message);
    throw new Error('Couldn’t create your profile. Check your connection and try again.');
  }
  // With email confirmation on, there's no session until they click the link.
  return { needsConfirmation: !data.session };
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    throw new Error(/invalid/i.test(error.message) ? 'That email and password don’t match a profile.' : error.message);
  }
}
