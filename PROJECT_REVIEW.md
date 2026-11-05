# Project review and redesign

Review date: 5 November 2026. Product priority: patients and hospital staff equally.

## Implemented findings

| Priority | Original issue | Change |
|---|---|---|
| Critical | Patient profiles and history could be retrieved without authentication | Require authentication and self access on patient profile routes; enforce patient/author ownership on record reads |
| Critical | Public registration accepted administrator roles and did not require OTP verification | Restrict registration roles, validate fields, require a signed email-bound proof, consume proof once |
| High | Staff could retrieve all hospital tokens or modify foreign doctors, schedules, and hospitals | Load current account from database on each authenticated request; enforce hospital/doctor ownership |
| High | Doctor user IDs were treated as clinical Doctor IDs | Add explicit `Doctor.userId`, self-link profile creation, manager account-linking UI/API, and correctly scope queues/records |
| High | Token numbers used count + 1 and raced under concurrent booking | Use an atomic per-doctor/day counter, preserve numbering when upgrading, add unique indexes and active-booking constraints |
| High | Online/offline date filtering mixed UTC, local weekday, and nonexistent bookingDate | Use one configured timezone and persisted date for queue and consultation-hour checks |
| High | Registration codes used Math.random and plaintext storage | Use crypto randomInt, bcrypt hashing, five-attempt bound, expiration index, resend cooldown, auth rate limits |
| High | Installed dependencies carried security advisories | Patch both dependency trees; upgrade Cloudinary and Nodemailer; remove incompatible legacy Cloudinary adapter |
| Medium | Availability could be changed to arbitrary values and booking ignored availability | Validate enum values and reject unavailable/out-of-hours bookings |
| Medium | Completed/cancelled visits could reenter active workflows | Validate transitions; use conditional updates to reject stale writes; preserve cancelled history |
| Medium | Schedule editing overwrote existing days without loading them | Load existing schedule, reset on doctor change, validate unique weekdays/time ranges, avoid state mutation |
| Medium | Doctor profile fetched nonexistent /schedules route | Correct /schedule endpoint and weeklySchedule response handling |
| Medium | Cancel button and filters used statuses absent from backend enum | Align views with pending/called/skipped/completed/cancelled |
| Medium | Mobile navigation and logout/profile controls were missing | Responsive role-aware navigation with keyboard-accessible links and complete sign-out |
| Medium | Hospital cards advertised invented reviews/departments and a broken image placeholder | Render real stored departments, addresses, and facility type; remove fictional reviews |
| Medium | All page modules loaded eagerly | Split routes with lazy/Suspense; keep QR and role-specific screens in on-demand chunks |
| Medium | Uploads and request bodies had no size limits | Limit JSON to 100 KB; five 10 MB JPEG/PNG/PDF uploads; stream directly to Cloudinary |
| Medium | Coordinates and department duplication were weakly validated | Validate latitude/longitude bounds; trim department names and use atomic addToSet |
| Low | Missing 404, invalid localStorage crashes, expired sessions, hard-coded deployment URLs | Add fallback route, guarded parsing, session cleanup, environment configuration, request timeout and error boundary |

## Redesign delivered

A shared teal/neutral MUI theme brings consistent typography, buttons, form fields, surfaces, and responsive grids to existing screens. New patient discovery, booking confirmation, appointment history, login/registration, and staff queue screens use the same visual language. The patient homepage supports facility type and name/location/department search. The staff dashboard adds queue counts, search, status filters, walk-in registration, department creation, and direct links to doctors and schedules. The old MUI Grid props were updated for MUI 7. Loading, empty, error, and disabled states were added to the main flows; reduced motion and visible focus styles are included.

## Remaining work, ordered by impact

These are explicitly not represented as complete by this change.

1. **Medical-file privacy (release blocker):** Cloudinary uploads still return normal delivery URLs inherited from the existing design. API authorization does not make those assets private. Introduce authenticated/private assets, server-authorized short-lived delivery, file ownership metadata, and a migration for existing uploads. Validate file signatures and add malware scanning before real clinical use.
2. **Database integration and migration verification (release blocker):** Run the preflight and tests against a disposable MongoDB 7+ database. Exercise actual parallel booking/index enforcement, counter initialization, cancellation/rebooking, account linking, and schedule edits. Multi-document doctor/account and hospital/account updates need transactions or recovery logic for partial failures and concurrent cross-hospital links. No existing database was modified in this review.
3. **Credential/session hardening:** Move browser bearer tokens from localStorage to secure HttpOnly cookies with appropriate CSRF controls, add short-lived access tokens/session revocation, password reset, stronger staff onboarding, and explicit patient-care-team consent policies. Add issuer/audience validation and normalized email migration. Auth rate limiting is process-local and needs Redis/shared storage and correctly configured trusted proxies for multiple instances.
4. **Clinical records experience:** Build patient record history, clinician encounter entry, prescriptions, attachments, and consent-aware referrals. Current backend record operations are restricted, but there is no complete UI or appointment-to-encounter lifecycle.
5. **Queue experience:** Add live updates with reconnect/backoff, patient queue position, actual consultation timing, no-show handling, one active consultation per doctor, queue capacity, check-in and validated QR scanning. The QR currently encodes token details; it is not an authorization credential.
6. **Scheduling:** Add future date/slot booking, holidays/leave, per-facility timezones, capacity controls, and explicit overnight shifts. Current booking is same-day and only during consultation hours; schedules use simple day intervals.
7. **Notifications and follow-up:** Add opt-in reminders and call notifications, notification delivery tracking, visit follow-ups, and configurable retention/deletion policies.
8. **Operations:** Add structured logs without patient data, request IDs, audit trails, backups/restore drills, monitoring, graceful shutdown, HTTPS deployment configuration, and readiness checks that include required dependencies. `/api/health` is a liveness response only.
9. **Scale/performance:** Paginate token/history/facility APIs, project only necessary public fields, add query-plan measurements and record indexes, cache public facilities with invalidation, and use server-side search for large directories. History currently loads all patient tokens. Avoid caching patient records in shared caches.
10. **Maintainability and frontend QA:** The existing ESLint config references packages absent from package.json, so lint remains unconfigured. Add a deliberate lint/format setup, a disposable seeded browser-test environment, component tests for selection/error states, and accessibility checks at mobile/desktop sizes. Remove unused empty CreateDoctor.jsx and unused Department model only after deciding whether departments should stay embedded strings or become entities. Add CI build/security/test checks and dependency-update automation.

## Verification performed

- Production Vite build passed after code and dependency changes.
- 12 Node regression tests pass: private routes, role/proof validation, ownership, linked-doctor authorization, timezone midnight boundary, health/404, foreign-hospital token updates, terminal token transitions, unavailable booking, and invalid schedule entries.
- Tests use local HTTP for unauthenticated route checks and mocked database lookups for ownership/workflow rules. They do not prove live database index/concurrency behavior or external provider delivery.
- npm audits initially reported 11 server and 14 frontend advisories. Updated lockfiles report zero known vulnerabilities in both trees as of this review. This does not establish application security.
- Browser preview could not reach the local frontend from the browser environment (connection refused/timed out). Visual and authenticated browser verification remain pending.
- MongoDB, SMTP and Cloudinary delivery were not exercised against live services. No production data migration or deployment was performed.

## Subsequent demo validation and documentation

After the initial review, the demo seed connected to the configured MongoDB database and verified three fictional hospitals, nine doctors, and nine schedules. The account seed created fifteen demo users, verified their login-controller behavior, and verified nine doctor-account links. These actions intentionally inserted demo data; they did not constitute a full database concurrency, authenticated HTTP, browser, SMTP, or Cloudinary integration test. The documentation index is now available at [docs/README.md](docs/README.md).
