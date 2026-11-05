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

Clinical record creation and retrieval are currently API workflows. There is no complete clinical-record entry interface. Doctor reads return only records they authored; patient reads return only that patient's records.

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

The printable token QR encodes token ID, token number, and patient name. Treat printed copies as containing patient information. There is no validated scanner/check-in workflow yet. The separate profile QR API encodes a `hospiq://` link; the web app does not register that custom scheme.

Booking is same-day, not future-slot scheduling. Consultation hours use the single configured hospital timezone; overnight shifts are not supported. Do not rely on unimplemented wait-time estimates or appointment reminders.
