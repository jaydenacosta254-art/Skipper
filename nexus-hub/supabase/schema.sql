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


-- Public profile image uploads (max 5 MB; users can upload only to their own folder).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile images are publicly viewable" on storage.objects;
create policy "Profile images are publicly viewable"
on storage.objects for select
using (bucket_id = 'profile-avatars');

drop policy if exists "Users upload their own profile images" on storage.objects;
create policy "Users upload their own profile images"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update their own profile images" on storage.objects;
create policy "Users update their own profile images"
on storage.objects for update to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- Nexus social features
create table if not exists public.friend_requests (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 receiver_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 unique(sender_id,receiver_id), check(sender_id <> receiver_id)
);
alter table public.friend_requests enable row level security;
drop policy if exists "Users view their friend requests" on public.friend_requests;
create policy "Users view their friend requests" on public.friend_requests for select to authenticated using(auth.uid()=sender_id or auth.uid()=receiver_id);
drop policy if exists "Users send friend requests" on public.friend_requests;
create policy "Users send friend requests" on public.friend_requests for insert to authenticated with check(auth.uid()=sender_id);
drop policy if exists "Recipients respond to friend requests" on public.friend_requests;
create policy "Recipients respond to friend requests" on public.friend_requests for update to authenticated using(auth.uid()=receiver_id) with check(auth.uid()=receiver_id);

create table if not exists public.direct_messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 receiver_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 2000),
 created_at timestamptz not null default now()
);
alter table public.direct_messages enable row level security;
drop policy if exists "Participants read direct messages" on public.direct_messages;
create policy "Participants read direct messages" on public.direct_messages for select to authenticated using(auth.uid()=sender_id or auth.uid()=receiver_id);
drop policy if exists "Users send direct messages" on public.direct_messages;
create policy "Users send direct messages" on public.direct_messages for insert to authenticated with check(auth.uid()=sender_id);

create table if not exists public.nexus_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 kind text not null, body text not null, read boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.nexus_notifications enable row level security;
drop policy if exists "Users manage their notifications" on public.nexus_notifications;
create policy "Users manage their notifications" on public.nexus_notifications for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

create table if not exists public.chat_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade,
 message_id text not null, channel text not null, reported_username text not null,
 message_text text not null, reason text not null,
 status text not null default 'open' check(status in ('open','reviewed','dismissed')),
 created_at timestamptz not null default now()
);
alter table public.chat_reports enable row level security;
drop policy if exists "Users submit reports" on public.chat_reports;
create policy "Users submit reports" on public.chat_reports for insert to authenticated with check(auth.uid()=reporter_id);
drop policy if exists "Reporters and admins view reports" on public.chat_reports;
create policy "Reporters and admins view reports" on public.chat_reports for select to authenticated using(auth.uid()=reporter_id or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists "Admins update reports" on public.chat_reports;
create policy "Admins update reports" on public.chat_reports for update to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('chat-uploads','chat-uploads',true,10485760,array['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Chat uploads are publicly viewable" on storage.objects;
create policy "Chat uploads are publicly viewable" on storage.objects for select using(bucket_id='chat-uploads');
drop policy if exists "Users upload chat attachments" on storage.objects;
create policy "Users upload chat attachments" on storage.objects for insert to authenticated with check(bucket_id='chat-uploads' and (storage.foldername(name))[1]=auth.uid()::text);
