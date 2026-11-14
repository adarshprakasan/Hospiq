<div align="center">

  <img src="client/public/hospiq.svg" width="76" height="76" alt="Hospiq logo" />
  <h1>Hospiq</h1>
  <p><strong>Better care. Less waiting.</strong></p>
  <p>Hospital discovery, visit-specific QR check-in, patient-owned medical records, and care-team queue management.</p>
  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-ISC-087f72" alt="License: ISC" /></a>
    <a href="docs/SETUP.md"><img src="https://img.shields.io/badge/Node.js-22.12%2B-339933" alt="Node.js 22.12 or newer" /></a>
    <a href="docs/ARCHITECTURE.md"><img src="https://img.shields.io/badge/React-19-149eca" alt="React 19" /></a>
    <a href="docs/SETUP.md"><img src="https://img.shields.io/badge/status-development-e5a437" alt="Development status" /></a>
  </p>
  <p><a href="docs/SETUP.md">Get started</a> · <a href="docs/USER_GUIDE.md">User guide</a> · <a href="docs/API.md">API reference</a> · <a href="docs/ROADMAP.md">Roadmap</a></p>
</div>

## Overview

Hospiq gives patients and hospital teams a shared appointment workflow. Patients find a hospital or clinic, choose a department and doctor, and book a queue visit up to 90 days ahead. Staff register walk-ins and manage the queue; doctors see visits assigned to their linked clinical profiles. Pharmacists manage hospital medication availability/prices and prepare doctor-sent prescriptions using separate pharmacy tokens.

Patients keep their visit history, medications, prescriptions, and lab reports in one place. A signed QR connects each appointment to the correct patient and doctor. Doctors can read their own associated records; access to another clinician's records requires the patient's approval.

Built and maintained by [Adarsh](https://github.com/adarshprakasan).

**Project status:** development and demonstration. New medical attachments use encrypted private storage with authorized downloads. Existing public-link attachments require private migration/re-upload; production rollout requires a restore rehearsal, provider verification and operational hardening. Use fictional patient information while evaluating the app. See [Security](SECURITY.md) and the [project review](PROJECT_REVIEW.md).

## Features

| Role | Scope and primary duties |
|---|---|
| Hospiq Admin | Platform console: facilities, patient identity/contact data, team accounts, departments, operations, billing and audit history |
| Patient | Care discovery, appointments, visit QR, family profiles, health summary, private records, lab results, notifications and pharmacy payments |
| Hospital / Clinic Admin | Own facility, departments, staff/doctor/pharmacist accounts and credentials, operational data and banking/payment settings |
| Hospital staff | Own hospital arrivals, queue, walk-in account linking and doctor schedules |
| Pharmacist | Own hospital catalogue, batch inventory, dispensing, payments, collection and refunds |
| Doctor | Own clinical queue and profile, consultation, records, consent requests, lab orders and pharmacy handoff |

Clinical records and lab files remain patient-controlled. Administrators receive operational access rather than a bypass to medical history. Existing staff remain queue-only; separate facility admins manage employees and departments. See [Administration and database upgrade](docs/ADMINISTRATION.md).

### Discovery, appointments and family access

- **My profile** brings together editable account details, a private photo, height and weight with calculated BMI, reviewed health data imports, saved providers, privacy controls and support. See the [profile guide](docs/USER_GUIDE.md#my-profile).

- Browse providers before signing in, search by facility, address or department, and keep your doctor selection through login. Book or reschedule a queue visit within 90 days. Schedules support closure dates and daily capacity.
- Open the visit QR, directions and arrival instructions on the patient home or appointments page. After check-in, eligible visits display people ahead and a wait estimate when sufficient consultation data exists.
- Manage dependent profiles and temporary adult delegation in **Family access**. Use **Health summary** for patient-reported information and clinical access history.
- Receive in-app updates for queue calls, medicine readiness and reviewed lab results. Opt into next-day email reminders where the reminder worker is scheduled. Password recovery uses a short-lived email link.
- Use the patient navigation on mobile or switch to Arabic for right-to-left layout and translated common labels. Untranslated text falls back to English.

See [Care workflows](docs/CARE_WORKFLOWS.md) and the [role-based user guide](docs/USER_GUIDE.md).

### Visit-specific QR check-in

- Every user has a stable `HQ-...` public ID. Each patient appointment has its own signed QR containing the patient identity, appointment ID, and visit date, so two visits on the same day have different codes.
- **My visit QR**, the patient homepage, and Profile show a selector for today's active visits, with download and copy options.
- Doctors scan by camera, upload a QR image, or paste its data from the selected patient's queue row. The server checks the patient, treating doctor, exact appointment, date, and active status before allowing visit entry.
- Previous-day, completed, cancelled, tampered, and mismatched visit codes are rejected. Scanning a QR does not grant access to other doctors' records.

### Medical history and patient permission

- Records capture visit date/time, doctor, hospital, department, diagnosis/reason, notes, prescription text, and structured medication details.
- Doctors search their hospital's medication catalogue, where each strength/form is a separate entry. Prescriptions use Morning/Noon/Night checkboxes, start/end date calendars (start defaults to today), optional Before food/After food selection, and instructions. Pharmacists manage the available list and AED prices in **Medications**; removing an entry preserves existing prescriptions.
- The clinician workspace opens notes and history alongside the queue. Doctors can save private drafts, finalize records with structured vitals, and add dated corrections with a reason. Patients can download visit summaries. Optional local image OCR returns text for review.
- Doctors order and review lab tests. Patients can link a finalized lab report associated with the ordering doctor.
- Doctors create records for their visits. Patients can add earlier visits and upload or photograph JPEG, PNG, or PDF prescriptions and lab reports, with up to five files per record and 10 MB per file.
- New attachments use AES-256-GCM encrypted private storage and authenticated downloads. Patients can view their own history; staff cannot read clinical records.
- Treating doctors can view their own associated history. Patient uploads may explicitly be associated with a Hospiq doctor after confirmation.
- For other clinicians' records, a doctor with an eligible current visit requests a six-digit email OTP. Patient approval grants 30 minutes of read-only access; the patient can revoke it sooner. Codes expire after five minutes and are single-use, with limited failed attempts.
- Histories support search and filtering by who added the record. Patients can open Medical records directly from navigation or its URL without scanning a QR first.

See [Patient QR](docs/PATIENT_QR.md), [Medical records](docs/MEDICAL_RECORDS.md), and the [complete feature-testing walkthrough](docs/TEST_TODAYS_FEATURES.md).

### Pharmacy collection and payments

- **Pharmacist** accounts have a hospital-scoped dashboard and maintain medication availability, selling units, and AED prices. Hospital/Clinic Admins create and assign pharmacist accounts through their console.
- Finalizing a doctor's record completes the associated appointment and prompts **Send medication to pharmacy**. Sending generates a separate pharmacy token, visible to the patient and pharmacist; retrying the same handoff preserves the token.
- Pharmacists confirm gathered quantities and prices or mark unavailable items with a reason. Only available items contribute to the frozen bill. Entirely unavailable orders have no payment due.
- Patients choose **Proceed to payment → Pay at counter** or **Pay Online**. Counter payments are confirmed by the pharmacist's **Paid at counter** action. The patient payment dialog shows confirmation and closes automatically, while a receipt remains in paid history.
- Pharmacists record collection separately from payment. Patients can download receipts. Full refunds are available for paid, uncollected orders. Batch inventory tracks stock, expiry and manual adjustments.
- Stripe hosted checkout supports cards and eligible Apple Pay/Google Pay wallets after merchant configuration. Paid status is verified server-side through signed webhooks or session retrieval; no success URL can mark an order paid. Active online checkout is expired before switching to counter payment.
- Pharmacists receive only the sent prescription/dispensing snapshot, without access to general clinical history or lab files. Online checkout remains unavailable until Stripe keys and its webhook are configured; counter payments work independently.

See [Pharmacy testing and Stripe setup](docs/PHARMACY.md) for accounts, preparation, pricing, payment flow, and provider setup.

### Administration and data organization

- Dedicated platform and hospital/clinic dashboards with scoped search, bounded pagination, details, team provisioning, temporary credentials, archive/restore and redacted audits.
- First-login password changes and session revocation for console-created/reset employee accounts. Public signup is limited to patients and unassigned hospital admins.
- Canonical department IDs, linked clinical profiles, indexed hospital/role/status/date queries and additive migration that preserves historical records and existing staff roles.
- Encrypted hospital bank identifiers and administrator-only billing settings; online checkout can be disabled per facility. Bank records do not change the existing platform Stripe settlement routing.
- Server-side medical-history search/filtering and 20-record pages for patient/doctor views. Doctors own clinical availability; staff/admins own weekly schedules.

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 19, React Router 7, Material UI 7, Axios, Vite 7 |
| API | Node.js, Express 5, Mongoose 8 |
| Database | MongoDB 7+ recommended |
| Authentication | JWT bearer tokens, bcrypt passwords, email OTP |
| Integrations | Nodemailer/Gmail or SMTP, private encrypted attachment storage, QR code generation |
| Quality checks | Node.js tests, disposable MongoDB integration suites, Playwright, axe, ESLint and GitHub Actions |

## Quick start

Install Node.js **22.12+**, npm, and MongoDB locally, or prepare a MongoDB Atlas connection. Run from the repository root:

```powershell
git clone https://github.com/adarshprakasan/Hospiq.git
Set-Location Hospiq
npm --prefix server ci
npm --prefix client ci
```

Create environment files only when they do not already exist:

```powershell
if (!(Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
if (!(Test-Path client/.env)) { Copy-Item client/.env.example client/.env }
```

Fill in `server/.env` with your MongoDB URI, JWT secret, a separate medical-file encryption key, and SMTP credentials for email features. `client/.env` contains only the public API base URL. See the [environment reference](docs/CONFIGURATION.md); do not put secrets in `VITE_*` variables.

Start the API and frontend in two separate terminals:

```powershell
# Terminal 1, repository root
npm --prefix server run dev
```

```powershell
# Terminal 2, repository root
npm --prefix client run dev
```

Open [the app](http://localhost:5173) and check [API health](http://localhost:5000/api/health). Detailed Windows instructions, provider setup, and upgrade steps are in [Setup](docs/SETUP.md).

## Demo data and accounts

For an existing installation, run the read-only role/database preflight before applying the additive upgrade, then restart both services:

```powershell
npm --prefix server run upgrade:roles
npm --prefix server run upgrade:roles -- --apply
```

The upgrade preserves existing accounts, passwords, clinical records, payments and token numbers; existing staff remain queue-only. It backfills canonical department relationships and creates indexes without dropping collections or existing indexes. New demo administrators are added separately by `seed:admins`. For a fresh deployment without demo data, follow the [first administrator bootstrap instructions](docs/ADMINISTRATION.md#fresh-deployment-without-demo-data).

These commands write to the MongoDB database selected by `server/.env`. Use a dedicated demo database:

### Large feature-testing dataset

```powershell
npm --prefix server run seed:large
npm --prefix server run seed:medications
npm --prefix server run seed:pharmacy
npm --prefix server run upgrade:roles -- --apply
npm --prefix server run seed:admins
```

This adds **6 facilities, 30 doctors with linked accounts, 12 staff, 120 patients, 30 schedules, 1,440 historical visits and medical records, 480 encrypted sample lab reports, and 240 appointments for the seed date**. The five departments are General Medicine, Cardiology, Paediatrics, Dermatology, and Orthopaedics.

The seed preserves existing records, passwords, and test edits. Repeating it on the same day does not duplicate data; running it on another date adds that day's appointments. All appointment date checks use `HOSPITAL_TIMEZONE` (Asia/Dubai by default).

The medication seed adds eight fictional medicine/strength/form choices per large-demo facility (48 total). It preserves existing entries and removed availability. See [Medication prescribing](docs/MEDICATIONS.md) for the redesigned form and catalogue workflow.

The pharmacy seed adds **12 pharmacists**, fills missing demo prices, and creates **24 pharmacy orders with dedicated fictional completed visits/records**, covering pending, partially gathered, ready, and counter-paid cases. It preserves existing passwords, prices, statuses, and payments. Pharmacists use the same locally generated large-demo password.

| Demo role | Email | Scenario |
|---|---|---|
| Patient | `patient001@demo.hospiq.invalid` | Two initial active visits and 12 historical records |
| Harbour doctor | `doctor01@demo.hospiq.invalid` | Patient001's Harbour visit and associated history |
| Oasis doctor | `doctor06@demo.hospiq.invalid` | Separate visit QR and cross-doctor permission checks |
| Hospiq Admin | `admin@demo.hospiq.invalid` | Platform administration |
| Harbour Hospital Admin | `hospitaladmin01@demo.hospiq.invalid` | Personnel, departments, operations and banking |
| Harbour staff | `staff01@demo.hospiq.invalid` | Hospital queue and doctor management |
| Harbour pharmacist | `pharmacist01@demo.hospiq.invalid` | Medication prices, preparation checklist and counter payments |
| Oasis pharmacist | `pharmacist03@demo.hospiq.invalid` | Separate hospital pharmacy queue |

The seed saves its generated password and complete roster in the ignored local file `server/.demo-large-credentials.json`. Retrieve your local demo password with:

```powershell
(Get-Content server/.demo-large-credentials.json -Raw | ConvertFrom-Json).password
```

Use a normal browser window for the patient and an incognito window or another browser for the doctor; ordinary tabs share the login. Dummy `*.invalid` email addresses cannot receive OTPs. Use a real verified patient email for manual consent testing, or the isolated local SMTP integration suite below. Follow [Test today's features](docs/TEST_TODAYS_FEATURES.md) for QR matching, wrong-code rejection, record entry, uploads, downloads, consent, expiry, and revocation. A fictional upload fixture is included at [demo-lab-report.pdf](server/fixtures/demo-lab-report.pdf).

### Smaller discovery dataset

```powershell
npm --prefix server run seed:demo
npm --prefix server run seed:accounts
```

The facility seed creates **3 fictional facilities, 9 embedded department entries, 9 doctors, and 9 weekly schedules**. The account seed creates **3 patients, 3 staff, and 9 linked doctor accounts**. It generates and prints a password for newly created accounts; existing passwords are preserved on rerun. No OTP email is required for seeded accounts, and no application-wide authentication bypass is introduced.

For Creekside testing, use `patient.creekside@example.invalid`, `staff.creekside@example.invalid`, and `maya.patel@example.invalid` with the password printed by your own seed run. Live credentials are not stored in this repository. See [Demo data](docs/DEMO_DATA.md) for every account, department, and testing scenario.

## Commands

| Command from repository root | Purpose |
|---|---|
| `npm --prefix server run dev` | API with Node's built-in watch mode |
| `npm --prefix server start` | API without auto-reload |
| `npm --prefix client run dev` | Vite development server |
| `npm --prefix client run build` | Build frontend into `client/dist` |
| `npm --prefix client run preview` | Local preview of built frontend |
| `npm --prefix server test` | Backend regression tests |
| `npm --prefix server run test:records` | Isolated database + local SMTP medical-record integration checks |
| `npm --prefix server run test:journey` | Expanded booking, records, delegation, pharmacy, inventory, lab and reminder integration checks |
| `npm --prefix client run lint` | Check frontend code |
| `npm --prefix client run test:browser` | Playwright journeys with fixture data |
| `npm --prefix server run reminders:run` | Send eligible next-day reminders from a deployment scheduler |
| `npm --prefix server run check:upgrade` | Read-only database upgrade preflight |
| `npm --prefix server run seed:large` | 6 facilities, 162 users, 1,680 visits, 1,440 records and 480 encrypted demo files |
| `npm --prefix server run seed:medications` | Add 48 fictional catalogue choices across the six large-demo facilities |
| `npm --prefix server run upgrade:roles` / `npm --prefix server run upgrade:roles -- --apply` | Read-only preflight / additive department-reference and index migration |
| `npm --prefix server run seed:admins` | Add one demo Hospiq Admin and six facility admins; preserve staff roles |
| `npm --prefix server run test:management` | Disposable role/scope, credentials, archive, bank and indexed-query tests |
| `npm --prefix server run seed:pharmacy` | Add 12 pharmacist accounts, prices and 24 fictional pharmacy orders |
| `npm --prefix server run test:pharmacy` | Disposable pharmacy + local Stripe HTTP/webhook fixture; no real charges |
| `npm --prefix server run seed:demo` | Insert demo facilities/doctors/schedules |
| `npm --prefix server run seed:accounts` | Insert and link demo login accounts |
| `npm --prefix server audit` / `npm --prefix client audit` | Current dependency advisories |

## Documentation

| Document | Contents |
|---|---|
| [Documentation index](docs/README.md) | Reading paths by role |
| [Project guide](docs/PROJECT_GUIDE.md) | Features, architecture, API, testing, and deployment |
| [Application route map](docs/ROUTES.md) | Screens by role |
| [Care workflows](docs/CARE_WORKFLOWS.md) | Current features and limits by workflow |
| [Operations](docs/OPERATIONS.md) | Rollout, readiness, reminders, OCR and verification |
| [Setup](docs/SETUP.md) | Install, run, upgrade, and troubleshoot |
| [Configuration](docs/CONFIGURATION.md) | Environment variables and provider settings |
| [User guide](docs/USER_GUIDE.md) | Patient, staff, doctor and pharmacist workflows |
| [Demo data](docs/DEMO_DATA.md) | Fictional facilities, accounts, and smoke test |
| [Administration](docs/ADMINISTRATION.md) | Role hierarchy, scoped consoles, credentials, banking, migration and improvement recommendations |
| [Architecture](docs/ARCHITECTURE.md) | Components, data model, and access boundaries |
| [API reference](docs/API.md) | Routes, authorization, requests, and responses |
| [Medical records](docs/MEDICAL_RECORDS.md) | Visit records, private attachments, and patient consent |
| [Medication prescribing](docs/MEDICATIONS.md) | Hospital catalogue, strengths, frequency checkboxes, date ranges and food timing |
| [Pharmacy and payments](docs/PHARMACY.md) | Pharmacist assignment, pharmacy tokens, checklists, billing and Stripe configuration |
| [Patient QR](docs/PATIENT_QR.md) | Per-appointment codes, doctor scanning, and matched visit records |
| [Test today's features](docs/TEST_TODAYS_FEATURES.md) | Large dataset, account roles, QR, clinical records and OTP walkthrough |
| [Testing](docs/TESTING.md) | Automated checks and manual scenarios |
| [Deployment](docs/DEPLOYMENT.md) | Build/hosting model and release requirements |
| [Roadmap](docs/ROADMAP.md) | Prioritized gaps and feature ideas |
| [Project review](PROJECT_REVIEW.md) | Dated findings and verification evidence |
| [Changelog](CHANGELOG.md) | Unreleased changes and baseline commit |

## Verification

For administrator testing, sign in as `admin@demo.hospiq.invalid` or `hospitaladmin01@demo.hospiq.invalid` using your existing private large-demo password. Verify facility scope, create a team member, save the one-time temporary credentials, and confirm the first-login password change. Existing `staff01` accounts now show only queues and schedules. Follow [Administration](docs/ADMINISTRATION.md) for bank settings, archive/restore, privacy checks and prioritized improvement suggestions.

| Role test | Expected result |
|---|---|
| Hospiq Admin opens the platform console | Facility/account/operational lists support search, details and pagination |
| Hospital Admin opens accounts or changes a resource | Only their facility's employees/resources are accessible; cross-hospital requests are rejected |
| Newly provisioned employee signs in | Must change temporary password before accessing the workspace; resets revoke older sessions |
| Staff opens their workspace | Queue, walk-ins and schedules; no department/account/catalogue/banking management |
| Doctor opens clinical workspace | Own queue/profile/availability and records; staff/admins own weekly schedule edits |
| Pharmacist opens their workspace | Own hospital's medicine catalogue, dispensing checklist and counter payments |
| Patient opens medical history | Own records, server-side search/filtering and 20-record pages; consent remains patient-controlled |
| Admin archives/restores an operational record | Related medical/payment history remains; active-visit and account-lockout guards apply |
| Admin saves bank settings | IBAN is validated/encrypted and masked by default; bank records do not reroute Stripe settlement |

Use independent browser sessions when switching roles. Administrative control does not bypass private clinical-history rules or allow arbitrary rewriting of paid bills/audit trails.


For a quick pharmacy test, start the API/frontend and use separate browser sessions for the patient, doctor and pharmacist:

1. As `doctor01@demo.hospiq.invalid`, finalize a called patient's medical record with medications, then select **Send medication to pharmacy**. Finalizing completes the visit; sending shows the new pharmacy token.
2. As `pharmacist01@demo.hospiq.invalid`, find that token, confirm selling quantities/prices, check each gathered medicine, then select **Done — mark ready**.
3. As the matching patient, open **My pharmacy**, confirm the same token/total, then choose **Proceed to payment → Pay at counter**.
4. After collecting the amount, the pharmacist selects **Paid at counter**. The patient sees confirmation, the payment dialog closes automatically, and the receipt remains in paid history.
5. For online tests, configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in the ignored backend environment file and follow the [Stripe test setup](docs/PHARMACY.md#stripe-test-configuration). Use Stripe test mode; dummy orders do not constitute real payments.

The pharmacy seed also provides ready-made pending/ready/paid cases for `patient001@demo.hospiq.invalid`. All demo login passwords come from your local credential file described above. Run the automated checks from the repository root:

```powershell
npm --prefix server test
npm --prefix server run test:records
npm --prefix server run test:pharmacy
npm --prefix server run test:management
npm --prefix client run build
```

The November 9 workflow verification passed **36 server unit tests, 445 integration checks, five browser journeys, frontend lint and the production build**. See [Testing](docs/TESTING.md) for suite commands and [Operations](docs/OPERATIONS.md) for rollout checks. Integration suites use disposable databases and local SMTP/Stripe HTTP fixtures, send no real email or charges, and clean up their temporary data. Browser checks cover medication controls, pharmacist checklists/readiness, shared patient tokens/totals, counter instructions, automatic payment-dialog closure, and paid history. Hardware camera capture, real-provider email delivery, and live merchant/wallet checkout still need manual verification.

## Contributing and support

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Report reproducible bugs through [GitHub Issues](https://github.com/adarshprakasan/Hospiq/issues); include sanitized details only. See [SUPPORT.md](SUPPORT.md) for help and [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License and copyright

Copyright (c) 2026 Adarsh. Licensed under the [ISC License](LICENSE), matching the existing backend package declaration. Third-party dependencies retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The license text follows the [SPDX ISC template](https://spdx.org/licenses/ISC.html).
