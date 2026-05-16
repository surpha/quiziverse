-- Quiziverse: Questions table schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

create table if not exists questions (
  id text primary key,
  question text not null,
  answer text not null,
  source text,
  image_url text,
  difficulty smallint not null default 3 check (difficulty between 1 and 5),
  type text not null default 'straight',
  weights jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Enable Row Level Security (read-only for anonymous users)
alter table questions enable row level security;

create policy "Allow public read access"
  on questions for select
  to anon
  using (true);

-- Allow anonymous users to insert (contribute) new questions
create policy "Allow public insert access"
  on questions for insert
  to anon
  with check (true);

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

-- Sample insert (matches your local schema):
insert into questions (id, question, answer, source, image_url, weights) values
  ('q001', 'What is the time complexity of binary search?', 'O(log n) — each comparison halves the search space.', 'Introduction to Algorithms (CLRS)', null, '{"technology": 9, "history": 2, "geography": 1, "science": 7, "literature": 1, "arts": 1, "music": 1, "society": 2, "religion": 1, "popCulture": 1, "sports": 1, "lifestyle": 1}'),
  ('q002', 'Who painted the Sistine Chapel ceiling?', 'Michelangelo, between 1508 and 1512.', 'Lives of the Artists — Giorgio Vasari', null, '{"technology": 1, "history": 9, "geography": 3, "science": 1, "literature": 2, "arts": 10, "music": 1, "society": 3, "religion": 8, "popCulture": 2, "sports": 1, "lifestyle": 1}'),
  ('q003', 'What is the double-slit experiment?', 'An experiment demonstrating that light and matter exhibit wave-particle duality — particles create an interference pattern when not observed, but behave as particles when measured.', 'Feynman Lectures on Physics, Vol. III', null, '{"technology": 4, "history": 5, "geography": 1, "science": 10, "literature": 1, "arts": 1, "music": 1, "society": 3, "religion": 2, "popCulture": 2, "sports": 1, "lifestyle": 1}')
on conflict (id) do nothing;
