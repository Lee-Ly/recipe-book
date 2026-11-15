-- Recipe Book: database and photo storage for Supabase.
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run. It is safe to run twice.

-- One row per recipe. The recipe itself is stored as JSON; the share token has its own column so a share link can be looked up fast.
create table if not exists public.recipes (
  id uuid primary key,
  share_token text unique,
  created_at timestamptz not null default now(),
  data jsonb not null
);

-- Small settings, such as the list of categories and tags.
create table if not exists public.site_settings (
  key text primary key,
  data jsonb not null
);

-- Lock the tables: with row level security on and no policies, nobody on the internet can read or write them.
-- Only the website's server, using the secret key, can.
alter table public.recipes enable row level security;
alter table public.site_settings enable row level security;

-- A private folder for recipe photos (the website serves them to you, or through a share link).
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', false)
on conflict (id) do nothing;
