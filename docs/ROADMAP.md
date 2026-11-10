# Roadmap

[Documentation index](README.md) · [Historical project review](../PROJECT_REVIEW.md)

## Available now

- Public care discovery, future queue bookings, closure dates, daily capacity, rescheduling, check-in and consultation timing. One active consultation per doctor and measured wait estimates with a minimum sample size.
- Private clinician drafts, finalized amendments, structured vitals, visit summaries, reviewed local image OCR, and lab orders with result linking and review.
- Family profiles and adult delegation, password recovery, access history, in-app notifications, and optional next-day email reminders with delivery tracking.
- Unavailable pharmacy lines, separate payment and collection, full refunds before collection, and a manual batch inventory ledger.
- Search and pagination for the public directory and clinical history, partial Arabic and right-to-left support, CI, browser/accessibility checks, MongoDB readiness, request IDs and structured timing logs.

See [Care workflows](CARE_WORKFLOWS.md) for current behavior and [Operations](OPERATIONS.md) for setup.

## Before using real patient data

- Move legacy public medical attachments to private storage, add malware scanning, and support a managed private file store.
- Rehearse restoration of MongoDB, encrypted files and keys. Assign monitoring and alert ownership. Verify payment, email, and OCR providers in the deployment environment.
- Strengthen privileged account onboarding and session controls. Make multi-document provisioning and clinical writes recoverable where they span separate updates.
- Expand audit coverage and add shared rate limits and tested proxy settings for multi-instance deployments.

## Workflow improvements to evaluate

- Exact-time appointments, facility timezones, overnight shifts and confirmed no-show policies.
- Live queue delivery and optional SMS or push reminders.
- Verified guardianship, transfer to an independent account at adulthood, and fuller Arabic localization.
- Pharmacy stock reconciliation tied to collection, partial refunds, and returns after collection.
- External lab integration and dedicated lab staff permissions.

These are priorities for evaluation. See the [feature request template](https://github.com/adarshprakasan/Hospiq/issues/new?template=feature_request.yml) for proposing scope and acceptance criteria.
