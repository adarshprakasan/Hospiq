# API reference

[Documentation index](README.md)

This is a reference to implemented Express routes, not a generated OpenAPI contract. Source controllers and middleware remain authoritative. Paths below are relative to `/api`; local base URL is `http://localhost:5000/api`.

## Conventions

- JSON requests use `Content-Type: application/json`; uploads use multipart with field `files`.
- Protected endpoints require `Authorization: Bearer <token>`.
- IDs are MongoDB document IDs unless a route says otherwise. `departmentId` on tokens is a department name string.
- Authorization includes both the route's allowed roles and the ownership check described below.
- Responses generally use `{ "message": "..." }` for errors; not all controllers currently normalize error codes identically.
- Pagination is endpoint-specific. Public facilities and clinical history can be paginated with a `page` query parameter. Public means no JWT is required by that API route, even if the web UI requires sign-in.

## Authentication

| Method | Path | Access | Request / result |
|---|---|---|---|
| POST | `/auth/send-otp` | Public, rate-limited | `{email}`; sends a six-digit registration code |
| POST | `/auth/verify-otp` | Public, rate-limited | `{email, otp}`; returns `{success, verificationToken}` |
| POST | `/auth/register` | Public, rate-limited | `{name, email, password, role?, verificationToken}`; creates user, returns message, not a login JWT |
| POST | `/auth/login` | Public, rate-limited | `{email, password}`; returns `{token, user}` |
| GET | `/auth/me` | Authenticated | Current user without password |

Registration roles: patient (default) and hospital_admin. Employee and platform-admin public signup is rejected; administrators provision employees with temporary credentials. Password validation requires at least 8 characters and at most 72 UTF-8 bytes. The verification proof must match the email and the OTP row can be consumed once. OTP rows expire after five minutes; proof JWT lifetime is ten minutes but row consumption still depends on the row existing.

Example login, using your own credentials:

```http
POST /api/auth/login
Content-Type: application/json

{"email":"patient.creekside@example.invalid","password":"<password-from-your-seed-run>"}
```

Login response fields:

```json
{
  "token": "<jwt>",
  "user": {
    "id": "<user-id>",
    "publicId": "HQ-<24-UPPERCASE-HEX-CHARACTERS>",
    "name": "Demo Patient",
    "email": "patient.creekside@example.invalid",
    "role": "patient",
    "hospitalId": "<optional-hospital-id>"
  }
}
```

`/auth/me` returns the Mongoose user shape with `_id`, whereas login's user summary uses `id`. Optional properties may be omitted.

## Hospitals and departments

| Method | Path | Route roles / ownership |
|---|---|---|
| GET | `/hospitals` | Public; list facilities |
| GET | `/hospitals/:id` | Public; one facility |
| POST | `/hospitals/create` | hospital_admin (one facility) or admin; new self-service facilities are active |
| PUT | `/hospitals/:id` | hospital_admin (own hospital) or admin; allowlisted fields and audit |
| DELETE | `/hospitals/:id` | hospital_admin (own hospital) or admin; recoverable archive, historical references preserved |
| GET | `/departments?hospitalId=<id>` | Public; returns canonical active department names (legacy projection fallback) |
| POST | `/departments/add` | hospital_admin (own hospital) or admin |

Hospital create/update fields: `name`, `address`, `location: {lat, lng}`, `departments: [string]`, `type: "Hospital" | "Clinic"`, and optional `contact`, `email`, `website`. Name, address, coordinates, and type are required by the schema. Valid latitude is -90 to 90; longitude -180 to 180. Creation associates the caller with the new hospital.

Department creation body:

```json
{"hospitalId":"<hospital-id>","name":"Cardiology"}
```

A normalized active department key has a unique hospital-scoped database index. Updates synchronize current doctor labels and the compatibility hospital-name projection.

## Doctors and schedules

| Method | Path | Route roles / ownership |
|---|---|---|
| GET | `/doctors?hospitalId=<id>&department=<name>` | Public; both query parameters required |
| GET | `/doctors/hospital/:hospitalId` | Public |
| GET | `/doctors/:id` | Public |
| POST | `/doctors/create` | hospital_admin or admin; scoped managed doctor provisioning |
| PUT | `/doctors/:id/availability` | doctor (own availability) or hospital_admin/admin (operational override) |
| PATCH | `/doctors/:id/account` | hospital_admin or admin; owned hospital; profile must be unlinked |
| GET | `/schedule/:doctorId` | Public |
| GET | `/schedule/doctor/:doctorId` | Public alias |
| POST | `/schedule/set` | staff or doctor; owned hospital doctor or own linked profile |

Doctor provisioning uses the management account service: name, login email, hospital scope and canonical department ID are required. Temporary credentials are generated/chosen and a linked clinical profile is created. Doctor self-provisioning is disabled. `GET /doctors/me` returns the current doctor's linked profile.

Availability body uses a string, not a boolean:

```json
{"available":"available"}
```

Use `unavailable` to disable new bookings. Link an existing doctor account with `{ "email": "<registered-doctor-email>" }`; a foreign-hospital or already-linked account is rejected.

Schedule request example:

```json
{
  "doctorId": "<doctor-id>",
  "weeklySchedule": [
    {"day":"Monday","isAvailable":true,"startTime":"09:00","endTime":"17:00"},
    {"day":"Tuesday","isAvailable":false}
  ]
}
```

Days use English full weekday names. At most seven unique days are accepted. Times are zero-padded `HH:mm`; available intervals must end after they start. The request replaces the weekly schedule rather than patching a single day. Include `closedDates` as date strings and `dailyCapacity` as a whole number from 0 to 500. Zero means unlimited. An absent schedule returns 404. Fetch before editing to preserve other days.

## Tokens and queues

| Method | Path | Route roles / ownership |
|---|---|---|
| POST | `/tokens/book` | patient; creates own online token |
| POST | `/tokens/offline` | staff; doctor must belong to staff hospital |
| GET | `/tokens/mine` | patient; own full history |
| GET | `/tokens/my` | staff or doctor; today's scoped queue |
| GET | `/tokens/doctor/:doctorId` | staff or doctor; ownership check; today's queue |
| PUT | `/tokens/:tokenId/status` | staff or doctor; doctor ownership and allowed transition |
| PATCH | `/tokens/:id/complete` | treating doctor or authorized administrator; same checks, requests completed |
| DELETE | `/tokens/:tokenId` | patient; own active token becomes cancelled, not physically deleted |

Booking takes `{ doctorId, date? }`. Walk-ins also require `patientName`. Omit `date` for today or send a `YYYY-MM-DD` value up to 90 days ahead. The server derives the department and facility, checks the schedule and closures, and enforces any configured capacity. Creation returns HTTP 201 with `{ message, token }`.

Queue/history results include visit and doctor IDs, facility details, token status, visit date and workflow timestamps. Eligible checked-in visits can include `peopleAhead` and a `waitEstimate` range based on recent consultation data.

| Method and path | Use |
|---|---|
| `POST /tokens/:tokenId/reschedule` | Patient sends `{ date }` to move a pending or skipped visit before check-in |
| `POST /tokens/:tokenId/actions/check-in` | Scoped staff, facility admin or doctor records arrival |
| `POST /tokens/:tokenId/actions/start` | Treating doctor starts a called, checked-in visit |
| `POST /tokens/:tokenId/claim-code` | Staff or facility admin issues a short-lived walk-in link code |
| `POST /tokens/claim` | Patient submits `{ code }` to link the walk-in |

Status body:

```json
{"status":"called"}
```

| Current status | Next statuses |
|---|---|
| pending | called, skipped, cancelled |
| called | completed, skipped, cancelled |
| skipped | pending, called, cancelled |
| completed / cancelled | None |

Same-day booking checks current availability and uses the consultation end time as an exclusive cutoff. Staff cannot complete a clinical visit. An existing active online token for the same patient/doctor/date returns conflict. Failed inserts can leave counter gaps.

## Records, profiles, QR, health

| Method | Path | Access / behavior |
|---|---|---|
| POST | `/records/add` | doctor; linked profile, called/completed token relationship; JSON or multipart record with files |
| GET/POST | `/records/mine` | patient self; list/create records |
| GET | `/records/patient/:patientId` | patient self; doctor-associated records plus other records under active patient consent |
| POST | `/records/upload` | Retired, 410; use multipart record creation |
| GET | `/profile/patient/:id` | Authenticated self only; returns `{user, records}` |
| GET | `/profile/doctor/:id` | Public; hospital name populated |
| GET | `/qr/me` | Patient self; stable ID plus today's active visit-specific QR entries |
| POST | `/qr/patient/resolve` | Doctor; `{tokenId, qrValue}` must match their registered patient appointment today |
| GET | `/qr/patient/:id` | Authenticated patient self; legacy identity-card alias |
| GET | `/qr/doctor/:id` | Public doctor profile QR; `{qr, encoded}` |
| GET | `/health` | Public; `{ "status": "ok" }`, liveness only |

Medical-record requests now require `visitDate` with timezone and support structured medications and private attachments. Doctor/facility/department identities derive from the linked profile; patient external visits use explicit text fields or an explicitly approved local doctor association. Public `testResults` URL submission is not supported. See [Medical records](MEDICAL_RECORDS.md) for all consent/access/download routes, multipart payloads, legacy-link behavior and the updated contract.

Patient QR resolution is purpose-signed and checks the linked doctor, exact active appointment, exact patient and visit date. The patient endpoint returns a visit list; codes are not reusable across visits, even on the same date. It does not create clinical consent or act as a login token. Doctor profile links retain the older public format. See [Patient QR](PATIENT_QR.md) for the contract and camera/image/paste flow.

## Pharmacy and medication catalogue

The `pharmacist` role is provisioned and assigned by Hospital/Clinic Admins; queue staff cannot assign accounts. Pharmacists maintain medication availability/prices and use hospital-scoped pharmacy orders; patients see only their own pharmacy tokens. Saving a doctor's record completes its appointment and returns `visitCompleted`; the subsequent pharmacy handoff is explicit and idempotent per appointment. See [Pharmacy API contract](PHARMACY.md#api-contract) and [Medication API](MEDICATIONS.md#api) for endpoints, order versions, integer-fils totals, counter payment, Stripe checkout, and signed webhooks. Pharmacists have no general medical-history or attachment access.

## Discovery, recovery and patient context

- `GET /hospitals` accepts `q`, `type`, `page` and `limit`. Requests with `page` return `{ items, total, page, limit }`. Requests without `page` retain the array response.
- `POST /auth/forgot-password` takes `{ email }` and returns a generic response for valid addresses. `POST /auth/reset-password` takes `{ token, password }`. The link expires after 15 minutes and a successful reset revokes previous sessions.
- A patient can send `X-Patient-Id` to select an authorized dependent or delegated profile. Authentication and family settings use the signed-in account. An expired or revoked selection returns HTTP 403 with `PATIENT_CONTEXT_REVOKED`.

| Method and path | Use |
|---|---|
| `GET /family` | List available profiles and access granted by the signed-in patient |
| `POST /family/dependents` | Create a dependent with `name`, `dateOfBirth` and `guardianConfirmation: true` |
| `POST /family/delegations` | Grant 30-day access with `email` and `confirm: true` |
| `DELETE /family/delegations/:id` | Revoke a grant made by the signed-in patient |
| `GET /health-profile/summary/:patientId` | Read own/selected summary or read as a doctor with full history permission |
| `PUT /health-profile/summary` | Patient saves `allergies`, `conditions`, `currentMedications`, `emergencyContact` and current `version` |
| `GET /health-profile/access-history?page=1` | Patient reviews recorded clinical reads, 20 per page |
| `GET /notifications`, `POST /notifications/:id/read` | List and mark patient notifications read |
| `GET /notifications/preferences`, `PUT /notifications/preferences` | Read or update `{ emailReminders }` |
| `GET /notifications/deliveries` | Recent reminder delivery attempts |

## Account profile

These routes require a signed-in account and ignore the selected family context. Measurements and saved care are patient-only.

| Method and path | Use |
|---|---|
| `GET /profile/me` | Read account details, private photo, measurements with calculated BMI, and saved provider IDs |
| `PUT /profile/me` | Update `name`, `preferredName` and `phone` |
| `PUT /profile/me/photo` | Set `photo` to a small JPEG/PNG data URL or `null` to remove it |
| `PUT /profile/me/measurements` | Set `heightCm`, `weightKg` and `source` of `manual`, `apple-export` or `csv`. Both values can be `null` to remove saved measurements |
| `GET /profile/me/saved` | List saved active facilities and doctors |
| `PUT /profile/me/saved/:kind/:id`, `DELETE /profile/me/saved/:kind/:id` | Save or remove a `hospital` or `doctor` |
| `POST /auth/sign-out-all` | Revoke existing login tokens for the signed-in account |

## Clinical drafts, lab orders and inventory

| Method and path | Use |
|---|---|
| `POST /records/add` | Doctor may send `status: "draft"` to keep the record private and the visit open |
| `PATCH /records/:recordId/draft` | Author sends editable fields, current `version` and `status` of `draft` or `final` |
| `POST /records/:recordId/amendments` | Author adds `{ text, reason, version }` to a finalized record |
| `POST /records/ocr` | Patient or doctor submits one image via multipart `files` and receives `{ text, requiresReview }` where OCR is configured |
| `GET /labs` | Patient's own or doctor's ordered tests. Doctor can filter by `patientId` |
| `POST /labs` | Doctor sends `{ patientId, visitId, tests, instructions }` for an eligible visit |
| `POST /labs/:id/status` | Send `{ status, version }`. Linking a result needs `resultRecordId` and patient submissions need `shareWithDoctor: true` |
| `GET /inventory`, `POST /inventory` | Pharmacist lists scoped batches or creates one with `medicationId`, `batchNumber`, `expiresOn`, `quantity` |
| `GET /inventory/:id/movements`, `POST /inventory/:id/movements` | Pharmacist reads the ledger or records `{ delta, reason, version, requestId }` |
| `GET /operations/metrics` | Doctor, staff or admin reads scoped 30-day measures |
| `GET /ready` | Public MongoDB readiness. HTTP 503 when unavailable |

See [Medical records](MEDICAL_RECORDS.md), [Pharmacy](PHARMACY.md) and [Operations](OPERATIONS.md) for behavior and configuration. Every API response has an `X-Request-Id` header.

## Error handling and limits

Common statuses are 400 invalid request/transition, 401 missing/invalid session or credentials, 403 denied ownership/role, 404 missing resource, 409 duplicate/stale change, 413 oversized body/file, 429 auth limit, 503 email unavailable, and 500 unexpected failure. Some legacy controller catch blocks return 500 for malformed IDs or validation failures; clients should not assume every validation failure is 400. Error normalization is a remaining improvement.

Auth requests share a process-local 20-request/IP/15-minute limit. A `Retry-After` header accompanies 429. JSON bodies are limited to 100 KB; normal API requests are not all covered by this auth limiter. Management and medical-history lists now support bounded pagination; other legacy list endpoints retain their array format. Pharmacy handoff is idempotent per appointment and Stripe checkout attempts use provider idempotency keys.


## Administration and credential lifecycle

See [Administration API](ADMINISTRATION.md#management-api-contract) for paginated/scoped operational CRUD, archive/restore, employee credentials, private billing settings and audit history. Public signup supports only patients and unassigned hospital admins. `POST /auth/change-password` requires current/new passwords, revokes existing sessions and clears the first-login gate. Medical-record GET routes optionally accept page/limit/q/source and return `{items,total,page,limit}` for authorized history. Staff cannot create facilities/departments/employees or complete clinical visits; schedules are owned by staff/admins and doctors own their availability.
