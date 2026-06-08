---
description: "Use when working with Supabase schema, SQL migrations, RLS policies, database tables, or backend data models."
applyTo: "supabase/**"
---
# Database Schema & Supabase Guidelines

## Tables Overview

| Table | Purpose |
|-------|---------|
| `questions` | Main question bank (status: pending/staging/approved/rejected) |
| `profiles` | User profiles with roles (user/quizmaster/admin) |
| `daily_challenges` | Daily challenge sets (one per date, IST timezone) |
| `daily_attempts` | User attempts on daily challenges |
| `events` | Event quiz sessions (slug-based, time-bounded) |
| `event_attempts` | User attempts on events (with ratings/feedback) |
| `live_quizzes` | Real-time quiz sessions (managed by quizmasters) |
| `live_quiz_responses` | Player responses in live quizzes |
| `play_attempts` | Free-play mode attempts (question_id + verdict per user) |

## Key Schema Details

### questions
```sql
id text PRIMARY KEY,
question text NOT NULL,
answer text NOT NULL,
source text,
image_url text,
difficulty smallint (1-10),
type text DEFAULT 'straight',
hints jsonb,            -- [{ "text": "...", "cost": 1 }]
weights jsonb NOT NULL, -- { "technology": 8, "science": 6, ... }
status text ('pending'|'staging'|'approved'|'rejected'),
submitted_by uuid,
reviewed_by uuid,
reviewed_at timestamptz
```

### profiles
```sql
id uuid PRIMARY KEY (references auth.users),
email text,
role text ('user'|'quizmaster'|'admin'),
display_name text,
username text UNIQUE,
age_range text,
favorite_domains jsonb,
avatar_emoji text DEFAULT '✦'
```

### daily_challenges
```sql
id uuid PRIMARY KEY,
challenge_date date UNIQUE,  -- IST date
questions jsonb,             -- array of question objects with hints + max_score
merged_to_universe boolean,
created_by uuid
```

### events
```sql
id uuid PRIMARY KEY,
slug text UNIQUE,
title text,
description text,
questions jsonb,
is_active boolean,
starts_at timestamptz,
ends_at timestamptz
```

## Row Level Security (RLS)

- **questions**: Public can read `approved` only; admins read all; anyone can INSERT (pending review)
- **profiles**: Users read/update own profile only
- **daily_challenges**: Authenticated can read past/today; admins manage all
- **daily_attempts**: Users CRUD own attempts only
- **events**: Public reads active events; admins manage all
- **event_attempts**: Users manage own; admins read all (leaderboard)

## Triggers

- `handle_new_user()` — auto-creates a profile row when user signs up

## Helper Functions

- `public.is_admin()` — checks if current user has admin role (used in RLS policies)

## Conventions

- Use `gen_random_uuid()` for UUIDs
- Timestamps always `timestamptz`
- JSONB for flexible nested data (questions arrays, weights, hints, answers)
- IST (UTC+5:30) for date boundaries in daily challenges
- Upsert pattern: `ON CONFLICT (user_id, question_id)` for play attempts
