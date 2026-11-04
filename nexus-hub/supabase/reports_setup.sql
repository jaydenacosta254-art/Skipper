-- Run this once in Supabase SQL Editor to enable game/member/bug reporting.
-- Safe to re-run: tables and policies are created idempotently.

create table if not exists public.nexus_user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reported_username text not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);
alter table public.nexus_user_reports enable row level security;
drop policy if exists "Members create member reports" on public.nexus_user_reports;
create policy "Members create member reports"
on public.nexus_user_reports for insert to authenticated
with check (auth.uid() = reporter_id and reporter_id <> reported_user_id);
drop policy if exists "Reporters and admins read member reports" on public.nexus_user_reports;
create policy "Reporters and admins read member reports"
on public.nexus_user_reports for select to authenticated
using (auth.uid() = reporter_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "Admins update member reports" on public.nexus_user_reports;
create policy "Admins update member reports"
on public.nexus_user_reports for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create table if not exists public.nexus_bug_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  title text not null check (char_length(title) between 3 and 100),
  description text not null check (char_length(description) between 8 and 2000),
  page text not null default 'unknown',
  severity text not null default 'normal' check (severity in ('minor','normal','major')),
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now()
);
alter table public.nexus_bug_reports enable row level security;
drop policy if exists "Members submit bug reports" on public.nexus_bug_reports;
create policy "Members submit bug reports"
on public.nexus_bug_reports for insert to authenticated
with check (auth.uid() = reporter_id);
drop policy if exists "Admins read bug reports" on public.nexus_bug_reports;
create policy "Admins read bug reports"
on public.nexus_bug_reports for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "Admins update bug reports" on public.nexus_bug_reports;
create policy "Admins update bug reports"
on public.nexus_bug_reports for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
