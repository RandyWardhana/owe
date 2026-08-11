-- owe — shared-bill storage + "paid" sync
-- Run this in the Supabase SQL editor (or `supabase db push`). Re-runnable.
--
-- Stores, keyed by the deterministic bill id:
--   data — the encrypted bill, so short links (/s/owe-…) can resolve it
--   paid — which person indices have settled
-- No auth: anyone with the link (and therefore the id) can read/update.

create table if not exists public.bills (
  id         text primary key,
  data       text,
  paid       jsonb       not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- add `data` to tables created before short links existed
alter table public.bills add column if not exists data text;

alter table public.bills enable row level security;

-- Public access (no auth). Drop/tighten these if you later add auth.
drop policy if exists "bills public select" on public.bills;
create policy "bills public select" on public.bills
  for select using (true);

drop policy if exists "bills public insert" on public.bills;
create policy "bills public insert" on public.bills
  for insert with check (true);

drop policy if exists "bills public update" on public.bills;
create policy "bills public update" on public.bills
  for update using (true) with check (true);

-- Live updates so every viewer sees paid changes in real time.
-- (guarded so re-running the script doesn't error if it's already added)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bills'
  ) then
    alter publication supabase_realtime add table public.bills;
  end if;
end $$;

-- Per-device backup of the user's own bill history (no auth).
--   key  — sha256(deviceId); the raw device id never reaches the server
--   data — the user's history, AES-GCM encrypted with a key derived from the
--          device id, so rows are opaque and only the owning device can read them
-- The device id lives in localStorage; it is the only key to this row.
create table if not exists public.user_bills (
  key        text primary key,
  data       text        not null,
  updated_at timestamptz not null default now()
);

alter table public.user_bills enable row level security;

-- Open access by design: security comes from the un-guessable key + encryption,
-- not from SQL auth. Drop/tighten these if you later add real auth.
drop policy if exists "user_bills public select" on public.user_bills;
create policy "user_bills public select" on public.user_bills
  for select using (true);

drop policy if exists "user_bills public insert" on public.user_bills;
create policy "user_bills public insert" on public.user_bills
  for insert with check (true);

drop policy if exists "user_bills public update" on public.user_bills;
create policy "user_bills public update" on public.user_bills
  for update using (true) with check (true);

-- Per-device backup of the user's saved people ("Pak Arif" and his bank /
-- e-wallet details), so re-adding someone on a later bill brings their payment
-- info back. Same scheme as user_bills:
--   key  — sha256(deviceId), so restoring with a sync code picks these up too
--   data — the contact list, AES-GCM encrypted with a key derived from the
--          device id. Each saved account carries both the real value and its
--          masked display form; both live inside this opaque blob, so no
--          column ever holds a payment number in the clear.
create table if not exists public.user_contacts (
  key        text primary key,
  data       text        not null,
  updated_at timestamptz not null default now()
);

alter table public.user_contacts enable row level security;

-- Open access by design, as above: the un-guessable key + encryption is the
-- security boundary, not SQL auth.
drop policy if exists "user_contacts public select" on public.user_contacts;
create policy "user_contacts public select" on public.user_contacts
  for select using (true);

drop policy if exists "user_contacts public insert" on public.user_contacts;
create policy "user_contacts public insert" on public.user_contacts
  for insert with check (true);

drop policy if exists "user_contacts public update" on public.user_contacts;
create policy "user_contacts public update" on public.user_contacts
  for update using (true) with check (true);
