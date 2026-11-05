-- NEXUS persistent chat and server-authorized message ownership.
-- Run this once in Supabase SQL Editor.
--
-- The NEXUS Render server uses SUPABASE_SERVICE_ROLE_KEY to read/write this table.
-- Never put that key in GitHub Pages, Vite variables, or browser code.

create table if not exists public.nexus_chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (char_length(channel) between 1 and 40),
  user_id uuid references auth.users(id) on delete cascade,
  guest_id uuid,
  username text not null check (char_length(username) between 1 and 24),
  body text not null default '' check (char_length(body) <= 1000),
  attachment jsonb,
  reply_to jsonb,
  reactions jsonb not null default '{}'::jsonb,
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  constraint nexus_chat_message_owner_check
    check (
      (user_id is not null and guest_id is null)
      or (user_id is null and guest_id is not null)
    ),
  constraint nexus_chat_message_content_check
    check (char_length(body) > 0 or attachment is not null)
);

create index if not exists nexus_chat_messages_channel_created_idx
  on public.nexus_chat_messages(channel, created_at desc);

create index if not exists nexus_chat_messages_user_created_idx
  on public.nexus_chat_messages(user_id, created_at desc)
  where user_id is not null;

alter table public.nexus_chat_messages enable row level security;

-- Only the private NEXUS server key may access this table. Clients must use
-- Socket.IO events, where the server verifies the account and message owner.
revoke all on table public.nexus_chat_messages from anon, authenticated;
grant select, insert, update, delete on table public.nexus_chat_messages to service_role;

notify pgrst, 'reload schema';
