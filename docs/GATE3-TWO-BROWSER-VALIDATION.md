# Gate 3 Two-Browser Validation

## Test environment

- Test window: `2026-10-12T22:52:24.830Z` to `2026-10-12T22:52:53.634Z` (`2026-10-13 06:52:24` to `06:52:53`, Asia/Shanghai)
- Device A: Chrome `154.0.8037.99`, desktop viewport `1280 × 900`
- Device B: Edge `155.0.4283.45`, mobile viewport `390 × 844`
- Frontend: local V4.1.6 candidate served with cache disabled
- Backend: isolated Supabase staging project `cytyjqucdrvjppmimmjs` over HTTPS
- Identity: the same synthetic staging validation account in two isolated browser profiles

## Result

**PASS — 14/14 checks**

1. A answered an approved question and B obtained the answer state.
2. The visible cloud-delete control had one active handler.
3. The versioned deletion RPC completed.
4. B cleared old answers and wrong-answer state after A deleted data.
5. B loaded data created in the new reset generation.
6. An offline answer remained available locally.
7. The offline answer synchronized after reconnection and appeared on A.
8. Reload preserved synchronized progress.
9. Sign-out, removal of local progress, and re-login restored cloud progress.
10. No duplicate answer keys were created.
11. Desktop had no horizontal overflow.
12. The 390px mobile viewport had no horizontal overflow.
13. JavaScript console errors and warnings: 0.
14. Unhandled HTTP 4xx/5xx: 0.

The browser trace contains 104 staging requests; every recorded response was HTTP 200 or 204. Screenshots are stored as `test-results/gate3-device-a-desktop.png` and `test-results/gate3-device-b-mobile.png`. The machine-readable evidence is `test-results/gate3-two-browser.json`.

## Database-level concurrency supplement

The separate staging API suite ran 17/17 checks. It issued the old-generation write and account deletion concurrently, then verified the reset version, rejected stale progress and drafts, loaded new-generation data, preserved the new draft, and confirmed one final progress row. Final database state recorded reset generation 7, progress version 2, and only the `G3-NEW` answer.

