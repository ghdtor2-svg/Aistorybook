-- Shared online storage foundation. Enable RLS before exposing tables to clients.
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{"version":1,"tasks":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create table if not exists public.story_records (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  status text not null check (status in ('running','completed','unknown')),
  result jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.office_ledger (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"version":1,"monthlyBudgetUsd":5,"receipts":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.story_records enable row level security;
alter table public.office_ledger enable row level security;

create policy "owners manage workspace" on public.workspaces
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners manage stories" on public.story_records
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners manage ledger" on public.office_ledger
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
