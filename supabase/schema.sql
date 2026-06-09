-- owe — shared-bill "paid" sync
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Stores only the deterministic bill id and which person indices have paid.
-- The bill contents never leave the device — they live in the share URL.
-- No auth: anyone with the link (and therefore the id) can read/update.

create table if not exists public.bills (
  id         text primary key,
  paid       jsonb       not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

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
alter publication supabase_realtime add table public.bills;
