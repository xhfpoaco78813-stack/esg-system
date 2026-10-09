import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PGLITE_MODULE_PATH;
if (!modulePath) throw new Error('PGLITE_MODULE_PATH is required');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();

const root = path.resolve(import.meta.dirname, '..');
const migrationV41 = await fs.readFile(path.join(root, 'supabase/migrations/202610090001_gate1_v41_state_privacy_question_access.sql'), 'utf8');
const migrationV412 = await fs.readFile(path.join(root, 'supabase/migrations/202610090002_gate1_v412_concurrency.sql'), 'utf8');

const uid = '11111111-1111-4111-8111-111111111111';
const deviceA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const deviceB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function check(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`PASS ${label}`);
}

await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users(id uuid primary key);
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
  $$;
  create table public.esg_progress_v40(
    user_id uuid primary key references auth.users(id) on delete cascade,
    payload jsonb not null default '{"answered":{},"learned":{},"wrong":{},"exams":[],"attempts":[]}'::jsonb,
    version bigint not null default 1,
    updated_by_device uuid,
    updated_at timestamptz not null default now()
  );
  create table public.esg_exam_drafts_v40(
    user_id uuid primary key references auth.users(id) on delete cascade,
    payload jsonb not null,
    updated_by_device uuid,
    updated_at timestamptz not null default now()
  );
  create or replace function public.esg_answer_time_v40(value jsonb)
  returns numeric language plpgsql immutable set search_path=public as $$
  begin
    if value is null or value->'at' is null then return 0; end if;
    if jsonb_typeof(value->'at')='number' then return (value->>'at')::numeric; end if;
    return extract(epoch from (value->>'at')::timestamptz)*1000;
  exception when others then return 0;
  end;
  $$;
  insert into auth.users(id) values('${uid}');
`);

await db.exec(migrationV41);
await db.exec(migrationV412);
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${uid}',false);`);

const initial = {
  schema_version: 4.1,
  cloud_reset_version: 0,
  answered: { before: { correct: true, at: 100 } },
  learned: {}, wrong: {}, exams: [], attempts: [], past37: { answers: {} }
};
await db.query('select * from public.esg_merge_learning_state_v40($1::jsonb,$2::uuid)', [JSON.stringify(initial), deviceA]);
const delete1 = await db.query('select * from public.esg_delete_my_learning_data_v41()');
check('delete advances reset generation to 1', Number(delete1.rows[0].reset_version) === 1);

const postDelete = {
  ...initial,
  cloud_reset_version: 1,
  answered: { new_work: { correct: true, at: 300 } }
};
await db.query('select * from public.esg_merge_learning_state_v40($1::jsonb,$2::uuid)', [JSON.stringify(postDelete), deviceA]);
const stale = { ...initial, cloud_reset_version: 0, answered: { stale_work: { correct: false, at: 999 } } };
const staleResult = await db.query('select * from public.esg_merge_learning_state_v40($1::jsonb,$2::uuid)', [JSON.stringify(stale), deviceB]);
const stalePayload = staleResult.rows[0].payload;
check('stale merge preserves newer-generation progress', Boolean(stalePayload.answered.new_work));
check('stale merge cannot add old-generation progress', !stalePayload.answered.stale_work);

await db.query('select * from public.esg_sync_exam_draft_v41($1::jsonb,$2::uuid,false,1)', [JSON.stringify({ savedAt: 400, answers: { q1: 'A' } }), deviceB]);
const delete2 = await db.query('select * from public.esg_delete_my_learning_data_v41()');
check('second delete advances reset generation to 2', Number(delete2.rows[0].reset_version) === 2);
await db.exec('reset role;');
let draftRows = await db.query('select payload from public.esg_exam_drafts_v40 where user_id=$1::uuid', [uid]);
check('delete after draft write removes the draft', draftRows.rows.length === 0);
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${uid}',false);`);

const staleDraft = await db.query('select * from public.esg_sync_exam_draft_v41($1::jsonb,$2::uuid,false,1)', [JSON.stringify({ savedAt: 999, answers: { q1: 'B' } }), deviceB]);
check('draft started after delete receives a generation tombstone', staleDraft.rows[0].payload.deleted === true && Number(staleDraft.rows[0].payload.cloudResetVersion) === 2);
await db.exec('reset role;');
draftRows = await db.query('select payload from public.esg_exam_drafts_v40 where user_id=$1::uuid', [uid]);
check('stale draft cannot recreate the deleted row', draftRows.rows.length === 0);
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${uid}',false);`);

let oldRpcBlocked = false;
try {
  await db.query('select * from public.esg_sync_exam_draft_v40($1::jsonb,$2::uuid,false)', [JSON.stringify({ savedAt: 1000 }), deviceB]);
} catch (error) {
  oldRpcBlocked = /permission denied/i.test(String(error?.message || error));
}
check('authenticated clients cannot execute retired V4.0 draft RPC', oldRpcBlocked);

await db.exec('reset role;');
const privilege = await db.query("select has_function_privilege('authenticated','public.esg_sync_exam_draft_v40(jsonb,uuid,boolean)','execute') as allowed");
check('database ACL confirms retired V4.0 RPC is closed', privilege.rows[0].allowed === false);

await db.close();
