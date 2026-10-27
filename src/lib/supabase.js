import { createClient } from '@supabase/supabase-js';

// Fall back to a harmless placeholder when the keys aren't present at build time — the SSR prerender
// step (scripts/prerender.mjs) imports this module, and a clean clone has no .env, so createClient must
// not throw or the whole build fails. At real runtime Vite has inlined the actual VITE_SUPABASE_* values,
// so the placeholder is never used; the prerender itself never calls supabase (data loads client-side).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
