-- NEXUS upgrade center support. Safe to run more than once.
-- The existing app already provides reviews, notifications, private lobbies,
-- events, cosmetics, and admin moderation. This migration adds durable
-- achievement showcase selections for signed-in members.
create table if not exists public.nexus_achievement_showcase (
  user_id uuid primary key references auth.users(id) on delete cascade,
  achievement_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.nexus_achievement_showcase enable row level security;
drop policy if exists "Members can view achievement showcases" on public.nexus_achievement_showcase;
create policy "Members can view achievement showcases"
  on public.nexus_achievement_showcase for select to authenticated using (true);
drop policy if exists "Players manage their achievement showcase" on public.nexus_achievement_showcase;
create policy "Players manage their achievement showcase"
  on public.nexus_achievement_showcase for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists nexus_events_date_idx on public.nexus_events(event_date);

create table if not exists public.nexus_daily_quest_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_date date not null default current_date,
  quest_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, quest_date)
);
alter table public.nexus_daily_quest_progress enable row level security;
drop policy if exists "Players manage their daily quest progress" on public.nexus_daily_quest_progress;
create policy "Players manage their daily quest progress"
  on public.nexus_daily_quest_progress for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.nexus_cosmetic_inventory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  owned_ids text[] not null default '{}',
  equipped jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.nexus_cosmetic_inventory enable row level security;
drop policy if exists "Players manage their cosmetic inventory" on public.nexus_cosmetic_inventory;
create policy "Players manage their cosmetic inventory"
  on public.nexus_cosmetic_inventory for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
