# API reference

[Documentation index](README.md)

This is a reference to implemented Express routes, not a generated OpenAPI contract. Source controllers and middleware remain authoritative. Paths below are relative to `/api`; local base URL is `http://localhost:5000/api`.

## Conventions

- JSON requests use `Content-Type: application/json`; uploads use multipart with field `files`.
- Protected endpoints require `Authorization: Bearer <token>`.
- IDs are MongoDB document IDs unless a route says otherwise. `departmentId` on tokens is a department name string.
- Authorization includes both the route's allowed roles and the ownership check described below.
- Responses generally use `{ "message": "..." }` for errors; not all controllers currently normalize error codes identically.
- Lists are currently unpaginated. Public means no JWT is required by that API route, even if the web UI requires sign-in.

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

Days use English full weekday names. At most seven unique days are accepted. Times are zero-padded `HH:mm`; available intervals must end after they start. The request replaces the weekly schedule rather than patching a single day. An absent schedule returns 404. Fetch before editing to preserve other days.

## Tokens and queues

| Method | Path | Route roles / ownership |
|---|---|---|
| POST | `/tokens/book` | patient; creates own online token |
| POST | `/tokens/offline` | staff; doctor must belong to staff hospital |
| GET | `/tokens/mine` | patient; own full history |
| GET | `/tokens/my` | staff or doctor; today's scoped queue |
| GET | `/tokens/doctor/:doctorId` | staff or doctor; ownership check; today's queue |
| PUT | `/tokens/:tokenId/status` | staff or doctor; doctor ownership and allowed transition |
| PATCH | `/tokens/:id/complete` | staff or doctor; same checks, requests completed |
| DELETE | `/tokens/:tokenId` | patient; own active token becomes cancelled, not physically deleted |

Online booking needs `{ "doctorId": "<clinical-doctor-id>" }`. Offline booking additionally needs `patientName`. The controller derives department and date from the doctor and configured clock; it does not trust a submitted hospital/department/date. No future date argument is supported.

Creation returns `{message, token}` with HTTP 201. Queue/history list objects include `_id`, `tokenNumber`, `status`, `patientName`, `doctorName`, `departmentName`, `date`, `createdAt`, `isOffline`, and available patient/doctor IDs. `date` is a `YYYY-MM-DD` string in the hospital timezone. There is no calculated ETA field.

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

Booking checks doctor availability and consultation hours for both online and offline tokens. End time is exclusive. An existing active online token for the same patient/doctor/date returns conflict. Failed inserts can leave counter gaps.

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

## Error handling and limits

Common statuses are 400 invalid request/transition, 401 missing/invalid session or credentials, 403 denied ownership/role, 404 missing resource, 409 duplicate/stale change, 413 oversized body/file, 429 auth limit, 503 email unavailable, and 500 unexpected failure. Some legacy controller catch blocks return 500 for malformed IDs or validation failures; clients should not assume every validation failure is 400. Error normalization is a remaining improvement.

Auth requests share a process-local 20-request/IP/15-minute limit. A `Retry-After` header accompanies 429. JSON bodies are limited to 100 KB; normal API requests are not all covered by this auth limiter. Management and medical-history lists now support bounded pagination; other legacy list endpoints retain their array format. Pharmacy handoff is idempotent per appointment and Stripe checkout attempts use provider idempotency keys.


## Administration and credential lifecycle

See [Administration API](ADMINISTRATION.md#management-api-contract) for paginated/scoped operational CRUD, archive/restore, employee credentials, private billing settings and audit history. Public signup supports only patients and unassigned hospital admins. `POST /auth/change-password` requires current/new passwords, revokes existing sessions and clears the first-login gate. Medical-record GET routes optionally accept page/limit/q/source and return `{items,total,page,limit}` for authorized history. Staff cannot create facilities/departments/employees or complete clinical visits; schedules are owned by staff/admins and doctors own their availability.
