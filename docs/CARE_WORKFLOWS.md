# Care workflow improvements

This guide describes the expanded implementation. Deployment configuration and external services are covered in [Operations](OPERATIONS.md).

## Patient experience

- Home prioritizes upcoming visits, with an inline visit QR, arrival instructions, directions, cancellation and follow-up booking.
- Public care discovery supports search and pagination. A selected doctor survives the sign-in journey.
- Appointments are queue bookings up to 90 days ahead, not exact-time slots. Schedules support closure dates and daily capacity. Cancelled bookings release capacity; completed visits still count. Rescheduling is available before check-in. Patients may cancel before the consultation starts.
- Checked-in patients see people ahead. A wait range appears only after five valid recorded consultations from the past 30 days; it is an estimate, not a promised start time.
- Mobile navigation provides Home, Appointments, Records and More. English/Arabic switching updates layout direction and preserves form input. Common labels are translated; remaining explanatory text and server errors fall back to English. Clinical content is never machine-translated.
- Health summary contains patient-reported allergies, conditions, medications and emergency contact details. Doctors need patient-approved history access to read it. Patients can review recorded history, summary and attachment access events.
- Family profiles support declared guardianship for children under 18 and explicitly granted, revocable 30-day adult access. The selected profile remains visible; authorization is checked on every request. Account and family settings always belong to the signed-in account. Guardianship is a declaration, not identity verification. When a dependent turns 18, guardian access stops; independent-account transfer still requires a separately designed verification process.
- Password recovery uses an emailed, short-lived, one-use link and invalidates existing sessions. In-app notifications cover calls, medicine readiness and reviewed lab results. Optional email reminders require the worker described in Operations.

## Clinical workflow

Staff check patients in and call them; the treating doctor starts the consultation. A database index prevents two consultations being open for the same doctor. The desktop queue uses a compact table and opens patient notes/history alongside the queue. Walk-ins can link their visit to an account using a staff-issued code that expires after ten minutes and can be used once.

Doctors save private drafts, resume them, and finalize the clinical record when ready. Finalization completes the associated visit. Optimistic versions prevent silent overwrites. Finalized notes use append-only corrections with a reason; they cannot be silently replaced. Vitals are structured, and patients can download a text visit summary. Drafts are not visible to patients or other doctors, including doctors with history consent.

Image OCR is optional. Extracted text must be reviewed and explicitly applied to notes. It does not generate a diagnosis, parse medications into prescriptions, or finalize a record. PDF OCR is not supported.

Lab orders track ordered, collected, resulted, reviewed and cancelled states. Patients may link an existing lab attachment only when its record is already associated with the ordering doctor, with explicit confirmation. Doctors review the result. External laboratory integration and a laboratory-technician role are not implemented.

## Pharmacy

Pharmacists can mark individual lines unavailable with a reason. Only confirmed available quantities contribute to the bill; an entirely unavailable order requires no payment. Paid orders remain visible until collection is recorded. Receipts can be downloaded as text.

Full refunds are supported for paid, uncollected orders. Counter refunds require confirmation that cash was returned. Online refunds use the existing Stripe payment reference and a persistent idempotency attempt; pending retries check the same provider refund. Failed provider refunds require refreshing before a new attempt. The original paid bill is retained. Partial monetary refunds and returns after collection are not supported.

Inventory tracks medication batches, expiry, quantity and adjustment history. Atomic version checks prevent lost stock updates or negative quantities. Expired batches cannot be dispensed. **Stock movements are manual and are not automatically linked to order collection.** Reconcile the ledger with physical stock; low stock currently means five units or fewer.

## Structure and quality

Appointment and discovery UI now have feature folders, with a shared private polling hook supporting cancellation, stale-response rejection, reconnect, visibility pause and retry backoff. Core pages remain in `pages`; this is an incremental refactor, not a complete reorganization.

Operational metrics show measured waiting, consultation and pharmacy preparation averages with sample counts. They do not infer no-shows from missed calls. Readiness checks, request IDs, optional structured timing logs, startup index validation, graceful shutdown, CI, dependency updates and browser/accessibility checks support ongoing maintenance.

The browser tests use fictional API fixtures. Integration suites use uniquely named disposable databases, captured email and local payment fixtures. They do not replace deployment smoke tests or external-provider verification.
