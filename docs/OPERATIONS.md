# Rollout and operations

## Before rollout

1. Back up MongoDB, the encrypted medical-file volume, and encryption keys. Store keys separately with restricted access. Database-only backups cannot recover uploaded files; files without their key cannot be decrypted.
2. Restore a backup to an isolated environment and verify a known attachment can be downloaded and decrypted through the application. Record restore duration and validate document counts. Do not restore test data over production or use production email/payment credentials in rehearsal.
3. Run `npm run check:upgrade` from `server` against the restored database. It is read-only and reports duplicate queue numbers, active bookings, capacity slots, open consultations and unlinked doctors. Resolve conflicts with the clinical owner; do not delete history or renumber historical records automatically.
4. Run the suites in [Testing](TESTING.md), including `npm run test:journey` in `server`, and `npm run lint`, `npm run build`, `npm run test:browser` in `client`. Browser tests use Edge on Windows and Chromium elsewhere; CI installs Chromium.
5. Start the new server against the restored database. Startup waits for registered model indexes and fails if required indexes cannot be created. Existing records without a status remain readable as finalized records; new drafts are explicit. Capacity slots for legacy bookings are assigned on the next capacity-limited booking. Enabling a limit below existing bookings does not remove them; it prevents additional bookings.
6. Verify every role, patient context switching/revocation, draft privacy, booking capacity, file access and a Stripe test-mode checkout/refund. Then deploy during a controlled window with a matching frontend and backend.

No production backup, restore, migration or deployment is performed by the source changes. Define backup retention, recovery targets and alert ownership for the actual hosting environment. Preserve the database and files on rollback; old clients do not understand all new workflow states. Roll back to a compatible release after review rather than restoring an older database over new clinical activity.

## Health and logs

- `/api/health` checks process liveness. `/api/ready` returns 200 after a successful MongoDB ping and 503 otherwise. Readiness does not validate SMTP, Stripe or OCR.
- Every response receives `X-Request-Id`. With `LOG_REQUESTS=true`, JSON timing logs include request ID, method, route template, status and duration. Credentials, request bodies and query strings are excluded. Apply retention and access controls to the log destination.
- Startup waits for indexes. SIGTERM/SIGINT stops accepting requests, closes MongoDB and bounds shutdown time. Configure the host's grace period accordingly.
- Monitor sustained readiness failures, 5xx rates, duplicate-index startup failures, failed reminder deliveries and refunds left processing. No external monitoring service has been provisioned.

## Reminder worker

Configure `CLIENT_URL` and the existing SMTP settings in `server/.env.example`. Patients must explicitly enable email reminders. Run `npm run reminders:run` from `server` through the deployment scheduler, for example hourly. No scheduler is created by this repository. The worker sends next-day visit reminders using `HOSPITAL_TIMEZONE`, leases delivery attempts, retries up to three times, and deduplicates successful deliveries. Email bodies omit clinical details. A crash after SMTP acceptance but before recording success can still cause duplicate delivery; SMTP does not provide exactly-once delivery.

Use one configured hospital timezone per deployment. Per-facility timezones, SMS, push notifications and realtime socket delivery are not implemented.

## Local OCR

Install a trusted Tesseract binary on the server and the required language data. Set `TESSERACT_PATH` to that executable and optionally `OCR_LANGUAGES=eng+ara`. See the [Tesseract installation guide](https://tesseract-ocr.github.io/tessdoc/Installation.html) and [command-line documentation](https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html).

The adapter uses stdin/stdout without a shell or an external OCR provider. It enforces image signatures, bounded output, timeout and concurrency. OCR must be tested with the deployed binary; repository tests exercise the process adapter with a fixture. OCR is not malware scanning. Production malware scanning and private object-storage migration remain infrastructure work.

## External payment validation

Use Stripe test credentials first. Confirm the original order reference, amount and currency, webhook signature handling, refund retries and provider failure handling. A pending refund blocks collection. Never mark a pending online refund successful manually merely to unblock the UI. Counter refund confirmation records an operator declaration; it cannot verify physical cash movement.

## Current evidence

Local verification on 2026-11-09 passed 36 server unit tests, 106 medical-record checks, 136 pharmacy checks, 113 management checks, 90 expanded-journey checks and five browser journeys. The mobile appointment accessibility check found no serious or critical violations in its tested state. Coverage is not an accessibility certification or a production payment/email test. CI is configured but has not been run remotely as part of this change.
