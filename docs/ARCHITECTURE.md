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
| Providers | Gmail email and Cloudinary storage | `server/utils` |
| Maintenance | Read-only preflight and demo seeds | `server/scripts` |
| Regression suite | HTTP boundary checks and mocked workflow tests | `server/test/security.test.js` |

The frontend and API run as separate processes. The API does not serve `client/dist`. Vite builds a single-page application with lazy page chunks; production hosting needs an SPA fallback for deep links.

## Entities and relationships

| Entity | Important fields | Relationships / notes |
|---|---|---|
| User | name, email, password hash, role, hospitalId | Login identity; roles patient/doctor/staff/admin; public signup excludes admin |
| Hospital | name, address, coordinates, type, departments | Departments are embedded strings; type Hospital or Clinic |
| Doctor | name, hospitalId, department, userId, qualifications, availabilityStatus | Clinical profile; optional unique userId links to a doctor login |
| DoctorSchedule | doctorId, weeklySchedule | One schedule per clinical doctor; weekday/time/availability entries |
| Token | doctorId, patientId, patientName, departmentId, date, tokenNumber, status, isOffline | `departmentId` currently stores a department name, not a Department ObjectId; offline token may have no patient account |
| QueueCounter | string _id, sequence | Counter key is doctorId + date |
| MedicalRecord | patientId, doctorId, hospitalId, diagnosis, prescription, notes, testResults | Author is a clinical Doctor; results are URL strings |
| OtpRequest | email, hashed otp, expiresAt, attempts | Expiration index plus explicit application expiry checks |
| Department | name, hospitalId, description | Legacy standalone model; current UI/seed use embedded Hospital strings |

`User.departmentId` still references the standalone Department model. Do not infer that it is the same type as `Token.departmentId`. Consolidating this dual representation is a roadmap item.

## Authentication and access

Login returns a seven-day JWT. The browser stores it in localStorage and sends it as `Authorization: Bearer ...`. Authentication verifies the signature and reloads the User from MongoDB, so role/hospital changes are checked against current account data. Frontend route guards are for navigation; server middleware and controller filters enforce access.

Staff scope derives from `User.hospitalId`. Doctor scope derives from `Doctor.userId`, not equality between a User ID and a Doctor ID. Patients read/cancel their own tokens and records. Doctor record reads are restricted to authored records; creating a record requires a token relationship with the patient and the same hospital.

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
