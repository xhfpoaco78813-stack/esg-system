# System-ESG V4.1.8 Gate 3 Revalidation Report

## Decision

**HOLD at Gate 3. Do not enter Gate 4.**

The two pilot-analyzer defects reported against V4.1.7 are fixed and covered by negative regression tests. Two evidence gates remain open: a shareable isolated frontend staging URL and a completed 10–20 person real-user pilot.

## Latest acceptance-center findings

| Finding | V4.1.8 result |
|---|---|
| P1 — arbitrary group text can satisfy segment coverage | Fixed. Only `beginner` and `practitioner` are accepted. Each requires at least five complete, valid participants. |
| P1 — out-of-range or negative values can still PASS | Fixed. Scores, SUS answers, task durations, and all count fields are validated. Invalid data is emitted in `validation_errors` and forces HOLD. |
| P1 — no shareable frontend staging URL | Open. The isolated backend and public staging repository target are prepared, but publication has not occurred. |
| P1 — no 10–20 person real-user pilot | Open. The complete toolkit is ready; no participant outcome was invented. |

## Analyzer rules

- Sample size must be 10–20 started participants.
- Segment code must be exactly `beginner` or `practitioner`.
- Each fixed segment must contain at least five complete, valid participants.
- Task status must be `pass` or `fail`.
- Pre-test and post-test scores must be finite numbers from 0 to 100.
- SUS answers must be integers from 1 to 5.
- All eight task durations must be finite and non-negative.
- Operation errors, help events, data loss, unrecoverable blocks, P0, and P1 values must be non-negative integers.
- Duplicate participant IDs, missing required fields, invalid choices, non-numeric values, infinities, and out-of-range values are listed in `validation_errors`.
- Any validation error forces `input_data_valid=false` and `decision=HOLD`.

## Negative regression evidence

1. Ten valid participants, five in each segment: PASS fixture.
2. Ten complete plus ten incomplete participants: HOLD.
3. Nine beginners plus one arbitrary segment string: HOLD.
4. No valid practitioners: HOLD.
5. Pre-test `-100`, post-test `200`, task time `-5`: validation errors and HOLD.
6. Negative values across all six count fields: validation errors and HOLD.
7. SUS value `6` and non-numeric task time: validation errors and HOLD.
8. Twenty-one participants: HOLD.

## Regression results

| Suite | Result |
|---|---:|
| Gate 1 static acceptance | 23/23 |
| Gate 2 static acceptance | 38/38 |
| Gate 3 static acceptance | 50/50 |
| Pilot analyzer positive and adversarial regression | 7/7 |
| State reload | 3/3 |
| Cloud deletion contract | 11/11 |
| Cross-device deletion model | 5/5 |
| New-generation pull model | 8/8 |
| PostgreSQL/PGlite migration integration | 9/9 |
| Gate 2 desktop and 390px browser | 2/2 |
| Gate 3 desktop and 390px browser | 2/2 |
| Trial learning, practice, past exam, and reload | 7/7 |
| Prior staging API/CORS/RPC/Edge evidence | 17/17 |
| Prior direct Chrome/Edge cross-device evidence | 14/14 |

V4.1.8 desktop and 390px tests recorded zero console errors, zero warnings, zero HTTP failures, and no horizontal overflow. The privacy view showed its consent status and completed the refresh path.

## Severity after remediation

- P0: 0
- P1 open: 2 evidence gates
- P2: 0
- P3: 0

V4.1.8 is ready for isolated frontend staging publication and the human pilot. Gate 3 remains HOLD until both evidence gates pass.
