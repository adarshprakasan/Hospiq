# Testing and validation

[Documentation index](README.md)

## Automated checks

From the repository root after installing dependencies:

```powershell
npm --prefix server test
npm --prefix server run test:records
npm --prefix server run test:pharmacy
npm --prefix server run test:management
npm --prefix server run test:journey
npm --prefix client run lint
npm --prefix client run build
npm --prefix client run test:browser
npm --prefix server audit
npm --prefix client audit
git diff --check
```

The November 9 verification ran 36 server unit tests. It starts an ephemeral localhost HTTP server for unauthenticated-route checks and uses mocked database methods for ownership/workflow rules. The regression suite does not require a seeded database, email delivery, or Cloudinary uploads. The separate integration commands need MongoDB access and create uniquely named disposable databases: 106 record/QR checks use local SMTP, and 136 pharmacy/payment checks use the official Stripe SDK against a local HTTP provider fixture and signed local webhooks. They send no real email or charges and clean up afterward. Allow local loopback connections in your test environment. Never load production secrets in CI. See [Pharmacy verification](PHARMACY.md#verification-evidence).

Covered behaviors include authentication boundaries, rejection of admin signup and unsigned email proofs, hospital scope, linked-doctor ownership, midnight timezone alignment, health/404 responses, foreign-hospital token rejection, terminal state transitions, unavailable doctors, and invalid schedules.

The journey integration suite covers appointment capacity, visit notes and delegation, stock, lab orders, refund recovery and reminder delivery. The 445 integration checks include 106 records, 136 pharmacy, 113 management and 90 journey checks.

Playwright uses API fixtures for discovery through login, mobile appointment QR, saving a clinician draft, Arabic direction and the combined queue/history workspace. The mobile appointment state has an axe check. Windows uses installed Edge. On other platforms run `npx playwright install chromium` from `client` before the browser suite. [GitHub Actions](../.github/workflows/quality.yml) installs Chromium and runs the integration suites, lint, build and browser checks.

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

## Additional integration coverage to evaluate

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

## Medical records and consent integration

The initial medical-record extension added seven cases for 19 total at that point; the current suite runs 24 regression cases, including clinical ownership, safe serialization, date validation, supported signatures, encryption round trips, patient binding and tamper detection. `npm --prefix server run test:records` now exercises 89 checks through real HTTP routes against a new uniquely named disposable database on the configured MongoDB server and a local SMTP fixture. It creates only fictional data and removes its test database/storage on completion. The database user needs permission to create/drop that isolated database. It never sends real email.

Integration checks cover doctor-created and patient-uploaded visits, local-doctor association confirmation, protected files, own-doctor visibility, denied staff/admin/other-patient access, OTP delivery capture, incorrect/wrong-doctor/expired/exhausted/reused codes, consent, revocation, grant expiry, SMTP failure without an access grant, and retired public uploads. A fixture cannot establish Gmail delivery behavior or SMS support.

Browser verification on 6 November 2026 used that disposable fixture: patient-created visit submission, doctor-specific history, email-OTP approval and patient revocation were observed through the UI. Camera hardware capture and real patient-email delivery were not exercised.

## Patient QR verification

Five QR unit cases cover all-role ID stability, full-ID uniqueness, purpose-scoped signatures, payload privacy, tampering and invalid scan formats. The 89-case integration command includes signed-card retrieval, self-only access, QR/login separation, appointment/patient/doctor matching, wrong/cancelled/offline/old visits, preserved OTP boundaries, queue public IDs and visit-bound record creation. It rejects operator-shaped IDs in QR and matched-record requests.

The browser test used a generated QR image: patient homepage/dedicated card, doctor queue scan action, actual image decoding, matched patient/doctor context, starting the visit, automatic record form, and saved linked notes were observed. Physical camera hardware and permission behavior were not exercised. The ZXing decoder is dynamically loaded only when camera/image scanning is used.

The per-visit update additionally checks different codes for same-day appointments and changed visit dates, empty visit lists without a generic code, old permanent code rejection, completed-visit rejection, and unchanged clinical consent rules. The persistent large dataset is inserted by `seed:large`, separately from the disposable integration database. Its second run was verified to insert zero duplicates. See [the feature-testing walkthrough](TEST_TODAYS_FEATURES.md).

On the actual large-demo dataset, the browser verified that Patient 001's two same-day visit QR strings differ while their HQ ID is unchanged. The Oasis doctor rejected the Harbour visit's code with an explicit wrong-visit message and accepted the correct Oasis code. This check did not change the seeded appointment statuses or medical history.


## Scoped administration

`npm --prefix server run test:management` verifies 113 checks across six roles and two facilities in a disposable database, including cross-hospital query/body/path restrictions, employee credentials, clinical privacy, archive/restore guards, canonical departments, bank encryption, paging and an indexed hospital-user query. Browser checks verified platform/facility dashboards, scoped employee lists, department creation, banking controls and queue-only staff navigation. See [Administration](ADMINISTRATION.md).
