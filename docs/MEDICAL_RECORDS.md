# Medical records and patient consent

## Contract

Patients can list their own records, add dated visits and upload JPG/PNG/PDF prescriptions or lab reports (including camera photos). Doctors can add records for their own called/completed patient visits. A record stores visit date/time, doctor, hospital, department, medication details, diagnosis, notes and attachments. Patient-entered records are marked as such and external doctors/hospitals can be recorded as text.

A doctor may read records associated with their own verified clinical profile without additional approval. Other doctors' records require an email OTP requested during a pending/called appointment today. The OTP email names the requesting doctor and hospital and explains the 30-minute read-only scope. A request expires after five minutes, allows five attempts, is single-use and is bound to doctor/patient/visit. Active grants can be revoked by the patient; new file reads recheck authorization. Staff/admin receive no clinical access.

New files are encrypted with AES-256-GCM under a separate server secret and stored outside static hosting. Downloads go through an authorized, non-cacheable API; no public file URLs or storage keys are returned. Historical public Cloudinary links are quarantined in responses and need re-upload/private migration; changing this code cannot retract old publicly shared URLs.

## Routes (relative to /api)

| Method | Route | Access |
|---|---|---|
| GET | /records/mine | Patient's own records |
| POST | /records/mine | Patient adds own record; JSON or multipart |
| POST | /records/add | Linked doctor adds own visit record; JSON or multipart |
| GET | /records/patient/:patientId | Doctor's own records plus others only under an active grant; patient self |
| GET | /records/patient/:patientId/access | Doctor's current access status or patient's own access status |
| POST | /records/patient/:patientId/access/request | Linked doctor with today's pending/called appointment sends consent OTP |
| POST | /records/patient/:patientId/access/verify | Requesting doctor submits requestId and otp |
| GET | /records/access/grants | Patient lists active grants |
| DELETE | /records/access/grants/:grantId | Patient revokes own grant |
| GET | /records/:recordId/attachments/:attachmentId | Same access policy as record |

The old POST /records/upload is retired (410); create a record with attachments instead. The patient profile/history alias must use the same safe serializer.

## Payload

Fields: visitDate (ISO timestamp with timezone), doctorId (optional local doctor for a patient upload), doctorName, hospitalName, department, diagnosis, prescription, notes, medications (array of name/dose/frequency/duration/instructions), and patientId for doctor creation. Doctor-created identity fields are derived from the linked doctor rather than trusted input. For multipart, include a JSON `data` field and up to five `files`, with `kind` prescription or lab-report applying to that submission's files. Local-doctor selection by a patient explicitly associates the record with that doctor and permits that doctor to read it; external/unlinked records always need consent for another doctor.

Email delivery requires real verified patient email addresses; demo example.invalid accounts cannot receive mail. Camera capture is browser/device dependent and does not provide OCR. SMS and automatic extraction are not implemented.

## Running and testing

Restart the API and frontend after pulling this feature. Configure `MEDICAL_FILE_KEY` as 64 hex characters and preserve it across restarts. Default files are stored in the ignored `server/storage/medical` directory; use a private persistent volume in deployment. New attachments do not use public Cloudinary delivery. The application's local backend environment has a generated key; it is not committed.

Run `npm --prefix server test`, `npm --prefix client run build`, and `npm --prefix server run test:records`. The explicit integration command creates a new uniquely named disposable database on the configured MongoDB server, uses an actual local SMTP fixture, and removes its test database/files. Existing patient data is untouched and no real email is sent. This fixture is used because email is SMTP rather than an HTTP dependency; Postman HTTP simulation is not the transport used here. It does not establish Gmail or SMS delivery.

Back up the database, private attachment volume, and encryption key with appropriate separation. Losing the key makes stored attachments unreadable. Patient-entered text remains unverified; signature validation is not full malware scanning or clinical verification. The app does not provide automatic OCR, mobile SMS, corrections/versioning, or a complete clinical audit trail.

Grant state is unique per doctor/patient pair and versioned. Successful verification and patient revocation advance that version, preventing an older in-flight permission proof from restoring revoked access.
