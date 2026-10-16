-- 003: student profiles, resumes, generated documents, usage log.
-- Safe to run more than once.

-- ─── PROFILES ──────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS class_year text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_market text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_firm_type text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_data jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_source text CHECK (resume_source IN ('upload', 'builder'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_file_path text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_updated_at timestamptz;

-- Create the profile row at signup from the metadata the signup form sends.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, school, class_year, target_market, target_firm_type)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'school',
    new.raw_user_meta_data ->> 'class_year',
    new.raw_user_meta_data ->> 'target_market',
    new.raw_user_meta_data ->> 'target_firm_type'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan) VALUES (new.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  -- Everyone who makes a profile is on the email list too. Its own block, so a duplicate
  -- email (signed up through the old gate) can't roll back the profile row above.
  BEGIN
  INSERT INTO public.waitlist_subscribers (email, full_name, law_school, class_year, target_market, target_firm_type, source)
  VALUES (
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'school',
    new.raw_user_meta_data ->> 'class_year',
    new.raw_user_meta_data ->> 'target_market',
    new.raw_user_meta_data ->> 'target_firm_type',
    'atlas-profile'
  );
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── DOCUMENTS ─────────────────────────────────────────────────────────────

ALTER TABLE documents ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES listings ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_documents_user_type ON documents (user_id, type);

-- ─── PLANS ─────────────────────────────────────────────────────────────────
-- free: no AI except one sample cover letter. pro ($4.99/mo, set by the Stripe webhook): AI resume
-- and letters. member and retainer (coaching, set by hand for now) include everything in pro.

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check CHECK (plan IN ('free', 'pro', 'member', 'retainer'));
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

-- ─── GENERATION LOG: every Claude call the API makes, for limits and cost ──

CREATE TABLE IF NOT EXISTS generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('resume_parse', 'resume_write', 'cover_letter')),
  ok boolean NOT NULL DEFAULT true,
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10, 6),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_genlog_user_day ON generation_log (user_id, created_at);
ALTER TABLE generation_log ENABLE ROW LEVEL SECURITY;

-- ─── RESUME FILES: private bucket, written only by the API ─────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resume-uploads', 'resume-uploads', false, 5242880,
        ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

NOTIFY pgrst, 'reload schema';
