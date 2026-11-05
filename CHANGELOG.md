# Changelog

Changes are recorded here as they land. No semantic-version release tag has been created for this documentation update.

## Unreleased

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
