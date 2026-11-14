# Configuration reference

[Documentation index](README.md)

## Backend: server/.env

| Variable | Purpose | Default / requirement |
|---|---|---|
| `MONGO_URI` | MongoDB connection and database | Required to start API or run seed/preflight scripts |
| `JWT_SECRET` | Signs login and registration-verification tokens | Required for API startup; use a long random secret |
| `PORT` | API listening port | `5000` |
| `CLIENT_URL` | Allowed browser CORS origin and email link base URL | `http://localhost:5173` |
| `HOSPITAL_TIMEZONE` | IANA timezone for queue dates, weekdays, and hours | `Asia/Dubai`; one timezone per deployment |
| `EMAIL_USER` | Gmail sender/login account | For email workflows when `SMTP_URL` is absent |
| `EMAIL_PASS` | Gmail app password | For email workflows when `SMTP_URL` is absent |
| `MEDICAL_FILE_KEY` | 32-byte AES-256 key encoded as 64 hex characters | Required for new medical file uploads/downloads; back up securely and do not replace after storing files |
| `MEDICAL_STORAGE_DIR` | Private persistent attachment directory | Defaults to `server/storage/medical`; never expose it through static hosting |
| `SMTP_URL` | Optional SMTP connection URL for another provider or local test mailbox | Otherwise the Gmail transport is used; contains secrets if credentials are included |
| `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` | Legacy Cloudinary configuration | Not used by the new medical-record upload/download routes |
| `DEMO_ACCOUNT_PASSWORD` | Optional initial password for newly seeded accounts | Otherwise generated; no reset of existing accounts |
| `STRIPE_SECRET_KEY` | Stripe secret key for hosted pharmacy checkout | Optional; counter payments work without it; use test keys for development |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the pharmacy checkout webhook | Required alongside Stripe secret key to enable online checkout |
| `HOSPIQ_ADMIN_EMAIL`, `HOSPIQ_ADMIN_PASSWORD` | Optional first administrator bootstrap credentials | Used only by `bootstrap:admin`; remove after setup; existing admin creation goes through the console |
| `LOG_REQUESTS` | Structured timing logs with request IDs | Off unless set to `true` |
| `TESSERACT_PATH` | Path to a local Tesseract executable | Optional. Enables image OCR |
| `OCR_LANGUAGES` | Installed Tesseract language packs to use | `eng` |

Email transport is configured in `server/utils/mailer.js`. Set `SMTP_URL` to use a custom SMTP provider; arbitrary SMTP host variables are not read. New medical files use `server/services/medical-files.js`, not public Cloudinary delivery. Never include real credentials in documentation, issues, screenshots, shell history, or commits.

## Frontend: client/.env

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_URL` | Public API base URL including `/api` | `http://localhost:5000/api` |

`VITE_*` values are embedded into the browser bundle at build time. Only use public settings there. Changing them for a deployed build requires rebuilding the frontend.

Keep `localhost` and `127.0.0.1` usage consistent: they are different browser origins. `CLIENT_URL` has no trailing path; `VITE_API_URL` includes `/api`.

## Limits and behaviors configured in source

| Setting | Current behavior |
|---|---|
| Login JWT lifetime | 1 hour |
| OTP | Six digits, expires after 5 minutes, bcrypt stored, at most 5 verification attempts |
| Registration proof | JWT valid for 10 minutes, also requires the source OTP row to exist when consumed |
| Auth rate limit | Per-route IP limits, with additional email and account limits on selected routes. Login allows 100 requests per IP and 10 per email per 15 minutes. OTP sending allows 20 per IP and 3 per email per 15 minutes, with a one-minute recipient cooldown. |
| OTP resend cooldown | Approximately one minute per email |
| JSON request body | 100 KB |
| Medical upload | Up to 5 JPEG/PNG/PDF files, 10 MB each, signature/header checks, encrypted at rest |
| Clinical consent OTP | Five minutes, five attempts, one use, bound to patient/doctor/today's visit; 60-second resend cooldown |
| Clinical read grant | 30 minutes; revocable by patient; read-only for other doctors' records |
| Frontend HTTP timeout | 15 seconds |
| Schedules | Same-day intervals, zero-padded 24-hour `HH:mm`, end after start |

These limits are not configurable through undocumented environment variables. Edit the relevant source deliberately and update tests/docs together when changing them.

## Secret handling

Both `.env` files are ignored by Git; `.env.example` files contain placeholders. Store production values in the deployment platform's secret manager. Rotating `JWT_SECRET` invalidates existing login and verification tokens. Do not print the connection URI when diagnosing connectivity errors.

## Medical-file key setup

For a new installation, generate a key locally and store the output as `MEDICAL_FILE_KEY` in the ignored backend environment file:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Never publish the output or regenerate it when files already exist. Losing the key makes encrypted attachments unreadable. Database backups need the attachment volume and separately protected key backup. Multi-instance deployment requires a shared private persistent volume or a deliberate private object-storage implementation; local ephemeral disks are unsuitable.

`LARGE_DEMO_PASSWORD` optionally sets the initial password for a new large dataset. Once `server/.demo-large-credentials.json` exists, that private manifest preserves the dataset's generated password; reruns never reset existing account passwords. This variable does not alter normal registration or OTP.

## Production security settings

- Set `REDIS_URL` on every API replica. Use a private, authenticated Redis service and `rediss://` where TLS is required. Replicas share `JWT_SECRET` so the same IP or account maps to the same bucket. Redis outages return 503 for protected rate-limited routes. Keep Redis capacity and eviction policy suitable for expiring counters.
- Set `TRUSTED_PROXY_CIDRS` to the actual addresses or CIDRs of the proxies allowed to supply forwarding headers. Leave it unset when directly serving clients. Configure ingress to replace untrusted forwarding headers and prevent direct access around the trusted ingress.
- Production password creation and changes use Have I Been Pwned's padded hash-range lookup. The plaintext password and complete hash stay in the API. If the service is unavailable, password writes return 503. Set `CHECK_BREACHED_PASSWORDS=true` to enable it during development.
- Set `VITE_API_URL` at build time. The production HTML includes a CSP restricting scripts to the frontend origin and API connections to the configured origin. Set a CSP header with the same directives and `frame-ancestors 'none'` at the frontend host, since frame restrictions require an HTTP header.
