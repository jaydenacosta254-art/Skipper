-- NEXUS event board repair
-- Safe to run more than once in the Supabase SQL Editor.

create table if not exists public.nexus_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  event_date timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.nexus_events
  add column if not exists event_type text not null default 'seasonal'
    check (event_type in ('current', 'seasonal')),
  add column if not exists end_date timestamptz;

alter table public.nexus_events enable row level security;

drop policy if exists "Community can read events" on public.nexus_events;
create policy "Community can read events"
  on public.nexus_events for select to anon, authenticated
  using (true);

drop policy if exists "Admins create events" on public.nexus_events;
create policy "Admins create events"
  on public.nexus_events for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins update events" on public.nexus_events;
create policy "Admins update events"
  on public.nexus_events for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins delete events" on public.nexus_events;
create policy "Admins delete events"
  on public.nexus_events for delete to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

grant select on public.nexus_events to anon, authenticated;
grant insert, update, delete on public.nexus_events to authenticated;

create index if not exists nexus_events_type_date_idx
  on public.nexus_events(event_type, event_date);

notify pgrst, 'reload schema';
