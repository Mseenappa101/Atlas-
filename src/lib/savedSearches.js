import { supabase } from './supabase';

const LOCAL = (uid) => `firmward.saved-searches.${uid}`;

// Saves to saved_searches (migration 004). If that table isn't there yet, keeps it on this device.
export async function saveSearch(userId, search) {
  const { error } = await supabase.from('saved_searches').insert({ user_id: userId, ...search });
  if (!error) return 'account';
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL(userId)) ?? '[]');
    list.push({ ...search, id: `local-${Date.now()}`, created_at: new Date().toISOString() });
    localStorage.setItem(LOCAL(userId), JSON.stringify(list));
    return 'device';
  } catch {
    throw new Error('Couldn’t save this search. Try again in a minute.');
  }
}

export async function loadSavedSearches(userId) {
  const { data, error } = await supabase.from('saved_searches').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  let local = [];
  try {
    local = JSON.parse(localStorage.getItem(LOCAL(userId)) ?? '[]');
  } catch {
    // Device storage unavailable.
  }
  return [...(error ? [] : data), ...local];
}
