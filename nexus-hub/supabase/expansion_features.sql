-- NEXUS expansion features. Run once in Supabase SQL Editor.
create table if not exists public.nexus_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_name text not null,
  created_at timestamptz not null default now(),
  primary key(user_id, game_name)
);
alter table public.nexus_favorites enable row level security;
drop policy if exists "Users read their own favorites" on public.nexus_favorites;
create policy "Users read their own favorites" on public.nexus_favorites for select to authenticated using(auth.uid()=user_id);
drop policy if exists "Users add their own favorites" on public.nexus_favorites;
create policy "Users add their own favorites" on public.nexus_favorites for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Users remove their own favorites" on public.nexus_favorites;
create policy "Users remove their own favorites" on public.nexus_favorites for delete to authenticated using(auth.uid()=user_id);

create table if not exists public.nexus_forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  title text not null check(char_length(title) between 1 and 90),
  body text not null check(char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.nexus_forum_posts enable row level security;
drop policy if exists "Community can read forum posts" on public.nexus_forum_posts;
create policy "Community can read forum posts" on public.nexus_forum_posts for select to anon, authenticated using(true);
drop policy if exists "Users create their own forum posts" on public.nexus_forum_posts;
create policy "Users create their own forum posts" on public.nexus_forum_posts for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Authors delete their forum posts" on public.nexus_forum_posts;
create policy "Authors delete their forum posts" on public.nexus_forum_posts for delete to authenticated using(auth.uid()=user_id);

create table if not exists public.nexus_polls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  question text not null check(char_length(question) between 1 and 180),
  options jsonb not null default '[]'::jsonb,
  votes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.nexus_polls enable row level security;
drop policy if exists "Community can read polls" on public.nexus_polls;
create policy "Community can read polls" on public.nexus_polls for select to anon, authenticated using(true);
drop policy if exists "Signed in users create polls" on public.nexus_polls;
create policy "Signed in users create polls" on public.nexus_polls for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Signed in users can vote in polls" on public.nexus_polls;
create policy "Signed in users can vote in polls" on public.nexus_polls for update to authenticated using(true) with check(true);

create table if not exists public.nexus_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(title) between 1 and 100),
  event_date timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.nexus_events enable row level security;
drop policy if exists "Community can read events" on public.nexus_events;
create policy "Community can read events" on public.nexus_events for select to anon, authenticated using(true);
drop policy if exists "Admins create events" on public.nexus_events;
create policy "Admins create events" on public.nexus_events for insert to authenticated with check(auth.uid()=user_id and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create table if not exists public.nexus_tournaments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  title text not null check(char_length(title) between 2 and 80),
  game_name text not null default 'Community tournament',
  status text not null default 'Open' check(status in ('Open','In progress','Completed')),
  created_at timestamptz not null default now()
);
alter table public.nexus_tournaments enable row level security;
drop policy if exists "Community can read tournaments" on public.nexus_tournaments;
create policy "Community can read tournaments" on public.nexus_tournaments for select to anon, authenticated using(true);
drop policy if exists "Signed in users create tournaments" on public.nexus_tournaments;
create policy "Signed in users create tournaments" on public.nexus_tournaments for insert to authenticated with check(auth.uid()=user_id);

create table if not exists public.nexus_game_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  game_name text not null,
  rating integer not null check(rating between 1 and 5),
  body text not null default '' check(char_length(body) <= 500),
  created_at timestamptz not null default now(),
  unique(user_id, game_name)
);
alter table public.nexus_game_reviews enable row level security;
drop policy if exists "Community can read game reviews" on public.nexus_game_reviews;
create policy "Community can read game reviews" on public.nexus_game_reviews for select to anon, authenticated using(true);
drop policy if exists "Users create their own reviews" on public.nexus_game_reviews;
create policy "Users create their own reviews" on public.nexus_game_reviews for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Users update their own reviews" on public.nexus_game_reviews;
create policy "Users update their own reviews" on public.nexus_game_reviews for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
