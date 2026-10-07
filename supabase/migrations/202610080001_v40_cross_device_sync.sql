begin;

create table if not exists public.esg_progress_v40 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"answered":{},"learned":{},"wrong":{},"exams":[],"attempts":[]}'::jsonb,
  version bigint not null default 1 check (version > 0),
  updated_by_device uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object'),
  check (pg_column_size(payload) <= 5000000)
);

create table if not exists public.esg_exam_drafts_v40 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_by_device uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object'),
  check (pg_column_size(payload) <= 1000000)
);

alter table public.esg_progress_v40 enable row level security;
alter table public.esg_exam_drafts_v40 enable row level security;
revoke all on public.esg_progress_v40, public.esg_exam_drafts_v40 from anon, authenticated;
drop policy if exists esg_progress_v40_self_read on public.esg_progress_v40;
drop policy if exists esg_exam_drafts_v40_self_read on public.esg_exam_drafts_v40;
create policy esg_progress_v40_self_read on public.esg_progress_v40 for select to authenticated using (user_id = (select auth.uid()));
create policy esg_exam_drafts_v40_self_read on public.esg_exam_drafts_v40 for select to authenticated using (user_id = (select auth.uid()));
grant select on public.esg_progress_v40, public.esg_exam_drafts_v40 to authenticated;

create or replace function public.esg_answer_time_v40(value jsonb)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
begin
  if value is null or value->'at' is null then return 0; end if;
  if jsonb_typeof(value->'at') = 'number' then return (value->>'at')::numeric; end if;
  return extract(epoch from (value->>'at')::timestamptz) * 1000;
exception when others then return 0;
end;
$$;

create or replace function public.esg_merge_learning_state_v40(p_payload jsonb, p_device_id uuid)
returns table(payload jsonb, version bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_server jsonb;
  v_client jsonb := coalesce(p_payload, '{}'::jsonb);
  v_answered jsonb;
  v_learned jsonb;
  v_wrong jsonb;
  v_attempts jsonb;
  v_exams jsonb;
  v_merged jsonb;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if p_device_id is null then raise exception 'device id required'; end if;
  if jsonb_typeof(v_client) <> 'object' or pg_column_size(v_client) > 5000000 then raise exception 'invalid progress payload'; end if;

  insert into public.esg_progress_v40(user_id, payload, updated_by_device)
  values (v_uid, '{"answered":{},"learned":{},"wrong":{},"exams":[],"attempts":[]}'::jsonb, p_device_id)
  on conflict (user_id) do nothing;

  select p.payload into v_server from public.esg_progress_v40 p where p.user_id = v_uid for update;

  select coalesce(jsonb_object_agg(chosen.key, chosen.value), '{}'::jsonb)
    into v_answered
    from (
      select distinct on (items.key) items.key, items.value
      from (
        select * from jsonb_each(coalesce(v_server->'answered','{}'::jsonb))
        union all
        select * from jsonb_each(coalesce(v_client->'answered','{}'::jsonb))
      ) items
      order by items.key, public.esg_answer_time_v40(items.value) desc
    ) chosen;

  v_learned := coalesce(v_server->'learned','{}'::jsonb) || coalesce(v_client->'learned','{}'::jsonb);

  select coalesce(jsonb_object_agg(a.key, 'true'::jsonb), '{}'::jsonb)
    into v_wrong
    from jsonb_each(v_answered) a
    where coalesce((a.value->>'correct')::boolean, false) = false;

  select coalesce(jsonb_agg(chosen.value order by chosen.value->>'at'), '[]'::jsonb)
    into v_attempts
    from (
      select distinct on (coalesce(item->>'attempt_id', md5(item::text))) item as value
      from jsonb_array_elements(coalesce(v_server->'attempts','[]'::jsonb) || coalesce(v_client->'attempts','[]'::jsonb)) item
      order by coalesce(item->>'attempt_id', md5(item::text)), item->>'at' desc
      limit 5000
    ) chosen;

  select coalesce(jsonb_agg(chosen.value order by coalesce((chosen.value->>'at')::numeric,0)), '[]'::jsonb)
    into v_exams
    from (
      select distinct on (md5(item::text)) item as value
      from jsonb_array_elements(coalesce(v_server->'exams','[]'::jsonb) || coalesce(v_client->'exams','[]'::jsonb)) item
      order by md5(item::text)
      limit 200
    ) chosen;

  v_merged := jsonb_build_object('answered',v_answered,'learned',v_learned,'wrong',v_wrong,'exams',v_exams,'attempts',v_attempts);
  update public.esg_progress_v40 p
    set payload=v_merged, version=p.version+1, updated_by_device=p_device_id, updated_at=now()
    where p.user_id=v_uid;
  return query select p.payload,p.version,p.updated_at from public.esg_progress_v40 p where p.user_id=v_uid;
end;
$$;

create or replace function public.esg_sync_exam_draft_v40(p_payload jsonb, p_device_id uuid, p_delete boolean default false)
returns table(payload jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_server jsonb;
  v_server_saved numeric := 0;
  v_client_saved numeric := 0;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if p_device_id is null then raise exception 'device id required'; end if;
  if p_delete then
    delete from public.esg_exam_drafts_v40 d where d.user_id=v_uid;
    return;
  end if;
  select d.payload into v_server from public.esg_exam_drafts_v40 d where d.user_id=v_uid for update;
  if p_payload is not null then
    if jsonb_typeof(p_payload) <> 'object' or pg_column_size(p_payload) > 1000000 then raise exception 'invalid exam draft'; end if;
    begin v_client_saved := coalesce((p_payload->>'savedAt')::numeric,0); exception when others then v_client_saved := 0; end;
    begin v_server_saved := coalesce((v_server->>'savedAt')::numeric,0); exception when others then v_server_saved := 0; end;
    if v_server is null or v_client_saved >= v_server_saved then
      insert into public.esg_exam_drafts_v40(user_id,payload,updated_by_device)
      values(v_uid,p_payload,p_device_id)
      on conflict(user_id) do update set payload=excluded.payload,updated_by_device=excluded.updated_by_device,updated_at=now();
    end if;
  end if;
  return query select d.payload,d.updated_at from public.esg_exam_drafts_v40 d where d.user_id=v_uid;
end;
$$;

revoke all on function public.esg_answer_time_v40(jsonb) from public;
revoke all on function public.esg_merge_learning_state_v40(jsonb,uuid) from public;
revoke all on function public.esg_sync_exam_draft_v40(jsonb,uuid,boolean) from public;
grant execute on function public.esg_merge_learning_state_v40(jsonb,uuid) to authenticated;
grant execute on function public.esg_sync_exam_draft_v40(jsonb,uuid,boolean) to authenticated;

do $$
begin
  if to_regclass('public.esg_progress') is not null then
    execute 'insert into public.esg_progress_v40(user_id,payload,updated_at)
      select user_id,payload,coalesce(updated_at,now()) from public.esg_progress
      on conflict(user_id) do nothing';
  end if;
end;
$$;

commit;
