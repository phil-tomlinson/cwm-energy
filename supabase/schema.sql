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

-- ── Contractor leads ──────────────────────────────────────────────────────────
-- Captures quote/assessment requests from calculator users.
-- Anon users can INSERT; reads are restricted to service-role (admin dashboard).
create table if not exists leads (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz default now(),

  -- Contact info
  name        text        not null,
  email       text        not null,
  phone       text,

  -- Location (pre-filled from calculator inputs)
  province    text,
  city        text,

  -- What they want quotes for
  -- 'solar' | 'heat_pump' | 'insulation' | 'water_heater' | 'home_efficiency' | 'general'
  interest    text        not null default 'general',

  -- Snapshot of relevant calculator data at time of submission
  context     jsonb,

  -- Admin workflow
  status      text        not null default 'new'
                check (status in ('new', 'contacted', 'converted', 'invalid')),
  notes       text
);

alter table leads enable row level security;

-- Anyone can submit a lead (anon insert)
create policy "Anyone can submit a lead"
  on leads for insert
  to anon, authenticated
  with check (true);

-- Only service-role (Supabase dashboard / admin) can read leads.
-- No SELECT policy for anon or authenticated — reads go through service-role key only.

create index if not exists leads_created_at_idx on leads (created_at desc);
create index if not exists leads_status_idx     on leads (status);
