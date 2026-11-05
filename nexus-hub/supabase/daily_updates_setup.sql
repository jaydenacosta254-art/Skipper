-- NEXUS daily Admin activity and Updates-tab summaries.
-- Run this once in Supabase SQL Editor.

create table if not exists public.nexus_admin_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null default 'NEXUS Admin',
  activity_date date not null,
  title text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists nexus_admin_activity_user_date_idx
  on public.nexus_admin_activity(user_id, activity_date, created_at);

alter table public.nexus_admin_activity enable row level security;

drop policy if exists "Admins read their own daily activity" on public.nexus_admin_activity;
create policy "Admins read their own daily activity"
  on public.nexus_admin_activity for select to authenticated
  using (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "Admins log their own daily activity" on public.nexus_admin_activity;
create policy "Admins log their own daily activity"
  on public.nexus_admin_activity for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create table if not exists public.nexus_daily_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null default 'NEXUS Admin',
  activity_date date not null,
  summary text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

create index if not exists nexus_daily_updates_date_idx
  on public.nexus_daily_updates(activity_date desc);

alter table public.nexus_daily_updates enable row level security;

drop policy if exists "Anyone can read published NEXUS daily updates" on public.nexus_daily_updates;
create policy "Anyone can read published NEXUS daily updates"
  on public.nexus_daily_updates for select to anon, authenticated
  using (true);

drop policy if exists "Admins publish their own NEXUS daily updates" on public.nexus_daily_updates;
create policy "Admins publish their own NEXUS daily updates"
  on public.nexus_daily_updates for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "Admins update their own NEXUS daily updates" on public.nexus_daily_updates;
create policy "Admins update their own NEXUS daily updates"
  on public.nexus_daily_updates for update to authenticated
  using (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Enable live refresh in the Updates tab when the Supabase Realtime publication exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'nexus_daily_updates'
     ) then
    execute 'alter publication supabase_realtime add table public.nexus_daily_updates';
  end if;
end $$;
