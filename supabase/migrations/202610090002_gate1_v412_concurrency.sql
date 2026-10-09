begin;

-- Gate 1 V4.1.2 follow-up:
-- 1. A stale device may read the current state, but must never blank it.
-- 2. The legacy V4.0 draft RPC is closed so it cannot bypass reset versions.
-- 3. Draft sync, progress merge and account deletion serialize on one reset row.

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
  v_past_answers jsonb;
  v_merged jsonb;
  v_reset_version bigint := 0;
  v_client_reset bigint := 0;
  v_server_reset bigint := -1;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if p_device_id is null then raise exception 'device id required'; end if;
  if jsonb_typeof(v_client) <> 'object' or pg_column_size(v_client) > 5000000 then raise exception 'invalid progress payload'; end if;

  insert into public.esg_data_resets_v41(user_id,reset_version)
  values(v_uid,0) on conflict(user_id) do nothing;
  select r.reset_version into v_reset_version
  from public.esg_data_resets_v41 r where r.user_id=v_uid for update;
  begin v_client_reset := coalesce((v_client->>'cloud_reset_version')::bigint,0); exception when others then v_client_reset := 0; end;

  insert into public.esg_progress_v40(user_id,payload,updated_by_device)
  values(v_uid,jsonb_build_object('schema_version',4.1,'cloud_reset_version',v_reset_version,'answered','{}'::jsonb,'learned','{}'::jsonb,'wrong','{}'::jsonb,'exams','[]'::jsonb,'attempts','[]'::jsonb,'past37',jsonb_build_object('answers','{}'::jsonb)),p_device_id)
  on conflict(user_id) do nothing;
  select p.payload into v_server from public.esg_progress_v40 p where p.user_id=v_uid for update;

  if v_client_reset < v_reset_version then
    -- The reset row is the account generation authority. A stale caller receives
    -- the current server state and is not allowed to overwrite post-delete work.
    begin v_server_reset := coalesce((v_server->>'cloud_reset_version')::bigint,-1); exception when others then v_server_reset := -1; end;
    if v_server_reset <> v_reset_version then
      v_server := jsonb_set(coalesce(v_server,'{}'::jsonb),'{cloud_reset_version}',to_jsonb(v_reset_version),true);
      update public.esg_progress_v40 p
      set payload=v_server,version=p.version+1,updated_by_device=p_device_id,updated_at=now()
      where p.user_id=v_uid;
    end if;
    return query select p.payload,p.version,p.updated_at from public.esg_progress_v40 p where p.user_id=v_uid;
    return;
  end if;

  if v_client_reset > v_reset_version then raise exception 'invalid reset generation'; end if;

  select coalesce(jsonb_object_agg(chosen.key,chosen.value),'{}'::jsonb) into v_answered
  from (
    select distinct on(items.key) items.key,items.value
    from (
      select * from jsonb_each(coalesce(v_server->'answered','{}'::jsonb))
      union all
      select * from jsonb_each(coalesce(v_client->'answered','{}'::jsonb))
    ) items
    order by items.key,public.esg_answer_time_v40(items.value) desc
  ) chosen;

  v_learned := coalesce(v_server->'learned','{}'::jsonb) || coalesce(v_client->'learned','{}'::jsonb);
  select coalesce(jsonb_object_agg(a.key,'true'::jsonb),'{}'::jsonb) into v_wrong
  from jsonb_each(v_answered) a where coalesce((a.value->>'correct')::boolean,false)=false;

  select coalesce(jsonb_agg(chosen.value order by chosen.value->>'at'),'[]'::jsonb) into v_attempts
  from (
    select distinct on(coalesce(item->>'attempt_id',md5(item::text))) item as value
    from jsonb_array_elements(coalesce(v_server->'attempts','[]'::jsonb) || coalesce(v_client->'attempts','[]'::jsonb)) item
    order by coalesce(item->>'attempt_id',md5(item::text)),item->>'at' desc limit 5000
  ) chosen;

  select coalesce(jsonb_agg(chosen.value),'[]'::jsonb) into v_exams
  from (
    select distinct on(md5(item::text)) item as value
    from jsonb_array_elements(coalesce(v_server->'exams','[]'::jsonb) || coalesce(v_client->'exams','[]'::jsonb)) item
    order by md5(item::text) limit 200
  ) chosen;

  select coalesce(jsonb_object_agg(chosen.key,chosen.value),'{}'::jsonb) into v_past_answers
  from (
    select distinct on(items.key) items.key,items.value
    from (
      select * from jsonb_each(coalesce(v_server#>'{past37,answers}','{}'::jsonb))
      union all
      select * from jsonb_each(coalesce(v_client#>'{past37,answers}','{}'::jsonb))
    ) items
    order by items.key,public.esg_answer_time_v40(items.value) desc
  ) chosen;

  v_merged := jsonb_build_object(
    'schema_version',4.1,'cloud_reset_version',v_reset_version,'answered',v_answered,'learned',v_learned,'wrong',v_wrong,
    'exams',v_exams,'attempts',v_attempts,'past37',jsonb_build_object('answers',v_past_answers)
  );
  update public.esg_progress_v40 p
  set payload=v_merged,version=p.version+1,updated_by_device=p_device_id,updated_at=now()
  where p.user_id=v_uid;
  return query select p.payload,p.version,p.updated_at from public.esg_progress_v40 p where p.user_id=v_uid;
end;
$$;

create or replace function public.esg_sync_exam_draft_v41(
  p_payload jsonb,
  p_device_id uuid,
  p_delete boolean default false,
  p_reset_version bigint default 0
)
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
  v_reset_version bigint := 0;
  v_tombstone jsonb;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if p_device_id is null then raise exception 'device id required'; end if;

  insert into public.esg_data_resets_v41(user_id,reset_version)
  values(v_uid,0) on conflict(user_id) do nothing;
  select r.reset_version into v_reset_version
  from public.esg_data_resets_v41 r where r.user_id=v_uid for update;

  if coalesce(p_reset_version,0) < v_reset_version then
    v_tombstone := jsonb_build_object('deleted',true,'savedAt',floor(extract(epoch from clock_timestamp())*1000),'cloudResetVersion',v_reset_version);
    return query select v_tombstone,now();
    return;
  end if;
  if coalesce(p_reset_version,0) > v_reset_version then raise exception 'invalid reset generation'; end if;

  if p_delete then
    v_tombstone := jsonb_build_object('deleted',true,'savedAt',floor(extract(epoch from clock_timestamp())*1000),'cloudResetVersion',v_reset_version);
    insert into public.esg_exam_drafts_v40(user_id,payload,updated_by_device)
    values(v_uid,v_tombstone,p_device_id)
    on conflict(user_id) do update set payload=excluded.payload,updated_by_device=excluded.updated_by_device,updated_at=now();
    return query select d.payload,d.updated_at from public.esg_exam_drafts_v40 d where d.user_id=v_uid;
    return;
  end if;

  select d.payload into v_server from public.esg_exam_drafts_v40 d where d.user_id=v_uid for update;
  if p_payload is not null then
    if jsonb_typeof(p_payload)<>'object' or pg_column_size(p_payload)>1000000 then raise exception 'invalid exam draft'; end if;
    begin v_client_saved:=coalesce((p_payload->>'savedAt')::numeric,0); exception when others then v_client_saved:=0; end;
    begin v_server_saved:=coalesce((v_server->>'savedAt')::numeric,0); exception when others then v_server_saved:=0; end;
    if v_server is null or v_client_saved>=v_server_saved then
      insert into public.esg_exam_drafts_v40(user_id,payload,updated_by_device)
      values(v_uid,p_payload || jsonb_build_object('cloudResetVersion',v_reset_version),p_device_id)
      on conflict(user_id) do update set payload=excluded.payload,updated_by_device=excluded.updated_by_device,updated_at=now();
    end if;
  end if;
  return query select d.payload,d.updated_at from public.esg_exam_drafts_v40 d where d.user_id=v_uid;
end;
$$;

create or replace function public.esg_delete_my_learning_data_v41()
returns table(reset_version bigint, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reset_version bigint;
  v_reset_at timestamptz;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  insert into public.esg_data_resets_v41(user_id,reset_version)
  values(v_uid,0) on conflict(user_id) do nothing;
  select r.reset_version into v_reset_version
  from public.esg_data_resets_v41 r where r.user_id=v_uid for update;
  v_reset_version := v_reset_version + 1;
  v_reset_at := now();
  update public.esg_data_resets_v41
  set reset_version=v_reset_version,reset_at=v_reset_at where user_id=v_uid;

  delete from public.esg_exam_drafts_v40 where user_id=v_uid;
  delete from public.esg_progress_v40 where user_id=v_uid;
  if to_regclass('public.esg_progress') is not null then execute 'delete from public.esg_progress where user_id=$1' using v_uid; end if;
  return query select v_reset_version,v_reset_at;
end;
$$;

-- Retain a clear failure for database owners while removing every client grant.
create or replace function public.esg_sync_exam_draft_v40(p_payload jsonb,p_device_id uuid,p_delete boolean default false)
returns table(payload jsonb,updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'esg_sync_exam_draft_v40 is retired; use esg_sync_exam_draft_v41';
end;
$$;

revoke all on function public.esg_sync_exam_draft_v40(jsonb,uuid,boolean) from public,anon,authenticated;
revoke all on function public.esg_merge_learning_state_v40(jsonb,uuid) from public,anon;
revoke all on function public.esg_sync_exam_draft_v41(jsonb,uuid,boolean,bigint) from public,anon;
revoke all on function public.esg_delete_my_learning_data_v41() from public,anon;
grant execute on function public.esg_merge_learning_state_v40(jsonb,uuid) to authenticated;
grant execute on function public.esg_sync_exam_draft_v41(jsonb,uuid,boolean,bigint) to authenticated;
grant execute on function public.esg_delete_my_learning_data_v41() to authenticated;

commit;
