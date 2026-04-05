import { supabase } from './supabase';

// ─── FIRMS ──────────────────────────────────────────────────────────────────

export async function getFirmsByState(state) {
  try {
    const { data, error } = await supabase
      .from('firms')
      .select('*')
      .eq('state', state);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function getFirmsByCity(state, city) {
  try {
    const { data, error } = await supabase
      .from('firms')
      .select('*')
      .eq('state', state)
      .eq('city', city);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function getFirmById(id) {
  try {
    const { data, error } = await supabase
      .from('firms')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function getStatesWithFirmCounts() {
  try {
    const { data, error } = await supabase
      .from('firms')
      .select('state');
    if (error) throw error;
    const counts = {};
    data.forEach((row) => {
      counts[row.state] = (counts[row.state] || 0) + 1;
    });
    const result = Object.entries(counts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => a.state.localeCompare(b.state));
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function searchFirms(query) {
  try {
    const { data, error } = await supabase
      .from('firms')
      .select('*')
      .or(`name.ilike.%${query}%,city.ilike.%${query}%`);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function updateFirmAiBrief(id, brief) {
  try {
    const { data, error } = await supabase
      .from('firms')
      .update({ ai_brief: brief, ai_brief_updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

// ─── USERS ──────────────────────────────────────────────────────────────────

export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function createUserProfile(userId, email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({ id: userId, email })
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function updateUserProfile(userId, data) {
  try {
    const { data: updated, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return { data: updated, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function uploadResume(userId, file) {
  try {
    const path = `${userId}/resume.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('resumes').getPublicUrl(path);
    return { data: data.publicUrl, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

// ─── USER FIRMS ─────────────────────────────────────────────────────────────

export async function getUserFirms(userId) {
  try {
    const { data, error } = await supabase
      .from('user_firms')
      .select('*, firms(*)')
      .eq('user_id', userId);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function addFirmToList(userId, firmId) {
  try {
    const { data, error } = await supabase
      .from('user_firms')
      .insert({ user_id: userId, firm_id: firmId, status: 'Researching' })
      .select('*, firms(*)')
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function updateFirmStatus(userFirmId, status) {
  try {
    const update = { status };
    if (status === 'Applied') {
      update.applied_at = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from('user_firms')
      .update(update)
      .eq('id', userFirmId)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function updateFirmNotes(userFirmId, notes) {
  try {
    const { data, error } = await supabase
      .from('user_firms')
      .update({ firm_notes: notes })
      .eq('id', userFirmId)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function removeFirmFromList(userFirmId) {
  try {
    const { error } = await supabase
      .from('user_firms')
      .delete()
      .eq('id', userFirmId);
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

// ─── DOCUMENTS ──────────────────────────────────────────────────────────────

export async function saveDocument(userId, firmId, type, content) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert({ user_id: userId, firm_id: firmId, type, content })
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function getDocumentsForFirm(userId, firmId) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function deleteDocument(documentId) {
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

// ─── SUBSCRIPTIONS ──────────────────────────────────────────────────────────

export async function getUserSubscription(userId) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function updateSubscription(userId, data) {
  try {
    const { data: updated, error } = await supabase
      .from('subscriptions')
      .upsert({ user_id: userId, ...data })
      .select()
      .single();
    if (error) throw error;
    return { data: updated, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function isPro(userId) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, current_period_end')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data.plan === 'pro' && new Date(data.current_period_end) > new Date();
  } catch {
    return false;
  }
}
