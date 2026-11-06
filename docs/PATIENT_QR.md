# Visit-specific patient QR codes

[Full testing guide](TEST_TODAYS_FEATURES.md) · [Medical records](MEDICAL_RECORDS.md)

## Identity and rotation

Every account has a stable public ID: `HQ-` followed by its full unique account ObjectId in uppercase. Existing accounts need no migration. The patient ID does not change.

The QR is different for **each appointment**. Its signed payload contains the patient ID, appointment ID and hospital-timezone visit date. Including the appointment ID prevents two visits on the same date from sharing a code. The code remains stable within that one active visit, rather than changing on every screen refresh.

Old permanent cards (`hospiq://patient-card/v1/...`) and unsigned appointment tickets are retired. Refresh the app to obtain `hospiq://patient-visit/v2/...` data for the correct visit. No contact details, name, diagnosis, medications or medical history are embedded in the QR payload; the visit date and identifiers are included intentionally.

## Patient section

The homepage, Profile and **My visit QR** show the user's ID and a selector for today's pending/called/skipped appointments. Each option identifies doctor, facility, department, date and token number. Download/copy actions apply only to the selected visit; PNG filenames include the appointment ID. A patient with no active visit sees their stable ID and booking instructions, not a reusable QR.

The section refreshes every 30 seconds and has a manual Refresh button. Completed, cancelled and previous-day visits do not issue codes. The server always rechecks current state, so a cached/downloaded code does not continue working after the visit ends or for a different visit. Appointment history links to its specific visit selector instead of generating a separate unsigned QR.

## Doctor scanning

Select **Scan patient QR** on the registered patient's queue row. Use a camera, a JPEG/PNG QR image up to 5 MB, or pasted visit QR data. Image decoding happens locally; only the signed result is sent to the API. The camera requires HTTPS or localhost plus user permission and stops on match/close/unmount. The [ZXing browser reader](https://github.com/zxing-js/browser) loads on demand.

Resolution requires the logged-in linked doctor, their own active registered appointment today, the exact patient, the exact appointment ID and the exact visit date. Wrong-patient, wrong-visit, old-day, completed, cancelled, unsigned and tampered codes are rejected. Offline walk-ins without accounts have no visit QR and cannot be scanned this way.

After identification, **Start visit & add medical record** calls a pending/skipped visit and opens entry with the validated visit ID. A called visit opens entry directly. Doctor/facility/department are derived from the server profile. Direct record APIs retain their care-relationship checks, and a supplied visitTokenId must be that doctor's called/completed appointment for the patient.

A QR is not a login token, proof of physical liveness, or patient consent to read other doctors' records. Other history still requires the existing revocable 30-minute patient-email OTP grant.

## API (relative to /api)

| Method | Route | Access / response |
|---|---|---|
| GET | `/qr/me` | Patient only; `{publicId, name, date, timeZone, visits: [...]}` |
| GET | `/qr/patient/:id` | Legacy patient-self alias; same visit-list response |
| POST | `/qr/patient/resolve` | Doctor; `{tokenId, qrValue}`; matched patient/doctor/appointment context |

Each `visits` entry contains `tokenId`, `date`, `tokenNumber`, `status`, `doctorName`, `hospitalName`, `department`, and `qrValue`. No top-level generic `qrValue` is returned. The caller must select a visit. Public doctor-profile links remain separate.

## Verification

The current suite has 24 regression cases and 89 isolated database/SMTP checks, including same-day code differentiation, missing-visit handling, retired permanent codes, previous dates and ended visits. Actual image decoding, appointment matching and visit-record saving were browser-verified; physical camera hardware remains a manual check.

`npm --prefix server run test:records -- --preview` can expose a fictional disposable browser fixture for up to ten minutes. It prints the local API address, fictional credentials, QR image paths and a protected stop URL/key. No real email is sent; its database and files are removed on stop/timeout. Use [the main guide](TEST_TODAYS_FEATURES.md) for persistent large-demo testing.
