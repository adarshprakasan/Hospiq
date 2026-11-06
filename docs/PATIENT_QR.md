# Patient identity cards and doctor scanning

Every user has a stable public ID derived from the full existing unique account ID: HQ- followed by 24 uppercase hexadecimal characters. No account migration or ID reset is required. All roles can see their ID on Profile.

Patients have an always-visible QR identity card on their homepage, Profile and My QR card page. It contains a signed, purpose-specific opaque patient identifier rather than medical history, contact details or a login credential. The patient may download the QR or copy its data for scanner fallback. Secret rotation invalidates old card signatures; the displayed user ID remains unchanged.

Doctors have a Scan patient QR action for each listed registered patient's appointment. The scanner supports camera, uploaded QR image and pasted signed card data. Resolution requires an authenticated linked doctor, their own non-cancelled appointment today, and a QR matching that exact appointment patient. It returns only the matched patient ID/name, doctor/hospital/department and appointment context. QR resolution grants no cross-doctor medical-record access and never replaces the consent OTP.

After identification the doctor can start/call a pending/skipped visit and open the record-entry form, or add notes to a called/completed visit. The record creation endpoint validates any supplied visitTokenId against the logged-in clinical doctor, patient and called/completed state. Offline walk-ins without registered accounts have a disabled scanner with an explanation.

API (relative to /api): GET /qr/me (patient only); POST /qr/patient/resolve with {tokenId, qrValue} (doctor only); GET /qr/patient/:id (legacy alias, authenticated patient self only). Public doctor-profile QR links remain supported but are not patient identity cards.

A copied permanent QR is an identity pointer, not proof of liveness or consent. Matching an appointment and current user authorization remain mandatory. Other doctors' records stay behind the existing patient-approved 30-minute read grant.

## Scanner operation and validation

Camera use requires HTTPS (or localhost), a supported camera and user permission. The reader stops on a match, close, cancellation or component cleanup. JPEG/PNG QR images up to 5 MB are decoded locally; only the signed result is sent for server verification. Pasted QR data is an alternative when camera/file access is unavailable. This reader uses [ZXing browser](https://github.com/zxing-js/browser), loaded on demand. Camera hardware was not exercised in the automated/browser checks; actual image decoding and the complete matched-record flow were browser-tested.

Appointment-ticket QRs are not patient identity cards; use My QR card. A pending/skipped appointment is called when the doctor chooses Start visit & add medical record. Called/completed appointments open record entry directly. Doctor identity/department/facility come from the linked clinical profile, not user-provided QR fields. Existing direct record APIs retain their care-relationship checks; QR resolution itself is an identification convenience rather than a new clinical permission.

For an isolated manual browser fixture, `npm --prefix server run test:records -- --preview` runs the integration checks and keeps their fictional database/API alive for at most ten minutes. It prints a local API URL, fictional credentials, QR image path and a protected stop URL/key; these values belong only to that disposable fixture. It does not send real emails. The fixture removes its own database/files when stopped or timed out.
