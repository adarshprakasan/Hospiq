# CI consolidation — 2026-11-10

All 13 open dependency branches were integrated with merge commits so their history remains reachable before branch cleanup.

Corrections:
- Upgrade MUI material and icons together; migrate removed system props using the official MUI v9 transform and use TextField slot props.
- Upgrade Vite with its React plugin, and ESLint with its JS configuration and hooks plugin.
- Remove the callback argument from Department pre-validation for Mongoose 9; add a regression test.
- Replace nodemon with Node's built-in watch mode to avoid the vulnerable minimatch dependency introduced by the proposed nodemon update.
- Override the client tooling's minimatch to 11.0.1 for GHSA-g3hv-75wg-m249. Remove this override once ESLint and config-array declare a patched compatible range. Lint and the dependency audit verify this configuration.
- Group related Dependabot packages so future upgrades are proposed together.
- Update repository links for the default-branch rename from master to main.

Validation includes all commands in `.github/workflows/quality.yml`: server unit tests, medical-records integration, pharmacy integration, management integration, journey integration, client lint, production build, and seven Playwright browser tests. Integration fixtures use isolated disposable databases and fictional data. npm audits report zero known vulnerabilities in both projects.

Migration references:
- https://mongoosejs.com/docs/migrating_to_9.html
- https://mui.com/material-ui/migration/upgrade-to-v9/
- https://vite.dev/guide/migration
- https://github.com/advisories/GHSA-g3hv-75wg-m249
