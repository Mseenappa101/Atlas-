-- ─── FIRMS ──────────────────────────────────────────────────────────────────

CREATE TABLE firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text not null,
  city text not null,
  address text,
  website text,
  careers_url text,
  size text,
  practice_areas text[],
  has_1l_program boolean default false,
  has_fellowship boolean default false,
  fellowship_name text,
  app_window_start date,
  app_window_end date,
  apply_url text,
  ai_brief text,
  ai_brief_updated_at timestamp,
  notes text,
  last_scraped_at timestamp,
  created_at timestamp default now()
);

-- ─── USERS ──────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  school text,
  grad_year int,
  gpa_range text,
  interests text[],
  target_states text[],
  prior_experience text,
  undergrad_school text,
  undergrad_major text,
  achievements text,
  personal_narrative text,
  resume_url text,
  onboarding_complete boolean default false,
  created_at timestamp default now()
);

-- ─── USER FIRMS ─────────────────────────────────────────────────────────────

CREATE TABLE user_firms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users on delete cascade,
  firm_id uuid references firms on delete cascade,
  status text default 'Researching',
  notes text,
  firm_notes text,
  applied_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(user_id, firm_id)
);

-- ─── DOCUMENTS ──────────────────────────────────────────────────────────────

CREATE TABLE documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users on delete cascade,
  firm_id uuid references firms on delete cascade,
  type text not null,
  content text not null,
  created_at timestamp default now()
);

-- ─── SUBSCRIPTIONS ──────────────────────────────────────────────────────────

CREATE TABLE subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users on delete cascade unique,
  plan text default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- ─── INDEXES ────────────────────────────────────────────────────────────────

CREATE INDEX idx_firms_state ON firms(state);
CREATE INDEX idx_firms_city ON firms(city);
CREATE INDEX idx_firms_state_city ON firms(state, city);
CREATE INDEX idx_user_firms_user_id ON user_firms(user_id);
CREATE INDEX idx_user_firms_firm_id ON user_firms(firm_id);
CREATE INDEX idx_documents_user_firm ON documents(user_id, firm_id);

-- ─── ROW LEVEL SECURITY ────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON users FOR ALL USING (auth.uid() = id);

ALTER TABLE user_firms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_firms" ON user_firms FOR ALL USING (auth.uid() = user_id);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents" ON documents FOR ALL USING (auth.uid() = user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
