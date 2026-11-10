# User guide

[Documentation index](README.md) · [Demo accounts](DEMO_DATA.md)

## Patients

1. Open **Find care** at `/find-care`. Search by facility, address or department, then pick a doctor and a visit date. Bookings are queue entries within the next 90 days. Your doctor selection carries through sign-in.
2. Register with the emailed six-digit code or sign in. Use **Forgot password?** for an emailed reset link.
3. Open **Appointments** to view instructions, directions and the visit QR. Reschedule before check-in or cancel before the consultation starts. A second active token for the same doctor and date is blocked.
4. Check in at reception. While waiting, the visit may show people ahead and an estimated wait range. Bring the QR for the exact appointment you are attending.
5. Open **More** on mobile for pharmacy, lab tests, family access, health summary and notifications. Switch to Arabic for right-to-left layout and translated common labels.

Use **Family access** to manage dependent profiles or grant an adult temporary access. Check the **Care for** selector before booking or opening records. Adult delegation expires after 30 days and can be revoked sooner. Use **Health summary** to record patient-reported information and review access history. **Notifications** shows queue calls, prescription readiness and reviewed lab results. Email reminders require both patient opt-in and a configured scheduler. See [Care workflows](CARE_WORKFLOWS.md).

## My profile

Open **Profile** from the account menu. Edit your name, preferred name and phone under **Account**. Add or remove a private JPEG or PNG photo. The sign-in email is shown for reference. Use the language control and notification settings to manage preferences.

Patients can enter height and weight under **Health & measurements**. BMI updates when both values are present. Use **Health summary** for allergies, conditions, medications and emergency contacts. For Apple Health, unzip the data export and select its `export.xml` file under **Import from health apps**. For other sources, use the two-column CSV template. Review the values and save to keep them. This imports only height and weight. Live HealthKit and Health Connect sync requires a native client.

Use **Save facility** in Find care and **Save doctor** on a booking page. **Saved care** lists those providers with links back to availability. Profile details, body measurements and bookmarks belong to the signed-in account. Clinical pages still use the selected patient context.

**Privacy & security** provides password change, session revocation, links to clinical access history and sharing controls, and a download of the account profile and measurements. **Help & about** links to support and the app guide. **Sign out** clears this browser's session. **Sign out everywhere** invalidates existing sessions on all devices.

## Hospital / Clinic Admin

Register through /hospital-register and verify your email, or use a demo facility administrator. An unassigned facility admin submits a registration. A Hospiq platform admin must approve it before it appears in the directory or can provision employees. The /hospital-admin console manages the facility's staff, pharmacist and doctor accounts, temporary login credentials, departments, operational data and encrypted banking settings. See [Administration](ADMINISTRATION.md) for the complete guide.

## Hospital staff

Use credentials issued by your hospital administrator and change the temporary password at first login. Queue staff can register walk-ins, check in arrivals, call or skip visits, and edit their hospital's doctor schedules, closure dates and capacity. Issue a short-lived link code when a walk-in wants to attach the visit to their patient account. They cannot create hospitals/departments, manage employee accounts, change medicines/prices/banking, read clinical records, or complete clinical visits. The queue refreshes every ten seconds and includes a manual Refresh button.

## Doctors

A login account and clinical profile are distinct records. Hospital administrators create and link them together from the account console; existing unlinked profiles can be linked by an administrator. Doctors do not create facilities or employees.

After signing in, the doctor queue includes visits for that linked profile. Doctors may change their own availability and call/skip/complete their own visits. Their weekly schedule is managed by hospital staff/admins. The backend rejects changes to other doctors even when a UI lists profiles in the same hospital.

Start the consultation after check-in and calling the patient. Open **Notes / history** on the patient's queue entry to work alongside the queue. **Save draft** keeps your notes private and the visit open. **Finalize** publishes the record and completes the associated visit. Add a correction with a reason if you need to amend a finalized record. The form supports structured vitals and optional review of image OCR text.

Your own associated history is visible automatically. Other doctors' records require the patient's emailed permission code for an eligible visit. Access is read-only for 30 minutes and the patient can revoke it earlier. Use **Lab tests** to order or review tests from an eligible visit. Patients can link a finalized lab-report record already associated with the ordering doctor.

## Pharmacists and pharmacy collection

Use the **Pharmacist** account created by your hospital administrator and replace its temporary password on first login; unassigned pharmacists cannot view hospital orders. Pharmacists sign in to `/pharmacy`, maintain medication availability/AED prices through **Medications**, and prepare prescriptions sent by doctors. They receive the prescription/dispensing snapshot, not the patient's full clinical history.

Finalizing a doctor's record completes its appointment and opens **Send medication to pharmacy**. Sending creates a distinct pharmacy token shared by patient and pharmacist. The patient sees **Collect your medicine at pharmacy**, with pending/ready status, on **My pharmacy** and in homepage/appointment banners.

Confirm gathered quantities and prices, and give a reason for each unavailable item. Once the checklist is resolved, mark the order ready. Patients pay at the counter or through configured Stripe checkout. Confirm collection separately after handing over a paid order. Paid orders have downloadable receipts. Full refunds are available before collection and preserve the original bill.

Open **Stock & expiry** to manage medication batches and record stock movements. Adjust stock after dispensing and reconcile it with physical inventory. See [Pharmacy walkthrough](PHARMACY.md) for payment and refund details.

## Queue statuses

| Current state | Allowed staff/doctor transitions |
|---|---|
| `pending` | `called`, `skipped`, `cancelled` |
| `called` | `completed`, `skipped`, `cancelled` |
| `skipped` | `pending`, `called`, `cancelled` |
| `completed` | None |
| `cancelled` | None |

Patients can cancel their own pending, called or skipped tokens before a consultation starts. Check-in and consultation start record timestamps alongside the queue status. Several visits can be called, with one open consultation per doctor.

## QR behavior and current limits

Each appointment now links to its own signed QR. Use **My visit QR** (also visible on the homepage and Profile), and select the exact doctor/date/appointment you are attending. Your HQ user ID stays the same while the QR changes for every visit. Doctors select **Scan patient QR** on that appointment, scan with a camera or uploaded QR image, or paste the signed card data. The app verifies the patient, appointment ID and visit date all match before opening the visit record. Other doctors' records still require OTP consent. Camera use requires browser permission and HTTPS or localhost. The custom QR URI is decoded by Hospiq rather than opened as a browser link.

Consultation hours use the deployment timezone and daytime schedule intervals. Booking gives a queue number. A wait estimate uses recent measured consultations when enough samples exist.

## Patient medical records and permission

Open **Medical records** in the patient navigation. Add the date/time of a past visit, treating doctor, facility, department, medications, prescription text, notes and lab/prescription files. Use **Scan / take photo** for supported device cameras or **Upload files** for JPEG/PNG/PDF; capturing an image adds an attachment. Where local OCR is configured, use the separate extraction action and review the text before applying it to notes.

For external visits, enter doctor/facility names. To associate an upload with an existing Hospiq doctor, select that doctor and explicitly confirm they treated you and may view this record. Matching a typed name alone does not establish a trusted doctor identity. Patient-entered records are labeled.

When another doctor requests access, the email identifies that doctor and hospital and explains the 30-minute scope. Do not share the code unless you approve. **Doctors with temporary access** shows active grants and a **Revoke access** action. Revocation blocks future reads, but cannot retract information already viewed or downloaded. SMS delivery is not implemented.

See [Medical records](MEDICAL_RECORDS.md) for the exact contract, storage setup, and legacy public-link migration notes.

Every registered account has a stable HQ-prefixed user ID on Profile. Patient IDs are also shown beside doctor queue entries. See [Patient QR](PATIENT_QR.md) for the full identification workflow and offline-walk-in limits.
