-- 006: application workspace, sending from Firmward, connected inboxes, newsletter sync.
-- Safe to run more than once.

-- ─── FIRMS: where a firm takes emailed applications ─────────────────────────

ALTER TABLE firms ADD COLUMN IF NOT EXISTS recruiting_email text;

-- Firms whose only application link is an email address.
UPDATE firms SET recruiting_email = lower(split_part(substring(apply_url from 8), '?', 1))
WHERE recruiting_email IS NULL AND apply_url ILIKE 'mailto:%';
UPDATE firms f SET recruiting_email = lower(split_part(substring(o.apply_url from 8), '?', 1))
FROM offices o
WHERE o.firm_id = f.id AND f.recruiting_email IS NULL AND o.apply_url ILIKE 'mailto:%';

-- ─── USER_FIRMS: one row per application the student is working on ──────────
-- materials: { resume: 'file' | 'builder' | 'none', letter_id, file_ids: [] }
-- draft:     { to, cc, subject, body, via }  (the unsent email, saved as they type)
-- checklist: [{ id, label, done }]           (their own to-dos for this firm)

ALTER TABLE user_firms ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES listings ON DELETE SET NULL;
ALTER TABLE user_firms ADD COLUMN IF NOT EXISTS method text;
ALTER TABLE user_firms ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE user_firms ADD COLUMN IF NOT EXISTS deadline date;
ALTER TABLE user_firms ADD COLUMN IF NOT EXISTS materials jsonb NOT NULL DEFAULT '{}';
ALTER TABLE user_firms ADD COLUMN IF NOT EXISTS draft jsonb NOT NULL DEFAULT '{}';
ALTER TABLE user_firms ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]';
ALTER TABLE user_firms DROP CONSTRAINT IF EXISTS user_firms_method_check;
ALTER TABLE user_firms ADD CONSTRAINT user_firms_method_check CHECK (method IS NULL OR method IN ('email', 'portal'));

-- ─── EXTRA FILES: transcripts, writing samples (stored in the resume-uploads bucket) ─

CREATE TABLE IF NOT EXISTS user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('transcript', 'writing-sample', 'other')),
  name text NOT NULL,
  path text NOT NULL,
  mime text NOT NULL,
  size int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_files_user ON user_files (user_id);
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own files" ON user_files;
CREATE POLICY "read own files" ON user_files FOR SELECT USING (auth.uid() = user_id);
-- Uploads and deletes go through the API, which also handles the stored file.

-- ─── CONNECTED INBOXES: written and read only by the API (tokens are encrypted) ─

CREATE TABLE IF NOT EXISTS email_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  email text NOT NULL,
  refresh_token_enc text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
ALTER TABLE email_connections ENABLE ROW LEVEL SECURITY;

-- ─── SENT EMAILS: every application email sent from Firmward ────────────────

CREATE TABLE IF NOT EXISTS sent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  user_firm_id uuid REFERENCES user_firms ON DELETE SET NULL,
  firm_id uuid REFERENCES firms ON DELETE SET NULL,
  via text NOT NULL CHECK (via IN ('gmail', 'outlook', 'firmward')),
  from_email text NOT NULL,
  to_email text NOT NULL,
  cc text,
  subject text NOT NULL,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]',
  provider_message_id text,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sent_user_time ON sent_messages (user_id, created_at);
ALTER TABLE sent_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own sent" ON sent_messages;
CREATE POLICY "read own sent" ON sent_messages FOR SELECT USING (auth.uid() = user_id);

-- ─── TIMELINE: stage changes, sends and portal submissions per application ──

CREATE TABLE IF NOT EXISTS application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  user_firm_id uuid NOT NULL REFERENCES user_firms ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('stage', 'sent', 'submitted')),
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_app ON application_events (user_firm_id, created_at);
ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own events" ON application_events;
CREATE POLICY "read own events" ON application_events FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "add own submitted events" ON application_events;
CREATE POLICY "add own submitted events" ON application_events FOR INSERT
  WITH CHECK (auth.uid() = user_id AND kind = 'submitted'
    AND EXISTS (SELECT 1 FROM user_firms u WHERE u.id = user_firm_id AND u.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.log_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR new.status IS DISTINCT FROM old.status THEN
    INSERT INTO application_events (user_id, user_firm_id, kind, detail)
    VALUES (new.user_id, new.id, 'stage',
            jsonb_build_object('to', new.status, 'from', CASE WHEN TG_OP = 'UPDATE' THEN old.status END));
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_user_firm_stage ON user_firms;
CREATE TRIGGER on_user_firm_stage
  AFTER INSERT OR UPDATE OF status ON user_firms
  FOR EACH ROW EXECUTE FUNCTION public.log_stage_change();

-- ─── NEWSLETTER: sync state with Resend ─────────────────────────────────────

ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS unsubscribed boolean NOT NULL DEFAULT false;
ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS resend_contact_id text;
ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS synced_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_waitlist_unsynced ON waitlist_subscribers (created_at) WHERE synced_at IS NULL;

NOTIFY pgrst, 'reload schema';
