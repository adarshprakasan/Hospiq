# Deployment and operations

[Documentation index](README.md)

## Readiness

This repository does not include a production deployment, Docker setup, infrastructure templates, or a CI workflow. The API and static frontend are separate services. Before processing real patient data, address private medical-file delivery, session/onboarding controls, operational logging/auditing, backups, and database integration verification in [Security](../SECURITY.md) and the [roadmap](ROADMAP.md).

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

Use `PORT` supplied by the host. Set `CLIENT_URL` to the exact frontend origin and `HOSPITAL_TIMEZONE` to the intended timezone. Provide database/provider credentials through the host's secret manager, not committed files. Configure HTTPS at the hosting layer. Configure proxy trust deliberately before relying on IP-based throttling; the application does not currently set `trust proxy`.

The API connects to MongoDB and waits for required Token/Doctor/QueueCounter indexes before listening. Preflight historical data before deployment. Startup failure may indicate credentials, connectivity, unsupported database capabilities, or duplicate index data.

## Database migration and rollback

1. Back up the selected database and confirm restore access.
2. Run `npm --prefix server run check:upgrade` against the intended environment. Resolve duplicate groups through reviewed migrations.
3. Record the current commit and deployment configuration, then deploy the new build.
4. Check health, sign-in, linking, patient booking, and scoped queue access with fictional accounts in staging.
5. Retain the previous app artifacts and configuration for rollback. Review database compatibility first; do not drop unique indexes or delete records just to make old code start.

The preflight is read-only; starting the API may create indexes. Demo seeds are explicit database writes and must not run automatically during production startup.

## Observability and scaling gaps

`GET /api/health` is liveness only. Add dependency-aware readiness, process supervision, structured sanitized logs, request IDs, audit events, alerting, backup/restore drills, and graceful shutdown before release. The application has no centralized session revocation or job worker.

Auth throttling uses an in-memory map in each process. Multi-instance deployments require a shared limiter and coordinated configuration. Link/create operations span multiple documents without transactions; use transactional or recoverable workflows before scaling sensitive operations. Current list endpoints need pagination before large workloads.

## Secret rotation

Rotate backend secrets in the host's secret manager and restart the API. JWT secret rotation invalidates existing login and verification tokens. Rotate provider credentials at their provider and update the server configuration. Changing `VITE_API_URL` requires rebuilding the frontend. Never include secrets, patient records, or generated demo passwords in deployment logs or release notes.
