-- 002: listings pipeline, firm metadata for the redesign, signup fields.
-- Safe to run more than once.

-- ─── FIRMS: fields the redesigned directory needs ──────────────────────────

ALTER TABLE firms ADD COLUMN IF NOT EXISTS hires_1l text NOT NULL DEFAULT 'unknown'
  CHECK (hires_1l IN ('yes', 'unknown', 'no'));
ALTER TABLE firms ADD COLUMN IF NOT EXISTS firm_type text
  CHECK (firm_type IN ('biglaw', 'mid-size', 'boutique', 'plaintiff', 'regional', 'government', 'public-interest'));
ALTER TABLE firms ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS source text;

-- has_1l_program = false meant "not found", not "no".
UPDATE firms SET hires_1l = 'yes' WHERE has_1l_program = true AND hires_1l = 'unknown';
UPDATE firms SET last_verified_at = last_scraped_at WHERE last_verified_at IS NULL;
UPDATE firms SET source = 'Firm careers page' WHERE source IS NULL AND careers_url IS NOT NULL;

UPDATE firms SET firm_type = CASE
    WHEN size ILIKE '%amlaw%' OR size ILIKE '%vault%' THEN 'biglaw'
    WHEN size ILIKE '%boutique%' THEN 'boutique'
    WHEN size ILIKE '%mid%' THEN 'mid-size'
  END
WHERE firm_type IS NULL AND size IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_firms_name_city ON firms (lower(name), lower(city));

-- ─── SOURCES: every page or feed the worker checks ─────────────────────────

CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES firms ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'page'
    CHECK (kind IN ('page', 'greenhouse', 'lever', 'usajobs')),
  url text NOT NULL UNIQUE,
  employer_name text NOT NULL,
  city text,
  state text,
  check_interval_minutes int NOT NULL DEFAULT 480,
  next_check_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  last_status text,
  last_content_hash text,
  consecutive_failures int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sources_due ON sources (next_check_at) WHERE active;

-- ─── LISTINGS: individual postings extracted from sources ──────────────────

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES sources ON DELETE CASCADE,
  firm_id uuid REFERENCES firms ON DELETE SET NULL,
  listing_key text NOT NULL,
  title text NOT NULL,
  employer_name text NOT NULL,
  class_years text[] NOT NULL DEFAULT '{}',
  posting_type text NOT NULL DEFAULT 'other'
    CHECK (posting_type IN ('summer-associate', 'law-clerk', 'intern', 'fellowship', 'extern', 'other')),
  city text,
  state text,
  window_start date,
  deadline date,
  apply_url text,
  summary text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  UNIQUE (source_id, listing_key)
);
CREATE INDEX IF NOT EXISTS idx_listings_open ON listings (state, city) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_listings_firm ON listings (firm_id);

-- ─── EXTRACTION JOBS: changed pages waiting on / processed by Claude ───────

CREATE TABLE IF NOT EXISTS extraction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES sources ON DELETE CASCADE,
  content_hash text NOT NULL,
  page_text text,
  batch_id text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'submitted', 'done', 'failed', 'skipped')),
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10, 6),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON extraction_jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_month ON extraction_jobs (finished_at) WHERE cost_usd IS NOT NULL;

-- ─── SCRAPE RUNS: one row per worker cycle, for monitoring ─────────────────

CREATE TABLE IF NOT EXISTS scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  sources_checked int NOT NULL DEFAULT 0,
  pages_changed int NOT NULL DEFAULT 0,
  jobs_queued int NOT NULL DEFAULT 0,
  listings_opened int NOT NULL DEFAULT 0,
  listings_closed int NOT NULL DEFAULT 0,
  errors int NOT NULL DEFAULT 0,
  notes text
);

CREATE OR REPLACE VIEW llm_spend_by_month AS
  SELECT date_trunc('month', finished_at) AS month,
         count(*) AS calls,
         sum(input_tokens) AS input_tokens,
         sum(output_tokens) AS output_tokens,
         sum(cost_usd) AS cost_usd
  FROM extraction_jobs
  WHERE cost_usd IS NOT NULL
  GROUP BY 1;

-- ─── SIGNUPS: extend the existing waitlist table ───────────────────────────

ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS class_year text;
ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS target_market text;
ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS target_firm_type text;

-- ─── ROW LEVEL SECURITY ────────────────────────────────────────────────────
-- Public site: read firms and open listings, insert signups. Nothing else.

ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read firms" ON firms;
CREATE POLICY "public read firms" ON firms FOR SELECT USING (true);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read listings" ON listings;
CREATE POLICY "public read listings" ON listings FOR SELECT USING (true);

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE waitlist_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public insert signups" ON waitlist_subscribers;
CREATE POLICY "public insert signups" ON waitlist_subscribers FOR INSERT WITH CHECK (true);

-- The view runs with its owner's rights by default; keep it off the public API.
REVOKE ALL ON llm_spend_by_month FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
