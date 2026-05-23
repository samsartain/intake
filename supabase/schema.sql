-- ============================================================================
-- INTAKE DATABASE SCHEMA
-- Paste this into Supabase SQL Editor and click Run
-- ============================================================================

-- Settings: one row per user
create table settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  age int,
  sex text,
  height_in int,
  weight numeric,
  activity text,
  goal text,
  protein_per_kg numeric,
  bmr int,
  tdee int,
  calorie_target int,
  protein_target int,
  carb_target int,
  fat_target int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Food entries
create table food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  meal text not null,
  name text not null,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  created_at timestamptz default now()
);

create index food_entries_user_date_idx on food_entries(user_id, log_date);

-- Daily weight
create table weight_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  weight numeric not null,
  created_at timestamptz default now(),
  primary key (user_id, log_date)
);

-- Workouts
create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  type text,
  duration_minutes int,
  calories numeric,
  avg_hr int,
  max_hr int,
  notes text,
  created_at timestamptz default now()
);

create index workouts_user_date_idx on workouts(user_id, log_date);

-- Row Level Security: users can only see/edit their own data
alter table settings enable row level security;
alter table food_entries enable row level security;
alter table weight_logs enable row level security;
alter table workouts enable row level security;

create policy "users manage own settings" on settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own food" on food_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own weight" on weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own workouts" on workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-update updated_at on settings
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger settings_updated_at
  before update on settings
  for each row execute function update_updated_at();
