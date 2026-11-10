# Pharmacy workflow and API contract

Pharmacists are hospital-linked accounts. They maintain medication availability and AED prices, receive only doctor-sent prescription snapshots, prepare orders using item checkboxes and explicit dispensing quantities, and record counter payments. They cannot read general medical records or other hospitals' pharmacy queues.

Finalizing a doctor's visit record completes the associated appointment. The doctor is then prompted to send its medication to pharmacy. Sending is explicit and idempotent per appointment: it generates one hospital/date pharmacy token shared by the patient and pharmacy. Preparation starts as `pending`. Resolve each line by confirming its available quantity and price or marking it unavailable with a reason. **Done** freezes the total for available lines and marks the order `ready`. An entirely unavailable order is marked `unavailable` with no payment due. Payment, collection and refund state are tracked separately.

## API contract

All application routes require a bearer login. Roles and hospital/patient ownership are enforced server-side. Order changes use version checks to reject concurrent stale edits. Monetary amounts are integer fils, in AED; pharmacist-entered quantities are selling units/packs, not inferred medical doses.

| Method / path | Role | Behavior |
|---|---|---|
| `POST /api/pharmacy/send/:recordId` | Treating doctor | Explicitly send own doctor-authored prescription; one order per visit |
| `GET /api/pharmacy/orders` | Patient / pharmacist | Own orders / assigned hospital queue, including prior unpaid orders |
| `GET /api/pharmacy/orders/:id` | Patient / pharmacist | Authorized order status and prescription snapshot |
| `PATCH /api/pharmacy/orders/:id/prepare` | Pharmacist | Save checklist and quantities while pending; requires current `version` |
| `POST /api/pharmacy/orders/:id/ready` | Pharmacist | Freeze the bill for resolved lines or mark the order entirely unavailable |
| `POST /api/pharmacy/orders/:id/collect` | Pharmacist | Record handover of a paid order using the current `version` |
| `POST /api/pharmacy/orders/:id/refund` | Pharmacist | Full refund before collection. Send `version`, `reason` and `confirm: true` |
| `POST /api/pharmacy/orders/:id/counter` | Patient | Select counter payment; safely expires any open checkout before switching |
| `POST /api/pharmacy/orders/:id/paid` | Pharmacist | Mark a ready order paid at counter, with pharmacist/time audit; never while an online checkout may charge |
| `POST /api/pharmacy/orders/:id/checkout` | Patient | Create/reuse Stripe hosted checkout with server-calculated AED amount |
| `POST /api/pharmacy/orders/:id/reconcile` | Patient | Retrieve Stripe session server-side and verify payment; URL parameters never mark paid |
| `POST /api/pharmacy/stripe/webhook` | Signed Stripe event | Raw-body signature verification and idempotent paid update, with amount/currency/order/session checks |
| `GET /api/pharmacy/team` | Hospital Admin | List pharmacists in own hospital |
| `POST /api/pharmacy/team` | Hospital Admin | Link registered pharmacist by email; cannot take an account from another hospital |

Catalogue reads remain available to linked doctors, pharmacists and administrators; queue staff do not manage medicines. Only pharmacists can add, price, or remove medications. Prices are captured when sent; unpriced legacy entries must be priced by pharmacy before preparation completes. Removing catalogue entries preserves existing order and record snapshots.

Online payments require Stripe merchant configuration. Counter payments remain usable without it. Apple Pay and Google Pay availability depends on the Stripe account, payment methods, device, browser, and deployment; card details are entered only on Stripe's hosted checkout. No fake online-paid action exists in the application.

## Collection, refunds and stock

Record collection after handing over a paid order. Patients can download their receipts from the pharmacy view. Full refunds are available before collection. For a counter payment, confirm that cash was returned. For online payments, a pending retry checks the same provider refund. Refresh after a failed attempt before retrying. The original paid bill is retained.

Open **Stock & expiry** to add batches with an expiry date and starting quantity, then record movements with a reason. Expired batches cannot be dispensed through the ledger. Stock changes are manual. Record the movement separately from order collection and reconcile with physical inventory. See [Inventory API](API.md#clinical-drafts-lab-orders-and-inventory).

## Run and test the feature

Install updated server dependencies and restart both services:

```powershell
npm --prefix server ci
npm --prefix server run dev
# In a second terminal:
npm --prefix client run dev
```

The existing checkout database has already received 12 fictional pharmacists and 24 pharmacy orders (four per facility: pending, partially gathered, ready, and paid). To reproduce these on another demo database, run:

```powershell
npm --prefix server run seed:large
npm --prefix server run seed:medications
npm --prefix server run seed:pharmacy
```

The pharmacy seed uses the existing large-demo password from the ignored `server/.demo-large-credentials.json`, preserves existing accounts/passwords, medication prices, order status, and payments, and does not charge money or send email. It adds 24 dedicated fictional completed appointments and clinical records for its 24 pharmacy orders. Reruns do not reset these test scenarios or create new copies for a later date; prior unpaid orders remain visible. Regular visit QR testing still uses `seed:large` for that day's appointments.

| Role | Login | Hospital |
|---|---|---|
| Main pharmacist | `pharmacist01@demo.hospiq.invalid` | Harbour |
| Second pharmacist | `pharmacist02@demo.hospiq.invalid` | Harbour, shared queue |
| Other hospital pharmacist | `pharmacist03@demo.hospiq.invalid` | Oasis |
| Patient | `patient001@demo.hospiq.invalid` | Harbour and Oasis example orders |
| Doctor | `doctor01@demo.hospiq.invalid` | Harbour |
| Hospital Admin | `hospitaladmin01@demo.hospiq.invalid` | Harbour employee provisioning (run seed:admins) |

Retrieve the local demo password:

```powershell
(Get-Content server/.demo-large-credentials.json -Raw | ConvertFrom-Json).password
```

Use independent browser sessions (normal versus incognito or another browser) for different users. Normal tabs share localStorage and overwrite each other's login.

1. **Pharmacist:** sign in to the pharmacy dashboard. Open **Medications** to add entries with strength/form, AED price, and selling unit (`pack`, `tablet`, etc.). Existing unpriced medication entries can be priced here.
2. **Hospital Admin:** create pharmacist accounts and temporary credentials through **Accounts & access** in the hospital console. Public signup no longer creates employees. Queue staff cannot provision users; existing unassigned pharmacist accounts can be linked by an administrator.
3. **Doctor:** call a registered patient's visit, open their record form, choose medicines, and save. The visit changes to completed. In the popup click **Send medication to pharmacy**. Its success message shows the new pharmacy token.
4. **Patient:** open **My pharmacy**, or follow the **Collect your medicine at pharmacy** banner on the homepage/appointments page. The pharmacy token is distinct from the appointment token and QR. Preparation starts as pending.
5. **Pharmacist:** find the patient/token. Confirm actual quantities in selling units and unit prices. Check medications as they are gathered. Use **Save checklist** for partial work; **Done — mark ready** enables when each line is gathered with valid pricing and quantity, or marked unavailable with a reason. The server independently enforces this.
6. **Patient:** the order changes to ready and shows its frozen total. Select **Proceed to payment**, then **Pay at counter**. The dialog says **Proceed to counter** with the token and amount.
7. **Pharmacist:** after collecting the displayed amount, click **Paid at counter**. The patient's view polls every five seconds, shows confirmed payment, and closes its payment dialog after three seconds. The receipt remains in paid history. No browser-wide forced tab closing is required.
8. **Online checkout:** with Stripe test keys configured, choose **Pay Online**. After a successful hosted checkout, the app verifies the payment on the server, displays confirmation, and returns automatically to pharmacy. A cancelled checkout stays unpaid and can be retried or safely switched to counter payment.

The doctor can choose **Later** in the handoff popup. The saved record remains, and its **Send medication to pharmacy** button retries handoff without resaving the visit. One appointment has one pharmacy bill; repeated sends of the same prescription return its original token. A different record for an already-sent appointment is rejected rather than silently replacing or duplicating the bill.

## Stripe test configuration

Add these to the ignored `server/.env`, using keys from your own Stripe test environment:

```dotenv
STRIPE_SECRET_KEY=your-stripe-test-secret-key
STRIPE_WEBHOOK_SECRET=your-webhook-signing-secret
CLIENT_URL=http://localhost:5173
```

Keep the configured origin consistent with your browser address. Restart the API after changes. No publishable key is required for the hosted redirect flow. Never put secret keys in `client/.env`, `VITE_*`, Git, or this guide.

Use Stripe's CLI to forward snapshot checkout events to the actual API port (replace 5000 if your environment differs):

```powershell
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to localhost:5000/api/pharmacy/stripe/webhook
```

Copy the listener's signing secret into `STRIPE_WEBHOOK_SECRET`. Use Stripe test payment methods only. For deployment, register the public HTTPS webhook endpoint with these events and use its signing secret; configure the correct HTTPS `CLIENT_URL`. Enable eligible wallets in Stripe and test them on supported devices. See [Stripe payment methods](https://docs.stripe.com/payments/checkout/payment-methods.md?ui=full-page), [fulfillment](https://docs.stripe.com/checkout/fulfillment.md?ui=full-page), and [webhook verification](https://docs.stripe.com/webhooks?lang=node).

Only signed provider events or server-side retrieval of the matching paid checkout can mark an online order paid. Amount, AED currency, checkout attempt, session, and order reference must match. The app never treats a success URL as proof. While a checkout creation outcome is uncertain, counter payment stays blocked; retry **Pay Online** after 30 seconds to recover the same idempotent attempt. If an old online session is active, choosing counter payment first expires it so it cannot also charge.

All hospitals in this development app use the configured merchant Stripe account and AED. Separate hospital merchant accounts, split settlement and tax computation remain outside the current payment workflow. Bills below AED 2.00 use counter payment. Clinical medicine names and schedules are not sent in payment-provider line items.

## Verification evidence

```powershell
npm --prefix server test
npm --prefix server run test:records
npm --prefix server run test:pharmacy
npm --prefix client run build
```

The pharmacy integration suite runs real HTTP requests against the app and the official Stripe SDK against a local HTTP provider fixture in a disposable database. It checks completion, idempotent handoff, role/hospital isolation, checklist/version validation, prices/totals, counter payment, checkout reuse, switching payment method, signed/invalid/duplicate webhooks, amount/currency checks, provider failures, and missing configuration. It uses fictional credentials and never sends a real charge. The fixture is test-process-only; production code uses Stripe's real HTTPS endpoint.

Browser verification covered pharmacist sign-in, disabled/enabled Done, readiness, shared patient token/total, counter instructions, automatic payment-dialog closure, and paid history. Live merchant checkout, actual wallet presentation, and real webhook delivery remain to be tested using your Stripe test environment.


Role separation and current administrative testing instructions are in [Administration](ADMINISTRATION.md). Existing staff remain queue-only. The dedicated management suite also verifies encrypted bank settings and hospital-scoped online-payment controls.
