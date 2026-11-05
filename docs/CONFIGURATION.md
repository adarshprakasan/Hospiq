# Configuration reference

[Documentation index](README.md)

## Backend: server/.env

| Variable | Purpose | Default / requirement |
|---|---|---|
| `MONGO_URI` | MongoDB connection and database | Required to start API or run seed/preflight scripts |
| `JWT_SECRET` | Signs login and registration-verification tokens | Required for API startup; use a long random secret |
| `PORT` | API listening port | `5000` |
| `CLIENT_URL` | Single allowed browser CORS origin | `http://localhost:5173` |
| `HOSPITAL_TIMEZONE` | IANA timezone for queue dates, weekdays, and hours | `Asia/Dubai`; one timezone per deployment |
| `EMAIL_USER` | Gmail sender/login account | Required for normal OTP registration |
| `EMAIL_PASS` | Gmail app password | Required for normal OTP registration |
| `CLOUD_NAME` | Cloudinary cloud name | Required for uploads |
| `CLOUD_API_KEY` | Cloudinary API key | Required for uploads |
| `CLOUD_API_SECRET` | Cloudinary API secret | Required for uploads |
| `DEMO_ACCOUNT_PASSWORD` | Optional initial password for newly seeded accounts | Otherwise generated; no reset of existing accounts |

Provider transports are configured in `server/utils/mailer.js` and `server/utils/cloudinary.js`. Changing SMTP provider requires code/configuration work; arbitrary SMTP host variables are not currently read. Never include real credentials in documentation, issues, screenshots, shell history, or commits.

## Frontend: client/.env

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_URL` | Public API base URL including `/api` | `http://localhost:5000/api` |

`VITE_*` values are embedded into the browser bundle at build time. Only use public settings there. Changing them for a deployed build requires rebuilding the frontend.

Keep `localhost` and `127.0.0.1` usage consistent: they are different browser origins. `CLIENT_URL` has no trailing path; `VITE_API_URL` includes `/api`.

## Limits and behaviors configured in source

| Setting | Current behavior |
|---|---|
| Login JWT lifetime | 7 days |
| OTP | Six digits, expires after 5 minutes, bcrypt stored, at most 5 verification attempts |
| Registration proof | JWT valid for 10 minutes, also requires the source OTP row to exist when consumed |
| Auth rate limit | 20 requests per IP per 15 minutes across login/send-OTP/verify/register; one process only |
| OTP resend cooldown | Approximately one minute per email |
| JSON request body | 100 KB |
| Upload | Up to 5 JPEG/PNG/PDF files, 10 MB each |
| Frontend HTTP timeout | 15 seconds |
| Schedules | Same-day intervals, zero-padded 24-hour `HH:mm`, end after start |

These limits are not configurable through undocumented environment variables. Edit the relevant source deliberately and update tests/docs together when changing them.

## Secret handling

Both `.env` files are ignored by Git; `.env.example` files contain placeholders. Store production values in the deployment platform's secret manager. Rotating `JWT_SECRET` invalidates existing login and verification tokens. Do not print the connection URI when diagnosing connectivity errors.
