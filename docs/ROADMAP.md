# Roadmap

[Documentation index](README.md) · [Detailed review](../PROJECT_REVIEW.md)

These priorities describe intended work, not committed dates or shipped functionality.

## Before real patient data

- Migrate any historical public medical assets, add malware scanning and managed private object-storage support; new attachments already use encrypted local private storage and authorized downloads.
- Disposable-database concurrency tests for booking uniqueness, counters, status changes, account linking, and upgrade migrations.
- Transactional or recoverable multi-document hospital/doctor-account changes.
- Stronger staff onboarding, explicit care-team consent, secure session storage/revocation, password recovery, and consistent validation/error responses.
- Audit events, sanitized logging, monitored backups, restore tests, and dependency-aware readiness.

## Patient and care-team experience

- Real-time queue updates, reconnect handling, queue position and measured wait estimates.
- One active consultation per doctor, capacity/no-show policies, and optional stronger proof-of-presence beyond the implemented signed patient QR appointment match.
- Future appointments, holidays and leave, timezone per facility, overnight shift rules.
- Extend the implemented patient history and clinician visit/prescription/attachment interfaces with versioned corrections, richer encounters and optional reviewed OCR.
- Opt-in reminders, follow-up messaging, and delivery tracking.
- Improved staff invitation/account lifecycle and a deliberate admin experience.

## Scale and maintainability

- Paginated histories and facility lists, server-side directory search, measured query indexes.
- Public-data caching with invalidation while excluding private patient data from shared caches.
- Shared rate-limiting store and tested proxy configuration for multiple instances.
- Consolidate embedded department strings versus the legacy Department model.
- Lint/format tooling, browser and accessibility tests, CI checks, and dependency automation.

Open a focused [feature request](https://github.com/adarshprakasan/Hospiq/issues/new?template=feature_request.yml) with the user problem, intended roles, scope, and acceptance criteria before implementing major additions.
