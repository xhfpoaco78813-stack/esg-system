# System-ESG V4.1.9 Gate 3 Staging Manifest

## Environment separation

- Candidate: **V4.1.9 Gate 3 Revalidation Candidate**
- Supabase staging project: `esg-system-gate3-staging`
- Project ref: `cytyjqucdrvjppmimmjs`
- API URL: `https://cytyjqucdrvjppmimmjs.supabase.co`
- Dashboard: `https://supabase.com/dashboard/project/cytyjqucdrvjppmimmjs`
- Runtime config uses the staging publishable key only. No service-role or secret key is packaged.
- Production project and the V4.0 public site were not modified.
- Public staging frontend URL: `https://xhfpoaco78813-stack.github.io/esgtestsystem/`
- Staging frontend commit: `6e38424b983847bd07b9b56ae449362ab0dc431e`
- HTTPS verification: entry page, V4.1.9 layer, trial page, and favicon all returned HTTP 200 on 2026-10-14 (Asia/Shanghai).
- Production project and `https://xhfpoaco78813-stack.github.io/esg-system/` remain unchanged; the production response does not contain V4.1.9.

## Applied migrations

1. `202609140001_v33_roles_prerequisite.sql`
2. `202609150001_v34_feedback.sql`
3. `202609170001_v36_account_admin.sql`
4. `202610070001_v39_venture_validation.sql`
5. `202610080001_v40_cross_device_sync.sql`
6. `202610080002_v40_exam_draft_tombstone.sql`
7. `202610080003_v40_exam_draft_polling.sql`
8. `202610090001_gate1_v41_state_privacy_question_access.sql`
9. `202610090002_gate1_v412_concurrency.sql`

The first migration is a fresh-project prerequisite. It creates `esg_roles` and `esg_is_editor()` before the feedback and governance migrations reference them.

## RLS scope

RLS is enabled for roles, feedback, admin audit, knowledge sources, knowledge points, product events, validation leads, competency snapshots, V4 progress, V4 exam drafts, reset generations, restricted questions, and entitlements. Learner rows are restricted to the authenticated user. Editor and admin access uses server-side role checks; sensitive management flows require AAL2 where defined.

## RPC inventory

- `esg_merge_learning_state_v40(jsonb, uuid)`
- `esg_sync_exam_draft_v41(jsonb, uuid, boolean, bigint)`
- `esg_delete_my_learning_data_v41()`
- `esg_get_questions_v41(text, integer)`
- `esg_check_answer_v41(text, jsonb)`
- `esg_is_editor()`

The retired `esg_sync_exam_draft_v40` RPC remains as a compatibility rejection stub and has no execute grant for authenticated clients.

## Edge Functions

- `account-admin`: deployed; CORS allows the GitHub Pages origin and local admin validation origin; admin operations require authenticated AAL2 plus the server-side admin role.
- `question-bank-v41`: deployed; authenticated list and answer-check calls use restricted RPCs so list results do not expose answer payloads.

## Runtime and CORS verification

`test-results/gate3-staging-frontend.json` records the public staging deployment, four successful HTTP 200 checks, the deployed commit, and the production-isolation check.

`test-results/gate3-staging-api.json` records a fresh 17/17 run and 21 successful HTTPS requests, including both Edge Function preflights, the authorized question-bank response, two authenticated sessions, RPC concurrency, reset generation, draft tombstone, and final database state.

`test-results/gate3-two-browser.json` records 14/14 checks from Chrome desktop and Edge mobile emulation directly connected to this staging backend. All 104 recorded staging requests returned HTTP 200 or 204.
