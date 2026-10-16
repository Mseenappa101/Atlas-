import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || 'Something went wrong. Try again in a minute.');
    this.status = status;
    this.code = body?.error ?? 'unknown';
    this.data = body;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { error: 'network', message: 'Couldn’t reach Atlas. Check your connection and try again.' });
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json);
  return json;
}
