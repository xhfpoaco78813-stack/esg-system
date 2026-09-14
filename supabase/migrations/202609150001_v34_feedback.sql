begin;

create table if not exists public.esg_feedback (
  feedback_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('content','feature','usability','bug','other')),
  message text not null check (char_length(trim(message)) between 10 and 3000),
  page_path text check (page_path is null or char_length(page_path) <= 500),
  status text not null default 'new' check (status in ('new','reviewing','planned','resolved','closed')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 2000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((reviewed_by is null and reviewed_at is null) or (reviewed_by is not null and reviewed_at is not null))
);

alter table public.esg_feedback enable row level security;
revoke all on public.esg_feedback from anon, authenticated;
drop policy if exists esg_feedback_submit on public.esg_feedback;
drop policy if exists esg_feedback_editor_read on public.esg_feedback;
drop policy if exists esg_feedback_editor_update on public.esg_feedback;

create policy esg_feedback_submit on public.esg_feedback
  for insert to anon, authenticated
  with check (
    (user_id is null or user_id = (select auth.uid()))
    and status = 'new' and admin_note is null
    and reviewed_by is null and reviewed_at is null
  );
create policy esg_feedback_editor_read on public.esg_feedback
  for select to authenticated using (public.esg_is_editor());
create policy esg_feedback_editor_update on public.esg_feedback
  for update to authenticated using (public.esg_is_editor()) with check (public.esg_is_editor());

grant insert (user_id, category, message, page_path) on public.esg_feedback to anon, authenticated;
grant select on public.esg_feedback to authenticated;
grant update (status, admin_note, reviewed_by, reviewed_at, updated_at) on public.esg_feedback to authenticated;

create index if not exists esg_feedback_status_created_idx on public.esg_feedback (status, created_at desc);
commit;
