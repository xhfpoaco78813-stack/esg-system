# System-ESG V4.1.8 Gate 3 Remediation Report

> Latest focused revalidation: `docs/GATE3-REVALIDATION-V418-REPORT.md`.

## Decision

The software remediation, isolated Supabase staging backend, Edge Functions, CORS, RPC/RLS, and two-browser validation are complete. The candidate remains **HOLD at Gate 3** for two external-evidence items:

1. The candidate frontend has not yet been published to a shareable staging URL. Publication is pending explicit approval for the public GitHub staging repository; the formal V4.0 website is unchanged.
2. The 10–20 person real-user pilot has not been run. The full toolkit is delivered, but automated tests cannot replace participant results.

Do not enter Gate 4 until both items are complete and the pilot thresholds pass.

## Program fixes

### P1-01 — isolated staging and cross-device integrity

- Created independent Supabase staging project `cytyjqucdrvjppmimmjs`.
- Added the fresh-project role prerequisite migration, then applied all nine migrations.
- Deployed `account-admin` and `question-bank-v41` Edge Functions.
- Validated RLS, versioned progress merge, reset generations, draft tombstones, account deletion, CORS, and authorized question-bank responses.
- Removed the obsolete `esg_progress` delete route. The visible delete control now owns one explicit V4.1 handler, pauses progress and draft synchronization, invokes `esg_delete_my_learning_data_v41`, installs the returned reset generation, and clears the active local state.
- Added a repeatable Chrome/Edge test covering two isolated browser profiles, offline recovery, reload, relogin, and deletion during synchronization.

### P1-02 — real-user pilot toolkit

Delivered:

- `docs/GATE3-PILOT-PROTOCOL.md`
- `docs/GATE3-PILOT-ASSESSMENT.md`
- `data/gate3-pilot-raw.csv` with 20 participant rows and 42 fields
- `tools/analyze_gate3_pilot.py`
- `test-results/gate3-pilot-summary.json`

The protocol covers ESG beginners and ESG/sustainability/carbon practitioners. Every participant performs login, assigned learning, scenario practice, one intentional error, wrong-answer remediation, report review, reload/relogin, pre-test, post-test, and SUS. The analyzer applies the specified 95% completion, 15-point improvement, SUS 70, zero data loss, zero unrecoverable block, P0=0, and P1=0 gates.

The empty template correctly returns `HOLD`; no participant outcomes were invented.

### P2-01 — wrong-answer naming

The official name is **错题回补**. Navigation, page title, buttons, empty states, learning reports, mobile UI, accessibility names, tests, and documentation use this term. The former `错题诊断` wording is removed.

### P2-02 — programmatic labels

All visible or conditional inputs, selects, and textareas receive a linked label, `aria-label`, or `aria-labelledby`. Account creation, search, role, MFA, feedback status, feedback note, and dynamically inserted controls are covered. Browser validation found zero unnamed controls on desktop and 390px mobile layouts.

### P3-01 — favicon

Added `assets/favicon.svg` and declared it in `index.html` and `trial.html`. The browser regression received HTTP 200 for the favicon and recorded no favicon 404.

## Regression evidence

| Suite | Result |
|---|---:|
| Gate 1 static acceptance | 23/23 |
| Gate 2 static acceptance | 38/38 |
| Gate 3 static acceptance | 43/43 |
| State reload | 3/3 |
| Cloud deletion contract | 11/11 |
| Cross-device deletion model | 5/5 |
| New-generation pull model | 8/8 |
| PostgreSQL/PGlite migration integration | 9/9 |
| Gate 2 desktop/mobile browser viewports | 2/2 |
| Gate 3 desktop/mobile browser viewports | 2/2 |
| Trial learning/practice/past-exam/reload checks | 7/7 |
| Supabase staging API/CORS/RPC/Edge checks | 17/17 |
| Direct Chrome/Edge cross-device checks | 14/14 |
| **Total executable checks** | **182/182** |

Additional results:

- Desktop `1440 × 1000`: pass, no horizontal overflow.
- Mobile `390 × 844`: pass, no horizontal overflow.
- Login, approved practice, learning report, wrong-answer remediation, reload continuation: pass.
- Trial learning, practice, past exam, and reload continuation: pass.
- Cloud synchronization enabled and disabled: pass in unit/browser coverage.
- JavaScript syntax: all shipped scripts pass.
- Console errors/warnings in Gate 3 and two-browser runs: 0.
- Unhandled HTTP 4xx/5xx in the two-browser run: 0.
- CORS preflight for both Edge Functions: pass.

## Staging verification versus remaining human work

Completed in actual staging:

- Database migrations, RLS, RPCs, and two Edge Functions.
- Two authenticated sessions for one account.
- Chrome desktop and Edge mobile synchronization.
- Deletion/write race, stale generation rejection, new generation pull, offline/reconnect, reload, and relogin.
- HTTPS backend, CORS, RPC, Edge Function, console, and request-status checks.

Still requires human participation:

- Recruit and run 10–20 target users.
- Enter task timing, mistakes, help events, pre/post scores, SUS, comments, device, and browser into the provided CSV.
- Run the analyzer and obtain `PASS` rather than the current expected empty-template `HOLD`.

Still requires publication authorization:

- Publish this candidate to the independent public GitHub staging repository and enable/confirm GitHub Pages HTTPS.
- Re-run the same browser suites against that shareable URL and record cache-update behavior. This does not affect the formal V4.0 site.

## Final severity list

- P0: 0
- P1 open: 2 evidence gates — shareable frontend staging URL; completed 10–20 person pilot
- P2: 0
- P3: 0

The candidate is ready for staging frontend publication and participant testing. It is not yet eligible for a Gate 3 pass or Gate 4.

