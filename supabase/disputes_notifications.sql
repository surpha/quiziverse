-- Disputes & Notifications tables for Quiziverse
-- Run this in your Supabase SQL Editor

-- Disputes: users can report incorrect LLM verdicts
create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,         -- references the question played
  question_text text not null,       -- snapshot of the question
  correct_answer text not null,      -- the "official" correct answer
  user_answer text not null,         -- what the user typed
  llm_verdict text not null,         -- 'incorrect' or 'partially_correct'
  user_reason text,                  -- optional: user's explanation of why they're correct
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,                   -- optional admin comment
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- Notifications: in-app notifications for users
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'info' check (type in ('info', 'dispute_approved', 'dispute_rejected', 'daily', 'achievement')),
  title text not null,
  message text not null,
  read boolean not null default false,
  metadata jsonb default '{}'::jsonb,  -- extra data (e.g. dispute_id, question_id)
  created_at timestamptz default now()
);

-- Enable RLS
alter table disputes enable row level security;
alter table notifications enable row level security;

-- Disputes: users can read their own disputes
create policy "Users read own disputes"
  on disputes for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their own disputes
create policy "Users insert own disputes"
  on disputes for insert
  to authenticated
  with check (user_id = auth.uid());

-- Admins can read all disputes
create policy "Admins read all disputes"
  on disputes for select
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can update disputes (approve/reject)
create policy "Admins update disputes"
  on disputes for update
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Notifications: users read their own
create policy "Users read own notifications"
  on notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Users can update their own (mark as read)
create policy "Users update own notifications"
  on notifications for update
  to authenticated
  using (user_id = auth.uid());

-- System/admins can insert notifications for any user
create policy "Admins insert notifications"
  on notifications for insert
  to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Index for fast lookups
create index if not exists idx_disputes_user on disputes(user_id);
create index if not exists idx_disputes_status on disputes(status);
create index if not exists idx_notifications_user on notifications(user_id, read);
create index if not exists idx_notifications_created on notifications(user_id, created_at desc);

-- Enable Realtime on notifications (required for live push to clients)
alter publication supabase_realtime add table notifications;

-- Trigger: auto-send confirmation notification when a dispute is raised
create or replace function notify_dispute_raised()
returns trigger as $$
begin
  insert into notifications (user_id, type, title, message, metadata)
  values (
    NEW.user_id,
    'info',
    'Dispute Submitted',
    'Your dispute for "' || left(NEW.question_text, 50) || '..." has been submitted for review.',
    jsonb_build_object('dispute_id', NEW.id, 'question_id', NEW.question_id)
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_dispute_raised
  after insert on disputes
  for each row
  execute function notify_dispute_raised();
