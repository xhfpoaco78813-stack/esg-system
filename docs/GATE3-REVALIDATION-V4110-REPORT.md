# System-ESG V4.1.10 Gate 3 Revalidation Report

Date: 2026-10-15 (Asia/Shanghai)  
Branch: `gate3-pilot-operations-v1`  
Candidate: `V4.1.10 Gate 3 Revalidation Candidate`  
Decision: **HOLD at Gate 3** because real participant evidence is still pending. Do not enter Gate 4.

## Scope

This release fixes the two P1 findings from the independent pilot-operations review. It is deployed only to the isolated staging site. The formal production site remains unchanged.

## P1-01 — Incomplete pilot samples can be exported

Changed `assets/pilot-v1.js` and `pilot.html` so a participant record can be downloaded once the anonymous participant ID and consent checks pass, even when required tasks are unfinished.

- Adds `record_status` with `complete` or `incomplete`.
- Adds `validation_errors` containing every failed rule.
- Adds `exported_at`.
- Preserves incomplete, failed, or withdrawn records in the analysis denominator.
- The merge tool accepts this metadata, retains the sample, and forces HOLD when the sample is incomplete.
- The UI now says the current record can be downloaded, including unfinished records.

Evidence:

- Static pilot operations: 23/23.
- Merge and analyzer integration: 6/6.
- Adversarial analyzer: 9/9.
- Desktop/mobile pilot browser: 11/11.
- Browser-exported incomplete record contained 28 validation errors and `record_status=incomplete`.

## P1-02 — Active sync no longer blocks cloud deletion

Changed `assets/sync-v40.js` from a shared busy flag and 10-second wait loop to a generation/epoch model.

- Pausing sync revokes consent and advances the client epoch immediately.
- Older progress and draft responses are discarded when their epoch is stale.
- A new generation may start without waiting for an obsolete request.
- Server-side reset-row locks and reset versions remain the source of truth.
- Old-generation progress and drafts cannot be uploaded after deletion.

Evidence from public staging and isolated Supabase:

- Chrome 155, desktop 1280×900, device A.
- Edge 155, mobile 390×844, device B.
- Same staging learner account on both browsers.
- 15/15 cross-device checks passed.
- Visible deletion during an active sync completed in 802 ms.
- Old progress cleared on B and did not resurrect.
- B loaded the new generation.
- Offline reconnect, reload, and re-login remained consistent.
- Duplicate answer keys: 0.
- Console error/warning: 0.
- Unhandled HTTP 4xx/5xx: 0.

## Staging verification

- Frontend: `https://xhfpoaco78813-stack.github.io/esgtestsystem/`
- Pilot recorder: `https://xhfpoaco78813-stack.github.io/esgtestsystem/pilot.html`
- Supabase project ref: `cytyjqucdrvjppmimmjs`
- Staging deployment tip: `5ebdc0a074b7bfa1c57eabc483c21600af72fa4e`
- Five changed frontend files: 5/5 HTTP 200 and matched the local candidate.
- Supabase API/CORS/RPC/Edge Function: 17/17, 21 requests.
- Production contains no V4.1.10 marker and was not overwritten.

## Full regression

| Suite | Result |
|---|---:|
| Gate 1 acceptance | 23/23 |
| State/delete/cross-device/generation checks | 28/28 |
| PostgreSQL integration | 9/9 |
| Gate 2 static acceptance | 38/38 |
| Gate 2 desktop and 390px browser | 2/2 |
| Gate 3 static acceptance | 53/53 |
| Gate 3 desktop and 390px browser | 2/2 |
| New P1 integrity regression | 9/9 |
| Pilot operations static acceptance | 23/23 |
| Pilot merge/analyzer integration | 6/6 |
| Pilot adversarial regression | 9/9 |
| Pilot desktop/mobile browser checks | 11/11 |
| Trial mobile learning/practice/reload checks | 7/7 |
| Public staging/frontend isolation | 6/6 |
| Two-browser deletion race | 15/15 |
| Staging API/CORS/RPC/Edge Function | 17/17 |

Every executed automated and browser check passed. JavaScript console errors/warnings and unhandled HTTP 4xx/5xx were zero in the browser acceptance runs.

## Remaining external evidence

The software and pilot tools are ready, but the real-user Gate 3 experiment has not yet been run. Current participant evidence remains:

- `participants_entered=0`
- `participants_valid=0`
- `decision=HOLD`

Gate 3 may be resubmitted only after 10–20 real target users complete the controlled pilot, both fixed segments have at least five valid participants, and the predefined completion, learning-effect, SUS, P0, and P1 thresholds are met. Automated tests and staging accounts do not replace this human evidence.
