-- Daily Challenge tables for Quiziverse
-- Run this in your Supabase SQL Editor

-- Daily challenges: each row = one day's challenge set
create table if not exists daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,  -- The date this challenge is active (IST)
  questions jsonb not null default '[]'::jsonb,
  -- questions format: [
  --   {
  --     "question": "...",
  --     "answer": "...",
  --     "source": "...",
  --     "difficulty": 6,₹
  --     "type": "straight",
  --     "weights": { "technology": 8, ... },
  --     "hints": [
  --       { "text": "First hint", "cost": 1 },
  --       { "text": "Second hint", "cost": 2 },
  --       { "text": "Third hint (big giveaway)", "cost": 3 }
  --     ],
  --     "max_score": 10  -- base score for answering correctly
  --   }
  -- ]
  merged_to_universe boolean not null default false,  -- Whether questions have been auto-added to main universe
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Daily attempts: tracks each user's progress on a challenge
create table if not exists daily_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references daily_challenges(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  -- answers format: [
  --   {
  --     "question_index": 0,
  --     "answer": "user's answer text",
  --     "verdict": "correct" | "partial" | "incorrect",
  --     "hints_used": [0, 1],  -- indices of hints revealed
  --     "score": 7  -- max_score - sum(hint costs)
  --   }
  -- ]
  total_score int not null default 0,
  completed boolean not null default false,
  current_index int not null default 0,  -- which question user is on
  started_at timestamptz default now(),
  completed_at timestamptz,
  unique(user_id, challenge_id)
);

-- Enable RLS
alter table daily_challenges enable row level security;
alter table daily_attempts enable row level security;

-- Everyone can read today's (and past) challenges
create policy "Public read challenges"
  on daily_challenges for select
  to authenticated
  using (
    challenge_date <= current_date
    OR exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can manage challenges
create policy "Admins manage challenges"
  on daily_challenges for all
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Users can read their own attempts
create policy "Users read own attempts"
  on daily_attempts for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their own attempts
create policy "Users create own attempts"
  on daily_attempts for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can update their own attempts
create policy "Users update own attempts"
  on daily_attempts for update
  to authenticated
  using (user_id = auth.uid());
