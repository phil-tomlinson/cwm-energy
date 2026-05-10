-- CWM Energy — Supabase schema
-- Run this in the Supabase SQL Editor (Database > SQL Editor > New query)

-- Saved calculator results
-- One row per module per save. Users can have multiple saves per module.
create table if not exists saved_results (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users on delete cascade not null,
  module      text        not null check (module in ('homeiq', 'ev')),
  label       text        not null default 'My results',
  data        jsonb       not null,
  created_at  timestamptz default now()
);

-- Row-level security: users can only see and modify their own rows
alter table saved_results enable row level security;

create policy "Users own their results"
  on saved_results for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast per-user queries
create index if not exists saved_results_user_id_idx on saved_results (user_id);
