-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  monthly_income_kes integer not null default 45000,
  keto_budget_kes integer not null default 5000,
  language text not null default 'en' check (language in ('en', 'sw')),
  legacy_statement text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- transactions
create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount_kes integer not null check (amount_kes > 0),
  type text not null check (type in ('income', 'expense', 'transfer', 'savings')),
  category text not null check (category in ('food','transport','rent','utilities','entertainment','health','savings','investment','family_support','tithe','other')),
  description text not null default '',
  source text not null default 'manual' check (source in ('manual','mpesa_scan','auto')),
  mpesa_ref text,
  date date not null,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_date on transactions(user_id, date);

-- budget_allocations
create table if not exists budget_allocations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  month text not null, -- YYYY-MM
  total_income_kes integer not null,
  allocations jsonb not null default '{}',
  actual_spent jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, month)
);
create index if not exists budget_allocations_user_month on budget_allocations(user_id, month);

-- impulse_pauses
create table if not exists impulse_pauses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  item_name text not null,
  amount_kes integer not null check (amount_kes >= 3000),
  created_at timestamptz not null default now(),
  unlock_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','approved','cancelled')),
  ai_reasoning text not null default ''
);

-- savings_streaks
create table if not exists savings_streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_streak_days integer not null default 0,
  longest_streak_days integer not null default 0,
  last_savings_date date,
  total_saved_kes integer not null default 0
);

-- food_logs
create table if not exists food_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_items jsonb not null default '[]',
  total_macros jsonb not null default '{}',
  logged_via text not null default 'manual' check (logged_via in ('manual','photo','meal_plan')),
  photo_url text,
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_date on food_logs(user_id, date);

-- daily_macros
create table if not exists daily_macros (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  target jsonb not null default '{}',
  actual jsonb not null default '{}',
  water_ml integer not null default 0,
  water_target_ml integer not null default 3000,
  ketosis_status jsonb not null default '{}',
  unique(user_id, date)
);
create index if not exists daily_macros_user_date on daily_macros(user_id, date);

-- water_logs
create table if not exists water_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  amount_ml integer not null check (amount_ml > 0),
  logged_at timestamptz not null default now()
);
create index if not exists water_logs_user_date on water_logs(user_id, date);

-- bible_verses
create table if not exists bible_verses (
  id uuid primary key default uuid_generate_v4(),
  reference text not null,
  text_en text not null,
  text_sw text not null,
  theme text not null default '',
  date date
);

-- memory_verses
create table if not exists memory_verses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  verse_id uuid not null references bible_verses(id),
  ease_factor real not null default 2.5 check (ease_factor >= 1.3),
  interval_days integer not null default 1,
  next_review date not null default current_date,
  repetitions integer not null default 0,
  last_reviewed date
);
create index if not exists memory_verses_user_review on memory_verses(user_id, next_review);

-- gratitude_entries
create table if not exists gratitude_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  date date not null,
  created_at timestamptz not null default now()
);
create index if not exists gratitude_entries_user_date on gratitude_entries(user_id, date);

-- spirit_scores
create table if not exists spirit_scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  week text not null, -- YYYY-WW
  verse_streak integer not null default 0,
  prayer_streak integer not null default 0,
  memory_reviews integer not null default 0,
  gratitude_entries integer not null default 0,
  score integer not null default 0 check (score >= 0 and score <= 100),
  unique(user_id, week)
);

-- goals
create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  month text not null, -- YYYY-MM
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  weekly_breakdowns jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists goals_user_month on goals(user_id, month);

-- habits
create table if not exists habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  frequency text not null default 'daily' check (frequency in ('daily','weekly')),
  module text not null check (module in ('finance','keto','spirit','goals','family','mental_health')),
  target_count integer not null default 1,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  is_morning_routine boolean not null default false,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

-- habit_logs
create table if not exists habit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  completed boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  unique(habit_id, date)
);
create index if not exists habit_logs_user_date on habit_logs(user_id, date);

-- mood_entries
create table if not exists mood_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  mood integer not null check (mood >= 1 and mood <= 5),
  stress integer not null check (stress >= 1 and stress <= 5),
  note text,
  date date not null,
  time_of_day text not null check (time_of_day in ('morning','afternoon','evening')),
  created_at timestamptz not null default now()
);
create index if not exists mood_entries_user_date on mood_entries(user_id, date);

-- sleep_entries
create table if not exists sleep_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  bedtime timestamptz not null,
  wake_time timestamptz not null,
  duration_hours real not null,
  quality integer not null check (quality >= 1 and quality <= 5),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists sleep_entries_user_date on sleep_entries(user_id, date);

-- cbt_entries
create table if not exists cbt_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  situation text not null,
  automatic_thought text not null,
  emotion text not null,
  cognitive_distortion text,
  rational_response text,
  outcome_mood integer check (outcome_mood >= 1 and outcome_mood <= 5),
  date date not null,
  created_at timestamptz not null default now()
);
create index if not exists cbt_entries_user_date on cbt_entries(user_id, date);

-- win_entries
create table if not exists win_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  description text not null,
  date date not null,
  created_at timestamptz not null default now()
);
create index if not exists win_entries_user_date on win_entries(user_id, date);

-- family_contributions
create table if not exists family_contributions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  recipient text not null,
  amount_kes integer not null check (amount_kes > 0),
  month text not null, -- YYYY-MM
  note text,
  created_at timestamptz not null default now()
);
create index if not exists family_contributions_user_month on family_contributions(user_id, month);

-- family_dates
create table if not exists family_dates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  date date not null,
  type text not null check (type in ('birthday','anniversary','school','other')),
  notes text
);

-- family_checkins
create table if not exists family_checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  person text not null,
  note text,
  checked_in_at timestamptz not null default now()
);

-- life_scores
create table if not exists life_scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  week text not null, -- YYYY-WW
  finance_score integer not null default 0 check (finance_score >= 0 and finance_score <= 100),
  keto_score integer not null default 0 check (keto_score >= 0 and keto_score <= 100),
  spirit_score integer not null default 0 check (spirit_score >= 0 and spirit_score <= 100),
  goals_score integer not null default 0 check (goals_score >= 0 and goals_score <= 100),
  mental_health_score integer not null default 0 check (mental_health_score >= 0 and mental_health_score <= 100),
  family_score integer not null default 0 check (family_score >= 0 and family_score <= 100),
  overall_score integer not null default 0 check (overall_score >= 0 and overall_score <= 100),
  trend text not null default 'stable' check (trend in ('up','down','stable')),
  created_at timestamptz not null default now(),
  unique(user_id, week)
);

-- user_levels
create table if not exists user_levels (
  user_id uuid primary key references profiles(id) on delete cascade,
  xp_total integer not null default 0,
  level integer not null default 1,
  level_name text not null default 'Mwanzo',
  xp_to_next_level integer not null default 100,
  updated_at timestamptz not null default now()
);

-- badges
create table if not exists badges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  name_sw text not null,
  description text not null,
  icon text not null,
  module text check (module in ('finance','keto','spirit','goals','family','mental_health','global'))
);

-- user_badges
create table if not exists user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  badge_id uuid not null references badges(id),
  earned_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

-- ai_cache
create table if not exists ai_cache (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  cache_key text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique(user_id, cache_key)
);
create index if not exists ai_cache_user_key on ai_cache(user_id, cache_key);

-- error_logs
create table if not exists error_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  error_type text not null,
  message text not null,
  context jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table transactions enable row level security;
alter table budget_allocations enable row level security;
alter table impulse_pauses enable row level security;
alter table savings_streaks enable row level security;
alter table food_logs enable row level security;
alter table daily_macros enable row level security;
alter table water_logs enable row level security;
alter table memory_verses enable row level security;
alter table gratitude_entries enable row level security;
alter table spirit_scores enable row level security;
alter table goals enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table mood_entries enable row level security;
alter table sleep_entries enable row level security;
alter table cbt_entries enable row level security;
alter table win_entries enable row level security;
alter table family_contributions enable row level security;
alter table family_dates enable row level security;
alter table family_checkins enable row level security;
alter table life_scores enable row level security;
alter table user_levels enable row level security;
alter table user_badges enable row level security;
alter table ai_cache enable row level security;

-- RLS policies: user can only access their own rows
create policy "users_own_data" on profiles for all using (id = auth.uid());
create policy "users_own_data" on transactions for all using (user_id = auth.uid());
create policy "users_own_data" on budget_allocations for all using (user_id = auth.uid());
create policy "users_own_data" on impulse_pauses for all using (user_id = auth.uid());
create policy "users_own_data" on savings_streaks for all using (user_id = auth.uid());
create policy "users_own_data" on food_logs for all using (user_id = auth.uid());
create policy "users_own_data" on daily_macros for all using (user_id = auth.uid());
create policy "users_own_data" on water_logs for all using (user_id = auth.uid());
create policy "users_own_data" on memory_verses for all using (user_id = auth.uid());
create policy "users_own_data" on gratitude_entries for all using (user_id = auth.uid());
create policy "users_own_data" on spirit_scores for all using (user_id = auth.uid());
create policy "users_own_data" on goals for all using (user_id = auth.uid());
create policy "users_own_data" on habits for all using (user_id = auth.uid());
create policy "users_own_data" on habit_logs for all using (user_id = auth.uid());
create policy "users_own_data" on mood_entries for all using (user_id = auth.uid());
create policy "users_own_data" on sleep_entries for all using (user_id = auth.uid());
create policy "users_own_data" on cbt_entries for all using (user_id = auth.uid());
create policy "users_own_data" on win_entries for all using (user_id = auth.uid());
create policy "users_own_data" on family_contributions for all using (user_id = auth.uid());
create policy "users_own_data" on family_dates for all using (user_id = auth.uid());
create policy "users_own_data" on family_checkins for all using (user_id = auth.uid());
create policy "users_own_data" on life_scores for all using (user_id = auth.uid());
create policy "users_own_data" on user_levels for all using (user_id = auth.uid());
create policy "users_own_data" on user_badges for all using (user_id = auth.uid());
create policy "users_own_data" on ai_cache for all using (user_id = auth.uid());

-- bible_verses is public read
alter table bible_verses enable row level security;
create policy "public_read" on bible_verses for select using (true);

-- badges is public read
alter table badges enable row level security;
create policy "public_read" on badges for select using (true);

-- error_logs: service role only (no user policy needed)
alter table error_logs enable row level security;
