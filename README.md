# Hospiq

Hospiq connects patients with hospitals and clinics and gives care teams a same-day appointment queue. React 19 + MUI 7 + Vite on the frontend; Express 5 + Mongoose on the backend.

## Local development

Use Node.js 22.12+ and MongoDB 7+. Install the exact audited dependency versions from the committed lockfiles:

```powershell
npm --prefix server ci
npm --prefix client ci
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

If `.env` files already exist, edit them instead of overwriting them. Configure MongoDB, a strong JWT secret, Gmail app credentials for verification emails, and Cloudinary credentials for uploads. The checked-in examples contain no secrets. Keep the timezone setting aligned with your hospital; the default is Asia/Dubai. This version uses one hospital timezone per server deployment.

Start each service in its own terminal:

```powershell
npm --prefix server run dev
npm --prefix client run dev
```

Frontend: http://localhost:5173. API: http://localhost:5000/api. Health: `/api/health`.

## Main workflows

- Patients register with email verification, find facilities by name/address/department, choose a doctor, book a same-day token during consultation hours, view history, print a QR token, and cancel active appointments.
- Staff register, create their hospital, add departments and doctors, configure weekly schedules, register walk-in patients, and call/skip/complete visits in their hospital queue.
- Doctors register and have a staff manager link their account to their doctor profile using **Manage doctors → Link doctor account**. A new profile can also be linked at creation. Doctor users creating their own facility can create a profile linked to themselves.
- Clinical records are available through authenticated API routes. Doctor record access is limited to records they authored; patient access is limited to their own records. A complete clinical-record editor is still a product gap.

## Existing installation upgrade

Back up the database before upgrading. The new unique indexes intentionally reject duplicate doctor/date/token numbers and duplicate active bookings. Run the read-only preflight from the server directory before starting the upgraded server:

```powershell
Set-Location server
npm run check:upgrade
```

Resolve any historical duplicate groups through a reviewed data migration; the script never deletes or renumbers records. Startup waits for required indexes and fails if their creation fails. Existing unlinked doctor profiles need linking through the manager screen. Existing OTP records use the old format and should be allowed to expire; request fresh codes after upgrading. Legacy mixed-case email accounts need a reviewed normalization/deduplication migration before normalized login can find them.

MongoDB partial unique indexes support the active-booking constraint; see [MongoDB's partial-index documentation](https://www.mongodb.com/docs/manual/core/index-partial/). Cloudinary now uses the native streaming SDK rather than the old adapter.

## Validation

```powershell
npm --prefix server test
npm --prefix client run build
npm --prefix server audit
npm --prefix client audit
```

See [PROJECT_REVIEW.md](PROJECT_REVIEW.md) for findings, remaining risks, feature ideas, and verification limits. This is a development application; outstanding medical-file privacy and operational controls must be addressed before handling real patient data.

## Demo data

Run `npm --prefix server run seed:demo` to insert three clearly labeled fictional facilities, nine departments, nine doctors, and weekly schedules into the database configured in `server/.env`. Reruns use stable IDs and insert-only updates, preserving existing records and later edits. Demo schedules run daily from 00:00 to 23:59 in the configured hospital timezone for booking tests. No login accounts or patient records are created. These facilities are not assigned to an existing staff account.

To create demo login accounts after the facility seed, run `npm --prefix server run seed:accounts`. This creates one patient and one staff account per demo facility and links an account to each of the nine demo doctors (15 accounts total). The command prints a generated password for newly created accounts and verifies their login behavior. Existing accounts and passwords are preserved on rerun. An optional `DEMO_ACCOUNT_PASSWORD` environment variable sets the initial password for new accounts only. These accounts use fictional `example.invalid` email addresses and are created directly for testing; no email is sent.
