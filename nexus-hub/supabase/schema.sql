-- Run this in Supabase SQL Editor.
-- Creates user profiles and protects them with Row Level Security.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 24),
  role text not null default 'member' check (role in ('member', 'admin')),
  avatar_url text,
  bio text not null default '',
  status text not null default 'Available',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists status text not null default 'Available';

alter table public.profiles enable row level security;

create policy "Profiles are readable by signed-in users"
on public.profiles for select
to authenticated
using (true);

create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id and role = 'member');

create policy "Users can update their own username"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id and role = (select role from public.profiles p where p.id = auth.uid()));

-- IMPORTANT:
-- Promote your own account manually from the Supabase SQL editor after signup:
-- update public.profiles set role = 'admin' where username = 'YOUR_USERNAME';
-- Do not expose the Supabase service-role key in frontend code.
