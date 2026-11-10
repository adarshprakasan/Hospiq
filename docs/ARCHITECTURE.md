# Architecture and data model

[Documentation index](README.md)

## Runtime structure

| Component | Responsibility | Main source |
|---|---|---|
| Browser application | Routing, forms, role-aware views, token display | `client/src/App.jsx`, `client/src/pages` |
| Shared UI | Theme, navigation, layouts, render-error fallback | `client/src/theme.js`, `client/src/components` |
| HTTP client | API base URL, bearer header, timeout, 401 cleanup | `client/src/api/axios.js` |
| Express application | CORS, JSON parsing, routes, JSON errors | `server/app.js` |
| API startup | Required settings, MongoDB connection, index initialization | `server/server.js` |
| Controllers | Business operations and authorization filters | `server/controllers` |
| Middleware | Authentication, roles, ownership, rate limit, uploads | `server/middlewares` |
| Persistence | Mongoose schemas and query indexes | `server/models` |
| Providers | Gmail/custom SMTP email; medical-file service encrypts files on private storage | `server/utils` |
| Maintenance | Read-only preflight and demo seeds | `server/scripts` |
| Regression suite | HTTP boundary checks and mocked workflow tests | `server/test/security.test.js` |

The frontend and API run as separate processes. The API does not serve `client/dist`. Vite builds a single-page application with lazy page chunks; production hosting needs an SPA fallback for deep links.

## Entities and relationships

The pharmacy extension adds `PharmacyOrder` snapshots linked to a medical record, patient, doctor, hospital and appointment. A unique appointment index prevents duplicate bills; a hospital/date/token index distinguishes pharmacy tokens. Orders carry prescription lines, preparation checklist, explicit dispensing quantities and integer-fils prices, version, ready state, frozen total, independent payment state, and payment audit details. `Medication` stores hospital-scoped catalogue entries with strength/form in the name, optional AED unit price, selling unit and availability.

Only hospital-assigned pharmacists can write medication catalogues or prepare/settle pharmacy orders. Patients read/pay their own orders, doctors explicitly hand off their own doctor-authored prescriptions, and hospital administrators create/link employee accounts. Clinical access remains under its separate patient/doctor consent policy. The Stripe webhook route uses raw-body parsing before JSON middleware; checkout creation/reuse, signed events and server-side reconciliation live in `server/services/pharmacy-payments.js`. See [Pharmacy contract](PHARMACY.md).

| Entity | Important fields | Relationships / notes |
|---|---|---|
| User | name, email, password hash, role, hospitalId, virtual publicId | Login identity; HQ-prefixed publicId uses the full account ObjectId and needs no migration; public signup excludes admin |
| Hospital | name, address, coordinates, type, departments | Department strings are a compatibility projection of canonical Department documents; type Hospital or Clinic |
| Doctor | name, hospitalId, department, userId, qualifications, availabilityStatus | Clinical profile; optional unique userId links to a doctor login |
| DoctorSchedule | doctorId, weeklySchedule | One schedule per clinical doctor; weekday/time/availability entries |
| Token | doctorId, patientId, patientName, departmentId, date, tokenNumber, status, isOffline | `departmentId` currently stores a department name, not a Department ObjectId; offline token may have no patient account |
| QueueCounter | string _id, sequence | Counter key is doctorId + date |
| MedicalRecord | patientId, optional doctorId/hospitalId, visitDate, department, medications, prescription, notes, source, attachments | Doctor or patient entered; new files use private encrypted storage metadata |
| RecordAccessRequest | patientId, doctorId, tokenId, requestKey, otpHash, attempts, sentAt, expiresAt, consumedAt | Pair-unique, five-minute OTP with TTL and atomic consumption |
| RecordAccessGrant | patientId, doctorId, tokenId, verifiedAt, expiresAt, revokedAt, version | Pair-unique read-only 30-minute access; revocation fences older proofs |
| OtpRequest | email, hashed otp, expiresAt, attempts | Expiration index plus explicit application expiry checks |
| Department | name, hospitalId, description | Canonical hospital-scoped department identity with a unique normalized active key |

`Doctor.departmentId` references canonical departments. `User.departmentId` is a compatibility mirror for linked doctor accounts. Historical `Token.departmentId` remains a department-name snapshot; `Token.departmentRef` stores the canonical relationship when available. An additive migration backfills matching references without changing snapshot names or token numbers.

## Authentication and access

Login returns a seven-day JWT. The browser stores it in localStorage and sends it as `Authorization: Bearer ...`. Authentication verifies the signature and reloads the User from MongoDB, so role/hospital changes are checked against current account data. Frontend route guards are for navigation; server middleware and controller filters enforce access.

Staff scope derives from `User.hospitalId`. Doctor scope derives from `Doctor.userId`, not equality between a User ID and a Doctor ID. Patients read/cancel their own tokens and records. Doctor record reads include their own associated visits; reading other records additionally requires an unexpired, unrevoked patient-approved grant. Creating a doctor record requires a called/completed token relationship; identity fields derive from the linked clinical profile. Patients may upload external records or explicitly associate an upload with a local treating doctor.

The Hospiq Admin and Hospital/Clinic Admin consoles enforce current database roles and tenant scope. Managed employees require a first-login password change; session versions invalidate old credentials. Suspended/archived users lose access. Admins retain operational access while clinical records remain patient/doctor controlled. See [Administration](ADMINISTRATION.md) for the full policy and migration.

## Booking and queue consistency

The API validates the requested date, doctor scope, schedule, closures and capacity before allocating a number from the per-doctor/date counter. Unique indexes protect visit numbers, active online bookings and capacity slots. Cancelled visits free capacity. Number allocation and insertion are separate, so rejected inserts can leave gaps.

Check-in and consultation start add timestamps to visit documents. A partial unique index permits one open consultation per doctor. Conditional updates detect stale queue changes. Consultation durations contribute to measured wait ranges only after the minimum sample threshold is met.

## Performance and boundaries

The care directory and clinical history support server-side search and pagination. The patient appointment list is still returned as an array. Queue and appointment views refresh through polling. Private polling state stays with the mounted client and supports visibility pause, reconnect and backoff.

Family context is selected per request and checked against current guardianship or delegation. The actual account remains available for clinical access logging and family settings. Private drafts, amendments, health summaries, lab orders, notifications, reminder deliveries and stock batches use separate scoped records or versioned updates.

The API uses one configured timezone and an in-memory rate limiter per process. The next-day email worker runs through an external scheduler, with a delivery lease and retry history. See [Operations](OPERATIONS.md).

## Clinical files and consent boundary

New attachments are encrypted using AES-256-GCM with random IVs and patient/storage-key authenticated associated data. Only authorized API downloads decrypt them, and authentication tags are verified before plaintext is returned. Download authorization is rechecked after disk I/O; responses use private/no-store caching policy and attachment disposition. Record list responses omit storage paths, IVs, tags, and legacy public URLs. The separate encryption key must be backed up with appropriate separation from data. Visit text remains in MongoDB; this change does not implement application-level encryption of all database fields.

Consent requests require today's pending/called appointment, a registered patient email and the requesting linked doctor. The code is never returned to the doctor API; actual email delivery or an explicit local SMTP test fixture is required. Incorrect attempts are counted atomically and successful codes are consumed atomically. Revoked/expired grants are excluded on each read. A patient can stop future access but cannot erase information already read or downloaded.

## Patient identification

The server signs a purpose-specific identity token under a dedicated audience/issuer and binds it to the patient ID, appointment ID and visit date. Login middleware rejects purpose-specific tokens, including this card. Resolution checks the current clinical doctor and their exact registered patient appointment today. The visit code carries no contact or medical details. The patient ID remains stable while each appointment/date produces a different QR; only today's active visits issue codes. Identity resolution never creates an access grant. A selected visitTokenId on record creation is validated against the patient, doctor and called/completed state. See [Patient QR](PATIENT_QR.md).
