-- Quiziverse: Questions table schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

create table if not exists questions (
  id text primary key,
  question text not null,
  answer text not null,
  source text,
  image_url text,
  weights jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Enable Row Level Security (read-only for anonymous users)
alter table questions enable row level security;

create policy "Allow public read access"
  on questions for select
  to anon
  using (true);

-- Optional: Create a storage bucket for question images
-- Go to Storage in your Supabase dashboard and create a bucket called "question-images"
-- Set it to public so images can be displayed without auth

-- Sample insert (matches your local schema):
insert into questions (id, question, answer, source, image_url, weights) values
  ('q001', 'What is the time complexity of binary search?', 'O(log n) — each comparison halves the search space.', 'Introduction to Algorithms (CLRS)', null, '{"technology": 9, "history": 2, "geography": 1, "science": 7, "literature": 1, "arts": 1, "music": 1, "society": 2, "religion": 1, "popCulture": 1, "sports": 1, "lifestyle": 1}'),
  ('q002', 'Who painted the Sistine Chapel ceiling?', 'Michelangelo, between 1508 and 1512.', 'Lives of the Artists — Giorgio Vasari', null, '{"technology": 1, "history": 9, "geography": 3, "science": 1, "literature": 2, "arts": 10, "music": 1, "society": 3, "religion": 8, "popCulture": 2, "sports": 1, "lifestyle": 1}'),
  ('q003', 'What is the double-slit experiment?', 'An experiment demonstrating that light and matter exhibit wave-particle duality — particles create an interference pattern when not observed, but behave as particles when measured.', 'Feynman Lectures on Physics, Vol. III', null, '{"technology": 4, "history": 5, "geography": 1, "science": 10, "literature": 1, "arts": 1, "music": 1, "society": 3, "religion": 2, "popCulture": 2, "sports": 1, "lifestyle": 1}')
on conflict (id) do nothing;
