-- ╔══════════════════════════════════════╗
-- ║  efuu — Supabase Database Setup     ║
-- ╚══════════════════════════════════════╝
--
-- SETUP:
--   1. Create free account at https://supabase.com
--   2. Create a new project (pick any region, note your password)
--   3. Go to SQL Editor → New Query → paste this entire file → Run
--   4. Copy your Project URL + anon key (Settings → API) into index.html
--   5. Visit your site, log in with viewer passphrase "barbu"
--   6. Switch to ADMIN tab, log in with admin passphrase "efuu"
--   7. Change both passphrases in ADMIN → SITE settings
--
-- NOTE: Auth is passphrase-based (no Supabase Auth needed).
--       All DB writes go through the anon key. Security is enforced
--       by the site's passphrase gate — RLS allows anon read/write.

-- ══════════════════════════════
--  TABLES
-- ══════════════════════════════

create table if not exists items (
  id          uuid default gen_random_uuid() primary key,
  type        text not null check (type in ('link', 'book', 'show')),
  tag         text,
  title       text not null,
  url         text,
  description text default '',
  rating      smallint check (rating is null or (rating >= 0 and rating <= 10)),
  status      text not null default 'done'
              check (status in ('done', 'reading', 'watching', 'up next', 'dropped')),
  date_added  date default current_date,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists quotes (
  id         uuid default gen_random_uuid() primary key,
  text       text not null,
  source     text default '',
  created_at timestamptz default now()
);

-- ══════════════════════════════
--  AUTO-UPDATE TIMESTAMP
-- ══════════════════════════════

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_updated_at on items;
create trigger items_updated_at
  before update on items
  for each row execute function update_updated_at();

-- ══════════════════════════════
--  ROW LEVEL SECURITY
-- ══════════════════════════════

alter table items  enable row level security;
alter table quotes enable row level security;

-- items: full access for anon (auth enforced at app level via passphrase)
create policy "Public read items"   on items for select using (true);
create policy "Anon insert items"   on items for insert with check (true);
create policy "Anon update items"   on items for update using  (true);
create policy "Anon delete items"   on items for delete using  (true);

-- quotes: full access for anon
create policy "Public read quotes"  on quotes for select using (true);
create policy "Anon insert quotes"  on quotes for insert with check (true);
create policy "Anon update quotes"  on quotes for update using  (true);
create policy "Anon delete quotes"  on quotes for delete using  (true);

-- ══════════════════════════════
--  INDEXES (for fast queries)
-- ══════════════════════════════

create index idx_items_type       on items (type);
create index idx_items_status     on items (status);
create index idx_items_date_added on items (date_added desc);
create index idx_items_tag        on items (tag);

-- ══════════════════════════════
--  SITE SETTINGS (passphrases, etc.)
-- ══════════════════════════════

create table if not exists site_settings (
  key   text primary key,
  value text not null
);

alter table site_settings enable row level security;

-- full access for anon (auth enforced at app level)
create policy "Public read settings"   on site_settings for select using (true);
create policy "Anon insert settings"   on site_settings for insert with check (true);
create policy "Anon update settings"   on site_settings for update using  (true);

-- atomic visitor counter increment (callable by anon)
create or replace function increment_visits()
returns integer as $$
declare
  current_count integer;
begin
  insert into site_settings (key, value) values ('visit_count', '1')
  on conflict (key) do update set value = (site_settings.value::integer + 1)::text;
  select value::integer into current_count from site_settings where key = 'visit_count';
  return current_count;
end;
$$ language plpgsql security definer;

-- seed data (default viewer passphrase: "barbu", admin passphrase: "efuu")
insert into site_settings (key, value) values
  ('viewer_pw_hash', 'e92a2dd9c7ea5d79789f9806cfa4c7c35a3f65496fdb938fa6d0e8c5996f3354'),
  ('admin_pw_hash',  '05340f7b77d45d8df98d8559a62d0af0af6de18f40605d1d3af1c59f480df55c'),
  ('visit_count', '0'),
  ('block_positions', '{}'),
  ('block_expanded', '{}')
on conflict (key) do nothing;

-- ══════════════════════════════
--  SEED DATA (delete or edit)
-- ══════════════════════════════

insert into items (type, tag, title, url, description, rating, status, date_added) values
  ('link', 'clip', 'sample clip — replace me', 'https://example.com', 'why you saved this', null, 'done', '2025-12-01'),
  ('book', null, 'sample book title', null, 'your review', 8, 'done', '2025-11-15'),
  ('book', null, 'currently reading this one', null, 'thoughts so far', null, 'reading', '2026-01-20'),
  ('book', null, 'on the list', null, '', null, 'up next', '2026-02-10'),
  ('show', null, 'sample show', null, 'pretty good', 9, 'done', '2025-10-05'),
  ('show', null, 'watching rn', null, '', null, 'watching', '2026-03-01'),
  ('link', 'misc', 'cool thing i found', 'https://example.com', 'worth saving', null, 'done', '2026-01-05'),
  ('link', 'clip', 'another clip placeholder', 'https://example.com', '', 7, 'done', '2025-12-20');

insert into quotes (text, source) values
  ('the future is already here — it''s just not evenly distributed', 'gibson'),
  ('we are all just prisoners here, of our own device', ''),
  ('i think therefore i am dangerous', ''),
  ('the only way to do great work is to love what you do', ''),
  ('placeholder — add your own quotes', 'you');
