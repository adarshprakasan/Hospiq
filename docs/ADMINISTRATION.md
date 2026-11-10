# Roles, administration and database upgrade

## Agreed access boundaries

| Role | Responsibility |
|---|---|
| Hospiq Admin (`admin`) | Platform-wide operational administration: facilities, accounts, departments, clinical profiles, queues, catalogues, billing configuration and audit history |
| Patient (`patient`) | Own account, appointments, visit QR, medical records, consent and pharmacy payments |
| Hospital/Clinic Admin (`hospital_admin`) | Own facility, departments, staff/doctor/pharmacist accounts and temporary credentials, hospital operations and payment settings |
| Hospital staff (`staff`) | Own hospital's queue, walk-ins, and doctor schedules only |
| Pharmacist (`pharmacist`) | Own hospital's medication catalogue, preparation queue and counter payments |
| Doctor (`doctor`) | Own queue, availability, visit QR, clinical records and explicit pharmacy handoff |

Hospital versus clinic administration uses the same permission role, with the facility type determining its display label. Existing staff remain staff; no automatic promotion is authorized. Admin powers do not include general medical-record or lab-file access: those remain with the patient and authorized doctors. Operational patient identity/contact information and explicitly sent pharmacy billing snapshots are available within their administrative scope.

Routine responsibilities have one owner: admins manage personnel/departments, staff edit schedules/queues, pharmacists maintain medicine/pricing/dispensing, and doctors make clinical decisions. Administrative operational overrides are audited. Changes to a doctor's availability are separate from editing their weekly schedule.

## Management API contract

`/api/management` requires an active Hospiq or hospital admin. Hospital scope is derived from the authenticated account; a hospital admin cannot select a different hospital via query/body parameters. Platform admins may select a hospital filter. Lists use bounded `page`/`limit` and return `{ items, total, page, limit }`.

- `GET /summary`: role/resource counts and operational overview.
- `GET /:entity`: scoped, searchable paginated operational resources.
- `POST /:entity`: validated resource creation, including account credentials for authorized roles.
- `PATCH /:entity/:id`: explicit allowlisted changes; no arbitrary MongoDB updates.
- `DELETE /:entity/:id`: recoverable archive; historical relationships/bills remain intact.
- `POST /:entity/:id/restore`: restore an archived operational resource.
- `GET /billing/:hospitalId` and `PUT /billing/:hospitalId`: authorized billing/contact/bank configuration; bank identifiers encrypted at rest and excluded from public facility data.
- `/audit`: paginated administrative action history, without plaintext passwords, banking values or clinical notes.

Supported operational entities: hospitals, users, doctors, departments, medications, appointments, pharmacy orders and schedules. General clinical records are deliberately excluded. Paid invoices are not arbitrarily rewritten. Account role/hospital transitions that would corrupt existing doctor/prescription relationships require creating/linking the correct account rather than silently reassigning historical ownership.

New managed accounts receive temporary login credentials and must change their password before using the app. Employee password resets revoke existing sessions. Existing patient passwords cannot be issued through administrator resets; patient recovery must verify the owner. Passwords are hashed and never returned in account listings; a newly generated temporary password is displayed only in its creation/reset response. Public signup supports patients and unassigned hospital admins, not privileged platform admins or independently assigned employees.

## Database design

Users reference their hospital; a separate linked Doctor profile holds clinical details and department identity. Department documents are canonical; hospital department names remain a compatibility projection for existing booking screens. Historical token/record department names remain snapshots. Referenced records are archived rather than cascade-deleted. New indexes follow hospital/role/status/date query paths. Administrative mutations have redacted intent/completion audit events, so partial failures are inspectable without pretending multi-document writes are atomic.

The upgrade script supports a read-only report before applying additive backfills and index initialization. It preserves users/passwords, records, prescriptions, pharmacy payments, token numbers and existing staff roles. No collection is dropped and no `syncIndexes()` removes existing indexes.

## Running the upgrade

From the repository root, after installing dependencies:

```powershell
npm --prefix server run upgrade:roles
npm --prefix server run upgrade:roles -- --apply
npm --prefix server run seed:admins
```

The first command is read-only and refuses normalized-email or active-department collisions. The second performs additive backfills and index creation. The third requires the existing large-demo dataset and creates one fictional platform administrator plus six facility administrators, without promoting staff or resetting existing passwords. Repeat runs preserve changes. Restart the API/frontend after upgrading.

The current checkout upgrade linked 39 clinical profiles and 1,705 matching appointment department references, with zero deleted records, changed passwords, or staff promotions. The initial 15 staff accounts remain queue-only. Existing patient hospital references are not membership boundaries: facility administrators' patient lists derive from patients' visits to their facility.

### Demo administrators

| Login | Role / scope |
|---|---|
| `admin@demo.hospiq.invalid` | Hospiq Admin, platform-wide |
| `hospitaladmin01@demo.hospiq.invalid` | Harbour Hospital Admin |
| `hospitaladmin02@demo.hospiq.invalid` | Oasis Hospital Admin |
| `hospitaladmin06@demo.hospiq.invalid` | Cedar Clinic Admin |
| `staff01@demo.hospiq.invalid` | Harbour queue/schedules only; unchanged account |
| `doctor01@demo.hospiq.invalid` | Harbour clinical workspace and own availability |
| `pharmacist01@demo.hospiq.invalid` | Harbour catalogue and pharmacy |

New demo administrators use the existing large-demo password, stored only in ignored `server/.demo-large-credentials.json`. Existing account passwords are preserved. Demo administrators skip forced first-login changes so repeatable test credentials remain stable; all accounts created/reset through the console require it.

```powershell
(Get-Content server/.demo-large-credentials.json -Raw | ConvertFrom-Json).password
```

### Fresh deployment without demo data

Provide `HOSPIQ_ADMIN_EMAIL` and `HOSPIQ_ADMIN_PASSWORD` through your local environment/secret manager, then run `npm --prefix server run bootstrap:admin`. The password must have at least 12 characters and at most 72 UTF-8 bytes. This creates only the first Hospiq administrator, prints no password, and requires a first-login password change. If an active Hospiq Admin already exists, use that admin's console. Never deploy demonstration credentials as production operators.

## Dashboard walkthrough

1. **Hospiq Admin:** sign in to `/admin`. The overview counts facilities, patients, doctors, administrators, queue staff, pharmacists, departments, visits and pharmacy workload. Use the facility scope to narrow all management views. Account, hospital, doctor, department, catalogue and queue lists have search, page-size controls, details, validated edits and recoverable archives. View audit events in **Audit history**.
2. **Facility Admin:** sign in to `/hospital-admin`. The same console is locked to the account's hospital/clinic. **Accounts & access → Add account** creates staff, pharmacists or doctors with chosen/generated temporary credentials. Doctors require an active department and get their clinical profile linked automatically. Reset credentials when necessary; old sessions are invalidated.
3. **Hospital setup:** public registration creates only patients or unassigned Hospital/Clinic Admins. New hospital admins use **Set up hospital / clinic**; the facility is active on creation, with platform-wide suspension/registration controls available to Hospiq Admins. Existing facilities remain usable after migration.
4. **Departments:** add/edit/archive from the admin console. Renaming updates the hospital's compatibility list and current doctor labels while historical visit/record names remain unchanged. Move/archive active doctors before archiving a department. **Doctors → Schedule** opens that doctor's schedule editor.
5. **Staff:** see only queue and schedule navigation. They can register walk-ins, call/skip/cancel arrivals and edit their hospital's weekly schedules. They cannot create facilities/departments, manage users, manage banking or medicines, or complete a clinical visit. Doctors complete visits through medical-record saving or their own completion action; administrative overrides are audited.
6. **Doctors:** clinical workspace shows their linked profile, own availability, patient QR/record actions and visit queue. Schedules are read-only for doctors; operational staff/admins own schedule changes. This removes competing schedule editors.
7. **Patients:** existing booking/QR/records/consent/pharmacy flows remain. Medical history now uses server-side search/source filtering and 20-record pages instead of downloading the whole history. Doctor history uses the same authorized pagination.
8. **Banking & payments:** select a hospital and enter billing contact, tax/business reference, bank name, account holder and IBAN. IBAN checksum is validated, identifiers are encrypted with a hospital-bound key derived from the existing medical encryption master, and the default response contains only the last four characters. Explicit reveal is audited. Public facility routes never return bank settings. Enable/disable online checkout per facility; bank records themselves do not change Stripe payout routing.

Use independent browser sessions for different roles. After role/password changes, sign in again; session version checks revoke old sessions. Archived doctors remain unavailable after restoration until reviewed. Self-archival/self-suspension is blocked, the last active platform administrator is protected, active appointments must be resolved before archiving a doctor, and unpaid pharmacy orders cannot be removed from their workflow.

The consoles and clinical dashboard show scoped operational metrics for recent visits. See [Care workflows](CARE_WORKFLOWS.md) for measured waiting, consultation and pharmacy preparation times.

## Deliberate boundaries and next improvements

Administrative control covers operational records, not unrestricted clinical-history access, deletion of audit trails, or arbitrary rewriting of paid invoices. Archive/restore preserves medical/billing references rather than cascading destructive deletes. Multi-document management writes use redacted started/completed/failed audit events and compensating suspension for failed employee/profile creation; they are not advertised as atomic transactions.

Recommended follow-up work from this code review:

- **Patients:** verified account recovery/contact updates, notification preferences and appointment reminders, language/accessibility polish, and an export of their own visit history.
- **Doctors:** draft autosave, explicit prescription amendments rather than replacing signed history, allergy/current-medication review fields, and schedule-change/leave requests for staff approval.
- **Pharmacy/administration:** stock and batch/expiry tracking, shortage/substitution approval, refunds/reconciliation, and separate hospital settlement through approved Stripe Connect onboarding. Current checkout still uses the configured platform merchant; banking forms do not reroute funds. [Stripe's Connect documentation](https://docs.stripe.com/connect/express-accounts) describes country/platform restrictions that must be reviewed before adding hospital settlement.
- **Operations:** two-factor authentication for privileged roles, durable audit monitoring/backups, transactional provisioning where a replica-set deployment supports it, and cursor pagination/exports for very large installations. These are future work, not features claimed by this change.

## Tests and evidence

```powershell
npm --prefix server test
npm --prefix server run test:records
npm --prefix server run test:pharmacy
npm --prefix server run test:management
npm --prefix client run build
```

The management suite uses a uniquely named disposable database, real HTTP routes, all six roles and two hospitals. It checks tenant isolation across body/query/path IDs, public signup restrictions, temporary passwords and session revocation, doctor linkage, safe archives/restores, clinical privacy, canonical department updates, bank encryption/reveal authorization, audit redaction, history pagination and an indexed hospital-user query (`IXSCAN`). No real invites, transfers or provider calls are made. Browser checks cover platform/facility dashboards, scoped employee lists, account form controls, department creation, banking fields, and queue-only staff navigation.


Latest verification: 32 regression tests, 106 medical-record/QR checks, 136 pharmacy/payment checks and 113 management checks passed, along with the production frontend build. The department/reference migration and administrator seed were rerun with zero new inserts or changed links/passwords/roles.
