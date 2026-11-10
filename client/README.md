# Hospiq frontend

The React and Vite client provides public care discovery and the patient, clinician, pharmacy and administration workspaces.

From the repository root:

```powershell
npm --prefix client ci
npm --prefix client run dev
npm --prefix client run lint
npm --prefix client run build
```

Copy `client/.env.example` to `client/.env` if needed and point `VITE_API_URL` to the API base ending in `/api`. Open the local Vite address and run the backend separately. See [Setup](../docs/SETUP.md) for both services and [Configuration](../docs/CONFIGURATION.md) for environment settings.

Find screens by role in the [route map](../docs/ROUTES.md), follow the [user guide](../docs/USER_GUIDE.md), or run the [Playwright journeys](../docs/TESTING.md) with `npm --prefix client run test:browser`.
