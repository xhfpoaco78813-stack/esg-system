# System-ESG V4.1.7 Gate 3 Revalidation Report

## Decision

**HOLD at Gate 3. Do not enter Gate 4.**

The two software defects reported in the latest V4.1.6 revalidation are fixed. Two evidence gates remain open: publishing the isolated frontend staging URL and completing the 10–20 person real-user pilot.

## Latest acceptance-center findings

| Finding | V4.1.7 result |
|---|---|
| P1 — privacy page calls removed `configureCloudDelete41()` | Fixed. The stale call is removed. Desktop, mobile, and delegated privacy entries use the current consent refresh path. The privacy status has a safe initial message. |
| P1 — pilot analyzer excludes incomplete participants | Fixed. Every started participant remains in the eight-task denominator. Incomplete records force HOLD and are listed by participant ID. |
| P1 — no shareable frontend staging URL | Open. The candidate is prepared for the isolated public staging repository; production remains unchanged. Publication still needs explicit authorization for the public destination. |
| P1 — no 10–20 person real-user pilot result | Open. The protocol, assessment, 20-row raw sheet, analyzer, and negative regression are ready. No human outcomes were invented. |

## Program changes

### Privacy and synchronization entry

- Removed the undefined function call that caused `ReferenceError`.
- Centralized desktop, mobile, and top-button navigation through `openPrivacy41()`.
- Refreshes the consent control whenever the privacy view opens.
- Added a non-empty initial status message for signed-out users.
- Added static and browser regression assertions for the privacy entry, status, refresh marker, and console errors.

### Human-pilot analysis integrity

- `task_total` now uses all started participants, not only complete records.
- Missing task outcomes count as unsuccessful rather than disappearing from the denominator.
- Data-loss, unrecoverable-block, P0, and P1 totals now include every started participant.
- The result reports `participants_incomplete`, `incomplete_participant_ids`, and completed-record segments.
- A complete 10-person two-segment fixture can PASS.
- An adversarial 20-person fixture with 10 complete and 10 incomplete records returns 93.75% task completion and HOLD.

## Regression status

| Suite | Result |
|---|---:|
| Gate 1 static acceptance | 23/23 |
| Gate 2 static acceptance | 38/38 |
| Gate 3 static acceptance | 48/48 |
| Pilot analyzer adversarial regression | 3/3 |
| State reload | 3/3 |
| Cloud deletion contract | 11/11 |
| Cross-device deletion model | 5/5 |
| New-generation pull model | 8/8 |
| PostgreSQL/PGlite migration integration | 9/9 |
| Prior staging API/CORS/RPC/Edge evidence | 17/17 |
| Prior direct Chrome/Edge cross-device evidence | 14/14 |

The latest local browser rerun reached both 1440 × 1000 and 390 × 844 with zero console errors, zero warnings, no HTTP failures, and no horizontal overflow before the final status assertion was strengthened. A final rerun of the strengthened browser assertion could not be launched because the desktop automatic approval service reported an account usage-limit error. This is recorded as an environment limitation and is not counted as a passing V4.1.7 browser result.

## Remaining work

1. Publish V4.1.7 to the isolated GitHub Pages staging repository and rerun desktop, mobile, HTTPS, cache, CORS, RPC, and Edge Function checks against the public URL.
2. Recruit 10–20 target users, run the supplied protocol, preserve incomplete/failed samples, and produce a PASS summary.

## Severity after remediation

- P0: 0
- P1 open: 2 evidence gates
- P2: 0
- P3: 0

V4.1.7 is ready for frontend staging publication and the human pilot. It is not yet eligible for Gate 3 PASS or Gate 4.
