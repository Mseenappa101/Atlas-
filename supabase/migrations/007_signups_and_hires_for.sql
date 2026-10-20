-- 007: signups log for the marketing forms, and "Hires for" (roles a firm hires law students and new
-- grads into). Additive only: nothing existing changes, so it is safe on the live site.

-- ─── SIGNUPS: one row per form submission (subscribe, workshop, placement application) ─

CREATE TABLE IF NOT EXISTS signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('subscribe', 'workshop', 'placement')),
  email text NOT NULL,
  name text,
  class_year text,
  role_sought text,
  source_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  referrer text,
  details jsonb NOT NULL DEFAULT '{}', -- the rest of the form (placement answers, workshop date)
  ip_hash text, -- hashed, for rate limiting and abuse review only
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signups_email ON signups (lower(email));
CREATE INDEX IF NOT EXISTS idx_signups_kind_time ON signups (kind, created_at);
ALTER TABLE signups ENABLE ROW LEVEL SECURITY; -- written and read only by the API

-- The email list gets the latest class year / role / first-touch source too.
ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS role_sought text;
ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS utm_campaign text;

-- ─── HIRES FOR ──────────────────────────────────────────────────────────────
-- Values: '1l-summer', '2l-summer', 'post-grad' (new-grad associate), 'entry-lateral' (0–2 years).
-- An empty array means "unknown". hires_1l stays as it was; hires_for is the new, broader field.

ALTER TABLE offices ADD COLUMN IF NOT EXISTS hires_for text[] NOT NULL DEFAULT '{}';
ALTER TABLE firms ADD COLUMN IF NOT EXISTS hires_for text[] NOT NULL DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';

-- Listings: a posting open to 1Ls is a 1L summer role; one open to 2Ls, a 2L summer role.
UPDATE listings SET roles = ARRAY(
  SELECT DISTINCT r FROM unnest(ARRAY[
    CASE WHEN '1L' = ANY (class_years) THEN '1l-summer' END,
    CASE WHEN '2L' = ANY (class_years) AND posting_type IN ('summer-associate', 'law-clerk', 'intern', 'extern', 'fellowship') THEN '2l-summer' END
  ]) AS r WHERE r IS NOT NULL ORDER BY r)
WHERE roles = '{}';

-- Offices: a confirmed 1L program, plus the roles of the open listings filed under the office.
UPDATE offices o SET hires_for = ARRAY(
  SELECT DISTINCT r FROM (
    SELECT '1l-summer' AS r WHERE o.hires_1l = 'yes'
    UNION SELECT unnest(l.roles) FROM listings l WHERE l.office_id = o.id AND l.status = 'open'
  ) x ORDER BY r)
WHERE hires_for = '{}';

-- Firms: everything their offices and listings show.
UPDATE firms f SET hires_for = ARRAY(
  SELECT DISTINCT r FROM (
    SELECT '1l-summer' AS r WHERE f.hires_1l = 'yes'
    UNION SELECT unnest(o.hires_for) FROM offices o WHERE o.firm_id = f.id
    UNION SELECT unnest(l.roles) FROM listings l WHERE l.firm_id = f.id AND l.status = 'open'
  ) x ORDER BY r)
WHERE hires_for = '{}';

NOTIFY pgrst, 'reload schema';
