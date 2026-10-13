# System-ESG V4.1.9 Gate 3 Revalidation Report

## Decision

**HOLD at Gate 3. Do not enter Gate 4.**

The product and staging P1 items in the latest acceptance feedback are fixed and evidenced. One P1 remains: the 10–20 person real-user pilot has not been performed. Automated or fabricated participant outcomes are not accepted as a substitute.

## Latest acceptance findings

| Finding | V4.1.9 result |
|---|---|
| P1 — started sample can be ignored through a blank participant ID | Fixed. Any row containing `pilot_started` or substantive pilot data remains in the denominator. A missing participant ID creates a row-numbered validation error and forces HOLD. |
| P1 — pilot data can evade validation by clearing `pilot_started` | Fixed. Substantive task, score, device, survey, or count data keeps the row in scope. Missing/invalid `pilot_started` forces HOLD. |
| P1 — public staging URL returned 404 | Fixed. The isolated staging URL is live and the entry page, V4.1.9 script, trial page, and favicon all return HTTP 200. |
| P1 — no 10–20 person real-user pilot | Open. The toolkit is complete; real participants and their actual observations are still required. |

## Public staging evidence

- URL: `https://xhfpoaco78813-stack.github.io/esgtestsystem/`
- Frontend commit: `6e38424b983847bd07b9b56ae449362ab0dc431e`
- Backend project ref: `cytyjqucdrvjppmimmjs`
- Frontend checks: 4/4 HTTP 200.
- Supabase staging API/CORS/RPC/Edge checks: 17/17, 21/21 requests successful.
- Direct Chrome desktop and Edge mobile staging-backend checks: 14/14.
- Console errors/warnings: 0.
- Unhandled HTTP 4xx/5xx: 0.
- Formal V4.0 site was not overwritten and does not contain V4.1.9.

## Pilot analyzer evidence

The regression suite now covers nine scenarios:

1. Ten complete participants with five in each fixed segment can PASS.
2. Incomplete started participants remain in the denominator.
3. Ten complete plus ten incomplete participants HOLD.
4. Arbitrary segment labels HOLD.
5. Each fixed segment needs at least five valid participants.
6. Out-of-range scores, SUS values, durations, and negative counts HOLD.
7. More than twenty participants HOLD.
8. A started row with a blank participant ID remains included, reports its CSV row number, and HOLDs.
9. A row with pilot data cannot disappear by clearing `pilot_started`.

## Regression results

| Suite | Result |
|---|---:|
| Gate 1 static acceptance | 23/23 |
| Gate 2 static acceptance | 38/38 |
| Gate 3 static acceptance | 52/52 |
| Pilot analyzer positive/adversarial regression | 9/9 |
| State reload | 3/3 |
| Cloud deletion contract | 11/11 |
| Cross-device deletion model | 5/5 |
| New-generation pull model | 8/8 |
| PostgreSQL/PGlite migration integration | 9/9 |
| Gate 2 desktop and 390px browser | 2/2 |
| Gate 3 desktop and 390px browser | 2/2 |
| Trial learning, practice, past exam, and reload | 7/7 |
| Public staging frontend HTTPS | 4/4 |
| Staging API/CORS/RPC/Edge | 17/17 |
| Direct two-browser staging-backend validation | 14/14 |

## Severity after remediation

- P0: 0
- P1 open: 1 — real-user pilot evidence
- P2: 0
- P3: 0

V4.1.9 is ready for the controlled 10–20 person pilot on the isolated staging URL. Gate 3 remains HOLD until the pilot data is collected, validated, and meets the predefined thresholds.
