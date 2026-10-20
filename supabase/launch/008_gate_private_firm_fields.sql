-- 008: gate the hiring details. APPLY ONLY TOGETHER WITH THE offer-ladder FRONTEND.
-- The current production site reads every column as an anonymous visitor; after this it can't.
-- To launch: move this file into supabase/migrations/ and run `node scripts/migrate.mjs`
-- right after the offer-ladder branch is live.
--
-- Signed-out visitors (role anon) can read only the public columns: name, places, practice, type, size.
-- Everything else comes from the API (/api/catalog/private) for unlocked or signed-in visitors.
-- Signed-in students (role authenticated) keep full read access, as before.

REVOKE SELECT ON public.firms FROM anon;
GRANT SELECT (id, name, slug, state, city, size, practice_areas, firm_type, last_verified_at, source) ON public.firms TO anon;

REVOKE SELECT ON public.offices FROM anon;
GRANT SELECT (id, firm_id, city, state, last_verified_at) ON public.offices TO anon;

-- Open postings are all gated.
REVOKE SELECT ON public.listings FROM anon;

NOTIFY pgrst, 'reload schema';
