# User guide

[Documentation index](README.md) · [Demo accounts](DEMO_DATA.md)

## Patients

1. Open `/register`, provide a name, email and password, and enter the emailed six-digit code. Passwords require at least eight characters and may not exceed 72 UTF-8 bytes in registration validation.
2. Sign in at `/login`. The patient homepage is `/`.
3. Search by hospital/clinic name, address, or department. Select a facility type if useful.
4. Choose a facility, department, and doctor. Confirm during the doctor's scheduled hours to receive today's token number.
5. Open **My appointments** (`/my-tokens`) to filter history by date/status, print the token QR, or cancel an active token.

A patient cannot hold a second active token for the same doctor on the same date. Cancelled and completed visits stay in history. A patient account's optional hospital reference does not restrict discovery or booking to that hospital.

## Hospital staff

1. Register through `/hospital-register` with the staff role and verify your email, or use seeded staff credentials.
2. Create a hospital/clinic if your account has no facility. One account manages one hospital reference.
3. Add departments, then open **Doctors** to add clinical profiles and optionally link a registered doctor email.
4. For an existing unlinked profile, choose **Link doctor account**. The account must be a registered doctor and must not belong to another hospital.
5. Configure weekly schedules. Select a doctor to load the existing schedule before editing.
6. Open **Queue overview** (`/dashboard`). Search by patient, doctor, department, or token; filter active/all/status; refresh for current data.
7. Register walk-in patients with **Walk-in patient**. Call waiting patients, skip a visit when appropriate, and complete a called visit.

Staff queue data is restricted to their hospital. Refresh is manual; queue changes do not stream live to other sessions.

## Doctors

A login account and a clinical profile are distinct records. A staff manager links them using the doctor's registered email. Doctors creating their own facility can create a profile linked to themselves.

After signing in, the doctor queue includes visits for that linked profile. Doctors may change their own availability and schedule and call/skip/complete their own visits. The backend rejects changes to other doctors even when a UI lists profiles in the same hospital.

Open **Medical records / visit notes** on a registered patient's queue card. You can add dated records after calling the patient or for an earlier completed visit, including medications, notes, prescriptions, and lab files. Your own associated visit history is visible automatically. Other doctors' records remain hidden until the patient shares an emailed permission code during a pending/called appointment today. Approval lasts 30 minutes and is read-only; the patient can revoke it. Offline walk-ins without a patient account cannot use the patient-owned record workflow.

## Queue statuses

| Current state | Allowed staff/doctor transitions |
|---|---|
| `pending` | `called`, `skipped`, `cancelled` |
| `called` | `completed`, `skipped`, `cancelled` |
| `skipped` | `pending`, `called`, `cancelled` |
| `completed` | None |
| `cancelled` | None |

Patients can cancel their own pending/called/skipped tokens. The API supports returning skipped tokens to pending, while the queue UI primarily offers call/skip/complete actions. Multiple simultaneous called visits are not currently prevented for a doctor.

## QR behavior and current limits

Appointment-ticket QRs contain token details and remain separate from the permanent patient identity card. Use **My QR card** (also visible on the homepage and Profile) when meeting the doctor. Doctors select **Scan patient QR** on that appointment, scan with a camera or uploaded QR image, or paste the signed card data. The app verifies the patient matches the appointment before opening the visit record. Other doctors' records still require OTP consent. Camera use requires browser permission and HTTPS or localhost. The custom QR URI is decoded by Hospiq rather than opened as a browser link.

Booking is same-day, not future-slot scheduling. Consultation hours use the single configured hospital timezone; overnight shifts are not supported. Do not rely on unimplemented wait-time estimates or appointment reminders.

## Patient medical records and permission

Open **Medical records** in the patient navigation. Add the date/time of a past visit, treating doctor, facility, department, medications, prescription text, notes and lab/prescription files. Use **Scan / take photo** for supported device cameras or **Upload files** for JPEG/PNG/PDF; scanning stores the image and does not extract text automatically.

For external visits, enter doctor/facility names. To associate an upload with an existing Hospiq doctor, select that doctor and explicitly confirm they treated you and may view this record. Matching a typed name alone does not establish a trusted doctor identity. Patient-entered records are labeled.

When another doctor requests access, the email identifies that doctor and hospital and explains the 30-minute scope. Do not share the code unless you approve. **Doctors with temporary access** shows active grants and a **Revoke access** action. Revocation blocks future reads, but cannot retract information already viewed or downloaded. SMS delivery is not implemented.

See [Medical records](MEDICAL_RECORDS.md) for the exact contract, storage setup, and legacy public-link migration notes.

Every registered account has a stable HQ-prefixed user ID on Profile. Patient IDs are also shown beside doctor queue entries. See [Patient QR](PATIENT_QR.md) for the full identification workflow and offline-walk-in limits.
