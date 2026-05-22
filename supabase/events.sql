-- Events tables for Quiziverse
-- Run this in your Supabase SQL Editor

-- Events: each row = one event quiz session
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,              -- URL-friendly identifier (e.g. "zerodha-varsity-2026")
  title text not null,                    -- Display title
  description text,                       -- Optional description shown to players
  questions jsonb not null default '[]'::jsonb,
  -- questions format: same as daily_challenges
  -- [{ "question": "...", "answer": "...", "hints": [...], "max_score": 10, ... }]
  is_active boolean not null default true,
  starts_at timestamptz,                  -- Optional: event goes live at this time
  ends_at timestamptz,                    -- Optional: event expires
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Event attempts: tracks each user's progress on an event
create table if not exists event_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  -- answers format: same as daily_attempts
  total_score int not null default 0,
  completed boolean not null default false,
  current_index int not null default 0,
  started_at timestamptz default now(),
  completed_at timestamptz,
  unique(user_id, event_id)
);

-- Enable RLS
alter table events enable row level security;
alter table event_attempts enable row level security;

-- Everyone can read active events
create policy "Public read active events"
  on events for select
  to authenticated
  using (is_active = true);

-- Admins can manage events
create policy "Admins manage events"
  on events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Users can read their own attempts
create policy "Users read own event attempts"
  on event_attempts for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their own attempts
create policy "Users insert own event attempts"
  on event_attempts for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can update their own attempts
create policy "Users update own event attempts"
  on event_attempts for update
  to authenticated
  using (user_id = auth.uid());

-- Admins can read all attempts (for leaderboard)
create policy "Admins read all event attempts"
  on event_attempts for select
  to authenticated
  using (public.is_admin());

-- Index for fast slug lookup
create index if not exists idx_events_slug on events(slug);
-- Index for leaderboard queries
create index if not exists idx_event_attempts_event_score on event_attempts(event_id, total_score desc);
