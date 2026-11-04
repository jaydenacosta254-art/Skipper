-- Ensure the upgrade center's shared event and favorite data exists even
-- when the older expansion migration has not been applied yet.
create table if not exists public.nexus_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  event_date timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.nexus_events enable row level security;
drop policy if exists "Community can read events" on public.nexus_events;
create policy "Community can read events" on public.nexus_events
  for select to anon, authenticated using (true);
drop policy if exists "Admins create events" on public.nexus_events;
create policy "Admins create events" on public.nexus_events
  for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

create table if not exists public.nexus_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_name)
);
alter table public.nexus_favorites enable row level security;
drop policy if exists "Users read their own favorites" on public.nexus_favorites;
create policy "Users read their own favorites" on public.nexus_favorites
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users add their own favorites" on public.nexus_favorites;
create policy "Users add their own favorites" on public.nexus_favorites
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users remove their own favorites" on public.nexus_favorites;
create policy "Users remove their own favorites" on public.nexus_favorites
  for delete to authenticated using (auth.uid() = user_id);

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


-- Expanded event management and member profile customization.
alter table public.nexus_events
  add column if not exists event_type text not null default 'seasonal'
    check (event_type in ('current', 'seasonal')),
  add column if not exists end_date timestamptz;

create index if not exists nexus_events_type_date_idx
  on public.nexus_events(event_type, event_date);

drop policy if exists "Admins update events" on public.nexus_events;
create policy "Admins update events" on public.nexus_events
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins delete events" on public.nexus_events;
create policy "Admins delete events" on public.nexus_events
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

alter table public.profiles
  add column if not exists profile_attributes text[] not null default '{}',
  add column if not exists profile_background text not null default 'violet';
