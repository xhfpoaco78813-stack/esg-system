begin;

-- Fresh-project prerequisite for policies introduced by the feedback migration.
-- The later V3.6 migration keeps ownership, grants and policies idempotent.
create table if not exists public.esg_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'learner' check (role in ('learner','reviewer','admin')),
  updated_at timestamptz not null default now()
);

alter table public.esg_roles enable row level security;
revoke all on public.esg_roles from anon, authenticated;

create or replace function public.esg_is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.esg_roles
    where user_id = (select auth.uid()) and role in ('admin','reviewer')
  );
$$;

revoke all on function public.esg_is_editor() from public;
grant execute on function public.esg_is_editor() to authenticated;

commit;
