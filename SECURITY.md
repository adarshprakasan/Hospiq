# Security policy

## Pharmacy access and payments

Pharmacists must be assigned to a hospital by its Hospital/Clinic Admin. They can manage that hospital's medication catalogue and see only explicitly sent prescription/dispensing snapshots, not general medical history or attachments. Patient pharmacy orders are scoped to the patient. Preparation, counter payment, collection and refund actions enforce hospital ownership and applicable order version and state checks. Refunds require a paid, uncollected order. Online refund attempts are persisted for safe retries.

Stripe checkout uses server-calculated, frozen AED totals and sends generic pharmacy order labels rather than clinical medicine names. Online paid status requires a signature-verified webhook or server-retrieved session with matching amount, currency, order, attempt and session. Counter settlement is blocked while an online session can still charge. Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` server-only; use test-mode credentials for evaluation. See [Pharmacy setup](docs/PHARMACY.md).

## Status and supported development line

The default branch is the maintained development line. There are no versioned release-support guarantees or published response-time commitments. Hospiq is not currently represented as ready to handle real patient data.

## Reporting a vulnerability

Do not publish exploit details, patient information, credentials, tokens, or database URLs in public issues. If GitHub's **Security → Report a vulnerability** option is available for this repository, use it. Otherwise open a public issue asking the maintainer for a private reporting channel, without technical exploit or sensitive details. This document does not imply that GitHub private vulnerability reporting is enabled.

Include the affected commit, component, sanitized reproduction, impact, and a proposed mitigation where possible. Use fictional accounts/data and only test systems you are authorized to access. Maintainer profile: [Adarsh](https://github.com/adarshprakasan).

## Existing controls

- JWT signature verification with a current User lookup on protected requests.
- Role and hospital/linked-doctor ownership checks on management and queue operations.
- Patient self-access, authored-record restrictions and consent checks. Private clinician drafts stay with the author.
- Dependent and delegated patient context is reauthorized per request. Clinical access history records actor identity for supported reads.
- Password recovery uses hashed, expiring tokens and revokes earlier sessions after reset.
- Hashed passwords/OTPs, bounded OTP attempts, expiry checks, resend cooldown, and Redis-backed IP, recipient and account throttling in production.
- Request/file limits and unique booking indexes.

These controls do not establish regulatory compliance or eliminate application risk.

## Known release blockers and limits

- New medical attachments use encrypted private storage and authorized downloads. Historical Cloudinary URLs may still be public outside the app: responses quarantine them, but existing provider assets must be migrated or removed separately. Run `node server/scripts/audit-legacy-attachments.js` against the intended database for a count-only inventory. Check the corresponding Cloudinary account for orphaned assets and custom delivery domains. Preserve required records in private storage before revoking public delivery or deleting assets, invalidate cached copies, and verify anonymous access to old URLs fails. The database count cannot establish provider-side reachability.
- Browser bearer tokens are stored in localStorage and accepted for up to one hour. The production frontend build restricts scripts to its own origin with CSP. Password changes, resets and account actions use session versions to revoke existing tokens.
- Staff and doctors are provisioned through authorized administrators. Real-world credentials, facility affiliation and declared guardianship require verification outside the current workflow.
- Doctor record creation now requires a called/completed token relationship. Other doctors' history needs a five-minute patient-email OTP for a revocable 30-minute read grant. Clinical credential/affiliation verification and richer consent scope still need work.
- Full clinical access audit trails, retention policies, malware scanning, transaction/recovery behavior, and broad integration coverage remain incomplete. JPEG/PNG/PDF signature checks are not malware scanning. Attachment keys/storage backups and deployment permissions need operational management.
- Production requires a shared Redis store. Configure trusted proxy CIDRs for your ingress before routing traffic. Local development can run with per-process throttling.
- Demo credentials are generated for fictional testing; remove or isolate demo users before any real deployment.

Track remediation in the [roadmap](docs/ROADMAP.md) and [project review](PROJECT_REVIEW.md). Do not advertise compliance certifications based on this repository.

## Secret hygiene

Keep `.env` files, generated passwords, JWTs, and provider credentials out of Git. If a secret is exposed, rotate it at the issuing system and review affected access; deleting it from a new commit does not invalidate it or remove history. Production configuration belongs in a secret manager. Dependency audits are time-sensitive checks, not security certification.

## Patient QR identity boundary

The per-visit patient QR is a signed identity pointer, not a login credential, OTP, or medical-access grant. It contains only the patient identifier, appointment identifier and visit date, not medical or contact data. Doctors must have the exact matching active registered appointment today; another visit, patient, ended visit or previous-day code is rejected. A copied card is not proof of liveness; the doctor should still confirm the person and patient ID in the visit. Account deletion or signing-secret rotation can make a card unusable; the public user ID remains stable. Never treat a successful scan as approval for another doctor's clinical history.


## Administrative role separation

Hospiq Admins manage platform operations; Hospital/Clinic Admins manage their own facility. Staff cannot provision users, create departments/facilities, edit banking/catalogues or complete clinical visits. Doctors control their own availability but not weekly schedules. Employee provisioning/reset issues temporary credentials with a first-login gate and session version invalidation. Existing patient credentials cannot be issued by administrator reset endpoints to bypass history privacy.

Management APIs derive hospital scope from the authenticated account and allowlist fields. Clinical-history routes retain patient/doctor consent rules; admins cannot use a generic records CRUD endpoint. Archives preserve related clinical/payment data. Administrative changes and bank reveals have redacted audit intent/result events. Bank identifiers are AES-GCM encrypted under a hospital-bound key derived separately from the existing medical master key, and are stored outside public hospital documents. Back up that master securely; rotating it requires data migration. See [Administration](docs/ADMINISTRATION.md).
