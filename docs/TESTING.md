# Testing and validation

[Documentation index](README.md)

## Automated checks

From the repository root after installing dependencies:

```powershell
npm --prefix server test
npm --prefix client run build
npm --prefix server audit
npm --prefix client audit
git diff --check
```

The Node test suite currently contains 12 cases. It starts an ephemeral localhost HTTP server for unauthenticated-route checks and uses mocked database methods for ownership/workflow rules. It does not require a seeded database, email delivery, or Cloudinary uploads. Allow local loopback connections in your test environment. Never load a production `.env` in CI; these tests do not need real secrets.

Covered behaviors include authentication boundaries, rejection of admin signup and unsigned email proofs, hospital scope, linked-doctor ownership, midnight timezone alignment, health/404 responses, foreign-hospital token rejection, terminal state transitions, unavailable doctors, and invalid schedules.

A successful frontend build proves bundling and compilation, not browser correctness. The checked-in ESLint config references dependencies absent from package.json; no working lint command or browser test suite is currently provided. There is no claimed coverage percentage.

## Manual smoke test

Use [Demo data](DEMO_DATA.md) in a disposable database:

| Scenario | Expected result |
|---|---|
| Patient searches for Cardiology | Matching facility departments are shown |
| Book a scheduled available doctor | Confirmation displays a token number |
| Repeat active booking for same doctor/date | Conflict; original token is preserved |
| Cancel own booking | History shows cancelled; active list excludes it |
| View hospital queue as its staff | Only doctors in that hospital are represented |
| View queue as another hospital's staff | Foreign hospital tokens are absent |
| View queue as linked doctor | Only the linked profile's visits are returned |
| Call, then complete a visit | Allowed; completed visit cannot be recalled |
| Mark doctor unavailable | New bookings are rejected |
| Edit schedule and reopen it | Saved weekdays/hours load correctly |
| Sign out on mobile and desktop | Stored session cleared, sign-in shown |
| Invalid URL | 404 page |
| Expired token | Session cleared and sign-in requested |

Also check keyboard focus, form labels, small screens, readable contrast, reduced-motion behavior, and printing. Native browser registration and provider delivery require separate testing.

## Database integration checks still needed

Against an isolated MongoDB database with actual required indexes:

- Concurrent online/offline bookings produce unique token numbers.
- Simultaneous duplicate online requests produce one active token.
- Cancellation frees the active-booking constraint for rebooking.
- Counter initialization preserves existing maximum token numbers.
- Hospital/doctor linking handles concurrent edits and partial failures.
- Real index creation and upgrade preflight work with representative historical data.
- Authenticated HTTP endpoints enforce ownership with real Users/Doctors/Tokens.

Mocked tests do not establish these properties. Record database version and query plans with test evidence.

## Historical verification

The initial redesign passed the 12-case suite and Vite build. Dependency audits reported zero known advisories after lockfile updates on 5 November 2026; rerun audits for current results. Subsequent demo seeds connected to the configured database, verified 3 hospitals/9 doctors/9 schedules, and verified login-controller behavior for 15 newly created accounts plus 9 doctor links. This was not a complete authenticated HTTP/browser or concurrency test. Browser preview was unavailable in the original environment.
