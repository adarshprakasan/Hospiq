# Deployment and operations

[Documentation index](README.md)

## Readiness

Deploy the API and static frontend as separate services. GitHub Actions runs the repository quality checks. Before real patient data is used, follow the [rollout checklist](OPERATIONS.md) for backup restoration, storage, provider checks and database preflight. See [Security](../SECURITY.md) and the [roadmap](ROADMAP.md) for outstanding work.

## Frontend build

Set `VITE_API_URL` to the public HTTPS API URL ending in `/api` in the build environment, then run:

```powershell
npm --prefix client ci
npm --prefix client run build
```

Publish `client/dist` with a static host. Configure fallback to `index.html` for application paths such as `/login`, `/dashboard`, and `/book/<id>`, while serving assets normally. Vite preview is for local build inspection and is not the production server. No secret belongs in a browser build setting.

## API process

Configure Node 22.12+, install the locked dependencies, provide backend environment secrets, and start the process from the server package:

```powershell
npm --prefix server ci --omit=dev
npm --prefix server start
```

Use `PORT` supplied by the host. Set `CLIENT_URL` to the exact frontend origin and `HOSPITAL_TIMEZONE` to the intended timezone. Provide database/provider credentials and `MEDICAL_FILE_KEY` through the host's secret manager, not committed files. Mount a private persistent directory at `MEDICAL_STORAGE_DIR`; do not serve it through the frontend or web server. Back up that volume and preserve the encryption key separately. Do not deploy these files on an ephemeral function filesystem. Configure HTTPS at the hosting layer. Set `TRUSTED_PROXY_CIDRS` to the verified proxy ranges before relying on IP-based throttling behind a proxy.

The API connects to MongoDB and waits for indexes for registered models before listening. Preflight historical data before deployment. Startup failure may indicate credentials, connectivity, unsupported database capabilities, or duplicate index data.

## Database migration and rollback

1. Back up the selected database and confirm restore access.
2. Run `npm --prefix server run check:upgrade` against the intended environment. Resolve duplicate groups through reviewed migrations.
3. Record the current commit and deployment configuration, then deploy the new build.
4. Check health, sign-in, linking, patient booking, and scoped queue access with fictional accounts in staging.
5. Retain the previous app artifacts and configuration for rollback. Review database compatibility first; do not drop unique indexes or delete records just to make old code start.

The preflight is read-only; starting the API may create indexes. Demo seeds are explicit database writes and must not run automatically during production startup.

## Observability and scaling

Use `GET /api/health` for liveness and `GET /api/ready` for MongoDB readiness. Requests carry `X-Request-Id`. Set `LOG_REQUESTS=true` for structured timing logs. The process handles graceful shutdown. Configure a scheduler for reminders and install Tesseract if local OCR is required. See [Operations](OPERATIONS.md) for setup and alerting targets.

Production requires `REDIS_URL` for shared rate limits. Local development without Redis uses in-process limits. Test proxy configuration before relying on IP-based limits. Some provisioning operations span multiple documents and need recovery plans.

## Secret rotation

Rotate backend secrets in the host's secret manager and restart the API. JWT secret rotation invalidates existing login and verification tokens. Rotate provider credentials at their provider and update the server configuration. Changing `VITE_API_URL` requires rebuilding the frontend. Never include secrets, patient records, or generated demo passwords in deployment logs or release notes.
