-- Drivn baseline schema.
--
-- Reconstructed from the row mappers in src/lib/supabaseData.ts so the project
-- can be recreated, reviewed and migrated from source control instead of only
-- existing in the Supabase dashboard.
--
-- Written to be idempotent: every statement is safe to re-run against an
-- already-populated database. Apply with `supabase db push` (or paste into the
-- SQL editor). Verify isolation afterwards by signing in as a second account and
-- confirming it sees none of the first account's rows.

-- ---------------------------------------------------------------- extensions
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ------------------------------------------------------------------- vehicle
create table if not exists public.vehicle (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  make              text not null,
  model             text not null,
  trim              text,
  engine            text,
  power             text,
  transmission      text,
  drive             text,
  year              int,
  fuel_type         text,
  owner             text,
  purchase_date     date,
  delivery_date     date,
  current_mileage   numeric not null default 0,
  starting_mileage  numeric not null default 0,
  image_url         text,
  is_active         boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Exactly one active vehicle per user; the app assumes this when it fetches.
create unique index if not exists vehicle_one_active_per_user
  on public.vehicle (user_id) where is_active;

-- -------------------------------------------------------------- app_settings
create table if not exists public.app_settings (
  user_id                  uuid primary key references auth.users (id) on delete cascade,
  dark_mode                boolean not null default true,
  accent_color             text not null default '#5b6cff',
  maintenance_reminders    boolean not null default true,
  insurance_reminders      boolean not null default true,
  inspection_reminders     boolean not null default true,
  avatar_url               text,
  mobile_nav_items         text,
  vehicle_picker_on_launch boolean not null default true,
  fab_style                text not null default 'radial',
  ui_theme                 text not null default 'classic',
  created_at               timestamptz not null default now()
);

-- ----------------------------------------------------------- timeline_events
-- source_table / source_id let an edit or delete of the originating row cascade
-- to its timeline event, so the Timeline page can't drift from reality.
create table if not exists public.timeline_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  date          date not null,
  type          text not null,
  title         text not null,
  description   text,
  mileage       numeric,
  cost          numeric,
  image_url     text,
  source_table  text,
  source_id     uuid,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------- fuel_entries
create table if not exists public.fuel_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  date            date not null,
  liters          numeric not null,
  price_per_liter numeric not null,
  total_cost      numeric not null,
  mileage         numeric not null,
  consumption     numeric,
  station         text,
  full_tank       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------ maintenance_entries
create table if not exists public.maintenance_entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  date               date not null,
  type               text not null,
  mileage            numeric not null,
  cost               numeric not null default 0,
  garage             text,
  notes              text,
  next_interval_km   numeric,
  next_interval_date date,
  created_at         timestamptz not null default now()
);

-- ----------------------------------------------------------- modifications
create table if not exists public.modifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  category       text not null,
  date_installed date not null,
  price          numeric not null default 0,
  brand          text,
  notes          text,
  image_url      text,
  created_at     timestamptz not null default now()
);

-- -------------------------------------------------------------------- trips
create table if not exists public.trips (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  start_location   text,
  destination      text,
  date             date not null,
  distance_km      numeric not null default 0,
  duration_minutes numeric not null default 0,
  consumption      numeric,
  fuel_cost        numeric,
  notes            text,
  route            jsonb,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------- documents
-- file_data is the legacy base64 column; storage_path supersedes it once media
-- has been migrated to Supabase Storage. Both are kept so old rows still render.
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  category        text not null,
  date            date not null,
  expiration_date date,
  status          text not null default 'valid',
  file_data       text,
  storage_path    text,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------------- photos
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  url          text,
  date         date not null,
  location     text,
  description  text,
  file_data    text,
  storage_path text,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------- expenses
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  category    text not null,
  description text,
  cost        numeric not null default 0,
  created_at  timestamptz not null default now()
);

-- ------------------------------------- bring pre-existing projects up to date
alter table public.documents       add column if not exists storage_path text;
alter table public.photos          add column if not exists storage_path text;
alter table public.timeline_events add column if not exists source_table text;
alter table public.timeline_events add column if not exists source_id    uuid;

-- ------------------------------------------------------------------- indexes
-- Every read filters on user_id, and the list screens also sort by date.
create index if not exists timeline_events_user_date_idx     on public.timeline_events (user_id, date desc);
create index if not exists timeline_events_source_idx        on public.timeline_events (source_table, source_id);
create index if not exists fuel_entries_user_date_idx        on public.fuel_entries (user_id, date desc);
create index if not exists maintenance_entries_user_date_idx on public.maintenance_entries (user_id, date desc);
create index if not exists modifications_user_date_idx       on public.modifications (user_id, date_installed desc);
create index if not exists trips_user_date_idx               on public.trips (user_id, date desc);
create index if not exists documents_user_date_idx           on public.documents (user_id, date desc);
create index if not exists photos_user_date_idx              on public.photos (user_id, date desc);
create index if not exists expenses_user_date_idx            on public.expenses (user_id, date desc);
create index if not exists vehicle_user_idx                  on public.vehicle (user_id);

-- ----------------------------------------------------------------------- RLS
-- The anon key ships in the client bundle, so these policies are the only thing
-- separating accounts. Applied to every table, for every operation.
alter table public.vehicle            enable row level security;
alter table public.app_settings       enable row level security;
alter table public.timeline_events    enable row level security;
alter table public.fuel_entries       enable row level security;
alter table public.maintenance_entries enable row level security;
alter table public.modifications      enable row level security;
alter table public.trips              enable row level security;
alter table public.documents          enable row level security;
alter table public.photos             enable row level security;
alter table public.expenses           enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'vehicle', 'app_settings', 'timeline_events', 'fuel_entries',
    'maintenance_entries', 'modifications', 'trips', 'documents', 'photos',
    'expenses'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)',
      t || '_delete_own', t);
  end loop;
end $$;

-- ------------------------------------------------------------ storage bucket
-- Private bucket for photos and documents. Objects live at {userId}/{uuid}.{ext},
-- so ownership is enforced by the first path segment.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

drop policy if exists "media_select_own" on storage.objects;
drop policy if exists "media_insert_own" on storage.objects;
drop policy if exists "media_update_own" on storage.objects;
drop policy if exists "media_delete_own" on storage.objects;

create policy "media_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
