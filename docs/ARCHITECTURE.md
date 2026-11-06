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

| Entity | Important fields | Relationships / notes |
|---|---|---|
| User | name, email, password hash, role, hospitalId, virtual publicId | Login identity; HQ-prefixed publicId uses the full account ObjectId and needs no migration; public signup excludes admin |
| Hospital | name, address, coordinates, type, departments | Departments are embedded strings; type Hospital or Clinic |
| Doctor | name, hospitalId, department, userId, qualifications, availabilityStatus | Clinical profile; optional unique userId links to a doctor login |
| DoctorSchedule | doctorId, weeklySchedule | One schedule per clinical doctor; weekday/time/availability entries |
| Token | doctorId, patientId, patientName, departmentId, date, tokenNumber, status, isOffline | `departmentId` currently stores a department name, not a Department ObjectId; offline token may have no patient account |
| QueueCounter | string _id, sequence | Counter key is doctorId + date |
| MedicalRecord | patientId, optional doctorId/hospitalId, visitDate, department, medications, prescription, notes, source, attachments | Doctor or patient entered; new files use private encrypted storage metadata |
| RecordAccessRequest | patientId, doctorId, tokenId, requestKey, otpHash, attempts, sentAt, expiresAt, consumedAt | Pair-unique, five-minute OTP with TTL and atomic consumption |
| RecordAccessGrant | patientId, doctorId, tokenId, verifiedAt, expiresAt, revokedAt, version | Pair-unique read-only 30-minute access; revocation fences older proofs |
| OtpRequest | email, hashed otp, expiresAt, attempts | Expiration index plus explicit application expiry checks |
| Department | name, hospitalId, description | Legacy standalone model; current UI/seed use embedded Hospital strings |

`User.departmentId` still references the standalone Department model. Do not infer that it is the same type as `Token.departmentId`. Consolidating this dual representation is a roadmap item.

## Authentication and access

Login returns a seven-day JWT. The browser stores it in localStorage and sends it as `Authorization: Bearer ...`. Authentication verifies the signature and reloads the User from MongoDB, so role/hospital changes are checked against current account data. Frontend route guards are for navigation; server middleware and controller filters enforce access.

Staff scope derives from `User.hospitalId`. Doctor scope derives from `Doctor.userId`, not equality between a User ID and a Doctor ID. Patients read/cancel their own tokens and records. Doctor record reads include their own associated visits; reading other records additionally requires an unexpired, unrevoked patient-approved grant. Creating a doctor record requires a called/completed token relationship; identity fields derive from the linked clinical profile. Patients may upload external records or explicitly associate an upload with a local treating doctor.

The schema includes admin, but there is no complete admin UI and route role lists vary. Do not treat the schema role as granting every endpoint automatically; see [API](API.md).

## Booking and queue consistency

1. Load the clinical doctor and check account scope for offline bookings.
2. Check `availabilityStatus` and today's consultation interval in `HOSPITAL_TIMEZONE`.
3. Reject an existing active patient booking for that doctor/date.
4. Initialize the per-doctor/date counter from historical maximum token number if absent.
5. Atomically increment the counter and create the token.

A unique doctor/date/token-number index prevents duplicate token numbers. A partial unique doctor/patient/date index applies to online pending/called/skipped bookings. Number allocation and token insertion are separate operations, so failures may leave gaps; token numbers are not guaranteed contiguous.

Status changes use a conditional update on the previous status to detect stale writes. Hospital/account creation and doctor/account linking span multiple documents without transactions; recovery logic and concurrency tests are still required before production.

## Performance and boundaries

Public facility search currently filters the downloaded list in the browser. Staff queues query today's tokens for doctors in that hospital; patient history is unpaginated. Indexes support hospital/department doctor lookup, patient/date history, and doctor/day numbering. Avoid shared caches of patient data. Large datasets need API pagination, measured query plans, and server-side directory search.

The system currently has one timezone and one in-memory auth rate limiter per API process. No WebSocket service, Redis cache, job queue, refresh-token service, or notification worker is implemented.

## Clinical files and consent boundary

New attachments are encrypted using AES-256-GCM with random IVs and patient/storage-key authenticated associated data. Only authorized API downloads decrypt them, and authentication tags are verified before plaintext is returned. Download authorization is rechecked after disk I/O; responses use private/no-store caching policy and attachment disposition. Record list responses omit storage paths, IVs, tags, and legacy public URLs. The separate encryption key must be backed up with appropriate separation from data. Visit text remains in MongoDB; this change does not implement application-level encryption of all database fields.

Consent requests require today's pending/called appointment, a registered patient email and the requesting linked doctor. The code is never returned to the doctor API; actual email delivery or an explicit local SMTP test fixture is required. Incorrect attempts are counted atomically and successful codes are consumed atomically. Revoked/expired grants are excluded on each read. A patient can stop future access but cannot erase information already read or downloaded.

## Patient identification

The server signs a purpose-specific identity token under a dedicated audience/issuer and binds it to the patient ID, appointment ID and visit date. Login middleware rejects purpose-specific tokens, including this card. Resolution checks the current clinical doctor and their exact registered patient appointment today. The visit code carries no contact or medical details. The patient ID remains stable while each appointment/date produces a different QR; only today's active visits issue codes. Identity resolution never creates an access grant. A selected visitTokenId on record creation is validated against the patient, doctor and called/completed state. See [Patient QR](PATIENT_QR.md).
