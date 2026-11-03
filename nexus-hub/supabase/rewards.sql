-- NEXUS rewards, XP leaderboard, and community activity
create table if not exists public.nexus_player_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  games_played integer not null default 0 check (games_played >= 0),
  daily_claim_date date,
  selected_theme text not null default 'violet' check (selected_theme in ('violet','ocean','ember','emerald')),
  updated_at timestamptz not null default now()
);

alter table public.nexus_player_stats enable row level security;
drop policy if exists "Anyone can view NEXUS player rankings" on public.nexus_player_stats;
create policy "Anyone can view NEXUS player rankings"
on public.nexus_player_stats for select to anon, authenticated using (true);
drop policy if exists "Players can insert their own NEXUS stats" on public.nexus_player_stats;
create policy "Players can insert their own NEXUS stats"
on public.nexus_player_stats for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Players can update their own NEXUS stats" on public.nexus_player_stats;
create policy "Players can update their own NEXUS stats"
on public.nexus_player_stats for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.nexus_game_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  activity_type text not null check (activity_type in ('played','challenge')),
  detail text not null,
  created_at timestamptz not null default now()
);

alter table public.nexus_game_activity enable row level security;
drop policy if exists "Anyone can view NEXUS community activity" on public.nexus_game_activity;
create policy "Anyone can view NEXUS community activity"
on public.nexus_game_activity for select to anon, authenticated using (true);
drop policy if exists "Players can add their own NEXUS activity" on public.nexus_game_activity;
create policy "Players can add their own NEXUS activity"
on public.nexus_game_activity for insert to authenticated with check (auth.uid() = user_id);

create index if not exists nexus_player_stats_xp_idx on public.nexus_player_stats (xp desc);
create index if not exists nexus_game_activity_created_at_idx on public.nexus_game_activity (created_at desc);
