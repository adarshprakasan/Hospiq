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

Hospiq gives patients and hospital teams a shared appointment workflow. Patients find a hospital or clinic, choose a department and doctor, and book a same-day queue token. Staff register walk-ins and manage the queue; doctors see visits assigned to their linked clinical profiles.

Patients keep their visit history, medications, prescriptions, and lab reports in one place. A signed QR connects each appointment to the correct patient and doctor. Doctors can read their own associated records; access to another clinician's records requires the patient's approval.

Built and maintained by [Adarsh](https://github.com/adarshprakasan).

**Project status:** development and demonstration. New medical attachments use encrypted private storage with authorized downloads. Existing public-link attachments require private migration/re-upload; broader database concurrency testing and operational hardening remain release work. Use fictional patient information while evaluating the app. See [Security](SECURITY.md) and the [project review](PROJECT_REVIEW.md).

## Features

| Patients | Hospital staff | Doctors |
|---|---|---|
| Email-verified registration | Hospital/clinic setup | Registered account linked to a clinical profile |
| Search facilities by name, address, or department | Departments, doctor profiles, and account linking | Queue scoped to the linked doctor |
| Filter hospitals and clinics | Weekly consultation schedules | Call, skip, and complete visits |
| Book same-day tokens during consultation hours | Walk-in bookings and hospital queue search | Manage own availability and schedule |
| Appointment history, cancellation, printable tickets | Queue counts and status filters | Dated visit records and prescriptions |
| Visit-specific QR selector and stable user ID | User ID on Profile | Scan patient QR, confirm matched appointment, and start record entry |
| Medical history, scanned documents, lab uploads, consent revocation | No access to clinical records | Own earlier visit records; other records with patient-approved email OTP |

The interface includes responsive navigation, a shared teal/neutral theme, loading and empty states, guarded routes, and lazy-loaded pages. The medical-record page includes dated visits, structured medications, protected prescription/lab files, camera capture, and patient-controlled temporary doctor access. Automatic OCR, SMS OTP, future-date slots, live queue notifications, and patient queue-position estimates are not implemented.

### Visit-specific QR check-in

- Every user has a stable `HQ-...` public ID. Each patient appointment has its own signed QR containing the patient identity, appointment ID, and visit date, so two visits on the same day have different codes.
- **My visit QR**, the patient homepage, and Profile show a selector for today's active visits, with download and copy options.
- Doctors scan by camera, upload a QR image, or paste its data from the selected patient's queue row. The server checks the patient, treating doctor, exact appointment, date, and active status before allowing visit entry.
- Previous-day, completed, cancelled, tampered, and mismatched visit codes are rejected. Scanning a QR does not grant access to other doctors' records.

### Medical history and patient permission

- Records capture visit date/time, doctor, hospital, department, diagnosis/reason, notes, prescription text, and structured medication details.
- Doctors create records for their visits. Patients can add earlier visits and upload or photograph JPEG, PNG, or PDF prescriptions and lab reports, with up to five files per record and 10 MB per file.
- New attachments use AES-256-GCM encrypted private storage and authenticated downloads. Patients can view their own history; staff cannot read clinical records.
- Treating doctors can view their own associated history. Patient uploads may explicitly be associated with a Hospiq doctor after confirmation.
- For other clinicians' records, a doctor with an eligible current visit requests a six-digit email OTP. Patient approval grants 30 minutes of read-only access; the patient can revoke it sooner. Codes expire after five minutes and are single-use, with limited failed attempts.
- Histories support search and filtering by who added the record. Patients can open Medical records directly from navigation or its URL without scanning a QR first.

See [Patient QR](docs/PATIENT_QR.md), [Medical records](docs/MEDICAL_RECORDS.md), and the [complete feature-testing walkthrough](docs/TEST_TODAYS_FEATURES.md).

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 19, React Router 7, Material UI 7, Axios, Vite 7 |
| API | Node.js, Express 5, Mongoose 8 |
| Database | MongoDB 7+ recommended |
| Authentication | JWT bearer tokens, bcrypt passwords, email OTP |
| Integrations | Nodemailer/Gmail or SMTP, private encrypted attachment storage, QR code generation |
| Tests | Node.js test runner and assertions |

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

Fill in `server/.env` with your MongoDB URI, JWT secret, Gmail app credentials, and a separate medical-file encryption key. `client/.env` contains only the public API base URL. See the [environment reference](docs/CONFIGURATION.md); do not put secrets in `VITE_*` variables.

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

These commands write to the MongoDB database selected by `server/.env`. Use a dedicated demo database:

### Large feature-testing dataset

```powershell
npm --prefix server run seed:large
```

This adds **6 facilities, 30 doctors with linked accounts, 12 staff, 120 patients, 30 schedules, 1,440 historical visits and medical records, 480 encrypted sample lab reports, and 240 appointments for the seed date**. The five departments are General Medicine, Cardiology, Paediatrics, Dermatology, and Orthopaedics.

The seed preserves existing records, passwords, and test edits. Repeating it on the same day does not duplicate data; running it on another date adds that day's appointments. All appointment date checks use `HOSPITAL_TIMEZONE` (Asia/Dubai by default).

| Demo role | Email | Scenario |
|---|---|---|
| Patient | `patient001@demo.hospiq.invalid` | Two initial active visits and 12 historical records |
| Harbour doctor | `doctor01@demo.hospiq.invalid` | Patient001's Harbour visit and associated history |
| Oasis doctor | `doctor06@demo.hospiq.invalid` | Separate visit QR and cross-doctor permission checks |
| Harbour staff | `staff01@demo.hospiq.invalid` | Hospital queue and doctor management |

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
| `npm --prefix server run dev` | API with nodemon |
| `npm --prefix server start` | API without auto-reload |
| `npm --prefix client run dev` | Vite development server |
| `npm --prefix client run build` | Build frontend into `client/dist` |
| `npm --prefix client run preview` | Local preview of built frontend |
| `npm --prefix server test` | Backend regression tests |
| `npm --prefix server run test:records` | Isolated database + local SMTP medical-record integration checks |
| `npm --prefix server run check:upgrade` | Read-only database upgrade preflight |
| `npm --prefix server run seed:large` | 6 facilities, 162 users, 1,680 visits, 1,440 records and 480 encrypted demo files |
| `npm --prefix server run seed:demo` | Insert demo facilities/doctors/schedules |
| `npm --prefix server run seed:accounts` | Insert and link demo login accounts |
| `npm --prefix server audit` / `npm --prefix client audit` | Current dependency advisories |

## Documentation

| Document | Contents |
|---|---|
| [Documentation index](docs/README.md) | Reading paths by role |
| [Setup](docs/SETUP.md) | Install, run, upgrade, and troubleshoot |
| [Configuration](docs/CONFIGURATION.md) | Environment variables and provider settings |
| [User guide](docs/USER_GUIDE.md) | Patient, staff, and doctor workflows |
| [Demo data](docs/DEMO_DATA.md) | Fictional facilities, accounts, and smoke test |
| [Architecture](docs/ARCHITECTURE.md) | Components, data model, and access boundaries |
| [API reference](docs/API.md) | Routes, authorization, requests, and responses |
| [Medical records](docs/MEDICAL_RECORDS.md) | Visit records, private attachments, and patient consent |
| [Patient QR](docs/PATIENT_QR.md) | Per-appointment codes, doctor scanning, and matched visit records |
| [Test today's features](docs/TEST_TODAYS_FEATURES.md) | Large dataset, account roles, QR, clinical records and OTP walkthrough |
| [Testing](docs/TESTING.md) | Automated checks and manual scenarios |
| [Deployment](docs/DEPLOYMENT.md) | Build/hosting model and release requirements |
| [Roadmap](docs/ROADMAP.md) | Prioritized gaps and feature ideas |
| [Project review](PROJECT_REVIEW.md) | Dated findings and verification evidence |
| [Changelog](CHANGELOG.md) | Unreleased changes and baseline commit |

## Verification

```powershell
npm --prefix server test
npm --prefix server run test:records
npm --prefix client run build
```

The latest feature baseline passed **24 backend regression tests, 89 isolated medical-record/QR integration checks, and the frontend production build**. The integration suite uses a disposable database and local SMTP fixture, sends no real email, and cleans up its temporary data. The direct medical-record page fix was also checked across six patient/doctor navigation cases. Hardware camera capture and real-provider email delivery still need manual verification.

## Contributing and support

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Report reproducible bugs through [GitHub Issues](https://github.com/adarshprakasan/Hospiq/issues); include sanitized details only. See [SUPPORT.md](SUPPORT.md) for help and [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License and copyright

Copyright (c) 2026 Adarsh. Licensed under the [ISC License](LICENSE), matching the existing backend package declaration. Third-party dependencies retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The license text follows the [SPDX ISC template](https://spdx.org/licenses/ISC.html).
