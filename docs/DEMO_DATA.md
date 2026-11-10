# Demo facilities and accounts

[Documentation index](README.md)

## Seed commands

Use a database reserved for fictional testing, selected by `server/.env`:

```powershell
npm --prefix server run seed:demo
npm --prefix server run seed:accounts
```

The facility seed uses stable IDs and insert-only writes. The account seed checks for conflicting accounts/links before creating records. Reruns preserve existing passwords and subsequent edits, and conflicting ownership causes failure rather than reassignment. Seeds do not reset the database or remove real records. There is no automatic cleanup command.

The account seed prints a randomly generated password **only for newly created accounts**. All new accounts in that run share that password. The optional `DEMO_ACCOUNT_PASSWORD` setting applies only when creating accounts. Passwords are stored as bcrypt hashes. Existing passwords cannot be retrieved by rerunning the seed; retain your original output privately or use your own reviewed reset process for demo users.

Seeded accounts are inserted directly and can log in without OTP. Normal registration still requires verification. No real emails are sent to these fictional addresses.

## Facilities and doctor accounts

| Facility | Department | Doctor | Login email |
|---|---|---|---|
| Demo — Creekside Hospital | Cardiology | Maya Patel | `maya.patel@example.invalid` |
| Demo — Creekside Hospital | General Medicine | Omar Hassan | `omar.hassan@example.invalid` |
| Demo — Creekside Hospital | Paediatrics | Leila Thomas | `leila.thomas@example.invalid` |
| Demo — Palm Wellness Hospital | Orthopaedics | Arjun Menon | `arjun.menon@example.invalid` |
| Demo — Palm Wellness Hospital | Dermatology | Sara Ahmed | `sara.ahmed@example.invalid` |
| Demo — Palm Wellness Hospital | Neurology | Daniel Joseph | `daniel.joseph@example.invalid` |
| Demo — Marina Family Clinic | General Medicine | Aisha Khan | `aisha.khan@example.invalid` |
| Demo — Marina Family Clinic | Dentistry | Nina George | `nina.george@example.invalid` |
| Demo — Marina Family Clinic | Ophthalmology | Rohan Shah | `rohan.shah@example.invalid` |

There are nine embedded department entries across the three facilities; General Medicine appears in two facilities. The legacy standalone Department collection is not populated by this seed.

Every demo doctor has a seven-day schedule from `00:00` to `23:59` in the configured hospital timezone. The end boundary is exclusive, so booking is unavailable during the final minute of the day. These broad hours support testing and do not represent real clinical hours.

## Patient and staff accounts

| Facility reference | Patient email | Staff email |
|---|---|---|
| Creekside | `patient.creekside@example.invalid` | `staff.creekside@example.invalid` |
| Palm Wellness | `patient.palm@example.invalid` | `staff.palm@example.invalid` |
| Marina | `patient.marina@example.invalid` | `staff.marina@example.invalid` |

Patients and staff have a `hospitalId` reference; all nine doctor accounts also link to a clinical Doctor through `Doctor.userId`. Patient hospital references do not create staff privileges or restrict booking elsewhere. Seeds create no administrator accounts, patient visit history, medical records, or tokens.

For newer scenarios including future bookings, drafts, family access, lab review and stock movements, use [Care workflows](CARE_WORKFLOWS.md) with fictional accounts. The [journey suite](TESTING.md) creates its own fixtures.

## Full-flow test

1. Use the password from your own seed run to sign in as the Creekside patient.
2. Book Cardiology with Maya Patel and note the token number.
3. Sign out and sign in as Creekside staff. Refresh the queue and find that visit.
4. Sign in as Maya Patel in a separate browser profile or after signing out. Verify the visit is visible.
5. Call the visit, then complete it; verify patient history shows completed after refreshing.
6. Book another visit and cancel it as the patient. Confirm it remains in history and leaves the active view.
7. Sign in as Palm staff and verify Creekside queue data is not included.

Never publish your generated password, reuse it outside testing, or run demo seeding against a real patient-data environment.

## Medical-record consent testing

The seeded example.invalid emails cannot receive real permission codes. Do not add a universal/demo OTP bypass. Use `npm --prefix server run test:records` for the isolated database/local SMTP consent scenarios, or use a real verified patient account for actual email delivery. Patient upload and the treating doctor's own visit records do not require the cross-doctor OTP workflow.

## Large dataset

Run `npm --prefix server run seed:large` for 6 additional facilities, 30 doctors, 12 staff, 120 patients, 30 schedules, 1,440 historical visits/records, 480 encrypted PDF lab attachments and 240 appointments for the seed date. This namespace is separate from the earlier smaller seed. It reserves token numbers with atomic counters, uses stable IDs and insert-only data writes, preserves passwords/edits, and stores generated credentials in the ignored `server/.demo-large-credentials.json`. A rerun on the same date creates no duplicates; a different date adds new daily visits without deleting prior history.

Use [Test today's features](TEST_TODAYS_FEATURES.md) for the account patterns, concrete primary logins, visit rotation and consent tests. All email addresses are fictional `.invalid` addresses and cannot receive real OTP messages. No consent grant or universal OTP bypass is seeded. The sample report is [demo-lab-report.pdf](../server/fixtures/demo-lab-report.pdf), contains no clinical results, and is encrypted separately for each seeded attachment.


## Administrator accounts and role separation

The earlier small/large seeds preserve their staff as queue-only users. Run `npm --prefix server run upgrade:roles -- --apply` and `npm --prefix server run seed:admins` to add one demo Hospiq Admin and six facility admins, using the existing private large-demo password. See [Administration](ADMINISTRATION.md) for all login patterns, scope tests and provisioning instructions. No existing staff are promoted.
