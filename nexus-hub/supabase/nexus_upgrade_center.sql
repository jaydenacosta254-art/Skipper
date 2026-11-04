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
