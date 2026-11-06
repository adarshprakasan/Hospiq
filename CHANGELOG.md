# Changelog

Changes are recorded here as they land. No semantic-version release tag has been created for this documentation update.

## Unreleased

### Visit QR rotation and expanded demo data — 6 November 2026

- Replaced the permanent patient QR with signed visit-specific codes based on patient ID, appointment ID and visit date; stable user IDs remain unchanged.
- Added today's visit selector, appointment-specific downloads, empty/ended visit states and rejection of codes from another visit/date or retired permanent cards.
- Added a repeatable large seed with 6 facilities, 162 user accounts, 1,680 visits, 1,440 records and 480 encrypted sample PDF files; credentials remain local and existing data is preserved.
- Added the complete feature-testing walkthrough and verified zero duplicate inserts on the seed's second run.
- 24 regression tests and 89 isolated integration checks pass.


### Patient identity and visit scanning — 6 November 2026

- Stable HQ-prefixed IDs for all existing/new users without backfilling accounts.
- Permanent patient QR card on the homepage, Profile and My QR card page, with download/copy actions.
- Doctor per-appointment Scan patient QR with camera, local QR image decoding and paste fallback.
- Signed purpose-specific QR resolution restricted to the exact patient on the logged-in doctor's appointment today; no login or OTP-consent bypass.
- Matched visit context and record-entry handoff, validated visitTokenId storage, and clear offline/unregistered/cancelled appointment handling.
- 23 regression tests and 81 isolated integration checks; actual QR image scanning and visit-record saving verified in the browser.


### Medical history and consent — 6 November 2026

- Patient medical history and upload/camera intake; dated doctor visit notes, department, prescriptions, structured medications and lab files.
- Automatic visibility for the treating doctor's own associated records; other history requires patient-email OTP consent for a revocable 30-minute read grant.
- Single-use five-minute OTPs bound to patient/doctor/visit, attempt/resend limits, active-grant controls, and protected file downloads.
- AES-256-GCM private attachment storage with a separate key, signature checks, no-store downloads and hidden legacy public links; old public upload route retired.
- Seven additional regression cases and 48 isolated-database/local-SMTP integration checks, plus browser verification of patient entry, doctor consent and patient revocation.
- Email is implemented; SMS and automated OCR remain future work. Historical public Cloudinary assets require separate migration.


### Added

- Expanded README and setup, configuration, user, demo, architecture, API, testing, deployment, and roadmap guides.
- ISC license text, copyright notice, third-party notices, contribution/security/support/conduct policies, and issue/PR templates.
- Repository and package descriptions, author/project links, and discovery topics/keywords.

### Current implementation baseline — 5 November 2026

Commit `1d12242` introduced the following redesign and hardening work. This is a source baseline, not a production-readiness or formal release claim.

- Shared responsive theme/navigation and redesigned patient discovery, booking, appointment history, authentication, and staff queues.
- Hospital search/type filters, queue search/status filters/counts, walk-in registration, cancellation history, and doctor-account linking.
- Email verification proof, hashed OTPs, stronger ownership checks, bounded requests/uploads, and current-account authentication.
- Atomic queue counters, unique booking indexes, timezone alignment, status transitions, schedule loading/validation, and corrected API paths.
- Lazy-loaded page routes and dependency security updates.
- Twelve backend regression tests, read-only upgrade preflight, and repeatable demo facility/account seeds.

### Known limitations

Private medical-file delivery, transaction/recovery handling, full database concurrency/browser validation, complete clinical-record UI, future scheduling, real-time updates, and operational controls remain outstanding. See [Roadmap](docs/ROADMAP.md) and [Security](SECURITY.md).
