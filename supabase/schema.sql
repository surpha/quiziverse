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
  role text not null default 'user' check (role in ('user', 'admin')),
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
