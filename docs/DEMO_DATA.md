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

## Full-flow test

1. Use the password from your own seed run to sign in as the Creekside patient.
2. Book Cardiology with Maya Patel and note the token number.
3. Sign out and sign in as Creekside staff. Refresh the queue and find that visit.
4. Sign in as Maya Patel in a separate browser profile or after signing out. Verify the visit is visible.
5. Call the visit, then complete it; verify patient history shows completed after refreshing.
6. Book another visit and cancel it as the patient. Confirm it remains in history and leaves the active view.
7. Sign in as Palm staff and verify Creekside queue data is not included.

Never publish your generated password, reuse it outside testing, or run demo seeding against a real patient-data environment.
