-- ============================================================
-- WORSHIP APP — Supabase Schema
-- Jalankan file ini di Supabase SQL Editor
-- ============================================================

-- Tabel lagu
create table songs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  default_key text default 'C',
  song_type text check (song_type in ('Hymn','Worship','SP')),
  genre text,
  tempo text,
  notes text,
  sections jsonb default '{}',
  -- sections format:
  -- { "Intro": ["4","3m","6m","2m","5","1"], "Verse": [...], "Reff": [...] }
  -- tokens: "4M#/5" = 4 major sharp slash 5, "\n" = line break
  lyrics text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabel ibadah (service)
create table services (
  id uuid default gen_random_uuid() primary key,
  service_date date not null,
  service_type text not null check (service_type in ('Subuh','Minggu Pagi','Minggu Siang','Rabu')),
  theme text,
  created_at timestamptz default now()
);

-- Tabel setlist (relasi service ↔ song)
create table setlist_items (
  id uuid default gen_random_uuid() primary key,
  service_id uuid references services(id) on delete cascade,
  song_id uuid references songs(id) on delete cascade,
  position integer not null,
  key_used text,
  note text
);

-- Auto-update updated_at pada songs
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger songs_updated_at
  before update on songs
  for each row execute function update_updated_at();

-- Index untuk pencarian judul
create index songs_title_idx on songs using gin (to_tsvector('simple', title));

-- RLS (Row Level Security) — public read, authenticated write
alter table songs enable row level security;
alter table services enable row level security;
alter table setlist_items enable row level security;

-- Siapapun bisa baca (worship team tidak perlu login untuk lihat chord)
create policy "public read songs" on songs for select using (true);
create policy "public read services" on services for select using (true);
create policy "public read setlist" on setlist_items for select using (true);

-- Hanya authenticated user yang bisa tulis
create policy "auth write songs" on songs for all using (auth.role() = 'authenticated');
create policy "auth write services" on services for all using (auth.role() = 'authenticated');
create policy "auth write setlist" on setlist_items for all using (auth.role() = 'authenticated');

-- ============================================================
-- MIGRATION — run this if upgrading from previous schema
-- ============================================================
-- alter table songs add column if not exists song_type text check (song_type in ('Hymn','Worship','SP'));
-- alter table songs add column if not exists genre text;
-- alter table songs add column if not exists tempo text;
-- alter table songs drop column if exists feel;
