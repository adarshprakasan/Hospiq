# Security policy

## Pharmacy access and payments

Pharmacists must be assigned to a hospital by its staff. They can manage that hospital's medication catalogue and see only explicitly sent prescription/dispensing snapshots, not general medical history or attachments. Patient pharmacy orders are scoped to the patient. Preparation and counter-payment updates enforce hospital ownership, order versions, and allowed states.

Stripe checkout uses server-calculated, frozen AED totals and sends generic pharmacy order labels rather than clinical medicine names. Online paid status requires a signature-verified webhook or server-retrieved session with matching amount, currency, order, attempt and session. Counter settlement is blocked while an online session can still charge. Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` server-only; use test-mode credentials for evaluation. See [Pharmacy setup](docs/PHARMACY.md).

## Status and supported development line

The default branch is the maintained development line. There are no versioned release-support guarantees or published response-time commitments. Hospiq is not currently represented as ready to handle real patient data.

## Reporting a vulnerability

Do not publish exploit details, patient information, credentials, tokens, or database URLs in public issues. If GitHub's **Security → Report a vulnerability** option is available for this repository, use it. Otherwise open a public issue asking the maintainer for a private reporting channel, without technical exploit or sensitive details. This document does not imply that GitHub private vulnerability reporting is enabled.

Include the affected commit, component, sanitized reproduction, impact, and a proposed mitigation where possible. Use fictional accounts/data and only test systems you are authorized to access. Maintainer profile: [Adarsh](https://github.com/adarshprakasan).

## Existing controls

- JWT signature verification with a current User lookup on protected requests.
- Role and hospital/linked-doctor ownership checks on management and queue operations.
- Patient self-access and authored-record restrictions.
- Hashed passwords/OTPs, bounded OTP attempts, expiry checks, resend cooldown, and process-local auth throttling.
- Request/file limits and unique booking indexes.

These controls do not establish regulatory compliance or eliminate application risk.

## Known release blockers and limits

- New medical attachments use encrypted private storage and authorized downloads. Historical Cloudinary URLs may still be public outside the app: responses quarantine them, but existing provider assets must be migrated/removed separately.
- Browser tokens are stored in localStorage, have a seven-day lifetime, and lack a dedicated revocation/refresh service.
- Staff/doctor self-registration does not verify real-world credentials or affiliation; hospital association alone is not a complete onboarding policy.
- Doctor record creation now requires a called/completed token relationship. Other doctors' history needs a five-minute patient-email OTP for a revocable 30-minute read grant. Clinical credential/affiliation verification and richer consent scope still need work.
- Full clinical access audit trails, retention policies, malware scanning, transaction/recovery behavior, and broad integration coverage remain incomplete. JPEG/PNG/PDF signature checks are not malware scanning. Attachment keys/storage backups and deployment permissions need operational management.
- IP throttling is local to each process, and trusted-proxy behavior must be configured deliberately for hosting.
- Demo credentials are generated for fictional testing; remove or isolate demo users before any real deployment.

Track remediation in the [roadmap](docs/ROADMAP.md) and [project review](PROJECT_REVIEW.md). Do not advertise compliance certifications based on this repository.

## Secret hygiene

Keep `.env` files, generated passwords, JWTs, and provider credentials out of Git. If a secret is exposed, rotate it at the issuing system and review affected access; deleting it from a new commit does not invalidate it or remove history. Production configuration belongs in a secret manager. Dependency audits are time-sensitive checks, not security certification.

## Patient QR identity boundary

The per-visit patient QR is a signed identity pointer, not a login credential, OTP, or medical-access grant. It contains only the patient identifier, appointment identifier and visit date, not medical or contact data. Doctors must have the exact matching active registered appointment today; another visit, patient, ended visit or previous-day code is rejected. A copied card is not proof of liveness; the doctor should still confirm the person and patient ID in the visit. Account deletion or signing-secret rotation can make a card unusable; the public user ID remains stable. Never treat a successful scan as approval for another doctor's clinical history.
