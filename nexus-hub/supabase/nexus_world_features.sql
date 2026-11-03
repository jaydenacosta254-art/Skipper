-- NEXUS World: database support for the 15-feature expansion.
-- Safe to run more than once in the Supabase SQL Editor.

create table if not exists public.nexus_game_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  unique(user_id, name)
);
alter table public.nexus_game_collections enable row level security;
drop policy if exists "Owners manage game collections" on public.nexus_game_collections;
create policy "Owners manage game collections" on public.nexus_game_collections
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.nexus_game_collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null references public.nexus_game_collections(id) on delete cascade,
  game_name text not null,
  created_at timestamptz not null default now(),
  unique(collection_id, game_name)
);
alter table public.nexus_game_collection_items enable row level security;
drop policy if exists "Owners manage collection items" on public.nexus_game_collection_items;
create policy "Owners manage collection items" on public.nexus_game_collection_items
for all to authenticated using (
  auth.uid() = user_id and exists (
    select 1 from public.nexus_game_collections c
    where c.id = collection_id and c.user_id = auth.uid()
  )
) with check (
  auth.uid() = user_id and exists (
    select 1 from public.nexus_game_collections c
    where c.id = collection_id and c.user_id = auth.uid()
  )
);

create table if not exists public.nexus_game_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  game_name text not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now()
);
alter table public.nexus_game_reports enable row level security;
drop policy if exists "Members submit game reports" on public.nexus_game_reports;
create policy "Members submit game reports" on public.nexus_game_reports
for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists "Reporters and admins read game reports" on public.nexus_game_reports;
create policy "Reporters and admins read game reports" on public.nexus_game_reports
for select to authenticated using (
  auth.uid() = reporter_id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);
drop policy if exists "Admins update game reports" on public.nexus_game_reports;
create policy "Admins update game reports" on public.nexus_game_reports
for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create table if not exists public.nexus_game_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  name text not null check (char_length(name) between 2 and 60),
  url text,
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending','reviewed','rejected')),
  created_at timestamptz not null default now()
);
alter table public.nexus_game_suggestions enable row level security;
drop policy if exists "Members submit game suggestions" on public.nexus_game_suggestions;
create policy "Members submit game suggestions" on public.nexus_game_suggestions
for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Authors and admins read game suggestions" on public.nexus_game_suggestions;
create policy "Authors and admins read game suggestions" on public.nexus_game_suggestions
for select to authenticated using (
  auth.uid() = user_id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);
drop policy if exists "Admins update game suggestions" on public.nexus_game_suggestions;
create policy "Admins update game suggestions" on public.nexus_game_suggestions
for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create table if not exists public.nexus_profile_showcase (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  featured_games text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.nexus_profile_showcase enable row level security;
drop policy if exists "Members read player showcases" on public.nexus_profile_showcase;
create policy "Members read player showcases" on public.nexus_profile_showcase
for select to authenticated using (true);
drop policy if exists "Players manage their showcase" on public.nexus_profile_showcase;
create policy "Players manage their showcase" on public.nexus_profile_showcase
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.nexus_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  description text not null default '',
  created_at timestamptz not null default now()
);
alter table public.nexus_groups enable row level security;
drop policy if exists "Members can discover groups" on public.nexus_groups;
create policy "Members can discover groups" on public.nexus_groups
for select to authenticated using (true);
drop policy if exists "Members create their own groups" on public.nexus_groups;
create policy "Members create their own groups" on public.nexus_groups
for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Owners update their groups" on public.nexus_groups;
create policy "Owners update their groups" on public.nexus_groups
for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Owners delete their groups" on public.nexus_groups;
create policy "Owners delete their groups" on public.nexus_groups
for delete to authenticated using (auth.uid() = owner_id);

create table if not exists public.nexus_group_members (
  group_id uuid not null references public.nexus_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','owner')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.nexus_group_members enable row level security;
drop policy if exists "Members can view group rosters" on public.nexus_group_members;
create policy "Members can view group rosters" on public.nexus_group_members
for select to authenticated using (true);
drop policy if exists "Players join groups as themselves" on public.nexus_group_members;
create policy "Players join groups as themselves" on public.nexus_group_members
for insert to authenticated with check (
  auth.uid() = user_id and (
    role = 'member' or exists (
      select 1 from public.nexus_groups g where g.id = nexus_group_messages.group_id and g.owner_id = auth.uid()
    )
  )
);
drop policy if exists "Players or owners remove group members" on public.nexus_group_members;
create policy "Players or owners remove group members" on public.nexus_group_members
for delete to authenticated using (
  auth.uid() = user_id or exists (
    select 1 from public.nexus_groups g where g.id = nexus_group_messages.group_id and g.owner_id = auth.uid()
  )
);

create table if not exists public.nexus_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.nexus_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  body text not null check (char_length(body) between 1 and 800),
  created_at timestamptz not null default now()
);
alter table public.nexus_group_messages enable row level security;
drop policy if exists "Group members read group messages" on public.nexus_group_messages;
create policy "Group members read group messages" on public.nexus_group_messages
for select to authenticated using (
  exists (select 1 from public.nexus_group_members m where m.group_id = nexus_group_messages.group_id and m.user_id = auth.uid())
  or exists (select 1 from public.nexus_groups g where g.id = nexus_group_messages.group_id and g.owner_id = auth.uid())
);
drop policy if exists "Group members send group messages" on public.nexus_group_messages;
create policy "Group members send group messages" on public.nexus_group_messages
for insert to authenticated with check (
  auth.uid() = user_id and (
    exists (select 1 from public.nexus_group_members m where m.group_id = nexus_group_messages.group_id and m.user_id = auth.uid())
    or exists (select 1 from public.nexus_groups g where g.id = nexus_group_messages.group_id and g.owner_id = auth.uid())
  )
);

create table if not exists public.nexus_news_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 90),
  body text not null check (char_length(body) between 1 and 1200),
  published_at timestamptz not null default now()
);
alter table public.nexus_news_posts enable row level security;
drop policy if exists "Everyone can read NEXUS news" on public.nexus_news_posts;
create policy "Everyone can read NEXUS news" on public.nexus_news_posts
for select to anon, authenticated using (true);
drop policy if exists "Admins publish NEXUS news" on public.nexus_news_posts;
create policy "Admins publish NEXUS news" on public.nexus_news_posts
for insert to authenticated with check (
  auth.uid() = author_id and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

create index if not exists nexus_group_messages_group_time_idx
  on public.nexus_group_messages(group_id, created_at);
create index if not exists nexus_news_posts_published_idx
  on public.nexus_news_posts(published_at desc);
