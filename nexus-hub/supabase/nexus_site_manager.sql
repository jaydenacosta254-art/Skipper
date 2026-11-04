-- NEXUS softcoded site content. Safe to run more than once.
create table if not exists public.nexus_site_config (
  id text primary key check (id = 'main'),
  games jsonb not null default '[]'::jsonb,
  announcements jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{"allowGameSubmissions":true,"showOnlineStats":true}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.nexus_site_config enable row level security;
drop policy if exists "Anyone can read NEXUS site config" on public.nexus_site_config;
create policy "Anyone can read NEXUS site config" on public.nexus_site_config
  for select to anon, authenticated using (true);
drop policy if exists "Admins manage NEXUS site config" on public.nexus_site_config;
create policy "Admins manage NEXUS site config" on public.nexus_site_config
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
grant select on public.nexus_site_config to anon, authenticated;
grant insert, update, delete on public.nexus_site_config to authenticated;
notify pgrst, 'reload schema';
