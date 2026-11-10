# Application route map

[Documentation index](README.md) · [User guide](USER_GUIDE.md) · [API reference](API.md)

Paths below are frontend routes. Open them under the app's configured frontend origin. Role and record checks still apply to protected screens. Identifiers such as `:hospitalId` represent a selected resource.

| Audience | Screen | Path |
|---|---|---|
| Public | Find care and view booking options | `/find-care`, `/book/:hospitalId` |
| Public | Sign in and register | `/login`, `/register`, `/hospital-register` |
| Public | Password recovery | `/forgot-password`, `/reset-password` |
| Signed-in account | Profile and password change | `/profile`, `/change-password` |
| Patient | Home, appointments and visit QR | `/`, `/my-tokens`, `/my-qr` |
| Patient | Records, health summary and lab tests | `/medical-records`, `/health-summary`, `/lab-tests` |
| Patient | Family access and notifications | `/family`, `/notifications` |
| Patient | Pharmacy and order payment | `/pharmacy`, `/pharmacy/payment/:orderId` |
| Doctor, staff and facility admin | Scoped queue | `/dashboard` |
| Doctor | Patient record and lab workspaces | `/patients/:patientId/records`, `/patients/:patientId/labs` |
| Staff and admins | Doctor schedules | `/schedule` |
| Pharmacist | Pharmacy queue, medications and batches | `/pharmacy`, `/medications`, `/inventory` |
| Facility admin and platform admin | Facility and doctor management | `/create-hospital`, `/manage-doctors`, `/pharmacy-team`
| Patient, doctor, staff and admins | Doctor profile | `/doctor/:doctorId` |
| Facility admin | Facility console | `/hospital-admin` |
| Platform admin | Platform console | `/admin` |
