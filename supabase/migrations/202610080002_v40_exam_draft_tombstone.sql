begin;

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
  v_tombstone jsonb;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if p_device_id is null then raise exception 'device id required'; end if;
  if p_delete then
    v_tombstone := jsonb_build_object('deleted',true,'savedAt',floor(extract(epoch from clock_timestamp()) * 1000));
    insert into public.esg_exam_drafts_v40(user_id,payload,updated_by_device)
    values(v_uid,v_tombstone,p_device_id)
    on conflict(user_id) do update set payload=excluded.payload,updated_by_device=excluded.updated_by_device,updated_at=now();
    return query select d.payload,d.updated_at from public.esg_exam_drafts_v40 d where d.user_id=v_uid;
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

revoke all on function public.esg_sync_exam_draft_v40(jsonb,uuid,boolean) from public;
grant execute on function public.esg_sync_exam_draft_v40(jsonb,uuid,boolean) to authenticated;

commit;
