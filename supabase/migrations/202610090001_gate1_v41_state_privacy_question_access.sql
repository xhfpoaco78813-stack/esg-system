begin;

alter table public.esg_progress_v40
  alter column payload set default '{"schema_version":4.1,"answered":{},"learned":{},"wrong":{},"exams":[],"attempts":[],"past37":{"answers":{}}}'::jsonb;

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
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if p_device_id is null then raise exception 'device id required'; end if;
  if jsonb_typeof(v_client) <> 'object' or pg_column_size(v_client) > 5000000 then raise exception 'invalid progress payload'; end if;

  insert into public.esg_progress_v40(user_id, payload, updated_by_device)
  values (v_uid, '{"schema_version":4.1,"answered":{},"learned":{},"wrong":{},"exams":[],"attempts":[],"past37":{"answers":{}}}'::jsonb, p_device_id)
  on conflict (user_id) do nothing;
  select p.payload into v_server from public.esg_progress_v40 p where p.user_id = v_uid for update;

  select coalesce(jsonb_object_agg(chosen.key, chosen.value), '{}'::jsonb) into v_answered
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
  select coalesce(jsonb_object_agg(a.key, 'true'::jsonb), '{}'::jsonb) into v_wrong
  from jsonb_each(v_answered) a where coalesce((a.value->>'correct')::boolean, false) = false;

  select coalesce(jsonb_agg(chosen.value order by chosen.value->>'at'), '[]'::jsonb) into v_attempts
  from (
    select distinct on (coalesce(item->>'attempt_id', md5(item::text))) item as value
    from jsonb_array_elements(coalesce(v_server->'attempts','[]'::jsonb) || coalesce(v_client->'attempts','[]'::jsonb)) item
    order by coalesce(item->>'attempt_id', md5(item::text)), item->>'at' desc limit 5000
  ) chosen;

  select coalesce(jsonb_agg(chosen.value), '[]'::jsonb) into v_exams
  from (
    select distinct on (md5(item::text)) item as value
    from jsonb_array_elements(coalesce(v_server->'exams','[]'::jsonb) || coalesce(v_client->'exams','[]'::jsonb)) item
    order by md5(item::text) limit 200
  ) chosen;

  select coalesce(jsonb_object_agg(chosen.key, chosen.value), '{}'::jsonb) into v_past_answers
  from (
    select distinct on (items.key) items.key, items.value
    from (
      select * from jsonb_each(coalesce(v_server#>'{past37,answers}','{}'::jsonb))
      union all
      select * from jsonb_each(coalesce(v_client#>'{past37,answers}','{}'::jsonb))
    ) items
    order by items.key, public.esg_answer_time_v40(items.value) desc
  ) chosen;

  v_merged := jsonb_build_object(
    'schema_version',4.1,'answered',v_answered,'learned',v_learned,'wrong',v_wrong,
    'exams',v_exams,'attempts',v_attempts,'past37',jsonb_build_object('answers',v_past_answers)
  );
  update public.esg_progress_v40 p set payload=v_merged,version=p.version+1,updated_by_device=p_device_id,updated_at=now() where p.user_id=v_uid;
  return query select p.payload,p.version,p.updated_at from public.esg_progress_v40 p where p.user_id=v_uid;
end;
$$;

create or replace function public.esg_delete_my_learning_data_v41()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  delete from public.esg_exam_drafts_v40 where user_id=v_uid;
  delete from public.esg_progress_v40 where user_id=v_uid;
  if to_regclass('public.esg_progress') is not null then execute 'delete from public.esg_progress where user_id=$1' using v_uid; end if;
end;
$$;

-- Future Pro/B2B/formal questions live here. The browser never receives answer_payload.
create table if not exists public.esg_question_bank_v41 (
  question_id text primary key,
  knowledge_id text not null,
  module_id text not null,
  jurisdiction text not null,
  access_level text not null check (access_level in ('pro','b2b')),
  public_question jsonb not null,
  answer_payload jsonb not null,
  source_id text not null,
  source_version text not null,
  valid_from date,
  verified boolean not null default false,
  review_status text not null default 'draft' check (review_status in ('draft','review','approved','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(public_question)='object'),
  check (jsonb_typeof(answer_payload)='object')
);
create table if not exists public.esg_entitlements_v41 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('pro','b2b')),
  active_until timestamptz,
  created_at timestamptz not null default now()
);
alter table public.esg_question_bank_v41 enable row level security;
alter table public.esg_entitlements_v41 enable row level security;
revoke all on public.esg_question_bank_v41, public.esg_entitlements_v41 from anon, authenticated;

create or replace function public.esg_get_questions_v41(p_jurisdiction text, p_limit integer default 20)
returns table(question_id text, knowledge_id text, module_id text, question jsonb)
language sql
security definer
set search_path = public
as $$
  select q.question_id,q.knowledge_id,q.module_id,q.public_question
  from public.esg_question_bank_v41 q
  join public.esg_entitlements_v41 e on e.user_id=auth.uid()
  where auth.uid() is not null and q.verified and q.review_status='approved'
    and q.jurisdiction=p_jurisdiction
    and (e.active_until is null or e.active_until>now())
    and (q.access_level=e.plan or e.plan='b2b')
  order by q.question_id limit least(greatest(coalesce(p_limit,20),1),100)
$$;

create or replace function public.esg_check_answer_v41(p_question_id text, p_answer jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_answer jsonb;
begin
  select q.answer_payload into v_answer
  from public.esg_question_bank_v41 q
  join public.esg_entitlements_v41 e on e.user_id=auth.uid()
  where q.question_id=p_question_id and q.verified and q.review_status='approved'
    and (e.active_until is null or e.active_until>now())
    and (q.access_level=e.plan or e.plan='b2b');
  if v_answer is null then raise exception 'question unavailable'; end if;
  return jsonb_build_object('correct',coalesce(v_answer->'answer','null'::jsonb)=coalesce(p_answer,'null'::jsonb),'explanation',v_answer->'explanation');
end;
$$;

revoke all on function public.esg_merge_learning_state_v40(jsonb,uuid) from public;
revoke all on function public.esg_delete_my_learning_data_v41() from public;
revoke all on function public.esg_get_questions_v41(text,integer) from public;
revoke all on function public.esg_check_answer_v41(text,jsonb) from public;
grant execute on function public.esg_merge_learning_state_v40(jsonb,uuid) to authenticated;
grant execute on function public.esg_delete_my_learning_data_v41() to authenticated;
grant execute on function public.esg_get_questions_v41(text,integer) to authenticated;
grant execute on function public.esg_check_answer_v41(text,jsonb) to authenticated;

commit;
