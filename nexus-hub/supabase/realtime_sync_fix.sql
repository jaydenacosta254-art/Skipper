-- NEXUS live Admin/site settings sync
-- Run this once in Supabase SQL Editor to enable Realtime notifications
-- for the shared site configuration row.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'nexus_site_config'
     ) then
    execute 'alter publication supabase_realtime add table public.nexus_site_config';
  end if;
end $$;
