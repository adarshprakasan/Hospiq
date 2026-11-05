# Setup and troubleshooting

[Documentation index](README.md)

## Requirements

- Node.js 22.12+ and npm. Check with `node --version` and `npm --version`.
- MongoDB 7+ recommended, locally or through Atlas. Start the local database service before the API.
- Git for cloning. Gmail app credentials are required for normal registration emails; Cloudinary credentials are required for uploads.

Use fictional information while evaluating the application. Seeded logins work without an email provider after account creation.

## Install on Windows

```powershell
git clone https://github.com/adarshprakasan/Hospiq.git
Set-Location Hospiq
npm --prefix server ci
npm --prefix client ci
if (!(Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
if (!(Test-Path client/.env)) { Copy-Item client/.env.example client/.env }
```

For an existing checkout such as `C:\Adarsh\Projects\Hospiq`, open PowerShell there and skip cloning. Preserve existing `.env` values. Use `npm ci` rather than deleting lockfiles; the lockfiles select the tested dependency versions.

Set `MONGO_URI`, a long random `JWT_SECRET`, and the provider values described in [Configuration](CONFIGURATION.md). A local database URI can be `mongodb://127.0.0.1:27017/hospiq`. For Atlas, use your own database name and a database user with access only to the intended database; configure network access for your PC.

## Run

In terminal 1, from the repository root:

```powershell
npm --prefix server run dev
```

In terminal 2, from the same root:

```powershell
npm --prefix client run dev
```

The API defaults to port 5000 and the frontend to port 5173. Check `http://localhost:5000/api/health`, then open `http://localhost:5173/login`. Stop each terminal with Ctrl+C.

The backend reads `.env` relative to its working directory. The npm-prefix commands run backend scripts from `server`, which is the supported launch method. The seed scripts resolve `server/.env` explicitly.

## Populate a fresh demo database

```powershell
npm --prefix server run seed:demo
npm --prefix server run seed:accounts
```

Run facility seeding first. Capture the generated password from the account seed in a private place. See [Demo data](DEMO_DATA.md). Do not send emails to the fictional `example.invalid` addresses.

## Upgrade an existing database

1. Back up the selected database and verify the connection points to the intended environment.
2. Run `npm --prefix server run check:upgrade`. It reports duplicate token-number groups, duplicate active-booking groups, and unlinked doctor profiles; it does not modify records or indexes.
3. Resolve duplicate groups through a reviewed migration before starting the upgraded API. Startup waits for required indexes and may fail when historical data violates uniqueness.
4. Link existing doctor profiles to registered doctor accounts through Manage doctors. No existing passwords need resetting.
5. Let old-format OTP requests expire and request new codes. Normalize legacy mixed-case email addresses only after reviewing duplicates; login now normalizes email input.
6. Check the manual scenarios in [Testing](TESTING.md).

## Troubleshooting

| Symptom | What to check |
|---|---|
| `npm` or `node` is not recognized | Install Node and reopen PowerShell so PATH refreshes |
| PowerShell blocks `npm.ps1` | Run `npm.cmd` instead of `npm` without changing machine execution policy |
| API fails to connect to MongoDB | Database service, URI/database name, credentials, Atlas network access, DNS and firewall; never post the URI publicly |
| Startup duplicate-key/index error | Run the upgrade preflight; review historical duplicates rather than dropping constraints |
| Browser network/CORS error | `CLIENT_URL` must match the actual browser origin; `VITE_API_URL` must point to the running API |
| Vite chooses another port | Set `CLIENT_URL` to that origin and restart the API, or free port 5173 |
| Changed env values have no effect | Restart the affected dev server; rebuild the frontend for built deployments |
| Registration email fails | Gmail account/app password, provider access, spam folder, and rate limit |
| `429` on auth requests | Wait for the Retry-After period; auth attempts share a per-IP limit |
| Doctor sees an empty queue | Confirm `Doctor.userId` is linked and book a visit for that exact doctor today |
| Booking unavailable | Doctor availability, configured timezone, weekday schedule, and consultation hours |
| Seed rerun prints no password | Existing accounts are preserved; use the password from their creation run |
| Upload fails | Cloudinary values, file format, five-file limit, and 10 MB per-file limit |

For unresolved errors, use [Support](../SUPPORT.md) with sanitized messages and reproduction steps.
