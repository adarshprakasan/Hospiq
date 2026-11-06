<div align="center">
  <img src="client/public/hospiq.svg" width="76" height="76" alt="Hospiq logo" />
  <h1>Hospiq</h1>
  <p><strong>Better care. Less waiting.</strong></p>
  <p>Hospital discovery, same-day appointment tokens, and care-team queue management.</p>
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
| Permanent patient QR card and stable user ID | User ID on Profile | Scan patient QR, confirm matched appointment, and start record entry |
| Medical history, scanned documents, lab uploads, consent revocation | No access to clinical records | Own earlier visit records; other records with patient-approved email OTP |

The interface includes responsive navigation, a shared teal/neutral theme, loading and empty states, guarded routes, and lazy-loaded pages. The medical-record page includes dated visits, structured medications, protected prescription/lab files, camera capture, and patient-controlled temporary doctor access. Automatic OCR, SMS OTP, future-date slots, live queue notifications, and patient queue-position estimates are not implemented.

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
| [Patient QR](docs/PATIENT_QR.md) | Permanent identity cards, doctor scanning, and matched visit records |
| [Testing](docs/TESTING.md) | Automated checks and manual scenarios |
| [Deployment](docs/DEPLOYMENT.md) | Build/hosting model and release requirements |
| [Roadmap](docs/ROADMAP.md) | Prioritized gaps and feature ideas |
| [Project review](PROJECT_REVIEW.md) | Dated findings and verification evidence |
| [Changelog](CHANGELOG.md) | Unreleased changes and baseline commit |

## Contributing and support

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Report reproducible bugs through [GitHub Issues](https://github.com/adarshprakasan/Hospiq/issues); include sanitized details only. See [SUPPORT.md](SUPPORT.md) for help and [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License and copyright

Copyright (c) 2026 Adarsh. Licensed under the [ISC License](LICENSE), matching the existing backend package declaration. Third-party dependencies retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The license text follows the [SPDX ISC template](https://spdx.org/licenses/ISC.html).
