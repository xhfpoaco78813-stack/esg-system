begin;

create table if not exists public.esg_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'learner' check (role in ('learner','reviewer','admin')),
  updated_at timestamptz not null default now()
);

alter table public.esg_roles enable row level security;
revoke all on public.esg_roles from anon, authenticated;
drop policy if exists esg_roles_self_read on public.esg_roles;
create policy esg_roles_self_read on public.esg_roles
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.esg_roles to authenticated;
grant select, insert, update, delete on public.esg_roles to service_role;

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

create table if not exists public.esg_admin_audit (
  audit_id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('create_user','set_role','disable_user','enable_user','reset_password')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.esg_admin_audit enable row level security;
revoke all on public.esg_admin_audit from anon, authenticated;
drop policy if exists esg_admin_audit_read on public.esg_admin_audit;
create policy esg_admin_audit_read on public.esg_admin_audit
  for select to authenticated using (public.esg_is_editor());
grant select on public.esg_admin_audit to authenticated;
grant select, insert on public.esg_admin_audit to service_role;
create index if not exists esg_admin_audit_created_idx on public.esg_admin_audit (created_at desc);

commit;

