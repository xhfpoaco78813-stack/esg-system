begin;

create table if not exists public.esg_knowledge_sources (
  source_id text primary key,
  source_title text not null,
  source_authority text not null,
  source_version text not null,
  source_clause text,
  valid_from date,
  valid_to date,
  jurisdiction text not null check (jurisdiction in ('CN','EU','INTL','TW','OTHER')),
  source_url text,
  last_reviewed_at timestamptz not null default now(),
  review_status text not null default 'approved' check (review_status in ('draft','reviewing','approved','superseded')),
  supersedes_source_id text references public.esg_knowledge_sources(source_id),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table if not exists public.esg_knowledge_points (
  knowledge_id text primary key,
  module_id text not null,
  title text not null,
  competency_tags text[] not null default '{}',
  source_id text not null references public.esg_knowledge_sources(source_id),
  applicable_regions text[] not null default '{}',
  content_version integer not null default 1 check (content_version > 0),
  review_status text not null default 'draft' check (review_status in ('draft','reviewing','approved','superseded')),
  verified boolean not null default false,
  last_reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.esg_product_events (
  event_id bigint generated always as identity primary key,
  event_name text not null check (event_name in ('page_view','login_success','view_open','lesson_open','practice_answer','exam_complete','diagnosis_view','feedback_open','pilot_intent')),
  anonymous_id uuid not null,
  session_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  page_path text check (page_path is null or char_length(page_path) <= 300),
  event_data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (jsonb_typeof(event_data) = 'object')
);

create table if not exists public.esg_validation_leads (
  lead_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  contact_email text not null check (char_length(contact_email) between 5 and 254),
  respondent_role text not null check (respondent_role in ('user','buyer','decision_maker','consultant')),
  company_type text not null check (company_type in ('cn_manufacturing','taiwan_invested','foreign_trade','supply_chain','other')),
  primary_pain text not null check (primary_pain in ('knowledge_update','practical_gap','audit','talent','training_roi')),
  intent_level text not null check (intent_level in ('trial','quote','preorder')),
  price_range text not null check (price_range in ('unknown','lt_1000','1000_3000','3000_10000','gt_10000')),
  consent_at timestamptz not null,
  status text not null default 'new' check (status in ('new','contacted','qualified','pilot','won','closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.esg_competency_snapshots (
  snapshot_id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  scores jsonb not null default '{}'::jsonb,
  recommendation text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_date),
  check (jsonb_typeof(scores) = 'object')
);

alter table public.esg_knowledge_sources enable row level security;
alter table public.esg_knowledge_points enable row level security;
alter table public.esg_product_events enable row level security;
alter table public.esg_validation_leads enable row level security;
alter table public.esg_competency_snapshots enable row level security;

revoke all on public.esg_knowledge_sources, public.esg_knowledge_points, public.esg_product_events, public.esg_validation_leads, public.esg_competency_snapshots from anon, authenticated;

create policy esg_sources_read on public.esg_knowledge_sources for select to authenticated using (review_status = 'approved' or public.esg_is_editor());
create policy esg_kp_read on public.esg_knowledge_points for select to authenticated using ((verified and review_status = 'approved') or public.esg_is_editor());
create policy esg_events_insert on public.esg_product_events for insert to anon, authenticated with check (user_id is null or user_id = (select auth.uid()));
create policy esg_events_editor_read on public.esg_product_events for select to authenticated using (public.esg_is_editor() and coalesce((select auth.jwt()->>'aal'),'aal1') = 'aal2');
create policy esg_leads_insert on public.esg_validation_leads for insert to anon, authenticated with check ((user_id is null or user_id = (select auth.uid())) and status = 'new' and admin_note is null);
create policy esg_leads_editor_read on public.esg_validation_leads for select to authenticated using (public.esg_is_editor() and coalesce((select auth.jwt()->>'aal'),'aal1') = 'aal2');
create policy esg_leads_editor_update on public.esg_validation_leads for update to authenticated using (public.esg_is_editor() and coalesce((select auth.jwt()->>'aal'),'aal1') = 'aal2') with check (public.esg_is_editor() and coalesce((select auth.jwt()->>'aal'),'aal1') = 'aal2');
create policy esg_competency_self_insert on public.esg_competency_snapshots for insert to authenticated with check (user_id = (select auth.uid()));
create policy esg_competency_self_read on public.esg_competency_snapshots for select to authenticated using (user_id = (select auth.uid()) or (public.esg_is_editor() and coalesce((select auth.jwt()->>'aal'),'aal1') = 'aal2'));
create policy esg_competency_self_update on public.esg_competency_snapshots for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select on public.esg_knowledge_sources, public.esg_knowledge_points to authenticated;
grant insert (event_name,anonymous_id,session_id,user_id,page_path,event_data,occurred_at) on public.esg_product_events to anon, authenticated;
grant select on public.esg_product_events to authenticated;
grant insert (user_id,contact_email,respondent_role,company_type,primary_pain,intent_level,price_range,consent_at) on public.esg_validation_leads to anon, authenticated;
grant select on public.esg_validation_leads to authenticated;
grant update (status,admin_note,updated_at) on public.esg_validation_leads to authenticated;
grant select,insert,update on public.esg_competency_snapshots to authenticated;
grant usage, select on sequence public.esg_product_events_event_id_seq, public.esg_competency_snapshots_snapshot_id_seq to anon, authenticated;

create index if not exists esg_events_name_time_idx on public.esg_product_events (event_name, occurred_at desc);
create index if not exists esg_events_anon_time_idx on public.esg_product_events (anonymous_id, occurred_at desc);
create index if not exists esg_events_user_time_idx on public.esg_product_events (user_id, occurred_at desc) where user_id is not null;
create index if not exists esg_leads_status_created_idx on public.esg_validation_leads (status, created_at desc);
create index if not exists esg_competency_user_date_idx on public.esg_competency_snapshots (user_id, snapshot_date desc);

insert into public.esg_knowledge_sources (source_id,source_title,source_authority,source_version,source_clause,valid_from,jurisdiction,source_url,last_reviewed_at,review_status) values
('CN-MOF-BASIC-2024','企业可持续披露准则——基本准则（试行）','中华人民共和国财政部等九部门','财会〔2024〕17号','发布通知与基本准则','2024-11-20','CN','https://kjs.mof.gov.cn/zhengcefabu/202412/t20241216_3949745.htm',now(),'approved'),
('CN-MOF-CLIMATE-2025','企业可持续披露准则第1号——气候（试行）','中华人民共和国财政部等部门','财会〔2025〕34号','第一条、第二条、第四条、第三十三条','2025-12-19','CN','https://m.mof.gov.cn/czxw/202512/t20251225_3980202.htm',now(),'approved'),
('CN-SSE-GUIDE-2026','可持续发展报告编制指南','上海证券交易所','2026年1月修订','适用章节及附件目录','2026-01-30','CN','https://www.sse.com.cn/lawandrules/guide/stock/kcbxxpljg/',now(),'approved'),
('CN-SZSE-GUIDE-2026','可持续发展报告编制指南','深圳证券交易所','2026年修订','污染物排放、能源利用、水资源利用','2026-01-30','CN','https://www.szse.cn/aboutus/trends/news/',now(),'approved'),
('EU-CBAM-2026','Carbon Border Adjustment Mechanism','European Commission, DG TAXUD','Definitive regime 2026','CBAM definitive regime','2026-01-01','EU','https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',now(),'approved'),
('GHG-CORPORATE','GHG Protocol Corporate Standard','WRI / WBCSD','Revised edition','Organizational and operational boundaries',null,'INTL','https://ghgprotocol.org/corporate-standard',now(),'approved'),
('GHG-SCOPE3','Corporate Value Chain (Scope 3) Standard','WRI / WBCSD','2011','15 Scope 3 categories','2011-01-01','INTL','https://ghgprotocol.org/corporate-value-chain-scope-3-standard',now(),'approved'),
('ISO-14064-1','ISO 14064-1','International Organization for Standardization','2018','Organization-level GHG quantification and reporting','2018-12-01','INTL','https://www.iso.org/standard/66453.html',now(),'approved'),
('ISO-14067','ISO 14067','International Organization for Standardization','2018','Carbon footprint of products','2018-08-01','INTL','https://www.iso.org/standard/71206.html',now(),'approved'),
('IFRS-S1S2','IFRS S1 and IFRS S2','IFRS Foundation / ISSB','2023','General and climate-related disclosures','2024-01-01','INTL','https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/',now(),'approved'),
('GRI-UNIVERSAL','GRI Universal Standards','Global Reporting Initiative','2021','GRI 1, GRI 2 and GRI 3','2023-01-01','INTL','https://www.globalreporting.org/standards/',now(),'approved')
on conflict (source_id) do update set source_title=excluded.source_title,source_authority=excluded.source_authority,source_version=excluded.source_version,source_clause=excluded.source_clause,valid_from=excluded.valid_from,jurisdiction=excluded.jurisdiction,source_url=excluded.source_url,last_reviewed_at=excluded.last_reviewed_at,review_status=excluded.review_status,updated_at=now();

commit;
