# System-ESG Gate 3 Pilot Operations v1.0

## Purpose

The V4.1.11 product candidate passes the technical Gate 3 checks. This auxiliary staging package removes the remaining operational friction for the required 10–20 person real-user pilot. It does not alter the production site and does not fabricate participant outcomes.

## Delivered workflow

- Public staging entry: `https://xhfpoaco78813-stack.github.io/esgtestsystem/pilot.html`
- Staging deployment commit: `3d5c30c3d63f3d50792c5a68b159e24d1ca6f775`
- `pilot.html`: responsive participant recorder for desktop and mobile.
- `assets/pilot-v1.js`: participant assignment, timers, strict validation, local draft recovery, and canonical CSV export.
- `assets/pilot-v1.css`: accessible desktop and 390px mobile layout.
- `data/gate3-pilot-invites.csv`: twenty anonymous staging links, split into ten beginner and ten practitioner slots.
- Twenty isolated Supabase staging learner accounts: one unique account for each P01–P20 slot; passwords are kept only in the coordinator's local private handoff file.
- `tools/merge_gate3_pilot_exports.py`: merges individual CSV files, rejects missing/duplicate IDs, preserves canonical fields, and runs the Gate 3 analyzer.
- `docs/GATE3-PILOT-EXECUTION.md`: coordinator instructions and evidence rules.

## Privacy and integrity controls

- No name, phone number, or personal email field exists.
- The participant must explicitly consent before a record can pass validation.
- Drafts remain in participant-scoped browser local storage.
- No pilot response is automatically sent to Supabase or another service.
- A CSV can be exported after the participant ID and consent checks pass. Incomplete or failed records are explicitly marked `record_status=incomplete` and retain `validation_errors`, so they cannot disappear from the denominator.
- Failed and incomplete tasks remain part of the record.
- Participant IDs are restricted to P01–P20; group assignment follows the approved fixed code rule.
- The merger rejects duplicate or blank participant IDs before analysis.

## Verification

| Suite | Result |
|---|---:|
| Pilot operations static acceptance | 23/23 |
| Individual CSV merge and analyzer integration | 6/6 |
| Desktop/mobile browser flow | 11/11 |
| Gate 1 regression | 23/23 |
| Gate 2 regression | 38/38 |
| Gate 3 regression | 53/53 |
| Existing pilot analyzer adversarial regression | 9/9 |
| State, deletion, cross-device, generation, and SQL regression | 45/45 |
| P1 incomplete-export and sync-preemption regression | 9/9 |
| Public staging files and production isolation | 6/6 |
| Real Chrome/Edge cross-device deletion race, repeated twice | 32/32 |
| Staging API/CORS/RPC/Edge Function | 17/17 |
| Staging account uniqueness, login, and learner-role verification | 20/20 |

The browser run confirmed draft save/reload, fixed segment assignment, complete-record validation, incomplete-record export with error metadata, accessible control names, no horizontal overflow at 390×844 and 1440×1000, zero console problems, and zero HTTP failures.

The public staging entry and all five changed V4.1.11 files returned HTTP 200 and matched the local candidate after newline normalization. The formal site returned HTTP 200 and does not contain V4.1.11.

All twenty staging accounts have distinct Supabase user IDs, passed password login, and were verified against `esg_roles` as `learner`. The tracked validation evidence contains no passwords or service keys. The private credential handoff is excluded by `.gitignore` and excluded from every project ZIP.

The V4.1.11 two-browser runs used Chrome 155 and Edge 155 against the public staging frontend and isolated Supabase project. Both runs passed 16/16 checks; visible cloud deletion completed in 799 ms and 813 ms while an older sync request was active, old-generation data did not return, and the new generation survived offline reconnect, reload, and re-login.

## Gate decision

Gate 3 remains **HOLD** until 10–20 real participants use this workflow and their actual data meet every predefined threshold. The tools are ready for controlled pilot execution; human participation remains external evidence.
