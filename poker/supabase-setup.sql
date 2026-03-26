-- ╔══════════════════════════════════════╗
-- ║  Poker Dashboard — Supabase Setup  ║
-- ╚══════════════════════════════════════╝
--
-- Run this in your Supabase SQL Editor (same project as efuu site).
-- This creates the poker_sessions table and a passphrase in site_settings.

-- ══════════════════════════════
--  POKER SESSIONS TABLE
-- ══════════════════════════════

create table if not exists poker_sessions (
  id          uuid default gen_random_uuid() primary key,
  game_name   text not null default 'Unnamed Game',
  start_time  timestamptz not null,
  end_time    timestamptz,
  duration_ms bigint,
  buyin       numeric(10,2) not null,
  cashout     numeric(10,2),
  profit      numeric(10,2),
  addons      jsonb default '[]'::jsonb,
  notes       text default '',
  created_at  timestamptz default now()
);

-- ══════════════════════════════
--  ROW LEVEL SECURITY
-- ══════════════════════════════

alter table poker_sessions enable row level security;

-- Open access for anon (auth enforced at app level via passphrase)
create policy "Public read poker_sessions"  on poker_sessions for select using (true);
create policy "Anon insert poker_sessions"  on poker_sessions for insert with check (true);
create policy "Anon update poker_sessions"  on poker_sessions for update using (true);
create policy "Anon delete poker_sessions"  on poker_sessions for delete using (true);

-- ══════════════════════════════
--  INDEXES
-- ══════════════════════════════

create index idx_poker_start_time on poker_sessions (start_time desc);

-- ══════════════════════════════
--  PASSPHRASE (default: "sixseven")
-- ══════════════════════════════
-- Change this via the dashboard settings or update directly.

insert into site_settings (key, value) values
  ('poker_pw_hash', 'ed227bb0d191d168545bec592e8b9c1199ef4ffa122a7395ededa0cf888dc09f')
on conflict (key) do nothing;

-- NOTE: The actual hash will be set on first login via the dashboard.
-- Default passphrase is "sixseven" — you can change it after logging in.
