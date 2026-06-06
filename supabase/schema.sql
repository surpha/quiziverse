-- Quiziverse: Questions table schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

create table if not exists questions (
  id text primary key,
  question text not null,
  answer text not null,
  source text,
  image_url text,
  difficulty smallint not null default 5 check (difficulty between 1 and 10),
  type text not null default 'straight',
  hints jsonb default null,
  weights jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'staging', 'approved', 'rejected')),
  submitted_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- Profiles table for role management & persona
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'quizmaster', 'admin')),
  display_name text,
  username text unique,
  age_range text check (age_range in ('under18', '18-24', '25-34', '35-44', '45+')),
  favorite_domains jsonb default '[]'::jsonb,
  avatar_emoji text default '✦',
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable Row Level Security
alter table questions enable row level security;
alter table profiles enable row level security;

-- Profiles: users can read and update their own profile
create policy "Users can read own profile"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- Questions: everyone can see approved questions
create policy "Public read approved questions"
  on questions for select
  to anon, authenticated
  using (status = 'approved');

-- Admins can see all questions (for review)
create policy "Admins read all questions"
  on questions for select
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Authenticated users can insert (contribute) questions
create policy "Authenticated users can contribute"
  on questions for insert
  to authenticated
  with check (true);

-- Anonymous users can also contribute (pending review)
create policy "Anon users can contribute"
  on questions for insert
  to anon
  with check (true);

-- Admins can update questions (approve/reject)
create policy "Admins can update questions"
  on questions for update
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can delete questions
create policy "Admins can delete questions"
  on questions for delete
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Optional: Create a storage bucket for question images
-- Go to Storage in your Supabase dashboard and create a bucket called "question-images"
-- Set it to public so images can be displayed without auth
-- Then run this policy to allow anonymous uploads:

-- Allow anyone to upload images to the question-images bucket
insert into storage.buckets (id, name, public) values ('question-images', 'question-images', true)
on conflict (id) do nothing;

create policy "Allow public upload to question-images"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'question-images');

create policy "Allow public read from question-images"
  on storage.objects for select
  to anon
  using (bucket_id = 'question-images');

-- Sample insert (matches your local schema — inserted as 'approved'):
insert into questions (id, question, answer, source, image_url, weights, status) values
  ('q001', 'What is the time complexity of binary search?', 'O(log n) — each comparison halves the search space.', 'Introduction to Algorithms (CLRS)', null, '{"technology": 9, "history": 2, "geography": 1, "science": 7, "literature": 1, "arts": 1, "music": 1, "society": 2, "religion": 1, "popCulture": 1, "sports": 1, "lifestyle": 1}', 'approved'),
  ('q002', 'Who painted the Sistine Chapel ceiling?', 'Michelangelo, between 1508 and 1512.', 'Lives of the Artists — Giorgio Vasari', null, '{"technology": 1, "history": 9, "geography": 3, "science": 1, "literature": 2, "arts": 10, "music": 1, "society": 3, "religion": 8, "popCulture": 2, "sports": 1, "lifestyle": 1}', 'approved'),
  ('q003', 'What is the double-slit experiment?', 'An experiment demonstrating that light and matter exhibit wave-particle duality — particles create an interference pattern when not observed, but behave as particles when measured.', 'Feynman Lectures on Physics, Vol. III', null, '{"technology": 4, "history": 5, "geography": 1, "science": 10, "literature": 1, "arts": 1, "music": 1, "society": 3, "religion": 2, "popCulture": 2, "sports": 1, "lifestyle": 1}', 'approved')
on conflict (id) do nothing;

-- To make a user an admin, run:
-- update profiles set role = 'admin' where email = 'your-email@example.com';

-- Play attempts: track user answers to questions in play mode
create table if not exists play_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null references questions(id) on delete cascade,
  verdict text not null check (verdict in ('correct', 'partially_correct', 'incorrect')),
  answered_at timestamptz default now(),
  unique(user_id, question_id)
);

alter table play_attempts enable row level security;

-- Users can read their own attempts
create policy "Users can read own play attempts"
  on play_attempts for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can insert their own attempts
create policy "Users can insert own play attempts"
  on play_attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own attempts (re-attempt overwrites)
create policy "Users can update own play attempts"
  on play_attempts for update
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- LIVE QUIZZES: Real-time IRL quiz hosting
-- ============================================================

-- Live quiz events created by quizmasters
create table if not exists live_quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'live', 'locked', 'evaluating', 'results')),
  questions jsonb not null default '[]'::jsonb,
  -- questions format: [{ question, answer, points }]
  num_questions int not null default 0,
  created_at timestamptz default now(),
  locked_at timestamptz,
  evaluated_at timestamptz
);

alter table live_quizzes enable row level security;

-- Anyone authenticated can read live/locked/results quizzes (to join)
create policy "Read active live quizzes"
  on live_quizzes for select
  to authenticated
  using (status in ('live', 'locked', 'evaluating', 'results') or created_by = auth.uid());

-- Admins/quizmasters can create
create policy "Create live quizzes"
  on live_quizzes for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Only creator can update their quiz
create policy "Update own live quizzes"
  on live_quizzes for update
  to authenticated
  using (auth.uid() = created_by);

-- Only creator can delete their quiz
create policy "Delete own live quizzes"
  on live_quizzes for delete
  to authenticated
  using (auth.uid() = created_by);

-- Player responses to a live quiz
create table if not exists live_quiz_responses (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references live_quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  -- answers format: [{ question_index: 0, answer: "text" }, ...]
  scores jsonb default null,
  -- scores format: [{ question_index, verdict, score }] — filled after evaluation
  total_score int default null,
  submitted_at timestamptz default now(),
  evaluated boolean default false,
  unique(quiz_id, user_id)
);

alter table live_quiz_responses enable row level security;

-- Players can read their own responses
create policy "Read own live quiz responses"
  on live_quiz_responses for select
  to authenticated
  using (auth.uid() = user_id);

-- Quizmaster can read all responses for their quiz
create policy "Quizmaster reads all responses"
  on live_quiz_responses for select
  to authenticated
  using (
    exists (select 1 from live_quizzes where id = quiz_id and created_by = auth.uid())
  );

-- Players can insert their own response
create policy "Insert own live quiz response"
  on live_quiz_responses for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Players can update their own response (autosave) while quiz is live
create policy "Update own live quiz response"
  on live_quiz_responses for update
  to authenticated
  using (auth.uid() = user_id);

-- Quizmaster can update responses (for evaluation scoring)
create policy "Quizmaster updates responses"
  on live_quiz_responses for update
  to authenticated
  using (
    exists (select 1 from live_quizzes where id = quiz_id and created_by = auth.uid())
  );

-- All participants can read leaderboard when quiz is in results status
create policy "Read all responses when results"
  on live_quiz_responses for select
  to authenticated
  using (
    exists (select 1 from live_quizzes where id = quiz_id and status = 'results')
  );

-- Enable realtime for live quiz state changes
alter publication supabase_realtime add table live_quizzes;
alter publication supabase_realtime add table live_quiz_responses;
