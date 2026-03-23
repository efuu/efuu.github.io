-- ╔══════════════════════════════════════════════╗
-- ║  efuu — Migration: Supabase Auth → Passphrase ║
-- ╚══════════════════════════════════════════════╝
--
-- Run this in SQL Editor if you already have the old schema.
-- It drops the old auth-based RLS policies and replaces them
-- with anon-accessible ones, and seeds the admin passphrase.

-- ── DROP OLD POLICIES ──
drop policy if exists "Auth insert items"   on items;
drop policy if exists "Auth update items"   on items;
drop policy if exists "Auth delete items"   on items;
drop policy if exists "Auth insert quotes"  on quotes;
drop policy if exists "Auth update quotes"  on quotes;
drop policy if exists "Auth delete quotes"  on quotes;
drop policy if exists "Auth upsert settings" on site_settings;
drop policy if exists "Auth update settings" on site_settings;
drop policy if exists "Anon update counter"  on site_settings;
drop policy if exists "Anon insert counter"  on site_settings;

-- ── CREATE NEW ANON POLICIES ──
create policy "Anon insert items"   on items  for insert with check (true);
create policy "Anon update items"   on items  for update using  (true);
create policy "Anon delete items"   on items  for delete using  (true);

create policy "Anon insert quotes"  on quotes for insert with check (true);
create policy "Anon update quotes"  on quotes for update using  (true);
create policy "Anon delete quotes"  on quotes for delete using  (true);

create policy "Anon insert settings" on site_settings for insert with check (true);
create policy "Anon update settings" on site_settings for update using  (true);

-- ── SEED ADMIN PASSPHRASE (default: "efuu") ──
insert into site_settings (key, value)
values ('admin_pw_hash', 'ed227bb0d191d168545bec592e8b9c1199ef4ffa122a7395ededa0cf888dc09f')
on conflict (key) do nothing;
