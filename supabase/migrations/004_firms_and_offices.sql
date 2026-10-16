-- 004: one row per firm, an offices table, the new firm types, saved searches, tracker stages.
-- The data move runs once (guarded by the offices table); the rest is safe to re-run.
--
-- Office ids reuse the old per-city firm row ids, so every old firm id maps 1:1 to an office.

CREATE TABLE IF NOT EXISTS offices (
  id uuid PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms ON DELETE CASCADE,
  city text NOT NULL,
  state text NOT NULL,
  careers_url text,
  apply_url text,
  app_window_start date,
  app_window_end date,
  window_kind text NOT NULL DEFAULT 'unknown' CHECK (window_kind IN ('dated', 'rolling', 'unknown')),
  hires_1l text NOT NULL DEFAULT 'unknown' CHECK (hires_1l IN ('yes', 'unknown', 'no')),
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offices_firm ON offices (firm_id);
CREATE INDEX IF NOT EXISTS idx_offices_city ON offices (lower(city), state);

ALTER TABLE firms ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS split_summers boolean;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS program_length_weeks int;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES offices ON DELETE SET NULL;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rolling boolean NOT NULL DEFAULT false;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES offices ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM offices) THEN
    RAISE NOTICE 'offices already populated; skipping the data move';
    RETURN;
  END IF;

  -- Canonical row per firm name: the one with the most to say.
  CREATE TEMP TABLE firm_map ON COMMIT DROP AS
  SELECT id AS old_id,
         first_value(id) OVER (
           PARTITION BY lower(name)
           ORDER BY (hires_1l = 'yes') DESC, (app_window_start IS NOT NULL OR app_window_end IS NOT NULL) DESC,
                    (firm_type IS NOT NULL) DESC, created_at, id
         ) AS new_id
  FROM firms;

  INSERT INTO offices (id, firm_id, city, state, careers_url, apply_url, app_window_start, app_window_end, window_kind, hires_1l, last_verified_at)
  SELECT f.id, m.new_id, f.city, f.state, f.careers_url, f.apply_url, f.app_window_start, f.app_window_end,
         CASE WHEN f.app_window_start IS NOT NULL OR f.app_window_end IS NOT NULL THEN 'dated' ELSE 'unknown' END,
         f.hires_1l, f.last_verified_at
  FROM firms f JOIN firm_map m ON m.old_id = f.id;

  -- Merge firm-level facts from every office row onto the canonical row.
  UPDATE firms c SET
    hires_1l = CASE WHEN agg.any_yes THEN 'yes' ELSE c.hires_1l END,
    firm_type = coalesce(c.firm_type, agg.any_type),
    size = coalesce(c.size, agg.any_size),
    website = coalesce(c.website, agg.any_website),
    practice_areas = coalesce(agg.areas, c.practice_areas),
    last_verified_at = greatest(c.last_verified_at, agg.max_verified)
  FROM (
    SELECT m.new_id,
           bool_or(f.hires_1l = 'yes') AS any_yes,
           max(f.firm_type) AS any_type,
           max(f.size) AS any_size,
           max(f.website) AS any_website,
           max(f.last_verified_at) AS max_verified,
           (SELECT array_agg(DISTINCT a) FROM firms f2 JOIN firm_map m2 ON m2.old_id = f2.id, unnest(f2.practice_areas) a
             WHERE m2.new_id = m.new_id) AS areas
    FROM firms f JOIN firm_map m ON m.old_id = f.id
    GROUP BY m.new_id
  ) agg
  WHERE c.id = agg.new_id;

  -- Point everything at the canonical firm (and the matching office) before removing duplicates.
  UPDATE listings l SET office_id = l.firm_id, firm_id = m.new_id FROM firm_map m WHERE l.firm_id = m.old_id;
  UPDATE sources s SET office_id = s.firm_id, firm_id = m.new_id FROM firm_map m WHERE s.firm_id = m.old_id;
  UPDATE documents d SET firm_id = m.new_id FROM firm_map m WHERE d.firm_id = m.old_id AND m.old_id <> m.new_id;

  -- A student who saved two offices of one firm keeps one tracker row.
  DELETE FROM user_firms a USING user_firms b, firm_map ma, firm_map mb
  WHERE a.user_id = b.user_id AND ma.old_id = a.firm_id AND mb.old_id = b.firm_id
    AND ma.new_id = mb.new_id AND a.id > b.id;
  UPDATE user_firms u SET firm_id = m.new_id FROM firm_map m WHERE u.firm_id = m.old_id AND m.old_id <> m.new_id;

  DELETE FROM firms f USING firm_map m WHERE f.id = m.old_id AND m.old_id <> m.new_id;
END $$;

-- ─── SLUGS ─────────────────────────────────────────────────────────────────

WITH base AS (
  SELECT id, trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) AS s FROM firms WHERE slug IS NULL
), numbered AS (
  SELECT id, s, row_number() OVER (PARTITION BY s ORDER BY id) AS n FROM base
)
UPDATE firms f SET slug = CASE WHEN n.n = 1 THEN n.s ELSE n.s || '-' || n.n END FROM numbered n WHERE f.id = n.id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_firms_slug ON firms (slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_firms_name ON firms (lower(name));

-- ─── FIRM TYPES ────────────────────────────────────────────────────────────

ALTER TABLE firms DROP CONSTRAINT IF EXISTS firms_firm_type_check;
UPDATE firms SET firm_type = CASE
    WHEN array_to_string(practice_areas, ' ') ~* '(litigation|trial|disputes|appellate)' THEN 'litigation-boutique'
    ELSE 'specialty-boutique'
  END
WHERE firm_type = 'boutique';
ALTER TABLE firms ADD CONSTRAINT firms_firm_type_check CHECK (firm_type IN (
  'litigation-boutique', 'specialty-boutique', 'plaintiff', 'mid-size', 'regional', 'biglaw', 'government', 'public-interest'
));

-- ─── TRACKER STAGES ────────────────────────────────────────────────────────

ALTER TABLE user_firms DROP CONSTRAINT IF EXISTS user_firms_status_check;
UPDATE user_firms SET status = CASE status
    WHEN 'Researching' THEN 'researching'
    WHEN 'Applied' THEN 'applied'
    WHEN 'Heard Back' THEN 'interviewing'
    WHEN 'Callback' THEN 'interviewing'
    WHEN 'Offer' THEN 'offer'
    WHEN 'Rejected' THEN 'not-pursuing'
    ELSE status
  END;
UPDATE user_firms SET status = 'saved' WHERE status NOT IN ('saved', 'researching', 'applied', 'interviewing', 'offer', 'not-pursuing');
ALTER TABLE user_firms ALTER COLUMN status SET DEFAULT 'saved';
ALTER TABLE user_firms ADD CONSTRAINT user_firms_status_check
  CHECK (status IN ('saved', 'researching', 'applied', 'interviewing', 'offer', 'not-pursuing'));

-- ─── SAVED SEARCHES ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  email_alerts boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches (user_id);

-- ─── ROW LEVEL SECURITY ────────────────────────────────────────────────────

ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read offices" ON offices;
CREATE POLICY "public read offices" ON offices FOR SELECT USING (true);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own saved searches" ON saved_searches;
CREATE POLICY "own saved searches" ON saved_searches FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Firm rows keep their old window/apply columns for now (unused by the new UI); offices are the source of truth.

NOTIFY pgrst, 'reload schema';
